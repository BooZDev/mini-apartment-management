import { HttpException } from '@nestjs/common';
import { DetailCode, ERROR_CODES, ErrorCode } from '../constants/error-codes';

export type ErrorDetail = {
  field?: string;
  code: DetailCode | string;
  message: string;
  [key: string]: unknown;
};

export type ErrorBody = {
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
};

// Lỗi trả cho giao diện: `{ error: { code, message, details, requestId } }`
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    readonly details: ErrorDetail[] = [],
    message?: string,
  ) {
    const body: ErrorBody = {
      code,
      message: message ?? ERROR_CODES[code].message,
      details,
    };
    super(body, ERROR_CODES[code].status);
  }

  /** Lỗi dữ liệu vào của một trường. */
  static field(
    field: string,
    code: DetailCode,
    message: string,
  ): AppException {
    return new AppException('VALIDATION_ERROR', [{ field, code, message }]);
  }
}
