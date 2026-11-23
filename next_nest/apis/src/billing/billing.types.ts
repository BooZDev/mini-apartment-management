import { CalculationMethod } from 'src/charge-types/enums/calculation-method.enum';
import { MeterType } from 'src/contracts/enums/contract.enum';

export enum PreviewRoomStatus {
  READY = 'READY',
  SKIPPED = 'SKIPPED',
  ALREADY_ISSUED = 'ALREADY_ISSUED',
}

export enum SkipReason {
  MISSING_METER_READING = 'MISSING_METER_READING',
  MISSING_PRICE = 'MISSING_PRICE',
}

export type InvoiceLineDraft = {
  chargeTypeId: string | null;
  description: string;
  calculationMethod: CalculationMethod;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  previousReading: number | null;
  currentReading: number | null;
  daysCharged: number | null;
  daysInPeriod: number | null;
  // Đơn giá đã dùng, để đánh dấu is_used khi phát hành
  priceId: string | null;
};

/** Hợp đồng được lập hóa đơn trong kỳ. */
export type BillableContract = {
  id: string;
  room_id: string;
  room_code: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  primary_occupant_id: string;
  primary_name: string;
  tenant_user_id: string;
  initial_electricity_reading: number | null;
  initial_water_reading: number | null;
};

export type MissingData = { reasons: Set<SkipReason>; items: string[] };

export const METER_LABELS: Record<MeterType, string> = {
  [MeterType.ELECTRICITY]: 'điện',
  [MeterType.WATER]: 'nước',
};

/** Thứ tự dòng trên hóa đơn. */
export const METHOD_ORDER: Record<CalculationMethod, number> = {
  [CalculationMethod.CONTRACT_RENT]: 0,
  [CalculationMethod.METER]: 1,
  [CalculationMethod.PER_ROOM]: 2,
  [CalculationMethod.PER_PERSON]: 3,
  [CalculationMethod.PER_VEHICLE]: 4,
  [CalculationMethod.MANUAL]: 5,
};
