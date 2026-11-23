import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { BillingCalculatorService } from 'src/billing/billing-calculator.service';
import { totalsOf } from 'src/billing/billing-math';
import { insertInvoice, toLineResponse } from 'src/billing/invoice-writer';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { lockRow, selectOne, selectRows } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { compactDate, periodOf, vnToday } from 'src/common/utils/date.util';
import { formatMoney } from 'src/common/utils/text.util';
import { Contract } from 'src/entities/contract.entity';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { loadInvoice } from 'src/invoices/invoice-view';
import { NotificationType } from 'src/notifications/enums/notification-type.enum';
import { NotificationsService } from 'src/notifications/notifications.service';
import { nextReceiptNumber } from 'src/payments/receipt-number';
import { ContractsService } from './contracts.service';
import { EndContractDto, SettlementPreviewDto } from './dto/end-contract.dto';
import { MeterType } from './enums/contract.enum';

@Injectable()
export class SettlementService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly calculator: BillingCalculatorService,
    private readonly contractsService: ContractsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // CTR-08 Xem trước thanh lý, không lưu gì
  async preview(id: string, dto: SettlementPreviewDto) {
    const result = await this.compute(this.dataSource.manager, id, dto);
    return {
      uncoveredFrom: result.uncoveredFrom,
      uncoveredTo: result.uncoveredTo,
      lines: result.lines.map(toLineResponse),
      subtotal: result.subtotal,
      roundingAmount: result.roundingAmount,
      totalAmount: result.totalAmount,
      otherOutstanding: result.otherOutstanding,
      deposit: result.deposit,
      remainingDebt: result.remainingDebt,
    };
  }

  // CTR-04 Kết thúc hợp đồng, thanh lý, cấn trừ tiền cọc trong một giao dịch
  end(id: string, dto: EndContractDto, ctx: RequestContext, idempotencyKey?: string) {
    return this.idempotencyService.run(
      { key: idempotencyKey, required: false, userId: ctx.user.id, endpoint: `POST /contracts/${id}/end`, payload: dto, status: 200 },
      async (manager: EntityManager) => {
        if (!(await lockRow(manager, 'contracts', id))) throw new AppException('RESOURCE_NOT_FOUND');
        const result = await this.compute(manager, id, dto);
        const { contract, endedOn } = result;
        const endPeriod = periodOf(endedOn);

        await manager.getRepository(Contract).update(
          { id },
          {
            endedOn,
            endNote: dto.endNote ?? null,
            ...(!result.cancelledBeforeStart && {
              finalElectricityReading: finalReading(dto, MeterType.ELECTRICITY),
              finalWaterReading: finalReading(dto, MeterType.WATER),
            }),
          },
        );
        // Người ở chưa rời đi rời cùng ngày kết thúc; hủy trước khi vào ở thì thời gian ở rỗng
        await manager.query(
          `update public.contract_occupants set move_out_date = greatest(move_in_date, $2::date)
            where contract_id = $1 and move_out_date is null`,
          [id, endedOn],
        );
        await manager.query(`delete from public.contract_services where contract_id = $1 and from_period > $2`, [id, endPeriod]);
        await manager.query(
          `update public.contract_services set to_period = $2
            where contract_id = $1 and (to_period is null or to_period > $2)`,
          [id, endPeriod],
        );

        let settlementInvoiceId: string | null = null;
        if (result.lines.length > 0) {
          const code = await this.settlementCode(manager, endedOn, result.roomCode);
          const invoice = await insertInvoice(manager, {
            code,
            invoiceType: 'SETTLEMENT',
            periodId: null,
            roomId: contract.roomId,
            contractId: id,
            primaryTenantName: result.primaryName,
            billingDate: endedOn,
            dueDate: result.dueDate,
            lines: result.lines,
            issuedBy: ctx.user.id,
          });
          settlementInvoiceId = invoice.id;
          await this.notificationsService.create(manager, {
            userId: contract.tenantUserId,
            type: NotificationType.INVOICE_ISSUED,
            title: `Hóa đơn thanh lý ${code}`,
            message: `Hóa đơn thanh lý phòng ${result.roomCode}: ${formatMoney(invoice.totalAmount)}, hạn thanh toán ${result.dueDate}`,
            relatedType: 'INVOICE',
            relatedId: invoice.id,
          });
          await this.auditLogsService.log(manager, ctx, {
            action: 'SETTLEMENT_ISSUED',
            entityType: 'INVOICE',
            entityId: invoice.id,
            summary: `Phát hành ${code}: ${formatMoney(invoice.totalAmount)}`,
            after: { code, totalAmount: invoice.totalAmount, lineCount: result.lines.length },
          });
        }

        const applied = result.deposit.applied > 0 ? await this.applyDeposit(manager, result, ctx) : 0;
        await manager
          .getRepository(Contract)
          .update({ id }, { depositRefundAmount: contract.deposit - result.depositAlreadyApplied - applied });

        await this.auditLogsService.log(manager, ctx, {
          action: 'CONTRACT_ENDED',
          entityType: 'CONTRACT',
          entityId: id,
          summary: result.cancelledBeforeStart
            ? `Hủy hợp đồng phòng ${result.roomCode} trước khi vào ở`
            : `Kết thúc hợp đồng phòng ${result.roomCode} ngày ${endedOn}`,
          after: {
            endedOn,
            cancelledBeforeStart: result.cancelledBeforeStart,
            settlementTotal: result.totalAmount,
            depositApplied: applied,
            depositRefund: contract.deposit - result.depositAlreadyApplied - applied,
            endNote: dto.endNote ?? null,
          },
        });

        return {
          contract: await this.contractsService.findView(manager, id, 'FULL'),
          settlementInvoice: settlementInvoiceId ? await loadInvoice(manager, settlementInvoiceId) : null,
          deposit: { amount: contract.deposit, applied, refund: contract.deposit - result.depositAlreadyApplied - applied },
        };
      },
    );
  }

  /** CTR-08 quy tắc tính, dùng chung cho xem trước và kết thúc. */
  private async compute(manager: EntityManager, id: string, dto: SettlementPreviewDto) {
    const contract = await manager.getRepository(Contract).findOneBy({ id });
    if (!contract) throw new AppException('RESOURCE_NOT_FOUND');
    if (contract.endedOn) throw new AppException('CONTRACT_ALREADY_ENDED');

    const today = vnToday();
    const cancelledBeforeStart = contract.startDate > today;
    const endedOn = dto.endedOn;
    if (cancelledBeforeStart ? endedOn !== today : endedOn < contract.startDate || endedOn > today) {
      throw AppException.field(
        'endedOn',
        DetailCode.OUT_OF_RANGE,
        cancelledBeforeStart
          ? 'Hợp đồng chưa bắt đầu: ngày kết thúc là hôm nay (hủy trước khi vào ở)'
          : 'Ngày kết thúc phải từ ngày bắt đầu hợp đồng đến hôm nay',
      );
    }
    if (cancelledBeforeStart && dto.finalReadings?.length) {
      throw AppException.field('finalReadings', DetailCode.INVALID_FORMAT, 'Hợp đồng chưa bắt đầu, không ghi chỉ số trả phòng');
    }
    const dueDate = dto.dueDate ?? endedOn;
    if (dueDate < endedOn) {
      throw AppException.field('dueDate', DetailCode.DUE_BEFORE_BILLING, 'Hạn thanh toán không được trước ngày kết thúc');
    }

    const billable = await this.calculator.contract(manager, id);
    const { uncoveredFrom, uncoveredTo, lines } = await this.calculator.settlementLines(manager, billable, {
      endedOn,
      finalReadings: dto.finalReadings ?? [],
      extraCharges: dto.extraCharges ?? [],
      cancelledBeforeStart,
    });
    const totals = totalsOf(lines);

    const money = await selectOne<{ other_outstanding: number; deposit_applied: number }>(
      manager,
      `select coalesce((select sum(balance) from public.invoices where contract_id = $1 and balance > 0), 0) as other_outstanding,
              coalesce((select sum(p.amount) from public.payments p join public.invoices i on i.id = p.invoice_id
                         where i.contract_id = $1 and p.method = 'DEPOSIT' and p.status <> 'CANCELLED'), 0) as deposit_applied`,
      [id],
    );
    const otherOutstanding = money?.other_outstanding ?? 0;
    const depositAlreadyApplied = money?.deposit_applied ?? 0;
    const available = contract.deposit - depositAlreadyApplied;
    const debt = totals.totalAmount + otherOutstanding;
    const applied = dto.applyDeposit === false ? 0 : Math.min(available, debt);

    return {
      contract,
      endedOn,
      dueDate,
      cancelledBeforeStart,
      roomCode: billable.room_code,
      primaryName: billable.primary_name,
      primaryOccupantId: billable.primary_occupant_id,
      uncoveredFrom,
      uncoveredTo,
      lines,
      ...totals,
      otherOutstanding,
      depositAlreadyApplied,
      deposit: { amount: contract.deposit, applied, refund: available - applied },
      remainingDebt: debt - applied,
    };
  }

  /** Cấn trừ lần lượt: hóa đơn thanh lý trước, rồi hóa đơn còn nợ khác theo hạn sớm nhất. */
  private async applyDeposit(manager: EntityManager, result: Awaited<ReturnType<SettlementService['compute']>>, ctx: RequestContext) {
    const invoices = await selectRows<{ id: string; code: string; balance: number }>(
      manager,
      `select id, code, balance from public.invoices
        where contract_id = $1 and balance > 0
        order by (invoice_type = 'SETTLEMENT') desc, due_date, issued_at
        for update`,
      [result.contract.id],
    );

    let remaining = result.deposit.applied;
    const parts: string[] = [];
    for (const invoice of invoices) {
      if (remaining === 0) break;
      const amount = Math.min(remaining, invoice.balance);
      await manager.query(
        `insert into public.payments
           (receipt_number, invoice_id, amount, method, payer_occupant_id, payer_name, paid_on, note, recorded_by)
         values ($1, $2, $3, 'DEPOSIT', $4, $5, $6, 'Cấn trừ tiền cọc khi thanh lý', $7)`,
        [await nextReceiptNumber(manager), invoice.id, amount, result.primaryOccupantId, result.primaryName, result.endedOn, ctx.user.id],
      );
      parts.push(`${invoice.code} ${formatMoney(amount)}`);
      remaining -= amount;
    }

    const applied = result.deposit.applied - remaining;
    await this.auditLogsService.log(manager, ctx, {
      action: 'DEPOSIT_APPLIED',
      entityType: 'CONTRACT',
      entityId: result.contract.id,
      summary: `Cấn trừ tiền cọc ${formatMoney(applied)}: ${parts.join(', ')}`,
      after: { applied, invoices: parts },
    });
    return applied;
  }

  /** TL-YYYYMMDD-<mã phòng>; phòng có hai hợp đồng kết thúc cùng ngày thì thêm hậu tố. */
  private async settlementCode(manager: EntityManager, endedOn: string, roomCode: string) {
    const base = `TL-${compactDate(endedOn)}-${roomCode}`;
    const existing = await selectRows<{ code: string }>(manager, `select code from public.invoices where code like $1`, [
      `${base}%`,
    ]);
    if (existing.length === 0) return base;
    return `${base}-${existing.length + 1}`;
  }
}

function finalReading(dto: EndContractDto, type: MeterType) {
  return dto.finalReadings?.find((r) => r.meterType === type)?.reading ?? null;
}
