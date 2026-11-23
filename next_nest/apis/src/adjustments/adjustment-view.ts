import { toVnDateTime } from 'src/common/utils/date.util';

export type AdjustmentRow = {
  id: string;
  invoice_id: string;
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

export const ADJUSTMENT_SELECT = `
  select a.id, a.invoice_id, i.code as invoice_code, a.amount, a.reason, a.status,
         a.requested_by, ru.full_name as requested_by_name, a.requested_at,
         a.decided_by, du.full_name as decided_by_name, a.decided_at, a.decision_note
    from public.invoice_adjustments a
    join public.invoices i on i.id = a.invoice_id
    join public.users ru on ru.id = a.requested_by
    left join public.users du on du.id = a.decided_by`;

export function toAdjustment(r: AdjustmentRow) {
  return {
    id: r.id,
    invoiceId: r.invoice_id,
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
