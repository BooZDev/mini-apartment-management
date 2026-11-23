import { EntityManager } from 'typeorm';
import { selectOne } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime } from 'src/common/utils/date.util';
import { invoiceLines } from 'src/invoices/invoice-lines';

export type PaymentRow = {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_code: string;
  contract_id: string;
  room_code: string;
  amount: number;
  method: string;
  reference_code: string | null;
  payer_occupant_id: string | null;
  payer_name: string;
  paid_on: string;
  note: string | null;
  status: string;
  recorded_by: string;
  recorded_by_name: string;
  recorded_at: Date;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  total?: number;
};

export const PAYMENT_SELECT = `
  select p.id, p.receipt_number, p.invoice_id, i.code as invoice_code, i.contract_id, r.code as room_code,
         p.amount, p.method, p.reference_code, p.payer_occupant_id, p.payer_name, p.paid_on, p.note, p.status,
         p.recorded_by, u.full_name as recorded_by_name, p.recorded_at, p.cancelled_at, p.cancel_reason
    from public.payments p
    join public.invoices i on i.id = p.invoice_id
    join public.rooms r on r.id = i.room_id
    join public.users u on u.id = p.recorded_by`;

export function toPayment(r: PaymentRow, options: { hideRecordedBy?: boolean } = {}) {
  return {
    id: r.id,
    receiptNumber: r.receipt_number,
    invoiceId: r.invoice_id,
    invoiceCode: r.invoice_code,
    roomCode: r.room_code,
    amount: r.amount,
    method: r.method,
    referenceCode: r.reference_code,
    payer: { occupantId: r.payer_occupant_id, name: r.payer_name },
    paidOn: r.paid_on,
    note: r.note,
    status: r.status,
    ...(!options.hideRecordedBy && { recordedBy: { id: r.recorded_by, fullName: r.recorded_by_name } }),
    recordedAt: toVnDateTime(r.recorded_at),
    cancelledAt: toVnDateTime(r.cancelled_at),
    cancelReason: r.cancel_reason,
  };
}

/** Biên lai (PAY-04, TEN-05). `contractId` giới hạn trong hợp đồng của người thuê. */
export async function loadReceipt(manager: EntityManager, paymentId: string, contractId?: string) {
  const row = await selectOne<
    PaymentRow & { amount_due: number; period: string | null; building_name: string; paid_to_date: number }
  >(
    manager,
    `select x.*, i.amount_due, bp.period, s.building_name,
            (select coalesce(sum(p2.amount), 0) from public.payments p2
              where p2.invoice_id = x.invoice_id and (p2.status <> 'CANCELLED' or p2.id = x.id)
                and (p2.recorded_at, p2.id) <= (x.recorded_at, x.id)) as paid_to_date
       from (${PAYMENT_SELECT}) x
       join public.invoices i on i.id = x.invoice_id
       left join public.billing_periods bp on bp.id = i.period_id
       cross join public.building_settings s
      where x.id = $1 ${contractId ? 'and x.contract_id = $2' : ''}`,
    contractId ? [paymentId, contractId] : [paymentId],
  );
  if (!row) throw new AppException('RESOURCE_NOT_FOUND');

  const lines = await invoiceLines(manager, row.invoice_id);
  return {
    receiptNumber: row.receipt_number,
    buildingName: row.building_name,
    roomCode: row.room_code,
    period: row.period,
    invoiceCode: row.invoice_code,
    lines: lines.map((l) => ({ description: l.description, amount: l.amount })),
    amountDue: row.amount_due,
    amount: row.amount,
    // Tính đến lần nộp này (theo thứ tự ghi nhận)
    paidToDate: row.paid_to_date,
    balanceAfter: row.amount_due - row.paid_to_date,
    method: row.method,
    paidOn: row.paid_on,
    payerName: row.payer_name,
    recordedByName: row.recorded_by_name,
    status: row.status,
  };
}
