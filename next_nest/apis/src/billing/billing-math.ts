// Phép tính tiền bằng số nguyên để khớp đúng ràng buộc của CSDL (round nửa lên)

/** quantity × unitPrice × daysCharged ÷ daysInPeriod, làm tròn đến đồng. */
export function lineAmount(quantity: number, unitPrice: number, daysCharged: number | null, daysInPeriod: number | null) {
  if (daysCharged === null || daysInPeriod === null) return quantity * unitPrice;
  const numerator = quantity * unitPrice * daysCharged;
  return Math.floor((2 * numerator + daysInPeriod) / (2 * daysInPeriod));
}

/** Tổng hóa đơn làm tròn đến 1.000 đ, phần lẻ từ 500 đ làm tròn lên. */
export function roundTotal(subtotal: number) {
  return Math.floor((subtotal + 500) / 1000) * 1000;
}

export function totalsOf(lines: { amount: number }[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const totalAmount = roundTotal(subtotal);
  return { subtotal, roundingAmount: totalAmount - subtotal, totalAmount };
}
