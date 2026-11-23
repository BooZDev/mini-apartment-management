import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { isConstraintError } from 'src/common/database/pg-error.util';
import { lockRow, selectOne, selectRows } from 'src/common/database/query.util';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { addDays, daysInPeriod, toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { formatMoney } from 'src/common/utils/text.util';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { INVOICE_SELECT, InvoiceRow, toInvoiceSummary } from 'src/invoices/invoice-view';
import { invoiceLines } from 'src/invoices/invoice-lines';
import { NotificationType } from 'src/notifications/enums/notification-type.enum';
import { NotificationsService } from 'src/notifications/notifications.service';
import { BillingCalculatorService } from './billing-calculator.service';
import { totalsOf } from './billing-math';
import { BillableContract, PreviewRoomStatus, SkipReason } from './billing.types';
import {
  CreateBillingPeriodDto,
  CreateExtraChargeDto,
  IssueInvoicesDto,
  UpdateBillingPeriodDto,
} from './dto/billing-period.dto';
import { insertInvoice, toLineResponse } from './invoice-writer';

type PeriodRow = {
  id: string;
  period: string;
  billing_date: string;
  due_date: string;
  created_by: string;
  created_by_name: string;
  created_at: Date;
  eligible_room_count: number;
  issued_invoice_count: number;
  total?: number;
};

const PERIOD_SELECT = `
  select bp.id, bp.period, bp.billing_date, bp.due_date, bp.created_by, u.full_name as created_by_name, bp.created_at,
         (select count(distinct c.room_id) from public.contracts c
           where c.ended_on is null
             and c.start_date <= ((bp.period || '-01')::date + interval '1 month' - interval '1 day')::date
         ) as eligible_room_count,
         (select count(*) from public.invoices i where i.period_id = bp.id) as issued_invoice_count
    from public.billing_periods bp
    join public.users u on u.id = bp.created_by`;

type Skipped = { roomId: string; roomCode: string; reason: string };

@Injectable()
export class BillingPeriodsService {
  private readonly logger = new Logger(BillingPeriodsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly calculator: BillingCalculatorService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // BIL-01 Danh sách kỳ
  async findAll(query: PaginationQueryDto) {
    const rows = await selectRows<PeriodRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${PERIOD_SELECT}) x order by x.period desc limit $1 offset $2`,
      [query.pageSize, (query.page - 1) * query.pageSize],
    );
    return new Paginated(rows.map(toPeriod), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // BIL-03 Chi tiết kỳ
  async findOne(id: string, manager: EntityManager = this.dataSource.manager) {
    const row = await selectOne<PeriodRow>(manager, `${PERIOD_SELECT} where bp.id = $1`, [id]);
    if (!row) throw new AppException('PERIOD_NOT_FOUND');
    return toPeriod(row);
  }

  // BIL-02 Lên lịch kỳ thu
  async create(dto: CreateBillingPeriodDto, userId: string) {
    const settings = await selectOne<{ default_billing_day: number; default_payment_term_days: number }>(
      this.dataSource.manager,
      `select default_billing_day, default_payment_term_days from public.building_settings where id = 1`,
    );
    // Tháng không có ngày thu mặc định thì lấy ngày cuối tháng
    const day = Math.min(settings?.default_billing_day ?? 1, daysInPeriod(dto.period));
    const billingDate = dto.billingDate ?? `${dto.period}-${String(day).padStart(2, '0')}`;
    const dueDate = dto.dueDate ?? addDays(billingDate, settings?.default_payment_term_days ?? 10);
    assertDueAfterBilling(billingDate, dueDate);

    const row = await selectOne<{ id: string }>(
      this.dataSource.manager,
      `insert into public.billing_periods (period, billing_date, due_date, created_by)
       values ($1, $2, $3, $4) returning id`,
      [dto.period, billingDate, dueDate, userId],
    );
    return this.findOne(row!.id);
  }

  // BIL-08 Sửa lịch thu của kỳ: kỳ đã có hóa đơn thì không sửa
  async update(id: string, dto: UpdateBillingPeriodDto) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'billing_periods', id))) throw new AppException('PERIOD_NOT_FOUND');
      const current = await this.findOne(id, manager);
      if (current.issuedInvoiceCount > 0) throw new AppException('PERIOD_ALREADY_ISSUED');

      const billingDate = dto.billingDate ?? current.billingDate;
      const dueDate = dto.dueDate ?? current.dueDate;
      assertDueAfterBilling(billingDate, dueDate);
      await manager.query(`update public.billing_periods set billing_date = $2, due_date = $3 where id = $1`, [
        id,
        billingDate,
        dueDate,
      ]);
      return this.findOne(id, manager);
    });
  }

  // BIL-04 Xem trước hóa đơn của kỳ, không lưu gì
  async preview(id: string) {
    const manager = this.dataSource.manager;
    const period = await this.findOne(id);
    const contracts = await this.calculator.billableContracts(manager, period.period);
    const issued = await this.issuedInvoices(manager, id);

    const rooms: Record<string, unknown>[] = [];
    for (const contract of contracts) {
      const invoice = issued.get(contract.room_id);
      if (invoice) {
        rooms.push(await this.issuedRoom(manager, invoice));
        issued.delete(contract.room_id);
        continue;
      }
      const { lines, missing } = await this.calculator.monthlyLines(manager, contract, period.period);
      rooms.push({
        roomId: contract.room_id,
        roomCode: contract.room_code,
        contractId: contract.id,
        primaryTenantName: contract.primary_name,
        status: missing.reasons.size > 0 ? PreviewRoomStatus.SKIPPED : PreviewRoomStatus.READY,
        skipReasons: [...missing.reasons],
        missingItems: missing.items,
        lines: lines.map(toLineResponse),
        ...totalsOf(lines),
      });
    }
    // Hóa đơn đã phát hành của phòng nay không còn hợp đồng để lập hóa đơn (đã thanh lý)
    for (const invoice of issued.values()) rooms.push(await this.issuedRoom(manager, invoice));
    rooms.sort((a, b) => String(a.roomCode).localeCompare(String(b.roomCode)));

    const ready = rooms.filter((r) => r.status === PreviewRoomStatus.READY);
    return {
      periodId: period.id,
      period: period.period,
      dueDate: period.dueDate,
      rooms,
      summary: {
        readyCount: ready.length,
        skippedCount: rooms.filter((r) => r.status === PreviewRoomStatus.SKIPPED).length,
        alreadyIssuedCount: rooms.filter((r) => r.status === PreviewRoomStatus.ALREADY_ISSUED).length,
        readyTotalAmount: ready.reduce((sum, r) => sum + (r.totalAmount as number), 0),
      },
    };
  }

  // BIL-05 Phát hành hóa đơn: tính lại tại lúc phát hành, mỗi phòng một giao dịch
  async issue(id: string, dto: IssueInvoicesDto, ctx: RequestContext, idempotencyKey?: string) {
    const period = await this.findOne(id);
    return this.idempotencyService.runEach(
      {
        key: idempotencyKey,
        required: false,
        userId: ctx.user.id,
        endpoint: `POST /billing-periods/${id}/issue`,
        payload: dto,
        status: 200,
      },
      async () => {
        const contracts = await this.calculator.billableContracts(this.dataSource.manager, period.period);
        const issuedRooms = await this.issuedInvoices(this.dataSource.manager, id);

        if (dto.roomIds) {
          const known = new Set([...contracts.map((c) => c.room_id), ...issuedRooms.keys()]);
          const details = dto.roomIds.flatMap((roomId, i) =>
            known.has(roomId)
              ? []
              : [{ field: `roomIds[${i}]`, code: DetailCode.INVALID_FORMAT, message: 'Phòng không được lập hóa đơn trong kỳ' }],
          );
          if (details.length > 0) throw new AppException('VALIDATION_ERROR', details);
        }

        const wanted = dto.roomIds ? new Set(dto.roomIds) : null;
        const issued: ReturnType<typeof toInvoiceSummary>[] = [];
        const skipped: Skipped[] = [];

        for (const invoice of issuedRooms.values()) {
          if (wanted?.has(invoice.room_id)) {
            skipped.push({ roomId: invoice.room_id, roomCode: invoice.room_code, reason: PreviewRoomStatus.ALREADY_ISSUED });
          }
        }
        for (const contract of contracts) {
          if (wanted && !wanted.has(contract.room_id)) continue;
          if (issuedRooms.has(contract.room_id)) {
            if (!wanted) {
              skipped.push({ roomId: contract.room_id, roomCode: contract.room_code, reason: PreviewRoomStatus.ALREADY_ISSUED });
            }
            continue;
          }
          const result = await this.issueRoom(period, contract, ctx);
          if ('reason' in result) skipped.push(result);
          else issued.push(result);
        }
        return { issued, skipped };
      },
    );
  }

  // BIL-06 Thêm khoản phát sinh
  async createExtraCharge(periodId: string, dto: CreateExtraChargeDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const period = await this.findOne(periodId, manager);
      if (!(await lockRow(manager, 'rooms', dto.roomId))) throw new AppException('RESOURCE_NOT_FOUND');
      const [contract] = await this.calculator.billableContracts(manager, period.period, dto.roomId);
      if (!contract) throw new AppException('ROOM_NOT_OCCUPIED');
      await this.assertNotIssued(manager, periodId, dto.roomId);

      const row = await selectOne<{ id: string }>(
        manager,
        `insert into public.extra_charges (period_id, room_id, contract_id, description, amount, created_by)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [periodId, dto.roomId, contract.id, dto.description, dto.amount, ctx.user.id],
      );
      await this.auditLogsService.log(manager, ctx, {
        action: 'EXTRA_CHARGE_CREATED',
        entityType: 'EXTRA_CHARGE',
        entityId: row!.id,
        summary: `Khoản phát sinh ${dto.description} ${formatMoney(dto.amount)}, phòng ${contract.room_code} kỳ ${period.period}`,
        after: { roomCode: contract.room_code, period: period.period, description: dto.description, amount: dto.amount },
      });
      return { id: row!.id, roomId: dto.roomId, description: dto.description, amount: dto.amount };
    });
  }

  // BIL-07 Xóa khoản phát sinh chưa phát hành
  async deleteExtraCharge(periodId: string, extraChargeId: string, ctx: RequestContext) {
    await this.dataSource.transaction(async (manager) => {
      const extra = await selectOne<{ room_id: string; description: string; amount: number }>(
        manager,
        `select room_id, description, amount from public.extra_charges where id = $1 and period_id = $2 for update`,
        [extraChargeId, periodId],
      );
      if (!extra) throw new AppException('RESOURCE_NOT_FOUND');
      await this.assertNotIssued(manager, periodId, extra.room_id);
      await manager.query(`delete from public.extra_charges where id = $1`, [extraChargeId]);
      await this.auditLogsService.log(manager, ctx, {
        action: 'EXTRA_CHARGE_DELETED',
        entityType: 'EXTRA_CHARGE',
        entityId: extraChargeId,
        summary: `Xóa khoản phát sinh ${extra.description} ${formatMoney(extra.amount)}`,
        before: { description: extra.description, amount: extra.amount },
      });
    });
  }

  private async issueRoom(
    period: ReturnType<typeof toPeriod>,
    contract: BillableContract,
    ctx: RequestContext,
  ): Promise<ReturnType<typeof toInvoiceSummary> | Skipped> {
    const skip = (reason: string): Skipped => ({ roomId: contract.room_id, roomCode: contract.room_code, reason });
    try {
      return await this.dataSource.transaction(async (manager) => {
        await lockRow(manager, 'rooms', contract.room_id);
        const { lines, missing } = await this.calculator.monthlyLines(manager, contract, period.period);
        if (missing.reasons.size > 0) {
          return skip(
            missing.reasons.has(SkipReason.MISSING_METER_READING) ? SkipReason.MISSING_METER_READING : SkipReason.MISSING_PRICE,
          );
        }

        const code = `HD-${period.period.replace('-', '')}-${contract.room_code}`;
        const { id, totalAmount } = await insertInvoice(manager, {
          code,
          invoiceType: 'MONTHLY',
          periodId: period.id,
          roomId: contract.room_id,
          contractId: contract.id,
          primaryTenantName: contract.primary_name,
          billingDate: period.billingDate,
          dueDate: period.dueDate,
          lines,
          issuedBy: ctx.user.id,
        });
        // Khóa chỉ số của phòng trong kỳ: sửa sai sau khi phát hành dùng phiếu điều chỉnh
        await manager.query(`update public.meter_readings set is_locked = true where room_id = $1 and period = $2`, [
          contract.room_id,
          period.period,
        ]);
        await this.notificationsService.create(manager, {
          userId: contract.tenant_user_id,
          type: NotificationType.INVOICE_ISSUED,
          title: `Hóa đơn mới ${code}`,
          message: `Hóa đơn kỳ ${period.period.slice(5)}/${period.period.slice(0, 4)} phòng ${contract.room_code}: ${formatMoney(totalAmount)}, hạn thanh toán ${period.dueDate}`,
          relatedType: 'INVOICE',
          relatedId: id,
        });
        await this.auditLogsService.log(manager, ctx, {
          action: 'INVOICES_ISSUED',
          entityType: 'INVOICE',
          entityId: id,
          summary: `Phát hành ${code}: ${formatMoney(totalAmount)}`,
          after: { code, totalAmount, lineCount: lines.length },
        });

        const row = await selectOne<InvoiceRow>(manager, `${INVOICE_SELECT} where i.id = $2`, [vnToday(), id]);
        return toInvoiceSummary(row!);
      });
    } catch (error) {
      // Hai người phát hành cùng lúc: phòng đã có hóa đơn
      if (isConstraintError(error, 'invoices_room_period_uk') || isConstraintError(error, 'invoices_code_uk')) {
        return skip(PreviewRoomStatus.ALREADY_ISSUED);
      }
      this.logger.error(`Phát hành hóa đơn phòng ${contract.room_code} kỳ ${period.period} lỗi`, (error as Error).stack);
      throw error;
    }
  }

  private async issuedInvoices(manager: EntityManager, periodId: string) {
    const rows = await selectRows<InvoiceRow>(
      manager,
      `${INVOICE_SELECT} where i.period_id = $2 and i.invoice_type = 'MONTHLY'`,
      [vnToday(), periodId],
    );
    return new Map(rows.map((r) => [r.room_id, r]));
  }

  private async issuedRoom(manager: EntityManager, invoice: InvoiceRow) {
    return {
      roomId: invoice.room_id,
      roomCode: invoice.room_code,
      contractId: invoice.contract_id,
      primaryTenantName: invoice.primary_tenant_name,
      status: PreviewRoomStatus.ALREADY_ISSUED,
      skipReasons: [],
      missingItems: [],
      lines: await invoiceLines(manager, invoice.id),
      subtotal: invoice.subtotal,
      roundingAmount: invoice.rounding_amount,
      totalAmount: invoice.total_amount,
      invoiceId: invoice.id,
    };
  }

  private async assertNotIssued(manager: EntityManager, periodId: string, roomId: string) {
    const invoice = await selectOne(
      manager,
      `select 1 from public.invoices where period_id = $1 and room_id = $2 and invoice_type = 'MONTHLY'`,
      [periodId, roomId],
    );
    if (invoice) throw new AppException('PERIOD_ALREADY_ISSUED');
  }
}

function assertDueAfterBilling(billingDate: string, dueDate: string) {
  if (dueDate < billingDate) {
    throw AppException.field('dueDate', DetailCode.DUE_BEFORE_BILLING, 'Hạn thanh toán không được trước ngày thu');
  }
}

function toPeriod(r: PeriodRow) {
  return {
    id: r.id,
    period: r.period,
    billingDate: r.billing_date,
    dueDate: r.due_date,
    eligibleRoomCount: r.eligible_room_count,
    issuedInvoiceCount: r.issued_invoice_count,
    createdBy: { id: r.created_by, fullName: r.created_by_name },
    createdAt: toVnDateTime(r.created_at),
  };
}

