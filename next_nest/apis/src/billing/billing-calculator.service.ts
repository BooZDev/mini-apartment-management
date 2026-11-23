import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CalculationMethod } from 'src/charge-types/enums/calculation-method.enum';
import { DetailCode } from 'src/common/constants/error-codes';
import { selectOne, selectRows } from 'src/common/database/query.util';
import { AppException, ErrorDetail } from 'src/common/exceptions/app.exception';
import {
  addPeriods,
  daysBetween,
  daysInPeriod,
  firstDayOf,
  lastDayOf,
  periodOf,
  periodsBetween,
} from 'src/common/utils/date.util';
import { MeterType } from 'src/contracts/enums/contract.enum';
import { lineAmount } from './billing-math';
import { BillableContract, InvoiceLineDraft, METER_LABELS, METHOD_ORDER, MissingData, SkipReason } from './billing.types';

type ApplicableCharge = {
  id: string;
  name: string;
  calculation_method: CalculationMethod;
  meter_type: MeterType | null;
  unit: string;
  service_quantity: number | null;
  price_id: string | null;
  unit_price: number | null;
};

type Days = { charged: number; inPeriod: number } | null;

export type FinalReading = { meterType: MeterType; reading: number };
export type ExtraChargeInput = { description: string; amount: number };

const BILLABLE_SELECT = `
  select c.id, c.room_id, r.code as room_code, c.start_date, c.end_date, c.monthly_rent, c.deposit,
         c.primary_occupant_id, o.full_name as primary_name, c.tenant_user_id,
         c.initial_electricity_reading, c.initial_water_reading
    from public.contracts c
    join public.rooms r on r.id = c.room_id
    join public.occupants o on o.id = c.primary_occupant_id`;

@Injectable()
export class BillingCalculatorService {
  /**
   * Phòng được lập hóa đơn trong kỳ (BIL-04 bước 1): hợp đồng chưa kết thúc, bắt đầu không sau
   * ngày cuối kỳ. Phòng có cả hợp đồng cũ chưa thanh lý và hợp đồng mới thì lấy hợp đồng mới.
   */
  billableContracts(manager: EntityManager, period: string, roomId?: string) {
    return selectRows<BillableContract>(
      manager,
      `select * from (
         select distinct on (c.room_id) x.*
           from (${BILLABLE_SELECT}) x
           join public.contracts c on c.id = x.id
          where c.ended_on is null and c.start_date <= $1::date ${roomId ? 'and c.room_id = $2' : ''}
          order by c.room_id, c.start_date desc
       ) b order by b.room_code`,
      roomId ? [lastDayOf(period), roomId] : [lastDayOf(period)],
    );
  }

  async contract(manager: EntityManager, contractId: string) {
    const row = await selectOne<BillableContract>(manager, `${BILLABLE_SELECT} where c.id = $1`, [contractId]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return row;
  }

  // BIL-04 bước 2 đến 7: dòng hóa đơn tháng của một hợp đồng
  async monthlyLines(manager: EntityManager, contract: BillableContract, period: string) {
    const missing: MissingData = { reasons: new Set(), items: [] };
    const firstDay = firstDayOf(period);
    // Ngày chốt: ngày muộn hơn giữa đầu tháng và ngày bắt đầu hợp đồng
    const cutoff = contract.start_date > firstDay ? contract.start_date : firstDay;
    // Tháng đầu của hợp đồng tính theo số ngày ở
    const days: Days =
      contract.start_date > firstDay
        ? { charged: daysBetween(contract.start_date, lastDayOf(period)), inPeriod: daysInPeriod(period) }
        : null;

    const charges = await this.applicableCharges(manager, contract.id, period, cutoff);
    const lines = await this.fixedLines(manager, contract, charges, cutoff, days, '', missing);

    const readings = await selectRows<{ meter_type: MeterType; previous_reading: number; current_reading: number }>(
      manager,
      `select meter_type, previous_reading, current_reading from public.meter_readings
        where room_id = $1 and period = $2`,
      [contract.room_id, period],
    );
    for (const charge of charges.filter((c) => c.calculation_method === CalculationMethod.METER)) {
      const reading = readings.find((r) => r.meter_type === charge.meter_type);
      if (!reading) {
        missing.reasons.add(SkipReason.MISSING_METER_READING);
        missing.items.push(`Chỉ số ${METER_LABELS[charge.meter_type as MeterType]}`);
        continue;
      }
      this.pushMeterLine(lines, charge, reading.previous_reading, reading.current_reading, missing);
    }

    const extras = await selectRows<{ description: string; amount: number }>(
      manager,
      `select e.description, e.amount from public.extra_charges e
         join public.billing_periods bp on bp.id = e.period_id
        where bp.period = $1 and e.room_id = $2 and e.contract_id = $3
        order by e.created_at, e.id`,
      [period, contract.room_id, contract.id],
    );
    lines.push(...extras.map((e) => manualLine(e.description, e.amount)));

    return { lines: sortLines(lines), missing };
  }

  /**
   * CTR-08 bước 1 đến 4: dòng hóa đơn thanh lý. Tiền phòng, khoản cố định tính cho khoảng chưa
   * có hóa đơn tháng; điện nước từ chỉ số đã lập hóa đơn gần nhất đến chỉ số trả phòng.
   */
  async settlementLines(
    manager: EntityManager,
    contract: BillableContract,
    input: { endedOn: string; finalReadings: FinalReading[]; extraCharges: ExtraChargeInput[]; cancelledBeforeStart: boolean },
  ) {
    const missing: MissingData = { reasons: new Set(), items: [] };
    const lines: InvoiceLineDraft[] = [];

    const last = await selectOne<{ period: string | null }>(
      manager,
      `select max(bp.period) as period from public.invoices i
         join public.billing_periods bp on bp.id = i.period_id
        where i.contract_id = $1 and i.invoice_type = 'MONTHLY'`,
      [contract.id],
    );
    const uncoveredFrom = last?.period ? firstDayOf(addPeriods(last.period, 1)) : contract.start_date;
    const hasRange = !input.cancelledBeforeStart && input.endedOn >= uncoveredFrom;

    if (hasRange) {
      const months = periodsBetween(periodOf(uncoveredFrom), periodOf(input.endedOn));
      for (const period of months) {
        const from = uncoveredFrom > firstDayOf(period) ? uncoveredFrom : firstDayOf(period);
        const to = input.endedOn < lastDayOf(period) ? input.endedOn : lastDayOf(period);
        const charged = daysBetween(from, to);
        const days: Days = charged === daysInPeriod(period) ? null : { charged, inPeriod: daysInPeriod(period) };
        const charges = await this.applicableCharges(manager, contract.id, period, from);
        const suffix = months.length > 1 ? ` (${period.slice(5)}/${period.slice(0, 4)})` : '';
        lines.push(...(await this.fixedLines(manager, contract, charges, from, days, suffix, missing)));
      }
    }

    if (!input.cancelledBeforeStart) {
      lines.push(...(await this.settlementMeterLines(manager, contract, input.endedOn, input.finalReadings, missing)));
    }
    lines.push(...input.extraCharges.map((e) => manualLine(e.description, e.amount)));

    if (missing.items.length > 0) {
      throw new AppException(
        'VALIDATION_ERROR',
        missing.items.map((item) => ({ field: 'endedOn', code: SkipReason.MISSING_PRICE, message: `Thiếu ${item.toLowerCase()}` })),
      );
    }
    return {
      uncoveredFrom: hasRange ? uncoveredFrom : null,
      uncoveredTo: hasRange ? input.endedOn : null,
      lines: sortLines(lines),
    };
  }

  /** Khoản thu áp cho hợp đồng trong kỳ: bắt buộc đang dùng, hoặc dịch vụ đăng ký của kỳ; đơn giá tại ngày chốt. */
  private applicableCharges(manager: EntityManager, contractId: string, period: string, priceDate: string) {
    return selectRows<ApplicableCharge>(
      manager,
      `select ct.id, ct.name, ct.calculation_method, ct.meter_type, ct.unit,
              cs.quantity as service_quantity, p.id as price_id, p.unit_price
         from public.charge_types ct
         left join lateral (
           select s.quantity from public.contract_services s
            where s.contract_id = $1 and s.charge_type_id = ct.id
              and s.from_period <= $2 and (s.to_period is null or s.to_period >= $2)
            limit 1
         ) cs on true
         left join lateral (
           select cp.id, cp.unit_price from public.charge_prices cp
            where cp.charge_type_id = ct.id and cp.effective_from <= $3::date
            order by cp.effective_from desc
            limit 1
         ) p on true
        where ct.is_active and ct.calculation_method not in ('CONTRACT_RENT', 'MANUAL')
          and (ct.is_mandatory or cs.quantity is not null)
        order by ct.meter_type nulls last, ct.name`,
      [contractId, period, priceDate],
    );
  }

  // Tiền phòng và khoản theo phòng, theo người, theo xe; tháng không trọn tính theo ngày
  private async fixedLines(
    manager: EntityManager,
    contract: BillableContract,
    charges: ApplicableCharge[],
    cutoff: string,
    days: Days,
    suffix: string,
    missing: MissingData,
  ) {
    const lines: InvoiceLineDraft[] = [];

    const rent = await selectOne<{ id: string; name: string; unit: string; rent: number }>(
      manager,
      `select ct.id, ct.name, ct.unit,
              coalesce((select cr.monthly_rent from public.contract_renewals cr
                         where cr.contract_id = $1 and cr.monthly_rent is not null and cr.effective_from <= $2::date
                         order by cr.effective_from desc limit 1), $3::bigint) as rent
         from public.charge_types ct where ct.calculation_method = 'CONTRACT_RENT'`,
      [contract.id, cutoff, contract.monthly_rent],
    );
    if (rent) lines.push(fixedLine(rent.id, rent.name + suffix, CalculationMethod.CONTRACT_RENT, 1, rent.unit, rent.rent, null, days));

    // Người vào ở sau ngày chốt tính từ kỳ sau; ngày rời đi không tính là còn ở
    const persons = await selectOne<{ n: number }>(
      manager,
      `select count(*) as n from public.contract_occupants
        where contract_id = $1 and move_in_date <= $2::date and (move_out_date is null or move_out_date > $2::date)`,
      [contract.id, cutoff],
    );

    for (const c of charges) {
      if (c.calculation_method === CalculationMethod.METER) continue;
      const quantity =
        c.calculation_method === CalculationMethod.PER_PERSON
          ? (persons?.n ?? 0)
          : c.calculation_method === CalculationMethod.PER_VEHICLE
            ? (c.service_quantity ?? 0)
            : 1;
      if (quantity === 0) continue;
      if (c.price_id === null || c.unit_price === null) {
        missing.reasons.add(SkipReason.MISSING_PRICE);
        missing.items.push(`Đơn giá ${c.name}`);
        continue;
      }
      lines.push(fixedLine(c.id, c.name + suffix, c.calculation_method, quantity, c.unit, c.unit_price, c.price_id, days));
    }
    return lines;
  }

  private async settlementMeterLines(
    manager: EntityManager,
    contract: BillableContract,
    endedOn: string,
    finalReadings: FinalReading[],
    missing: MissingData,
  ) {
    const lines: InvoiceLineDraft[] = [];
    const charges = (await this.applicableCharges(manager, contract.id, periodOf(endedOn), endedOn)).filter(
      (c) => c.calculation_method === CalculationMethod.METER,
    );
    const details: ErrorDetail[] = [];

    for (const charge of charges) {
      const type = charge.meter_type as MeterType;
      const final = finalReadings.find((r) => r.meterType === type);
      if (!final) {
        details.push({
          field: 'finalReadings',
          code: DetailCode.FINAL_READING_REQUIRED,
          message: `Thiếu chỉ số ${METER_LABELS[type]} trả phòng`,
          meterType: type,
        });
        continue;
      }

      const recorded = await selectRows<{ current_reading: number; is_locked: boolean }>(
        manager,
        `select current_reading, is_locked from public.meter_readings
          where room_id = $1 and meter_type = $2 and period between $3 and $4
          order by period desc`,
        [contract.room_id, type, periodOf(contract.start_date), periodOf(endedOn)],
      );
      // Chỉ số cũ: chỉ số mới của kỳ đã lập hóa đơn gần nhất, chưa có thì chỉ số bàn giao
      const billed = recorded.find((r) => r.is_locked)?.current_reading;
      const initial = type === MeterType.ELECTRICITY ? contract.initial_electricity_reading : contract.initial_water_reading;
      const previous = billed ?? initial;
      const latest = Math.max(recorded[0]?.current_reading ?? 0, previous ?? 0);

      if (previous === null) {
        details.push({
          field: 'finalReadings',
          code: DetailCode.PREVIOUS_READING_MISSING,
          message: `Hợp đồng chưa có chỉ số ${METER_LABELS[type]} bàn giao`,
          meterType: type,
        });
      } else if (final.reading < latest) {
        details.push({
          field: 'finalReadings',
          code: DetailCode.READING_DECREASED,
          message: `Chỉ số ${METER_LABELS[type]} trả phòng nhỏ hơn chỉ số gần nhất (${latest})`,
          meterType: type,
        });
      } else {
        this.pushMeterLine(lines, charge, previous, final.reading, missing);
      }
    }
    if (details.length > 0) throw new AppException('VALIDATION_ERROR', details);
    return lines;
  }

  private pushMeterLine(
    lines: InvoiceLineDraft[],
    charge: ApplicableCharge,
    previous: number,
    current: number,
    missing: MissingData,
  ) {
    if (charge.price_id === null || charge.unit_price === null) {
      missing.reasons.add(SkipReason.MISSING_PRICE);
      missing.items.push(`Đơn giá ${charge.name}`);
      return;
    }
    const quantity = current - previous;
    if (quantity === 0) return;
    lines.push({
      chargeTypeId: charge.id,
      description: charge.name,
      calculationMethod: CalculationMethod.METER,
      quantity,
      unit: charge.unit,
      unitPrice: charge.unit_price,
      amount: quantity * charge.unit_price,
      previousReading: previous,
      currentReading: current,
      daysCharged: null,
      daysInPeriod: null,
      priceId: charge.price_id,
    });
  }
}

function fixedLine(
  chargeTypeId: string,
  description: string,
  method: CalculationMethod,
  quantity: number,
  unit: string,
  unitPrice: number,
  priceId: string | null,
  days: Days,
): InvoiceLineDraft {
  return {
    chargeTypeId,
    description,
    calculationMethod: method,
    quantity,
    unit,
    unitPrice,
    amount: lineAmount(quantity, unitPrice, days?.charged ?? null, days?.inPeriod ?? null),
    previousReading: null,
    currentReading: null,
    daysCharged: days?.charged ?? null,
    daysInPeriod: days?.inPeriod ?? null,
    priceId,
  };
}

function manualLine(description: string, amount: number): InvoiceLineDraft {
  return {
    chargeTypeId: null,
    description,
    calculationMethod: CalculationMethod.MANUAL,
    quantity: 1,
    unit: 'khoản',
    unitPrice: amount,
    amount,
    previousReading: null,
    currentReading: null,
    daysCharged: null,
    daysInPeriod: null,
    priceId: null,
  };
}

function sortLines(lines: InvoiceLineDraft[]) {
  return lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => METHOD_ORDER[a.line.calculationMethod] - METHOD_ORDER[b.line.calculationMethod] || a.index - b.index)
    .map((x) => x.line);
}
