import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from 'src/common/exceptions/app.exception';

const MAX_FAILURES = 5;
// Một tên đăng nhập bị sai chừng này lần trên mọi IP trong 15 phút thì ghi cảnh báo (dò mật khẩu phân tán)
const WARN_TOTAL = 30;
// Lượt đếm cũ hết hiệu lực: lần sai đầu đã quá 15 phút hoặc đã hết thời gian chặn
const EXPIRED = `(la.first_failed_at < now() - interval '15 minutes'
                  or (la.locked_until is not null and la.locked_until <= now()))`;
const NEXT_COUNT = `(case when ${EXPIRED} then 1 else la.failed_count + 1 end)`;

/**
 * 5 lần sai liên tiếp trong 15 phút với cùng tên đăng nhập từ cùng một IP thì chặn IP đó 15 phút.
 * Chặn theo cặp để người biết tên đăng nhập không khóa được chủ tài khoản ở máy khác.
 * Tên không tồn tại cũng được đếm để không lộ tài khoản nào có thật.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async assertNotLocked(username: string, ip: string) {
    const rows: unknown[] = await this.dataSource.query(
      `select 1 from public.login_attempts
        where username_normalized = lower(btrim($1)) and client_ip = $2 and locked_until > now()`,
      [username, ip],
    );
    if (rows.length > 0) throw new AppException('TOO_MANY_LOGIN_ATTEMPTS');
  }

  async recordFailure(username: string, ip: string) {
    const rows: { total: number }[] = await this.dataSource.query(
      `with upsert as (
         insert into public.login_attempts as la (username_normalized, client_ip, failed_count, first_failed_at)
         values (lower(btrim($1)), $2, 1, now())
         on conflict (username_normalized, client_ip) do update set
           failed_count = ${NEXT_COUNT},
           first_failed_at = case when ${EXPIRED} then now() else la.first_failed_at end,
           locked_until = case when ${NEXT_COUNT} >= ${MAX_FAILURES} then now() + interval '15 minutes' else null end
         returning failed_count
       )
       select coalesce((select sum(failed_count) from public.login_attempts
                         where username_normalized = lower(btrim($1)) and client_ip <> $2
                           and first_failed_at > now() - interval '15 minutes'), 0)
              + (select failed_count from upsert) as total`,
      [username, ip],
    );
    if ((rows[0]?.total ?? 0) === WARN_TOTAL) {
      this.logger.warn(
        `Tên đăng nhập ${JSON.stringify(username.trim().toLowerCase())} bị sai ${WARN_TOTAL} lần trong 15 phút từ nhiều IP`,
      );
    }
  }

  async clear(username: string, ip: string) {
    await this.dataSource.query(
      `delete from public.login_attempts where username_normalized = lower(btrim($1)) and client_ip = $2`,
      [username, ip],
    );
  }
}
