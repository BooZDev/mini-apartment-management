import { Transform } from 'class-transformer';

/** Bỏ khoảng trắng đầu cuối; `emptyToNull` cho trường xóa được giá trị (SĐT, email, ghi chú). */
export function Trim(options: { emptyToNull?: boolean } = {}) {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return options.emptyToNull && trimmed === '' ? null : trimmed;
  });
}

/** Tham số truy vấn "true" / "false" sang boolean. */
export function ToBoolean() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });
}

/** Tham số truy vấn "A,B" sang mảng. */
export function ToArray() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value,
  );
}
