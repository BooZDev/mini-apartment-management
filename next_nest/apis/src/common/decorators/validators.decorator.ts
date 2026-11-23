import { registerDecorator, ValidateIf, ValidationArguments, ValidationOptions } from 'class-validator';
import { DetailCode } from '../constants/error-codes';
import { isValidDate, isValidPeriod, vnToday } from '../utils/date.util';

/** Không bắt buộc, nhưng gửi thì không được null (cột NOT NULL khi sửa một phần). */
export function IsOptionalNotNull(options?: ValidationOptions) {
  return ValidateIf((_object, value) => value !== undefined, options);
}

/** Ngày YYYY-MM-DD có thật (không nhận 2026-02-30). */
export function IsDateOnly(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateOnly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidDate(value),
        defaultMessage: () => 'Ngày phải có dạng YYYY-MM-DD',
      },
    });
  };
}

/** So với hôm nay (giờ VN). `strict`: phải trước hôm nay; không strict: không sau hôm nay. */
export function IsNotFutureDate(strict: boolean, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: { context: { code: DetailCode.DATE_IN_FUTURE }, ...options },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !isValidDate(value)) return true;
          const today = vnToday();
          return strict ? value < today : value <= today;
        },
      },
    });
  };
}

/** Kỳ YYYY-MM. */
export function IsPeriod(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPeriod',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidPeriod(value),
        defaultMessage: () => 'Kỳ phải có dạng YYYY-MM',
      },
    });
  };
}

/** Ngày không trước (strict: phải sau) một trường khác; chỉ kiểm khi cả hai hợp lệ. */
export function IsDateAfter(property: string, strict: boolean, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const other = (args.object as Record<string, unknown>)[property];
          if (typeof value !== 'string' || typeof other !== 'string') return true;
          if (!isValidDate(value) || !isValidDate(other)) return true;
          return strict ? value > other : value >= other;
        },
      },
    });
  };
}

/** Phần tử của danh sách không trùng nhau theo các trường. */
export function UniqueBy(keys: string | string[], options?: ValidationOptions) {
  const fields = Array.isArray(keys) ? keys : [keys];
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'uniqueBy',
      target: object.constructor,
      propertyName,
      constraints: fields,
      options: { context: { code: DetailCode.DUPLICATE_ITEM }, ...options },
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return true;
          const ids = value.map((item: Record<string, unknown> | null) => fields.map((f) => item?.[f]).join('|'));
          return new Set(ids).size === ids.length;
        },
      },
    });
  };
}
