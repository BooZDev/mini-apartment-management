import { EntityManager } from 'typeorm';
import { selectOne } from 'src/common/database/query.util';
import { totalsOf } from './billing-math';
import { InvoiceLineDraft } from './billing.types';

export type NewInvoice = {
  code: string;
  invoiceType: 'MONTHLY' | 'SETTLEMENT';
  periodId: string | null;
  roomId: string;
  contractId: string;
  primaryTenantName: string;
  billingDate: string;
  dueDate: string;
  lines: InvoiceLineDraft[];
  issuedBy: string;
};

/**
 * Phát hành hóa đơn: chụp lại các dòng, đánh dấu đơn giá đã dùng. Số phải trả, còn nợ,
 * trạng thái do trigger của CSDL tính, không ghi ở đây.
 */
export async function insertInvoice(manager: EntityManager, invoice: NewInvoice) {
  const { subtotal, roundingAmount, totalAmount } = totalsOf(invoice.lines);
  const row = await selectOne<{ id: string }>(
    manager,
    `insert into public.invoices
       (code, invoice_type, period_id, room_id, contract_id, primary_tenant_name, billing_date, due_date,
        subtotal, rounding_amount, total_amount, issued_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning id`,
    [
      invoice.code,
      invoice.invoiceType,
      invoice.periodId,
      invoice.roomId,
      invoice.contractId,
      invoice.primaryTenantName,
      invoice.billingDate,
      invoice.dueDate,
      subtotal,
      roundingAmount,
      totalAmount,
      invoice.issuedBy,
    ],
  );
  if (!row) throw new Error('Không tạo được hóa đơn');

  for (const [index, line] of invoice.lines.entries()) {
    await manager.query(
      `insert into public.invoice_lines
         (invoice_id, charge_type_id, description, calculation_method, quantity, unit, unit_price, amount,
          previous_reading, current_reading, days_charged, days_in_period, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        row.id,
        line.chargeTypeId,
        line.description.slice(0, 150),
        line.calculationMethod,
        line.quantity,
        line.unit,
        line.unitPrice,
        line.amount,
        line.previousReading,
        line.currentReading,
        line.daysCharged,
        line.daysInPeriod,
        index,
      ],
    );
  }

  const priceIds = invoice.lines.map((l) => l.priceId).filter((id): id is string => id !== null);
  if (priceIds.length > 0) {
    await manager.query(`update public.charge_prices set is_used = true where id = any($1::uuid[]) and not is_used`, [
      priceIds,
    ]);
  }
  return { id: row.id, totalAmount };
}

/** Dòng hóa đơn trả cho API (bỏ trường nội bộ). */
export function toLineResponse(line: InvoiceLineDraft) {
  return {
    chargeTypeId: line.chargeTypeId,
    description: line.description,
    calculationMethod: line.calculationMethod,
    quantity: line.quantity,
    unit: line.unit,
    unitPrice: line.unitPrice,
    amount: line.amount,
    previousReading: line.previousReading,
    currentReading: line.currentReading,
    daysCharged: line.daysCharged,
    daysInPeriod: line.daysInPeriod,
  };
}
