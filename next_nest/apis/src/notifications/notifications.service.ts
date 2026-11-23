import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime } from 'src/common/utils/date.util';
import { NotificationType } from './enums/notification-type.enum';

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: Date;
  total: number;
};

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedType?: 'INVOICE' | 'REQUEST';
  relatedId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Tạo trong giao dịch của thao tác gốc; mỗi (hóa đơn, loại) chỉ một thông báo
  async create(manager: EntityManager, n: NewNotification) {
    await manager.query(
      `insert into public.notifications (user_id, type, title, message, related_type, related_id)
       values ($1, $2, $3, $4, $5, $6)
       on conflict do nothing`,
      [n.userId, n.type, n.title, n.message, n.relatedType ?? null, n.relatedId ?? null],
    );
  }

  // NTF-01 Thông báo của tôi
  async findMine(userId: string, query: { isRead?: boolean; page: number; pageSize: number }) {
    const where = new WhereBuilder().add('n.user_id = ?', userId);
    if (query.isRead !== undefined) where.add('n.is_read = ?', query.isRead);
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);

    const [rows, unread] = await Promise.all([
      selectRows<NotificationRow>(
        this.dataSource.manager,
        `select n.*, count(*) over () as total
           from public.notifications n
           ${where.sql}
          order by n.created_at desc, n.id desc
          limit ${limit} offset ${offset}`,
        where.params,
      ),
      selectOne<{ count: number }>(
        this.dataSource.manager,
        `select count(*) as count from public.notifications where user_id = $1 and not is_read`,
        [userId],
      ),
    ]);

    return new Paginated(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        relatedType: r.related_type,
        relatedId: r.related_id,
        isRead: r.is_read,
        createdAt: toVnDateTime(r.created_at),
      })),
      query.page,
      query.pageSize,
      rows[0]?.total ?? 0,
      { unreadCount: unread?.count ?? 0 },
    );
  }

  // NTF-02 Đánh dấu đã đọc: thông báo của người khác trả 404
  async markRead(userId: string, id: string) {
    const row = await selectOne(
      this.dataSource.manager,
      `select 1 from public.notifications where id = $1 and user_id = $2`,
      [id, userId],
    );
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    await this.dataSource.query(
      `update public.notifications set is_read = true, read_at = coalesce(read_at, now())
        where id = $1 and user_id = $2`,
      [id, userId],
    );
  }

  // NTF-03 Đánh dấu tất cả đã đọc
  async markAllRead(userId: string) {
    await this.dataSource.query(
      `update public.notifications set is_read = true, read_at = now()
        where user_id = $1 and not is_read`,
      [userId],
    );
  }
}
