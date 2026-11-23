export enum CalculationMethod {
  CONTRACT_RENT = 'CONTRACT_RENT',
  METER = 'METER',
  PER_PERSON = 'PER_PERSON',
  PER_ROOM = 'PER_ROOM',
  PER_VEHICLE = 'PER_VEHICLE',
  MANUAL = 'MANUAL',
}

// Cách tính được chọn khi thêm khoản thu (CHG-02): Tiền phòng tạo sẵn, khoản phát sinh nhập ở BIL-06
export const CREATABLE_METHODS = [
  CalculationMethod.METER,
  CalculationMethod.PER_PERSON,
  CalculationMethod.PER_ROOM,
  CalculationMethod.PER_VEHICLE,
] as const;
