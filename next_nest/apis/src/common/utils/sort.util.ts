import { DetailCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

/** Tham số `sort` (ví dụ `-startDate`) sang ORDER BY; chỉ nhận trường trong danh sách cho phép. */
export function buildOrderBy(
  sort: string | undefined,
  allowed: Record<string, string>,
  defaultSort: string,
  tieBreaker: string,
): string {
  const value = sort ?? defaultSort;
  const desc = value.startsWith('-');
  const column = allowed[desc ? value.slice(1) : value];

  if (!column) {
    throw AppException.field('sort', DetailCode.INVALID_FORMAT, `Chỉ sắp xếp được theo: ${Object.keys(allowed).join(', ')}`);
  }
  return `${column} ${desc ? 'desc' : 'asc'}, ${tieBreaker}`;
}
