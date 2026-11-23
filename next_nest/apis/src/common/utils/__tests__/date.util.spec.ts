import {
  addDays,
  isValidDate,
  isValidPeriod,
  periodOf,
  previousPeriod,
  toVnDateTime,
  vnToday,
} from '../date.util';

describe('date.util', () => {
  it('hôm nay theo giờ Việt Nam: 17:30 UTC đã là ngày hôm sau', () => {
    expect(vnToday(new Date('2026-11-18T17:30:00Z'))).toBe('2026-11-19');
    expect(vnToday(new Date('2026-11-18T16:59:59Z'))).toBe('2026-11-18');
  });

  it('chỉ nhận ngày có thật dạng YYYY-MM-DD', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-2-3')).toBe(false);
    expect(isValidDate('2026-11-18T00:00:00Z')).toBe(false);
  });

  it('kỳ YYYY-MM', () => {
    expect(isValidPeriod('2026-11')).toBe(true);
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(periodOf('2026-11-18')).toBe('2026-11');
    expect(previousPeriod('2026-01')).toBe('2025-12');
  });

  it('cộng ngày qua tháng, qua năm', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', 30)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('datetime trả dạng +07:00', () => {
    expect(toVnDateTime(new Date('2026-11-01T01:30:00Z'))).toBe('2026-11-01T08:30:00.000+07:00');
    expect(toVnDateTime(null)).toBeNull();
  });
});
