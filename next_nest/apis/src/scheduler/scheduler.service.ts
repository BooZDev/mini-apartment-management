import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { addDays, vnToday } from 'src/common/utils/date.util';
import { EnvironmentVariables } from 'src/config/env.validation';

const DUE_SOON_DAYS = 3;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.enabled = config.get('SCHEDULER', { infer: true }) !== 'false';
  }

  // Hằng ngày 07:00 giờ Việt Nam
  @Cron('0 7 * * *', { name: 'daily', timeZone: 'Asia/Ho_Chi_Minh' })
  async daily() {
    if (!this.enabled) return;
    try {
      const notified = await this.notifyInvoices(vnToday());
      await this.cleanup();
      this.logger.log(`Tác vụ hằng ngày: ${notified} thông báo hóa đơn`);
    } catch (error) {
      this.logger.error('Tác vụ hằng ngày lỗi', (error as Error).stack);
    }
  }

  /**
   * Thông báo cho người thuê: còn 3 ngày đến hạn mà còn nợ (INVOICE_DUE_SOON); đã quá hạn mà
   * còn nợ (INVOICE_OVERDUE). Mỗi (hóa đơn, loại) một thông báo dù tác vụ chạy lại.
   */
  async notifyInvoices(today: string) {
    const dueSoon = await this.dataSource.query(
      `insert into public.notifications (user_id, type, title, message, related_type, related_id)
       select c.tenant_user_id, 'INVOICE_DUE_SOON', 'Hóa đơn sắp đến hạn ' || i.code,
              'Hóa đơn ' || i.code || ' còn nợ ' || replace(to_char(i.balance, 'FM999,999,999,999'), ',', '.') || ' đ, hạn thanh toán '
                || to_char(i.due_date, 'DD/MM/YYYY'),
              'INVOICE', i.id
         from public.invoices i join public.contracts c on c.id = i.contract_id
        where i.balance > 0 and i.due_date between $1::date and $2::date
       on conflict do nothing
       returning id`,
      [today, addDays(today, DUE_SOON_DAYS)],
    );
    const overdue = await this.dataSource.query(
      `insert into public.notifications (user_id, type, title, message, related_type, related_id)
       select c.tenant_user_id, 'INVOICE_OVERDUE', 'Hóa đơn quá hạn ' || i.code,
              'Hóa đơn ' || i.code || ' đã quá hạn ' || to_char(i.due_date, 'DD/MM/YYYY') || ', còn nợ '
                || replace(to_char(i.balance, 'FM999,999,999,999'), ',', '.') || ' đ',
              'INVOICE', i.id
         from public.invoices i join public.contracts c on c.id = i.contract_id
        where i.balance > 0 and i.due_date < $1::date
       on conflict do nothing
       returning id`,
      [today],
    );
    return (dueSoon as unknown[]).length + (overdue as unknown[]).length;
  }

  // Dọn phiên, khóa chống gửi lặp, lượt đăng nhập sai đã hết hạn
  private async cleanup() {
    await this.dataSource.query(
      `delete from public.user_sessions
        where expires_at < now() - interval '1 day' or revoked_at < now() - interval '1 day'`,
    );
    await this.dataSource.query(`delete from public.idempotency_keys where expires_at < now()`);
    await this.dataSource.query(
      `delete from public.login_attempts
        where first_failed_at < now() - interval '1 day' and (locked_until is null or locked_until < now())`,
    );
  }
}
