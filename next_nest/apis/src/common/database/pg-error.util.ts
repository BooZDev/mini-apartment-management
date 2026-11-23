import { QueryFailedError } from 'typeorm';
import { ErrorCode, isErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

type PgError = {
  code?: string;
  message?: string;
  constraint?: string;
};

// Ràng buộc của CSDL sang mã lỗi API (supabase/README.md)
const CONSTRAINT_CODES: Record<string, ErrorCode> = {
  contracts_period_overlap: 'CONTRACT_PERIOD_OVERLAP',
  users_username_uk: 'USERNAME_TAKEN',
  rooms_code_uk: 'ROOM_CODE_TAKEN',
  contracts_contract_number_uk: 'CONTRACT_NUMBER_TAKEN',
  charge_types_name_uk: 'CHARGE_NAME_TAKEN',
  charge_types_active_meter_uk: 'METER_TYPE_IN_USE',
  charge_prices_type_effective_uk: 'PRICE_EFFECTIVE_DATE_TAKEN',
  billing_periods_period_uk: 'PERIOD_ALREADY_EXISTS',
  invoices_settlement_uk: 'CONTRACT_ALREADY_ENDED',
  payment_cancellation_requests_pending_uk: 'CANCELLATION_ALREADY_PENDING',
  expense_categories_name_uk: 'CATEGORY_NAME_TAKEN',
};

// Trigger báo các mã này nghĩa là máy chủ ghi sai: lỗi lập trình, trả 500
const INTERNAL_TRIGGER_CODES = new Set(['DELETE_NOT_ALLOWED', 'IMMUTABLE_RECORD', 'DEPOSIT_EXCEEDED']);

export function pgErrorOf(error: unknown): PgError | null {
  if (error instanceof QueryFailedError) return error.driverError as PgError;
  const e = error as PgError | null;
  if (e && typeof e.code === 'string' && /^[0-9A-Z]{5}$/.test(e.code)) return e;
  return null;
}

export function isConstraintError(error: unknown, constraint: string) {
  return pgErrorOf(error)?.constraint === constraint;
}

/** Lỗi PostgreSQL sang lỗi API; `null` khi không nhận ra (không lộ thông báo thô của CSDL). */
export function mapPgError(error: unknown): AppException | null {
  const pg = pgErrorOf(error);
  if (!pg) return null;

  switch (pg.code) {
    // Trigger nghiệp vụ: message là mã lỗi API
    case 'P0001':
      if (pg.message && INTERNAL_TRIGGER_CODES.has(pg.message)) return null;
      return isErrorCode(pg.message) ? new AppException(pg.message) : null;
    case '23505':
    case '23P01': {
      const code = pg.constraint ? CONSTRAINT_CODES[pg.constraint] : undefined;
      return code ? new AppException(code) : null;
    }
    case '23514':
    case '23502':
    case '22P02':
    case '22007':
    case '22008':
    case '22003':
    case '22001':
      return new AppException('VALIDATION_ERROR');
    case '23503':
      return new AppException('RESOURCE_NOT_FOUND');
    case '40001':
    case '40P01':
    case '55P03':
      return new AppException('CONCURRENT_UPDATE');
    default:
      return null;
  }
}
