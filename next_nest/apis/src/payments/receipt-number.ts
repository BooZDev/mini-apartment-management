import { EntityManager } from 'typeorm';
import { selectOne } from 'src/common/database/query.util';
import { compactDate, vnToday } from 'src/common/utils/date.util';

/** Số biên lai BL-YYYYMM-NNNN theo tháng ghi nhận; khóa theo tháng để hai người ghi cùng lúc không trùng số. */
export async function nextReceiptNumber(manager: EntityManager): Promise<string> {
  const prefix = `BL-${compactDate(vnToday()).slice(0, 6)}-`;
  await manager.query(`select pg_advisory_xact_lock(hashtext($1))`, [prefix]);
  const row = await selectOne<{ n: number }>(
    manager,
    `select coalesce(max(substring(receipt_number from ${prefix.length + 1})::int), 0) as n
       from public.payments where receipt_number like $1`,
    [`${prefix}%`],
  );
  return prefix + String((row?.n ?? 0) + 1).padStart(4, '0');
}
