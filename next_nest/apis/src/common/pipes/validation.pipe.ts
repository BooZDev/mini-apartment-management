import { ValidationError, ValidationPipe } from '@nestjs/common';
import { DetailCode } from '../constants/error-codes';
import { AppException, ErrorDetail } from '../exceptions/app.exception';

const CONSTRAINT_CODES: Record<string, DetailCode> = {
  isDefined: DetailCode.REQUIRED,
  isNotEmpty: DetailCode.REQUIRED,
  isNotEmptyObject: DetailCode.REQUIRED,
  arrayNotEmpty: DetailCode.REQUIRED,
  minLength: DetailCode.TOO_SHORT,
  maxLength: DetailCode.TOO_LONG,
  arrayMinSize: DetailCode.TOO_SHORT,
  arrayMaxSize: DetailCode.TOO_LONG,
  min: DetailCode.OUT_OF_RANGE,
  max: DetailCode.OUT_OF_RANGE,
  isPositive: DetailCode.OUT_OF_RANGE,
  isDateAfter: DetailCode.OUT_OF_RANGE,
  uniqueBy: DetailCode.DUPLICATE_ITEM,
  arrayUnique: DetailCode.DUPLICATE_ITEM,
};

type Context = { code?: string; message?: string };

/** Lỗi class-validator sang `details` của API; tên trường dạng `items[2].currentReading`. */
export function validationDetails(errors: ValidationError[], parent = ''): ErrorDetail[] {
  const details: ErrorDetail[] = [];

  for (const error of errors) {
    const isIndex = /^\d+$/.test(error.property);
    const field = !parent ? error.property : isIndex ? `${parent}[${error.property}]` : `${parent}.${error.property}`;

    const constraints = error.constraints ?? {};
    const names = Object.keys(constraints);
    if (names.length > 0) {
      // Thiếu trường thì chỉ báo REQUIRED
      const name = names.find((n) => CONSTRAINT_CODES[n] === DetailCode.REQUIRED) ?? names[0];
      const context = (error.contexts?.[name] ?? {}) as Context;
      const unknownField = name === 'whitelistValidation';
      details.push({
        field,
        code: unknownField ? DetailCode.INVALID_FORMAT : (context.code ?? CONSTRAINT_CODES[name] ?? DetailCode.INVALID_FORMAT),
        message: unknownField ? 'Trường này không được phép gửi' : constraints[name],
      });
    }

    if (error.children?.length) details.push(...validationDetails(error.children, field));
  }
  return details;
}

/** Thông báo riêng của trường lỗi đầu tiên, ví dụ "Hãy nhập vào số tiền hợp lệ!". */
function topMessageOf(errors: ValidationError[]): string | undefined {
  for (const error of errors) {
    for (const context of Object.values(error.contexts ?? {}) as Context[]) {
      if (context.message) return context.message;
    }
    const nested = error.children?.length ? topMessageOf(error.children) : undefined;
    if (nested) return nested;
  }
  return undefined;
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Không tự ép kiểu phần thân: "100" không thành số 100
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors: ValidationError[]) =>
      new AppException('VALIDATION_ERROR', validationDetails(errors), topMessageOf(errors)),
  });
}
