import { EntityManager } from 'typeorm';
import { selectOne, selectRows } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { ADJUSTMENT_SELECT, AdjustmentRow, toAdjustment } from 'src/adjustments/adjustment-view';
import { PAYMENT_SELECT, PaymentRow, toPayment } from 'src/payments/payment-view';
import { invoiceLines } from './invoice-lines';

export type InvoiceRow = {
  id: string;
  code: string;
  invoice_type: 'MONTHLY' | 'SETTLEMENT';
  period_id: string | null;
  period: string | null;
  room_id: string;
  room_code: string;
  contract_id: string;
  primary_tenant_name: string;
  issued_at: Date;
  billing_date: string;
  due_date: string;
  subtotal: number;
  rounding_amount: number;
  total_amount: number;
  adjustment_total: number;
  amount_due: number;
  paid_amount: number;
  balance: number;
  status: string;
  total?: number;
};

// OVERDUE tính khi đọc: còn nợ và hôm nay ($1) sau hạn thanh toán
export const INVOICE_SELECT = `
  select i.id, i.code, i.invoice_type, i.period_id, bp.period, i.room_id, r.code as room_code, i.contract_id,
         i.primary_tenant_name, i.issued_at, i.billing_date, i.due_date, i.subtotal, i.rounding_amount,
         i.total_amount, i.adjustment_total, i.amount_due, i.paid_amount, i.balance,
         case when i.balance > 0 and $1::date > i.due_date then 'OVERDUE' else i.status end as status
    from public.invoices i
    join public.rooms r on r.id = i.room_id
    left join public.billing_periods bp on bp.id = i.period_id`;

/** Điều kiện lọc theo trạng thái (gồm OVERDUE tính khi đọc). */
export const INVOICE_STATUS_SQL: Record<string, string> = {
  PAID: `i.status = 'PAID'`,
  OVERDUE: `(i.balance > 0 and $1::date > i.due_date)`,
  PARTIALLY_PAID: `(i.status = 'PARTIALLY_PAID' and $1::date <= i.due_date)`,
  UNPAID: `(i.status = 'UNPAID' and $1::date <= i.due_date)`,
};

export function toInvoiceSummary(r: InvoiceRow) {
  return {
    id: r.id,
    code: r.code,
    invoiceType: r.invoice_type,
    periodId: r.period_id,
    period: r.period,
    roomId: r.room_id,
    roomCode: r.room_code,
    contractId: r.contract_id,
    primaryTenantName: r.primary_tenant_name,
    issuedAt: toVnDateTime(r.issued_at),
    billingDate: r.billing_date,
    dueDate: r.due_date,
    totalAmount: r.total_amount,
    adjustmentTotal: r.adjustment_total,
    amountDue: r.amount_due,
    paidAmount: r.paid_amount,
    balance: r.balance,
    status: r.status,
  };
}

/**
 * Invoice chi tiết. Người thuê (TEN-03) chỉ thấy phiếu điều chỉnh đã duyệt và thanh toán
 * không kèm người thu; `contractId` giới hạn trong hợp đồng của người thuê.
 */
export async function loadInvoice(
  manager: EntityManager,
  invoiceId: string,
  options: { tenantContractId?: string } = {},
) {
  const tenant = options.tenantContractId !== undefined;
  const row = await selectOne<InvoiceRow>(
    manager,
    `${INVOICE_SELECT} where i.id = $2 ${tenant ? 'and i.contract_id = $3' : ''}`,
    tenant ? [vnToday(), invoiceId, options.tenantContractId] : [vnToday(), invoiceId],
  );
  if (!row) throw new AppException('RESOURCE_NOT_FOUND');

  const [lines, adjustments, payments] = await Promise.all([
    invoiceLines(manager, invoiceId),
    selectRows<AdjustmentRow>(
      manager,
      `${ADJUSTMENT_SELECT} where a.invoice_id = $1 ${tenant ? `and a.status = 'APPROVED'` : ''} order by a.requested_at`,
      [invoiceId],
    ),
    selectRows<PaymentRow>(manager, `${PAYMENT_SELECT} where p.invoice_id = $1 order by p.recorded_at`, [invoiceId]),
  ]);

  return {
    ...toInvoiceSummary(row),
    lines,
    subtotal: row.subtotal,
    roundingAmount: row.rounding_amount,
    adjustments: adjustments.map(toAdjustment),
    payments: payments.map((p) => toPayment(p, { hideRecordedBy: tenant })),
  };
}
