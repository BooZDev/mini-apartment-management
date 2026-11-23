// Kiểm thử đầu cuối phần chỉ số, hóa đơn, thanh toán, điều chỉnh, báo cáo, cổng người thuê, yêu cầu, thanh lý.
// Chạy sau api.e2e.mjs trên cùng CSDL (dùng bảng giá, thiết lập lịch thu do kịch bản đó tạo).
import { addDays, addMonths, check, Client, code, finish, hasDetail, TODAY } from './e2e-client.mjs';

const CUR = TODAY.slice(0, 7);
const CUR_START = `${CUR}-01`;
const PREV_START = addMonths(CUR_START, -1);
const PREV = PREV_START.slice(0, 7);
const NEXT_START = addMonths(CUR_START, 1);
const lastDay = (start) => addDays(addMonths(start, 1), -1);
const dim = (start) => Number(lastDay(start).slice(8));
const prorate = (q, price, dc, days) => Math.floor((2 * q * price * dc + days) / (2 * days));
const roundTotal = (s) => Math.floor((s + 500) / 1000) * 1000;
const key = () => crypto.randomUUID();

const person = (fullName, idNumber, extra = {}) => ({
  fullName,
  dateOfBirth: '1995-01-01',
  hometown: 'Hà Nội',
  idNumber,
  ...extra,
});

async function main() {
  const manager = new Client('manager');
  const owner = new Client('owner');
  const accountant = new Client('accountant');
  const dual = new Client('dual');
  await manager.login('quanly01', 'Abc@12345');
  await owner.login('chunha01', 'Abc@12345');
  await accountant.login('ketoan01', 'Abc@12345');
  let r = await dual.login('ketoan02', 'MatKhau2026');
  check('Đăng nhập ketoan02 (ACCOUNTANT + MANAGER)', r.status === 200, r.body);

  console.log('== Dữ liệu nền');
  const types = (await owner.get('/charge-types')).body.data;
  const wifi = types.find((t) => t.name === 'Wifi').id;
  const bike = types.find((t) => t.calculationMethod === 'PER_VEHICLE').id;
  const room = async (code) => (await manager.post('/rooms', { code, floor: 1, areaM2: 20, listedPrice: 3000000 })).body.data.id;
  const b101 = await room('B101');
  const b102 = await room('B102');
  const b103 = await room('B103');
  const readings = (e, w) => [{ meterType: 'ELECTRICITY', reading: e }, { meterType: 'WATER', reading: w }];
  const contract = (roomId, startDate, primary, extra) => ({
    roomId,
    signedOn: addDays(PREV_START, -5),
    startDate,
    endDate: addDays(addMonths(startDate, 12), -1),
    monthlyRent: 3000000,
    deposit: 3000000,
    primaryTenant: primary,
    ...extra,
  });
  r = await manager.post('/contracts', contract(b101, PREV_START, person('Hoàng Văn K', '079000000011'), {
    initialReadings: readings(1200, 40),
    additionalOccupants: [person('Lý Thị M', '079000000012', { relationshipToPrimary: 'Vợ' })],
    services: [{ chargeTypeId: wifi, quantity: 1 }, { chargeTypeId: bike, quantity: 1 }],
    tenantUsername: 'b101.tenant',
  }));
  check('Hợp đồng B101 bắt đầu đầu tháng trước', r.status === 201, r.body);
  const k1 = r.body.data.contract;
  const k1Temp = r.body.data.tenantAccount.temporaryPassword;
  const k2Start = `${PREV}-20`;
  r = await manager.post('/contracts', contract(b102, k2Start, person('Đinh Văn N', '079000000021'), {
    initialReadings: readings(500, 30),
    tenantUsername: 'b102.tenant',
  }));
  const k2 = r.body.data.contract;

  console.log('== BIL-02, BIL-08 Lên lịch kỳ thu');
  r = await manager.post('/billing-periods', { period: PREV });
  check('BIL-02 MANAGER: 403', r.status === 403, r.body);
  r = await accountant.post('/billing-periods', { period: PREV, billingDate: `${PREV}-10`, dueDate: `${PREV}-05` });
  check('BIL-02 hạn trước ngày thu: 400 DUE_BEFORE_BILLING', r.status === 400 && hasDetail(r, 'dueDate', 'DUE_BEFORE_BILLING'), r.body);
  r = await accountant.post('/billing-periods', { period: PREV });
  check('BIL-02 mặc định theo thiết lập (ngày 5, +7 ngày)', r.status === 201 && r.body.data.billingDate === `${PREV}-05` && r.body.data.dueDate === `${PREV}-12`, r.body);
  const periodId = r.body.data.id;
  r = await accountant.post('/billing-periods', { period: PREV });
  check('BIL-02 trùng kỳ: 409 PERIOD_ALREADY_EXISTS', r.status === 409 && code(r) === 'PERIOD_ALREADY_EXISTS', r.body);
  r = await accountant.patch(`/billing-periods/${periodId}`, { dueDate: addDays(TODAY, 20) });
  check('BIL-08 sửa hạn thanh toán', r.status === 200 && r.body.data.dueDate === addDays(TODAY, 20) && r.body.data.eligibleRoomCount >= 2, r.body);
  r = await owner.get('/billing-periods');
  check('BIL-01 danh sách kỳ', r.status === 200 && r.body.data[0].period >= PREV, r.body);

  console.log('== MTR Chỉ số');
  r = await manager.get(`/meter-readings?period=${PREV}`);
  const rowsB101 = r.body.data.filter((x) => x.roomCode === 'B101');
  check('MTR-01 kỳ đầu của hợp đồng: chỉ số cũ là chỉ số bàn giao', r.status === 200 && rowsB101.length === 2 && rowsB101.find((x) => x.meterType === 'ELECTRICITY').previousReading === 1200 && rowsB101.every((x) => x.currentReading === null), r.body);
  r = await manager.put('/meter-readings', { period: CUR, items: [{ roomId: b101, meterType: 'ELECTRICITY', currentReading: 1300 }] });
  check('MTR-02 kỳ chưa lên lịch: 404 PERIOD_NOT_FOUND', r.status === 404 && code(r) === 'PERIOD_NOT_FOUND', r.body);
  r = await manager.put('/meter-readings', { period: PREV, items: [{ roomId: b103, meterType: 'ELECTRICITY', currentReading: 10 }] });
  check('MTR-02 phòng không có hợp đồng: 409 ROOM_NOT_OCCUPIED', r.status === 409 && code(r) === 'ROOM_NOT_OCCUPIED', r.body);
  r = await manager.put('/meter-readings', {
    period: PREV,
    items: [
      { roomId: b101, meterType: 'ELECTRICITY', currentReading: 1350 },
      { roomId: b101, meterType: 'WATER', currentReading: 39 },
    ],
  });
  check('MTR-02 chỉ số giảm: 400 READING_DECREASED, không lưu dòng nào', r.status === 400 && hasDetail(r, 'items[1].currentReading', 'READING_DECREASED'), r.body);
  r = await manager.get(`/meter-readings?period=${PREV}&missingOnly=true`);
  check('Không dòng nào được lưu khi có lỗi', r.body.data.filter((x) => x.roomCode === 'B101').length === 2, r.body);
  r = await manager.put('/meter-readings', {
    period: PREV,
    items: [
      { roomId: b101, meterType: 'ELECTRICITY', currentReading: 1350 },
      { roomId: b101, meterType: 'WATER', currentReading: 48 },
    ],
  });
  check('MTR-02 ghi chỉ số B101', r.status === 200 && r.body.data.length === 2 && r.body.data.find((x) => x.meterType === 'ELECTRICITY').consumption === 150, r.body);

  console.log('== BIL-06, BIL-04 Khoản phát sinh, xem trước');
  r = await manager.post(`/billing-periods/${periodId}/extra-charges`, { roomId: b103, description: 'Sửa khóa', amount: 50000 });
  check('BIL-06 phòng không có hợp đồng: 409 ROOM_NOT_OCCUPIED', r.status === 409 && code(r) === 'ROOM_NOT_OCCUPIED', r.body);
  r = await manager.post(`/billing-periods/${periodId}/extra-charges`, { roomId: b101, description: 'Sửa vòi nước', amount: 150000 });
  check('BIL-06 thêm khoản phát sinh', r.status === 201 && r.body.data.amount === 150000, r.body);
  r = await manager.post(`/billing-periods/${periodId}/extra-charges`, { roomId: b101, description: 'Nhầm', amount: 1 });
  r = await manager.del(`/billing-periods/${periodId}/extra-charges/${r.body.data.id}`);
  check('BIL-07 xóa khoản phát sinh chưa phát hành: 204', r.status === 204, r.body);

  r = await manager.get(`/billing-periods/${periodId}/preview`);
  const pB101 = r.body.data.rooms.find((x) => x.roomCode === 'B101');
  const pB102 = r.body.data.rooms.find((x) => x.roomCode === 'B102');
  check('BIL-04 B102 thiếu chỉ số: SKIPPED MISSING_METER_READING', pB102?.status === 'SKIPPED' && pB102.skipReasons.includes('MISSING_METER_READING') && pB102.missingItems.includes('Chỉ số điện'), pB102);
  const expectB101 = 3000000 + 150 * 3456 + 8 * 25000 + 100000 + 2 * 30000 + 100000 + 150000;
  check('BIL-04 B101 READY, đủ 7 dòng, tổng làm tròn 1.000 đ', pB101?.status === 'READY' && pB101.lines.length === 7 && pB101.subtotal === expectB101 && pB101.totalAmount === roundTotal(expectB101), pB101);
  check('BIL-04 thứ tự dòng: tiền phòng, điện, nước, wifi, vệ sinh, xe, phát sinh', pB101?.lines.map((l) => l.calculationMethod).join() === 'CONTRACT_RENT,METER,METER,PER_ROOM,PER_PERSON,PER_VEHICLE,MANUAL', pB101?.lines);

  await manager.put('/meter-readings', {
    period: PREV,
    items: [
      { roomId: b102, meterType: 'ELECTRICITY', currentReading: 560 },
      { roomId: b102, meterType: 'WATER', currentReading: 33 },
    ],
  });
  r = await manager.get(`/billing-periods/${periodId}/preview`);
  const p2 = r.body.data.rooms.find((x) => x.roomCode === 'B102');
  const dc = dim(PREV_START) - 20 + 1;
  const expectB102 = prorate(1, 3000000, dc, dim(PREV_START)) + 60 * 3456 + 3 * 25000 + prorate(1, 30000, dc, dim(PREV_START));
  check('BIL-04 tháng đầu của hợp đồng tính theo ngày (tiền phòng, vệ sinh), điện nước không chia', p2?.status === 'READY' && p2.subtotal === expectB102 && p2.lines[0].daysCharged === dc && p2.lines[0].daysInPeriod === dim(PREV_START) && p2.lines[1].daysCharged === null, p2);

  console.log('== BIL-05 Phát hành');
  const issueKey = key();
  r = await manager.post(`/billing-periods/${periodId}/issue`, {}, { 'Idempotency-Key': issueKey });
  const issued = r.body?.data?.issued ?? [];
  check('BIL-05 phát hành B101, B102', r.status === 200 && ['B101', 'B102'].every((c) => issued.some((i) => i.roomCode === c)), r.body);
  const inv1 = issued.find((i) => i.roomCode === 'B101');
  const inv2 = issued.find((i) => i.roomCode === 'B102');
  check('Mã hóa đơn HD-YYYYMM-<phòng>, UNPAID', inv1?.code === `HD-${PREV.replace('-', '')}-B101` && inv1.status === 'UNPAID' && inv1.totalAmount === roundTotal(expectB101), inv1);
  r = await manager.post(`/billing-periods/${periodId}/issue`, {}, { 'Idempotency-Key': issueKey });
  check('BIL-05 gửi lặp cùng khóa: trả lại kết quả cũ', r.status === 200 && r.body.data.issued.length === issued.length, r.body);
  r = await manager.post(`/billing-periods/${periodId}/issue`, { roomIds: [b101] });
  check('BIL-05 phát hành lại: skipped ALREADY_ISSUED', r.status === 200 && r.body.data.issued.length === 0 && r.body.data.skipped[0]?.reason === 'ALREADY_ISSUED', r.body);
  r = await manager.put('/meter-readings', { period: PREV, items: [{ roomId: b101, meterType: 'ELECTRICITY', currentReading: 1360 }] });
  check('MTR-02 sau phát hành: 409 METER_READING_LOCKED', r.status === 409 && code(r) === 'METER_READING_LOCKED', r.body);
  r = await manager.post(`/billing-periods/${periodId}/extra-charges`, { roomId: b101, description: 'Muộn', amount: 1000 });
  check('BIL-06 sau phát hành: 409 PERIOD_ALREADY_ISSUED', r.status === 409 && code(r) === 'PERIOD_ALREADY_ISSUED', r.body);
  r = await accountant.patch(`/billing-periods/${periodId}`, { dueDate: addDays(TODAY, 30) });
  check('BIL-08 sau phát hành: 409 PERIOD_ALREADY_ISSUED', r.status === 409 && code(r) === 'PERIOD_ALREADY_ISSUED', r.body);
  r = await owner.get(`/charge-types/${types.find((t) => t.meterType === 'ELECTRICITY').id}/prices`);
  check('Đơn giá đã dùng được đánh dấu isUsed', r.body.data.some((p) => p.isUsed), r.body);

  console.log('== INV Hóa đơn');
  r = await accountant.get(`/invoices?period=${PREV}&status=UNPAID`);
  check('INV-01 lọc kỳ, trạng thái', r.status === 200 && r.body.data.length >= 2, r.body);
  r = await owner.get(`/invoices/${inv1.id}`);
  check('INV-02 chi tiết có dòng đã chụp, chỉ số cũ mới', r.status === 200 && r.body.data.lines.length === 7 && r.body.data.lines[1].previousReading === 1200 && r.body.data.lines[1].currentReading === 1350, r.body);

  console.log('== PAY Thanh toán');
  const payBody = { invoiceId: inv1.id, amount: 2000000, method: 'CASH', payerOccupantId: k1.primaryTenant.occupantId, paidOn: TODAY };
  r = await accountant.post('/payments', payBody);
  check('PAY-01 thiếu Idempotency-Key: 400 IDEMPOTENCY_KEY_REQUIRED', r.status === 400 && code(r) === 'IDEMPOTENCY_KEY_REQUIRED', r.body);
  r = await accountant.post('/payments', { invoiceId: inv1.id, amount: 1, method: 'CASH', paidOn: TODAY }, { 'Idempotency-Key': key() });
  check('PAY-01 thiếu người nộp: "Vui lòng nhập khoản nộp hợp lí!"', r.status === 400 && r.body.error.message === 'Vui lòng nhập khoản nộp hợp lí!', r.body);
  r = await accountant.post('/payments', { ...payBody, invoiceId: undefined }, { 'Idempotency-Key': key() });
  check('PAY-01 thiếu hóa đơn: "Vui lòng nhập khoản nộp hợp lí!"', r.status === 400 && r.body.error.message === 'Vui lòng nhập khoản nộp hợp lí!', r.body);
  r = await accountant.post('/payments', { ...payBody, paidOn: addDays(TODAY, 1) }, { 'Idempotency-Key': key() });
  check('PAY-01 ngày nộp sau hôm nay: DATE_IN_FUTURE', r.status === 400 && hasDetail(r, 'paidOn', 'DATE_IN_FUTURE'), r.body);
  r = await accountant.post('/payments', { ...payBody, amount: 99999999 }, { 'Idempotency-Key': key() });
  check('PAY-01 vượt số còn nợ: 409 AMOUNT_EXCEEDS_BALANCE kèm số còn nợ', r.status === 409 && code(r) === 'AMOUNT_EXCEEDS_BALANCE' && r.body.error.details[0].balance === inv1.totalAmount, r.body);
  r = await accountant.post('/payments', { ...payBody, payerOccupantId: k2.primaryTenant.occupantId }, { 'Idempotency-Key': key() });
  check('PAY-01 người nộp không thuộc phòng: 400', r.status === 400 && hasDetail(r, 'payerOccupantId'), r.body);
  r = await manager.post('/payments', payBody, { 'Idempotency-Key': key() });
  check('PAY-01 MANAGER: 403', r.status === 403, r.body);
  const payKey = key();
  r = await accountant.post('/payments', payBody, { 'Idempotency-Key': payKey });
  check('PAY-01 nộp một phần: 201 PARTIALLY_PAID', r.status === 201 && r.body.data.invoice.status === 'PARTIALLY_PAID' && r.body.data.invoice.balance === inv1.totalAmount - 2000000, r.body);
  const pay1 = r.body.data.payment;
  check('Số biên lai BL-YYYYMM-0001', /^BL-\d{6}-0001$/.test(pay1.receiptNumber) && pay1.payer.name === 'Hoàng Văn K', pay1);
  r = await accountant.post('/payments', payBody, { 'Idempotency-Key': payKey });
  check('PAY-01 gửi lặp: trả lại đúng thanh toán cũ', r.status === 201 && r.body.data.payment.id === pay1.id, r.body);
  r = await accountant.post('/payments', { ...payBody, amount: 1000 }, { 'Idempotency-Key': payKey });
  check('PAY-01 cùng khóa khác nội dung: 409 IDEMPOTENCY_KEY_REUSED', r.status === 409 && code(r) === 'IDEMPOTENCY_KEY_REUSED', r.body);
  r = await accountant.post('/payments', { invoiceId: inv1.id, amount: inv1.totalAmount - 2000000, method: 'BANK_TRANSFER', referenceCode: 'FT123', payerName: 'Người khác', paidOn: TODAY }, { 'Idempotency-Key': key() });
  check('PAY-01 trả nốt: PAID', r.status === 201 && r.body.data.invoice.status === 'PAID' && r.body.data.invoice.balance === 0, r.body);
  const pay2 = r.body.data.payment;
  r = await accountant.post('/payments', { ...payBody, amount: 1000 }, { 'Idempotency-Key': key() });
  check('PAY-01 hóa đơn đã trả đủ: 409 INVOICE_ALREADY_PAID', r.status === 409 && code(r) === 'INVOICE_ALREADY_PAID', r.body);
  r = await manager.get(`/payments/${pay2.id}/receipt`);
  check('PAY-04 biên lai: đã trả tính đến lần này, còn nợ sau', r.status === 200 && r.body.data.paidToDate === inv1.totalAmount && r.body.data.balanceAfter === 0 && r.body.data.buildingName === 'BlueMoon', r.body);
  r = await owner.get(`/payments?invoiceId=${inv1.id}`);
  check('PAY-02 danh sách theo hóa đơn', r.status === 200 && r.body.data.length === 2, r.body);

  console.log('== ADJ Phiếu điều chỉnh');
  r = await accountant.post(`/invoices/${inv1.id}/adjustments`, { amount: -100000, reason: 'Giảm do mất nước' });
  check('ADJ-01 làm số phải trả nhỏ hơn đã trả: 409 ADJUSTMENT_BELOW_PAID', r.status === 409 && code(r) === 'ADJUSTMENT_BELOW_PAID', r.body);
  r = await accountant.post(`/invoices/${inv2.id}/adjustments`, { amount: -200000, reason: 'Ab' });
  check('ADJ-01 lý do dưới 5 ký tự: 400', r.status === 400 && hasDetail(r, 'reason'), r.body);
  r = await accountant.post(`/invoices/${inv2.id}/adjustments`, { amount: -200000, reason: 'Giảm do mất điện 3 ngày' });
  check('ADJ-01 lập phiếu: PENDING, chưa ảnh hưởng số còn nợ', r.status === 201 && r.body.data.status === 'PENDING', r.body);
  const adj1 = r.body.data;
  r = await accountant.get(`/invoices/${inv2.id}`);
  check('Số phải trả chưa đổi', r.body.data.amountDue === inv2.totalAmount, r.body);
  r = await accountant.post(`/adjustments/${adj1.id}/approve`);
  check('ADJ-03 ACCOUNTANT duyệt: 403', r.status === 403, r.body);
  r = await manager.post(`/adjustments/${adj1.id}/approve`, { note: 'Đồng ý' });
  check('ADJ-03 duyệt: APPROVED, số phải trả giảm ngay', r.status === 200 && r.body.data.status === 'APPROVED', r.body);
  r = await accountant.get(`/invoices/${inv2.id}`);
  check('Hóa đơn tính lại: adjustmentTotal -200.000', r.body.data.adjustmentTotal === -200000 && r.body.data.amountDue === inv2.totalAmount - 200000 && r.body.data.balance === inv2.totalAmount - 200000, r.body);
  r = await manager.post(`/adjustments/${adj1.id}/reject`, { note: 'x' });
  check('ADJ-04 phiếu đã xử lý: 409 REQUEST_ALREADY_PROCESSED', r.status === 409 && code(r) === 'REQUEST_ALREADY_PROCESSED', r.body);
  r = await dual.post(`/invoices/${inv2.id}/adjustments`, { amount: 50000, reason: 'Thu thêm phí vệ sinh' });
  const adj2 = r.body.data;
  r = await dual.post(`/adjustments/${adj2.id}/approve`);
  check('ADJ-03 tự duyệt phiếu mình lập: 403 SELF_APPROVAL_NOT_ALLOWED', r.status === 403 && code(r) === 'SELF_APPROVAL_NOT_ALLOWED', r.body);
  r = await owner.post(`/adjustments/${adj2.id}/reject`, {});
  check('ADJ-04 từ chối thiếu lý do: 400', r.status === 400 && hasDetail(r, 'note', 'REQUIRED'), r.body);
  r = await owner.post(`/adjustments/${adj2.id}/reject`, { note: 'Không có căn cứ' });
  check('ADJ-04 từ chối: REJECTED', r.status === 200 && r.body.data.status === 'REJECTED', r.body);
  r = await owner.get(`/adjustments?invoiceId=${inv2.id}`);
  check('ADJ-02 danh sách theo hóa đơn', r.status === 200 && r.body.data.length === 2, r.body);

  console.log('== PAY-05..08 Hủy thanh toán');
  r = await accountant.post(`/payments/${pay1.id}/cancellation-requests`, { reason: 'Ghi nhầm hóa đơn' });
  check('PAY-05 yêu cầu hủy: PENDING, thanh toán chờ hủy vẫn được tính', r.status === 201 && r.body.data.status === 'PENDING', r.body);
  const cr1 = r.body.data;
  r = await accountant.get(`/invoices/${inv1.id}`);
  check('Hóa đơn vẫn PAID khi đang chờ hủy', r.body.data.status === 'PAID' && r.body.data.payments.find((p) => p.id === pay1.id).status === 'PENDING_CANCELLATION', r.body);
  r = await accountant.post(`/payments/${pay1.id}/cancellation-requests`, { reason: 'Gửi lại lần nữa' });
  check('PAY-05 đang chờ hủy: 409 CANCELLATION_ALREADY_PENDING', r.status === 409 && code(r) === 'CANCELLATION_ALREADY_PENDING', r.body);
  r = await manager.post(`/cancellation-requests/${cr1.id}/approve`);
  check('PAY-07 duyệt hủy', r.status === 200 && r.body.data.status === 'APPROVED', r.body);
  r = await accountant.get(`/invoices/${inv1.id}`);
  check('Hóa đơn tính lại: còn nợ 2.000.000, PARTIALLY_PAID', r.body.data.balance === 2000000 && r.body.data.status === 'PARTIALLY_PAID', r.body);
  r = await accountant.post(`/payments/${pay1.id}/cancellation-requests`, { reason: 'Hủy lần nữa' });
  check('PAY-05 thanh toán đã hủy: 409 PAYMENT_ALREADY_CANCELLED', r.status === 409 && code(r) === 'PAYMENT_ALREADY_CANCELLED', r.body);
  r = await accountant.post(`/payments/${pay2.id}/cancellation-requests`, { reason: 'Thử từ chối' });
  r = await owner.post(`/cancellation-requests/${r.body.data.id}/reject`, { note: 'Thanh toán đúng' });
  check('PAY-08 từ chối hủy: thanh toán trở về VALID', r.status === 200 && r.body.data.status === 'REJECTED', r.body);
  r = await accountant.get(`/payments/${pay2.id}`);
  check('Thanh toán VALID', r.body.data.status === 'VALID', r.body);
  r = await owner.get('/cancellation-requests?status=APPROVED');
  check('PAY-06 danh sách yêu cầu hủy', r.status === 200 && r.body.data.some((c) => c.id === cr1.id), r.body);

  console.log('== EXP, RPT Báo cáo');
  r = await owner.post('/expense-categories', { name: 'Sửa chữa' });
  const cat = r.body.data;
  r = await owner.post('/expense-categories', { name: 'sửa chữa' });
  check('EXP-02 trùng tên loại chi: 409 CATEGORY_NAME_TAKEN', r.status === 409 && code(r) === 'CATEGORY_NAME_TAKEN', r.body);
  r = await accountant.post('/expenses', { spentOn: TODAY, categoryId: cat.id, amount: 500000, description: 'Thay bóng đèn' });
  check('EXP-04 ghi khoản chi', r.status === 201 && r.body.data.categoryName === 'Sửa chữa', r.body);
  r = await accountant.get(`/expenses?fromDate=${CUR_START}`);
  check('EXP-03 danh sách khoản chi', r.status === 200 && r.body.data.length === 1, r.body);
  r = await accountant.get('/reports/debts');
  const debtK1 = r.body.data.find((d) => d.contractId === k1.id);
  check('RPT-01 công nợ theo hợp đồng, có meta.totals', r.status === 200 && debtK1?.totalBalance === 2000000 && r.body.meta.totals.rowCount >= 2, r.body);
  r = await owner.get(`/reports/revenue?fromMonth=${PREV}&toMonth=${CUR}`);
  const curRev = r.body.data.find((m) => m.month === CUR);
  check('RPT-02 doanh thu là tiền thực thu; thanh toán hủy chỉ đối chiếu', r.status === 200 && r.body.data.length === 2 && curRev.totalCollected === pay2.amount && curRev.cancelledAmount === 2000000 && curRev.bankTransferAmount === pay2.amount, r.body);
  r = await owner.get(`/reports/revenue?fromMonth=${addMonths(CUR_START, -13).slice(0, 7)}&toMonth=${CUR}`);
  check('RPT-02 quá 12 tháng: 400', r.status === 400, r.body);
  r = await owner.get(`/reports/profit?fromMonth=${CUR}&toMonth=${CUR}`);
  check('RPT-03 lợi nhuận = doanh thu - chi', r.status === 200 && r.body.data[0].expenses === 500000 && r.body.data[0].profit === pay2.amount - 500000, r.body);
  r = await manager.get('/reports/occupancy');
  check('RPT-04 lấp đầy', r.status === 200 && r.body.data.occupiedRooms >= 2 && r.body.data.occupancyRate > 0, r.body);
  r = await accountant.get('/reports/debts/export');
  check('RPT-05 xuất công nợ: file xlsx', r.status === 200 && r.headers.get('content-type').includes('spreadsheetml') && r.buffer.subarray(0, 2).toString() === 'PK' && /bao-cao-debts-\d{8}\.xlsx/.test(r.headers.get('content-disposition')), Object.fromEntries(r.headers));
  r = await accountant.get(`/reports/revenue/export?fromMonth=${CUR}&toMonth=${CUR}`);
  check('RPT-05 ACCOUNTANT xuất doanh thu: 403', r.status === 403, r.body);
  r = await owner.get('/reports/revenue/export');
  check('RPT-05 thiếu tham số: 400', r.status === 400, r.body);
  r = await manager.get('/occupants/export');
  check('OCC-06 xuất danh sách người ở', r.status === 200 && r.buffer.subarray(0, 2).toString() === 'PK', r.status);
  r = await owner.get('/audit-logs?action=PERSONAL_DATA_EXPORTED');
  check('OCC-06 ghi nhật ký PERSONAL_DATA_EXPORTED', r.body.data.length === 1, r.body);

  console.log('== SRCH Tìm kiếm');
  r = await manager.get('/search?q=hoang van');
  check('SRCH-01 không dấu, MANAGER thấy SĐT', r.status === 200 && r.body.data.occupants.some((o) => o.fullName === 'Hoàng Văn K' && 'phone' in o), r.body);
  r = await accountant.get('/search?q=b101&types=rooms,invoices');
  check('SRCH-01 ACCOUNTANT: phòng, hóa đơn; không có nhóm người ở', r.status === 200 && r.body.data.rooms[0]?.code === 'B101' && r.body.data.invoices.length >= 1 && !('occupants' in r.body.data), r.body);
  r = await accountant.get('/search?q=a');
  check('SRCH-01 từ khóa dưới 2 ký tự: 400', r.status === 400, r.body);

  console.log('== TEN Cổng người thuê');
  const tenant = new Client('tenant-b101');
  await tenant.login('b101.tenant', k1Temp);
  await tenant.post('/auth/change-password', { currentPassword: k1Temp, newPassword: 'NguoiThue2026' });
  r = await tenant.get('/me/room');
  check('TEN-01 phòng, hợp đồng, người cùng phòng (chỉ họ tên)', r.status === 200 && r.body.data.room.code === 'B101' && r.body.data.occupants.every((o) => Object.keys(o).sort().join() === 'fullName,isPrimary'), r.body);
  r = await tenant.get('/me/invoices');
  check('TEN-02 chỉ hóa đơn của hợp đồng mình', r.status === 200 && r.body.data.length === 1 && r.body.data[0].id === inv1.id, r.body);
  r = await tenant.get(`/me/invoices/${inv2.id}`);
  check('TEN-03 hóa đơn phòng khác: 404', r.status === 404 && code(r) === 'RESOURCE_NOT_FOUND', r.body);
  r = await tenant.get(`/me/invoices/${inv1.id}`);
  check('TEN-03 thanh toán không có người thu', r.status === 200 && r.body.data.payments.every((p) => !('recordedBy' in p)), r.body);
  r = await tenant.get('/me/payments');
  check('TEN-04 lịch sử thanh toán', r.status === 200 && r.body.data.length === 2 && r.body.data.every((p) => !('recordedBy' in p)), r.body);
  r = await tenant.get(`/me/payments/${pay2.id}/receipt`);
  check('TEN-05 biên lai', r.status === 200 && r.body.data.receiptNumber === pay2.receiptNumber, r.body);
  r = await tenant.get(`/invoices/${inv1.id}`);
  check('Người thuê gọi INV-02: 403', r.status === 403, r.body);
  r = await tenant.get('/me/contract');
  check('TEN-06 hợp đồng, người ở chỉ họ tên', r.status === 200 && r.body.data.id === k1.id && r.body.data.occupants.every((o) => !('phone' in o)), r.body);
  r = await tenant.get('/notifications');
  check('NTF-01 có thông báo hóa đơn mới', r.body.data.some((n) => n.type === 'INVOICE_ISSUED' && n.relatedId === inv1.id) && r.body.meta.unreadCount >= 1, r.body);

  r = await tenant.post('/me/requests', { type: 'MAINTENANCE', title: 'Bóng đèn hỏng', description: 'Phòng tắm' });
  check('TEN-07 yêu cầu sửa chữa: NEW', r.status === 201 && r.body.data.status === 'NEW' && r.body.data.roomCode === 'B101', r.body);
  const req1 = r.body.data;
  r = await tenant.post('/me/requests', { type: 'OCCUPANT_CHANGE', title: 'Thêm người ở', occupantChange: { action: 'ADD', proposedData: { fullName: 'Trịnh P' } } });
  check('TEN-07 thêm người thiếu trường bắt buộc: 400, field occupantChange.proposedData.idNumber', r.status === 400 && hasDetail(r, 'occupantChange.proposedData.idNumber', 'REQUIRED'), r.body);
  r = await tenant.post('/me/requests', { type: 'OCCUPANT_CHANGE', title: 'Thêm người ở', occupantChange: { action: 'ADD', proposedData: person('Trịnh P', '079000000013', { relationshipToPrimary: 'Em' }) } });
  check('TEN-07 thêm người ở: PENDING', r.status === 201 && r.body.data.status === 'PENDING' && r.body.data.occupantChange.action === 'ADD', r.body);
  const req2 = r.body.data;
  r = await tenant.post('/me/requests', { type: 'OCCUPANT_CHANGE', title: 'Người ở rời đi', occupantChange: { action: 'MOVE_OUT', occupantId: k2.primaryTenant.occupantId, moveOutDate: TODAY } });
  check('TEN-07 người ở không thuộc phòng mình: 404', r.status === 404, r.body);
  const wife = k1.occupants.find((o) => !o.isPrimary).id;
  r = await tenant.post('/me/requests', { type: 'OCCUPANT_CHANGE', title: 'Người ở rời đi', occupantChange: { action: 'MOVE_OUT', occupantId: wife, moveOutDate: TODAY } });
  const req3 = r.body.data;
  r = await tenant.get('/me/requests');
  check('TEN-08 yêu cầu đã gửi', r.status === 200 && r.body.data.length === 3, r.body);

  console.log('== REQ Xử lý yêu cầu');
  r = await manager.post(`/requests/${req1.id}/approve`);
  check('REQ-03 với yêu cầu sửa chữa: 409 INVALID_REQUEST_TYPE', r.status === 409 && code(r) === 'INVALID_REQUEST_TYPE', r.body);
  r = await manager.patch(`/requests/${req1.id}/status`, { status: 'DONE' });
  check('REQ-05 NEW sang DONE: 409 INVALID_STATUS_TRANSITION', r.status === 409 && code(r) === 'INVALID_STATUS_TRANSITION', r.body);
  r = await manager.patch(`/requests/${req1.id}/status`, { status: 'IN_PROGRESS' });
  r = await manager.patch(`/requests/${req1.id}/status`, { status: 'DONE', responseNote: 'Đã thay bóng' });
  check('REQ-05 IN_PROGRESS sang DONE', r.status === 200 && r.body.data.status === 'DONE' && r.body.data.handledBy?.fullName === 'Quản lý', r.body);
  r = await manager.post(`/requests/${req2.id}/approve`, { responseNote: 'Đã thêm' });
  check('REQ-03 duyệt thêm người ở: APPROVED', r.status === 200 && r.body.data.status === 'APPROVED', r.body);
  r = await manager.get(`/rooms/${b101}/occupants`);
  check('Người ở mới được thêm vào hợp đồng', r.body.data.some((o) => o.fullName === 'Trịnh P'), r.body);
  r = await manager.post(`/requests/${req2.id}/approve`);
  check('REQ-03 duyệt lại: 409 REQUEST_ALREADY_PROCESSED', r.status === 409 && code(r) === 'REQUEST_ALREADY_PROCESSED', r.body);
  r = await manager.post(`/requests/${req3.id}/reject`, {});
  check('REQ-04 từ chối thiếu phản hồi: 400', r.status === 400 && hasDetail(r, 'responseNote', 'REQUIRED'), r.body);
  r = await manager.post(`/requests/${req3.id}/reject`, { responseNote: 'Cần ký xác nhận' });
  check('REQ-04 từ chối', r.status === 200 && r.body.data.status === 'REJECTED', r.body);
  r = await tenant.get('/notifications?isRead=false');
  check('Người gửi nhận thông báo REQUEST_PROCESSED', r.body.data.filter((n) => n.type === 'REQUEST_PROCESSED').length === 3, r.body);
  r = await manager.get('/requests?type=OCCUPANT_CHANGE');
  check('REQ-01 danh sách theo loại', r.status === 200 && r.body.data.length === 2, r.body);

  console.log('== CTR-08, CTR-04 Thanh lý');
  const end = { endedOn: TODAY, finalReadings: readings(1400, 50), extraCharges: [{ description: 'Vệ sinh phòng', amount: 100000 }] };
  r = await manager.post(`/contracts/${k1.id}/settlement-preview`, { ...end, finalReadings: [{ meterType: 'ELECTRICITY', reading: 1400 }] });
  check('CTR-08 thiếu chỉ số trả phòng: FINAL_READING_REQUIRED', r.status === 400 && hasDetail(r, 'finalReadings', 'FINAL_READING_REQUIRED'), r.body);
  r = await manager.post(`/contracts/${k1.id}/settlement-preview`, { ...end, finalReadings: readings(1300, 50) });
  check('CTR-08 chỉ số nhỏ hơn chỉ số gần nhất: READING_DECREASED', r.status === 400 && hasDetail(r, 'finalReadings', 'READING_DECREASED'), r.body);
  r = await manager.post(`/contracts/${k1.id}/settlement-preview`, { ...end, endedOn: addDays(PREV_START, -1) });
  check('CTR-08 ngày kết thúc trước ngày bắt đầu: OUT_OF_RANGE', r.status === 400 && hasDetail(r, 'endedOn', 'OUT_OF_RANGE'), r.body);
  r = await manager.post(`/contracts/${k1.id}/settlement-preview`, { ...end, dueDate: addDays(TODAY, -1) });
  check('CTR-08 hạn trước ngày kết thúc: DUE_BEFORE_BILLING', r.status === 400 && hasDetail(r, 'dueDate', 'DUE_BEFORE_BILLING'), r.body);

  r = await manager.post(`/contracts/${k1.id}/settlement-preview`, end);
  const days = Number(TODAY.slice(8));
  const month = dim(CUR_START);
  const part = (q, price) => (days === month ? q * price : prorate(q, price, days, month));
  const persons = 2 + (TODAY === CUR_START ? 1 : 0);
  const expectSub = part(1, 3000000) + 50 * 3456 + 2 * 25000 + part(1, 100000) + part(persons, 30000) + part(1, 100000) + 100000;
  const expectTotal = roundTotal(expectSub);
  const applied = Math.min(3000000, expectTotal + 2000000);
  const pv = r.body?.data;
  check('CTR-08 khoảng chưa có hóa đơn tháng: từ đầu tháng này đến ngày kết thúc', r.status === 200 && pv.uncoveredFrom === CUR_START && pv.uncoveredTo === TODAY, pv);
  check('CTR-08 tiền phòng, khoản cố định theo ngày; điện nước từ chỉ số đã lập hóa đơn', pv?.subtotal === expectSub && pv.totalAmount === expectTotal && pv.lines.find((l) => l.description === 'Điện')?.previousReading === 1350, pv);
  check('CTR-08 cấn trừ cọc vào thanh lý và nợ khác', pv?.otherOutstanding === 2000000 && pv.deposit.applied === applied && pv.deposit.refund === 3000000 - applied && pv.remainingDebt === expectTotal + 2000000 - applied, pv);

  const endKey = key();
  r = await manager.post(`/contracts/${k1.id}/end`, { ...end, endNote: 'Trả phòng đúng hạn' }, { 'Idempotency-Key': endKey });
  const ended = r.body?.data;
  check('CTR-04 kết thúc: ENDED, hóa đơn thanh lý TL-YYYYMMDD-B101', r.status === 200 && ended.contract.status === 'ENDED' && ended.settlementInvoice.code === `TL-${TODAY.replaceAll('-', '')}-B101` && ended.settlementInvoice.invoiceType === 'SETTLEMENT' && ended.settlementInvoice.period === null, ended);
  check('CTR-04 tiền cọc: cấn trừ, trả lại', ended?.deposit.applied === applied && ended.deposit.refund === 3000000 - applied && ended.contract.depositApplied === applied && ended.contract.depositRefundAmount === 3000000 - applied, ended?.deposit);
  check('CTR-04 chỉ số trả phòng lưu trên hợp đồng', ended?.contract.finalReadings.length === 2 && ended.contract.settlementInvoiceId === ended.settlementInvoice.id, ended?.contract);
  check('Người ở rời đi cùng ngày kết thúc', ended?.contract.occupants.every((o) => o.moveOutDate !== null), ended?.contract.occupants);
  r = await manager.post(`/contracts/${k1.id}/end`, { ...end, endNote: 'Trả phòng đúng hạn' }, { 'Idempotency-Key': endKey });
  check('CTR-04 gửi lặp cùng khóa: trả lại kết quả cũ', r.status === 200 && r.body.data.settlementInvoice.id === ended.settlementInvoice.id, r.body);
  r = await manager.post(`/contracts/${k1.id}/end`, end);
  check('CTR-04 hợp đồng đã kết thúc: 409 CONTRACT_ALREADY_ENDED', r.status === 409 && code(r) === 'CONTRACT_ALREADY_ENDED', r.body);
  r = await manager.get(`/rooms/${b101}`);
  check('Phòng B101 trở về VACANT', r.body.data.status === 'VACANT' && r.body.data.activeContract === null, r.body);
  r = await accountant.get(`/payments?method=DEPOSIT`);
  const deposits = r.body.data;
  check('Thanh toán DEPOSIT: thanh lý trước rồi hóa đơn còn nợ khác', deposits.length >= 1 && deposits.reduce((s, p) => s + p.amount, 0) === applied, deposits);
  r = await accountant.post(`/payments/${deposits[0].id}/cancellation-requests`, { reason: 'Thử hủy cấn trừ' });
  check('PAY-05 khoản cấn trừ cọc: 409 PAYMENT_NOT_CANCELLABLE', r.status === 409 && code(r) === 'PAYMENT_NOT_CANCELLABLE', r.body);
  r = await owner.get(`/reports/revenue?fromMonth=${CUR}&toMonth=${CUR}`);
  check('RPT-02 tiền cọc cấn trừ tính vào doanh thu tháng thanh lý', r.body.data[0].depositAmount === applied, r.body);

  r = await tenant.get('/auth/me');
  check('Người thuê sau khi kết thúc: READ_ONLY 30 ngày', r.status === 200 && r.body.data.status === 'READ_ONLY' && r.body.data.tenant.readOnlyUntil === addDays(TODAY, 30), r.body);
  r = await tenant.post('/me/requests', { type: 'MAINTENANCE', title: 'Còn đồ để lại' });
  check('TEN-07 khi chỉ đọc: 403 TENANT_READ_ONLY', r.status === 403 && code(r) === 'TENANT_READ_ONLY', r.body);
  r = await tenant.patch('/me/profile', { email: 'k@example.com' });
  check('USR-09 khi chỉ đọc: 403 TENANT_READ_ONLY', r.status === 403 && code(r) === 'TENANT_READ_ONLY', r.body);
  r = await tenant.get(`/me/invoices/${ended.settlementInvoice.id}`);
  check('Người thuê xem được hóa đơn thanh lý', r.status === 200, r.body);

  console.log('== Hủy hợp đồng trước khi vào ở');
  r = await manager.post('/contracts', contract(b103, NEXT_START, person('Mai Văn Q', '079000000031'), { initialReadings: readings(0, 0), tenantUsername: 'b103.tenant' }));
  const k3 = r.body.data.contract;
  check('Hợp đồng B103 sắp hiệu lực', k3?.status === 'UPCOMING', r.body);
  r = await manager.post(`/contracts/${k3.id}/end`, { endedOn: addDays(TODAY, -1) });
  check('Hợp đồng chưa bắt đầu: ngày kết thúc phải là hôm nay', r.status === 400 && hasDetail(r, 'endedOn', 'OUT_OF_RANGE'), r.body);
  r = await manager.post(`/contracts/${k3.id}/end`, { endedOn: TODAY, finalReadings: readings(1, 1) });
  check('Hợp đồng chưa bắt đầu: không gửi chỉ số trả phòng', r.status === 400 && hasDetail(r, 'finalReadings'), r.body);
  r = await manager.post(`/contracts/${k3.id}/end`, { endedOn: TODAY });
  check('Hủy trước khi vào ở: không có hóa đơn, trả lại toàn bộ cọc', r.status === 200 && r.body.data.settlementInvoice === null && r.body.data.contract.cancelledBeforeStart === true && r.body.data.deposit.refund === 3000000, r.body);
  r = await manager.get(`/rooms/${b103}`);
  check('Phòng B103 không còn hợp đồng sắp hiệu lực', r.body.data.upcomingContract === null && r.body.data.status === 'VACANT', r.body);

  console.log('== Kỳ tháng này');
  r = await accountant.post('/billing-periods', { period: CUR, dueDate: addDays(TODAY, 20) });
  r = await manager.get(`/billing-periods/${r.body.data.id}/preview`);
  const rooms = r.body?.data?.rooms ?? [];
  check('BIL-04 kỳ này: hợp đồng đã thanh lý không lập hóa đơn tháng, B102 thiếu chỉ số', r.status === 200 && !rooms.some((x) => x.roomCode === 'B101') && rooms.find((x) => x.roomCode === 'B102')?.status === 'SKIPPED', rooms);

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
