import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { ApproveDto, ReasonDto, RejectDto } from 'src/common/dto/decision.dto';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { buildOrderBy } from 'src/common/utils/sort.util';
import { formatMoney } from 'src/common/utils/text.util';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { INVOICE_SELECT, InvoiceRow } from 'src/invoices/invoice-view';
import { CreatePaymentDto, FindCancellationRequestsDto, FindPaymentsDto, INVALID_PAYMENT } from './dto/payment.dto';
import { loadReceipt, PAYMENT_SELECT, PaymentRow, toPayment } from './payment-view';
import { nextReceiptNumber } from './receipt-number';

type CancellationRow = {
  id: string;
  payment_id: string;
  receipt_number: string;
  invoice_code: string;
  amount: number;
  reason: string;
  status: string;
  requested_by: string;
  requested_by_name: string;
  requested_at: Date;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: Date | null;
  decision_note: string | null;
  total?: number;
};

const CANCELLATION_SELECT = `
  select c.id, c.payment_id, p.receipt_number, i.code as invoice_code, p.amount, c.reason, c.status,
         c.requested_by, ru.full_name as requested_by_name, c.requested_at,
         c.decided_by, du.full_name as decided_by_name, c.decided_at, c.decision_note
    from public.payment_cancellation_requests c
    join public.payments p on p.id = c.payment_id
    join public.invoices i on i.id = p.invoice_id
    join public.users ru on ru.id = c.requested_by
    left join public.users du on du.id = c.decided_by`;

const SORT_FIELDS = { paidOn: 'x.paid_on', amount: 'x.amount', recordedAt: 'x.recorded_at' };

@Injectable()
export class PaymentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // PAY-01 Ghi nhận thanh toán: khóa theo hóa đơn, số còn nợ tính lại ngay (trigger)
  create(dto: CreatePaymentDto, ctx: RequestContext, idempotencyKey?: string) {
    const hasOccupant = dto.payerOccupantId !== undefined;
    const hasName = dto.payerName !== undefined && dto.payerName !== '';
    if (hasOccupant === hasName) {
      throw new AppException(
        'VALIDATION_ERROR',
        [{ field: 'payerOccupantId', code: DetailCode.REQUIRED, message: 'Chọn người nộp là người ở hoặc nhập tên người nộp' }],
        INVALID_PAYMENT.message,
      );
    }

    return this.idempotencyService.run(
      { key: idempotencyKey, required: true, userId: ctx.user.id, endpoint: 'POST /payments', payload: dto, status: 201 },
      async (manager: EntityManager) => {
        if (!(await lockRow(manager, 'invoices', dto.invoiceId))) throw new AppException('RESOURCE_NOT_FOUND');
        const invoice = await this.invoice(manager, dto.invoiceId);
        if (invoice.balance === 0) throw new AppException('INVOICE_ALREADY_PAID');
        if (dto.amount > invoice.balance) {
          throw new AppException('AMOUNT_EXCEEDS_BALANCE', [
            {
              field: 'amount',
              code: DetailCode.OUT_OF_RANGE,
              message: `Số còn nợ hiện tại là ${formatMoney(invoice.balance)}`,
              balance: invoice.balance,
            },
          ]);
        }

        let payerName = dto.payerName ?? '';
        if (dto.payerOccupantId) {
          const payer = await selectOne<{ full_name: string }>(
            manager,
            `select o.full_name from public.contract_occupants co join public.occupants o on o.id = co.occupant_id
              where co.contract_id = $1 and co.occupant_id = $2`,
            [invoice.contract_id, dto.payerOccupantId],
          );
          if (!payer) {
            throw AppException.field('payerOccupantId', DetailCode.INVALID_FORMAT, 'Người nộp không phải người ở của phòng');
          }
          payerName = payer.full_name;
        }

        const receiptNumber = await nextReceiptNumber(manager);
        const row = await selectOne<{ id: string }>(
          manager,
          `insert into public.payments
             (receipt_number, invoice_id, amount, method, reference_code, payer_occupant_id, payer_name, paid_on, note, recorded_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
          [
            receiptNumber,
            dto.invoiceId,
            dto.amount,
            dto.method,
            dto.referenceCode ?? null,
            dto.payerOccupantId ?? null,
            payerName,
            dto.paidOn,
            dto.note ?? null,
            ctx.user.id,
          ],
        );
        await this.auditLogsService.log(manager, ctx, {
          action: 'PAYMENT_CREATED',
          entityType: 'PAYMENT',
          entityId: row!.id,
          summary: `Ghi nhận ${formatMoney(dto.amount)} cho ${invoice.code}`,
          after: { receiptNumber, invoiceCode: invoice.code, amount: dto.amount, method: dto.method, paidOn: dto.paidOn },
        });

        const after = await this.invoice(manager, dto.invoiceId);
        return {
          payment: await this.findOne(row!.id, manager),
          invoice: {
            id: after.id,
            code: after.code,
            amountDue: after.amount_due,
            paidAmount: after.paid_amount,
            balance: after.balance,
            status: after.status,
          },
        };
      },
    );
  }

  // PAY-02 Danh sách thanh toán; TEN-04 dùng cùng hàm với hợp đồng của người thuê
  async findAll(query: FindPaymentsDto, options: { contractId?: string; hideRecordedBy?: boolean } = {}) {
    const where = new WhereBuilder();
    if (options.contractId) where.add('i.contract_id = ?', options.contractId);
    if (query.invoiceId) where.add('p.invoice_id = ?', query.invoiceId);
    if (query.roomId) where.add('i.room_id = ?', query.roomId);
    if (query.fromDate) where.add('p.paid_on >= ?', query.fromDate);
    if (query.toDate) where.add('p.paid_on <= ?', query.toDate);
    if (query.method) where.add('p.method = ?', query.method);
    if (query.status) where.add('p.status = ?', query.status);

    const orderBy = buildOrderBy(query.sort, SORT_FIELDS, '-paidOn', 'x.recorded_at desc, x.id');
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<PaymentRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${PAYMENT_SELECT} ${where.sql}) x
        order by ${orderBy} limit ${limit} offset ${offset}`,
      where.params,
    );
    return new Paginated(
      rows.map((r) => toPayment(r, { hideRecordedBy: options.hideRecordedBy })),
      query.page,
      query.pageSize,
      rows[0]?.total ?? 0,
    );
  }

  // PAY-03 Chi tiết thanh toán
  async findOne(id: string, manager: EntityManager = this.dataSource.manager) {
    const row = await selectOne<PaymentRow>(manager, `${PAYMENT_SELECT} where p.id = $1`, [id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toPayment(row);
  }

  // PAY-04 Biên lai
  receipt(id: string) {
    return loadReceipt(this.dataSource.manager, id);
  }

  // PAY-05 Gửi yêu cầu hủy: thanh toán chờ duyệt hủy vẫn được tính
  requestCancellation(paymentId: string, dto: ReasonDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'payments', paymentId))) throw new AppException('RESOURCE_NOT_FOUND');
      const payment = await this.findOne(paymentId, manager);
      if (payment.status === 'CANCELLED') throw new AppException('PAYMENT_ALREADY_CANCELLED');
      if (payment.method === 'DEPOSIT') throw new AppException('PAYMENT_NOT_CANCELLABLE');
      if (payment.status === 'PENDING_CANCELLATION') throw new AppException('CANCELLATION_ALREADY_PENDING');

      const row = await selectOne<{ id: string }>(
        manager,
        `insert into public.payment_cancellation_requests (payment_id, reason, requested_by)
         values ($1, $2, $3) returning id`,
        [paymentId, dto.reason, ctx.user.id],
      );
      await manager.query(`update public.payments set status = 'PENDING_CANCELLATION' where id = $1`, [paymentId]);
      await this.auditLogsService.log(manager, ctx, {
        action: 'PAYMENT_CANCELLATION_REQUESTED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        summary: `Yêu cầu hủy ${payment.receiptNumber} (${formatMoney(payment.amount)})`,
        after: { reason: dto.reason },
      });
      return this.findCancellation(manager, row!.id);
    });
  }

  // PAY-06 Danh sách yêu cầu hủy
  async findCancellations(query: FindCancellationRequestsDto) {
    const where = new WhereBuilder();
    if (query.status) where.add('c.status = ?', query.status);
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<CancellationRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${CANCELLATION_SELECT} ${where.sql}) x
        order by x.requested_at desc, x.id limit ${limit} offset ${offset}`,
      where.params,
    );
    return new Paginated(rows.map(toCancellation), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // PAY-07 Duyệt hủy: thanh toán CANCELLED, hóa đơn tính lại số còn nợ
  approveCancellation(id: string, dto: ApproveDto, ctx: RequestContext) {
    return this.decideCancellation(id, 'APPROVED', dto.note ?? null, ctx);
  }

  // PAY-08 Từ chối hủy: thanh toán trở về VALID
  rejectCancellation(id: string, dto: RejectDto, ctx: RequestContext) {
    return this.decideCancellation(id, 'REJECTED', dto.note, ctx);
  }

  private decideCancellation(id: string, status: 'APPROVED' | 'REJECTED', note: string | null, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'payment_cancellation_requests', id))) throw new AppException('RESOURCE_NOT_FOUND');
      const request = await this.findCancellation(manager, id);
      if (request.status !== 'PENDING') throw new AppException('REQUEST_ALREADY_PROCESSED');
      if (status === 'APPROVED' && request.requestedBy.id === ctx.user.id) {
        throw new AppException('SELF_APPROVAL_NOT_ALLOWED');
      }

      await manager.query(
        `update public.payment_cancellation_requests
            set status = $2, decided_by = $3, decided_at = now(), decision_note = $4
          where id = $1`,
        [id, status, ctx.user.id, note],
      );
      if (status === 'APPROVED') {
        await manager.query(
          `update public.payments set status = 'CANCELLED', cancelled_at = now(), cancel_reason = $2 where id = $1`,
          [request.paymentId, request.reason],
        );
      } else {
        await manager.query(`update public.payments set status = 'VALID' where id = $1`, [request.paymentId]);
      }

      await this.auditLogsService.log(manager, ctx, {
        action: status === 'APPROVED' ? 'PAYMENT_CANCELLED' : 'PAYMENT_CANCELLATION_REJECTED',
        entityType: 'PAYMENT',
        entityId: request.paymentId,
        summary: `${status === 'APPROVED' ? 'Hủy' : 'Từ chối hủy'} ${request.receiptNumber} (${formatMoney(request.amount)})`,
        before: { status: 'PENDING_CANCELLATION' },
        after: { status: status === 'APPROVED' ? 'CANCELLED' : 'VALID', note },
      });
      return this.findCancellation(manager, id);
    });
  }

  private async invoice(manager: EntityManager, id: string) {
    const row = await selectOne<InvoiceRow>(manager, `${INVOICE_SELECT} where i.id = $2`, [vnToday(), id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return row;
  }

  private async findCancellation(manager: EntityManager, id: string) {
    const row = await selectOne<CancellationRow>(manager, `${CANCELLATION_SELECT} where c.id = $1`, [id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toCancellation(row);
  }
}

function toCancellation(r: CancellationRow) {
  return {
    id: r.id,
    paymentId: r.payment_id,
    receiptNumber: r.receipt_number,
    invoiceCode: r.invoice_code,
    amount: r.amount,
    reason: r.reason,
    status: r.status,
    requestedBy: { id: r.requested_by, fullName: r.requested_by_name },
    requestedAt: toVnDateTime(r.requested_at),
    decidedBy: r.decided_by ? { id: r.decided_by, fullName: r.decided_by_name } : null,
    decidedAt: toVnDateTime(r.decided_at),
    decisionNote: r.decision_note,
  };
}
