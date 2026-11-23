// Ngày nghiệp vụ theo giờ Việt Nam (UTC+7); ngày luôn là chuỗi YYYY-MM-DD, tính theo UTC

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function vnToday(now: Date = new Date()): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isValidPeriod(value: string): boolean {
  return PERIOD_RE.test(value);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Số ngày từ `from` đến `to`, tính cả hai đầu. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Kỳ YYYY-MM chứa ngày. */
export function periodOf(date: string): string {
  return date.slice(0, 7);
}

export function addPeriods(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

export function previousPeriod(period: string): string {
  return addPeriods(period, -1);
}

export function firstDayOf(period: string): string {
  return `${period}-01`;
}

export function lastDayOf(period: string): string {
  return addDays(firstDayOf(addPeriods(period, 1)), -1);
}

export function daysInPeriod(period: string): number {
  return Number(lastDayOf(period).slice(8));
}

/** Các kỳ từ `from` đến `to`, tính cả hai đầu. */
export function periodsBetween(from: string, to: string): string[] {
  const result: string[] = [];
  for (let p = from; p <= to; p = addPeriods(p, 1)) result.push(p);
  return result;
}

/** Datetime ISO 8601 có múi giờ +07:00. */
export function toVnDateTime(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getTime() + VN_OFFSET_MS).toISOString().replace('Z', '+07:00');
}

/** 00:00 của một ngày VN, để lọc cột timestamptz theo ngày. */
export function vnStartOfDay(date: string): Date {
  return new Date(`${date}T00:00:00+07:00`);
}

/** YYYYMMDD cho tên file, mã hóa đơn. */
export function compactDate(date: string): string {
  return date.replaceAll('-', '');
}
