import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { DetailCode } from 'src/common/constants/error-codes';
import { isConstraintError } from 'src/common/database/pg-error.util';
import { selectOne } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RunOptions<T> = {
  key: string | undefined;
  required: boolean;
  userId: string;
  // Ví dụ "POST /contracts"
  endpoint: string;
  payload: unknown;
  status: number;
  // Bỏ dữ liệu nhạy cảm (mật khẩu tạm) trước khi lưu kết quả
  redact?: (result: T) => unknown;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Chống gửi lặp (đặc tả 2.7): cùng khóa, cùng nội dung trong 24 giờ trả lại kết quả lần đầu;
 * cùng khóa, khác nội dung trả 409.
 */
@Injectable()
export class IdempotencyService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Thao tác chạy trong một giao dịch, khóa được ghi cùng giao dịch: gửi đồng thời chỉ một lần thành công. */
  async run<T>(options: RunOptions<T>, work: (manager: EntityManager) => Promise<T>): Promise<T> {
    if (options.key === undefined) {
      if (options.required) throw new AppException('IDEMPOTENCY_KEY_REQUIRED');
      return this.dataSource.transaction(work);
    }
    const requestHash = this.prepare(options.key, options.endpoint, options.payload);
    const replay = await this.findReplay<T>(options.key, options.userId, requestHash);
    if (replay !== undefined) return replay;

    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.deleteExpired(manager, options.key as string, options.userId);
        const result = await work(manager);
        await this.save(manager, options as RunOptions<T> & { key: string }, requestHash, result);
        return result;
      });
    } catch (error) {
      if (!isConstraintError(error, 'idempotency_keys_pkey')) throw error;
      const again = await this.findReplay<T>(options.key, options.userId, requestHash);
      if (again !== undefined) return again;
      throw error;
    }
  }

  /** Thao tác tự chia nhiều giao dịch (phát hành từng phòng): lưu kết quả sau khi xong. */
  async runEach<T>(options: RunOptions<T>, work: () => Promise<T>): Promise<T> {
    if (options.key === undefined) {
      if (options.required) throw new AppException('IDEMPOTENCY_KEY_REQUIRED');
      return work();
    }
    const requestHash = this.prepare(options.key, options.endpoint, options.payload);
    const replay = await this.findReplay<T>(options.key, options.userId, requestHash);
    if (replay !== undefined) return replay;

    const result = await work();
    await this.dataSource.transaction(async (manager) => {
      await this.deleteExpired(manager, options.key as string, options.userId);
      await manager.query(
        `insert into public.idempotency_keys (key, user_id, endpoint, request_hash, response_status, response_body)
         values ($1, $2, $3, $4, $5, $6::jsonb) on conflict do nothing`,
        [options.key, options.userId, options.endpoint, requestHash, options.status, JSON.stringify(result)],
      );
    });
    return result;
  }

  private prepare(key: string, endpoint: string, payload: unknown) {
    if (!UUID_RE.test(key)) {
      throw AppException.field('Idempotency-Key', DetailCode.INVALID_FORMAT, 'Mã chống gửi lặp phải là UUID');
    }
    return createHash('sha256').update(`${endpoint}\n${canonicalJson(payload)}`).digest('hex');
  }

  private async save<T>(manager: EntityManager, options: RunOptions<T> & { key: string }, requestHash: string, result: T) {
    const body = options.redact ? options.redact(result) : result;
    await manager.query(
      `insert into public.idempotency_keys (key, user_id, endpoint, request_hash, response_status, response_body)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [options.key, options.userId, options.endpoint, requestHash, options.status, JSON.stringify(body)],
    );
  }

  private deleteExpired(manager: EntityManager, key: string, userId: string) {
    return manager.query(`delete from public.idempotency_keys where key = $1 and user_id = $2 and expires_at <= now()`, [
      key,
      userId,
    ]);
  }

  private async findReplay<T>(key: string, userId: string, requestHash: string): Promise<T | undefined> {
    const row = await selectOne<{ request_hash: string; response_body: T }>(
      this.dataSource.manager,
      `select request_hash, response_body from public.idempotency_keys
        where key = $1 and user_id = $2 and expires_at > now()`,
      [key, userId],
    );
    if (!row) return undefined;
    if (row.request_hash !== requestHash) throw new AppException('IDEMPOTENCY_KEY_REUSED');
    return row.response_body;
  }
}
