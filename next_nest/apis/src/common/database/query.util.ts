import { EntityManager } from 'typeorm';

// Mọi câu SQL viết tay dùng tham số ràng buộc $1, $2..., không ghép dữ liệu vào chuỗi

export async function selectRows<T>(manager: EntityManager, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await manager.query(sql, params)) as T[];
}

export async function selectOne<T>(manager: EntityManager, sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await selectRows<T>(manager, sql, params);
  return rows[0] ?? null;
}

/** UPDATE/DELETE ... RETURNING: TypeORM trả `[rows, rowCount]`, đưa về danh sách dòng. */
export async function updateReturning<T>(manager: EntityManager, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = (await manager.query(sql, params)) as unknown[];
  if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as T[];
  }
  return result as T[];
}

type LockableTable =
  | 'rooms'
  | 'contracts'
  | 'occupants'
  | 'charge_types'
  | 'users'
  | 'invoices'
  | 'payments'
  | 'invoice_adjustments'
  | 'payment_cancellation_requests'
  | 'tenant_requests'
  | 'billing_periods';

/** SELECT ... FOR UPDATE theo id; false khi không có dòng. */
export async function lockRow(manager: EntityManager, table: LockableTable, id: string): Promise<boolean> {
  const rows = await selectRows(manager, `select 1 from public.${table} where id = $1 for update`, [id]);
  return rows.length > 0;
}

/** Bỏ trường không gửi lên (undefined) trước khi cập nhật. */
export function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Ghép điều kiện WHERE, `?` là chỗ đặt tham số. */
export class WhereBuilder {
  readonly conditions: string[] = [];
  readonly params: unknown[] = [];

  add(sql: string, ...values: unknown[]) {
    let text = sql;
    for (const value of values) {
      this.params.push(value);
      text = text.replace('?', `$${this.params.length}`);
    }
    this.conditions.push(text);
    return this;
  }

  /** Thêm tham số dùng ngoài WHERE, trả `$n`. */
  param(value: unknown) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  get sql() {
    return this.conditions.length ? `where ${this.conditions.join(' and ')}` : '';
  }
}
