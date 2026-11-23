import { lineAmount, roundTotal, totalsOf } from '../billing-math';

describe('billing-math', () => {
  it('tháng đầu tính theo ngày, làm tròn đến đồng (ví dụ P102 của đặc tả)', () => {
    expect(lineAmount(1, 3000000, 11, 30)).toBe(1100000);
    expect(lineAmount(1, 100000, 11, 30)).toBe(36667);
    expect(lineAmount(1, 30000, 11, 30)).toBe(11000);
  });

  it('thanh lý 10/30 ngày (ví dụ P105 của đặc tả)', () => {
    expect(lineAmount(1, 100000, 10, 30)).toBe(33333);
    expect(lineAmount(2, 30000, 10, 30)).toBe(20000);
  });

  it('không chia theo ngày thì bằng số lượng nhân đơn giá', () => {
    expect(lineAmount(150, 3456, null, null)).toBe(518400);
  });

  it('tổng làm tròn 1.000 đ, phần lẻ từ 500 đ làm tròn lên', () => {
    expect(roundTotal(3978400)).toBe(3978000);
    expect(roundTotal(1459466)).toBe(1459000);
    expect(roundTotal(1500)).toBe(2000);
    expect(roundTotal(1499)).toBe(1000);
    expect(totalsOf([{ amount: 1430027 }])).toEqual({ subtotal: 1430027, roundingAmount: -27, totalAmount: 1430000 });
  });
});
