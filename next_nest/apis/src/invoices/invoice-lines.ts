import { EntityManager } from 'typeorm';
import { selectRows } from 'src/common/database/query.util';

type LineRow = {
  charge_type_id: string | null;
  description: string;
  calculation_method: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  previous_reading: number | null;
  current_reading: number | null;
  days_charged: number | null;
  days_in_period: number | null;
};

export async function invoiceLines(manager: EntityManager, invoiceId: string) {
  const rows = await selectRows<LineRow>(
    manager,
    `select charge_type_id, description, calculation_method, quantity, unit, unit_price, amount,
            previous_reading, current_reading, days_charged, days_in_period
       from public.invoice_lines where invoice_id = $1 order by sort_order`,
    [invoiceId],
  );
  return rows.map((l) => ({
    chargeTypeId: l.charge_type_id,
    description: l.description,
    calculationMethod: l.calculation_method,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unit_price,
    amount: l.amount,
    previousReading: l.previous_reading,
    currentReading: l.current_reading,
    daysCharged: l.days_charged,
    daysInPeriod: l.days_in_period,
  }));
}
