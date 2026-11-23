// Mã lỗi của API (đặc tả mục 6)
export const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, message: 'Dữ liệu không hợp lệ' },
  READ_ONLY_FIELD: { status: 400, message: 'Trường này không được sửa trực tiếp' },
  WRONG_CURRENT_PASSWORD: { status: 400, message: 'Mật khẩu hiện tại không đúng' },
  WEAK_PASSWORD: {
    status: 400,
    message: 'Mật khẩu mới cần ít nhất 8 ký tự, gồm cả chữ và số, khác mật khẩu cũ',
  },
  IDEMPOTENCY_KEY_REQUIRED: { status: 400, message: 'Thiếu mã chống gửi lặp' },
  INVALID_CREDENTIALS: {
    status: 401,
    message: 'Tài khoản hoặc mật khẩu không chính xác',
  },
  UNAUTHENTICATED: {
    status: 401,
    message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  },
  FORBIDDEN: { status: 403, message: 'Bạn không có quyền thực hiện thao tác này' },
  ACCOUNT_LOCKED: { status: 403, message: 'Tài khoản đã bị khóa' },
  PASSWORD_CHANGE_REQUIRED: {
    status: 403,
    message: 'Bạn cần đổi mật khẩu trước khi tiếp tục',
  },
  SELF_APPROVAL_NOT_ALLOWED: {
    status: 403,
    message: 'Bạn không thể tự duyệt yêu cầu do chính mình gửi',
  },
  TENANT_READ_ONLY: {
    status: 403,
    message: 'Hợp đồng đã kết thúc, tài khoản chỉ còn quyền xem',
  },
  RESOURCE_NOT_FOUND: { status: 404, message: 'Không tìm thấy dữ liệu' },
  PERIOD_NOT_FOUND: { status: 404, message: 'Kỳ hóa đơn không tồn tại' },
  USERNAME_TAKEN: { status: 409, message: 'Tên đăng nhập đã tồn tại' },
  LAST_SYSTEM_ADMIN: {
    status: 409,
    message: 'Hệ thống phải còn ít nhất một Quản trị hệ thống đang hoạt động',
  },
  CANNOT_LOCK_SELF: { status: 409, message: 'Bạn không thể tự khóa tài khoản của mình' },
  CANNOT_RESET_SELF: { status: 409, message: 'Hãy dùng chức năng đổi mật khẩu' },
  TENANT_ACCOUNT_NOT_EDITABLE: {
    status: 409,
    message: 'Không đổi vai trò của tài khoản người thuê',
  },
  TENANT_ACCESS_EXPIRED: {
    status: 409,
    message: 'Hợp đồng đã kết thúc quá 30 ngày, không mở khóa được',
  },
  ROOM_CODE_TAKEN: { status: 409, message: 'Mã phòng đã tồn tại' },
  ROOM_CODE_LOCKED: {
    status: 409,
    message: 'Phòng đã có hợp đồng, không đổi được mã phòng',
  },
  ROOM_HAS_ACTIVE_CONTRACT: {
    status: 409,
    message: 'Phòng đang có hợp đồng hiệu lực hoặc sắp hiệu lực',
  },
  ROOM_UNDER_MAINTENANCE: { status: 409, message: 'Phòng đang bảo trì' },
  ROOM_NOT_OCCUPIED: {
    status: 409,
    message: 'Phòng không có hợp đồng hiệu lực hoặc sắp hiệu lực',
  },
  ID_NUMBER_TAKEN: {
    status: 409,
    message: 'Số CCCD trùng với một người ở khác trong cùng thời gian',
  },
  CONTRACT_ALREADY_ENDED: { status: 409, message: 'Hợp đồng đã kết thúc' },
  CONTRACT_PERIOD_OVERLAP: {
    status: 409,
    message: 'Thời gian hợp đồng trùng với hợp đồng khác của phòng',
  },
  CONTRACT_NUMBER_TAKEN: { status: 409, message: 'Số hợp đồng đã tồn tại' },
  CONTRACT_HAS_INVOICE: {
    status: 409,
    message:
      'Hợp đồng đã có hóa đơn, không đổi được ngày bắt đầu, giá thuê hoặc chỉ số bàn giao',
  },
  PRIMARY_TENANT_CANNOT_MOVE_OUT: {
    status: 409,
    message: 'Người đứng tên rời đi thì cần kết thúc hợp đồng',
  },
  OCCUPANT_ALREADY_MOVED_OUT: {
    status: 409,
    message: 'Người này đã được ghi nhận rời đi',
  },
  CHARGE_NAME_TAKEN: { status: 409, message: 'Tên khoản thu đã tồn tại' },
  METER_TYPE_IN_USE: {
    status: 409,
    message: 'Đã có khoản thu đang dùng cho loại công tơ này',
  },
  CHARGE_TYPE_IN_USE: {
    status: 409,
    message: 'Khoản thu đã dùng trong hóa đơn, không đổi được cách tính',
  },
  SYSTEM_CHARGE_TYPE: {
    status: 409,
    message: 'Không sửa cách tính hoặc ngừng dùng khoản Tiền phòng',
  },
  CHARGE_TYPE_HAS_NO_PRICE: { status: 409, message: 'Khoản thu này không dùng bảng giá' },
  PRICE_EFFECTIVE_DATE_TAKEN: {
    status: 409,
    message: 'Đã có đơn giá với ngày hiệu lực này',
  },
  PRICE_IN_USE: { status: 409, message: 'Đơn giá đã được dùng, không xóa được' },
  METER_READING_LOCKED: {
    status: 409,
    message: 'Hóa đơn kỳ này đã phát hành, hãy dùng phiếu điều chỉnh',
  },
  PERIOD_ALREADY_EXISTS: { status: 409, message: 'Kỳ hóa đơn đã tồn tại' },
  PERIOD_ALREADY_ISSUED: {
    status: 409,
    message: 'Đã có hóa đơn phát hành trong kỳ này',
  },
  INVOICE_ALREADY_PAID: { status: 409, message: 'Hóa đơn đã được thanh toán đủ' },
  AMOUNT_EXCEEDS_BALANCE: { status: 409, message: 'Số tiền vượt quá số còn nợ' },
  IDEMPOTENCY_KEY_REUSED: {
    status: 409,
    message: 'Yêu cầu trùng mã nhưng khác nội dung',
  },
  ADJUSTMENT_BELOW_PAID: {
    status: 409,
    message: 'Sau điều chỉnh, số phải trả nhỏ hơn số đã thanh toán',
  },
  REQUEST_ALREADY_PROCESSED: { status: 409, message: 'Yêu cầu đã được xử lý' },
  PAYMENT_ALREADY_CANCELLED: { status: 409, message: 'Thanh toán đã bị hủy' },
  PAYMENT_NOT_CANCELLABLE: {
    status: 409,
    message: 'Khoản cấn trừ tiền cọc không hủy được, hãy dùng phiếu điều chỉnh',
  },
  CANCELLATION_ALREADY_PENDING: {
    status: 409,
    message: 'Thanh toán này đang có yêu cầu hủy chờ duyệt',
  },
  CATEGORY_NAME_TAKEN: { status: 409, message: 'Tên loại chi đã tồn tại' },
  INVALID_REQUEST_TYPE: {
    status: 409,
    message: 'Thao tác không áp dụng cho loại yêu cầu này',
  },
  INVALID_STATUS_TRANSITION: {
    status: 409,
    message: 'Không chuyển được sang trạng thái này',
  },
  // Ghi đồng thời, CSDL hủy giao dịch của một người
  CONCURRENT_UPDATE: {
    status: 409,
    message: 'Dữ liệu vừa được thay đổi, vui lòng tải lại và thử lại',
  },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'Dữ liệu gửi lên quá lớn' },
  TOO_MANY_LOGIN_ATTEMPTS: {
    status: 429,
    message: 'Bạn đã đăng nhập sai nhiều lần, vui lòng thử lại sau 15 phút',
  },
  // Giới hạn số yêu cầu theo IP
  TOO_MANY_REQUESTS: {
    status: 429,
    message: 'Thao tác quá nhanh, vui lòng thử lại sau ít phút',
  },
  INTERNAL_ERROR: { status: 500, message: 'Hệ thống gặp lỗi, vui lòng thử lại sau' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Mã lỗi chi tiết trong `error.details[].code`. */
export enum DetailCode {
  REQUIRED = 'REQUIRED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  DUPLICATE_ITEM = 'DUPLICATE_ITEM',
  END_BEFORE_START = 'END_BEFORE_START',
  DUE_BEFORE_BILLING = 'DUE_BEFORE_BILLING',
  DATE_IN_FUTURE = 'DATE_IN_FUTURE',
  READING_DECREASED = 'READING_DECREASED',
  PREVIOUS_READING_MISSING = 'PREVIOUS_READING_MISSING',
  FINAL_READING_REQUIRED = 'FINAL_READING_REQUIRED',
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_CODES, value);
}
