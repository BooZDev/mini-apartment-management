import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { addDays, toVnDateTime, vnStartOfDay } from 'src/common/utils/date.util';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto';

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

type AuditRow = {
  id: string;
  occurred_at: Date;
  actor_id: string | null;
  actor_username: string;
  actor_full_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  request_id: string | null;
  total: number;
};

@Injectable()
export class AuditLogsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Ghi trong giao dịch của thao tác; không ghi mật khẩu, CCCD vì Chủ nhà đọc được nhật ký
  async log(manager: EntityManager, ctx: RequestContext, entry: AuditEntry) {
    await manager.query(
      `insert into public.audit_logs
         (actor_id, actor_username, actor_full_name, action, entity_type, entity_id,
          summary, before_data, after_data, request_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)`,
      [
        ctx.user.id,
        ctx.user.username,
        ctx.user.fullName,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.summary.slice(0, 255),
        entry.before ? JSON.stringify(entry.before) : null,
        entry.after ? JSON.stringify(entry.after) : null,
        ctx.requestId,
      ],
    );
  }

  async findAll(query: FindAuditLogsDto) {
    const where = new WhereBuilder();
    if (query.fromDate) where.add('a.occurred_at >= ?', vnStartOfDay(query.fromDate));
    if (query.toDate) where.add('a.occurred_at < ?', vnStartOfDay(addDays(query.toDate, 1)));
    if (query.actorId) where.add('a.actor_id = ?', query.actorId);
    if (query.action) where.add('a.action = ?', query.action);
    if (query.entityType) where.add('a.entity_type = ?', query.entityType);
    if (query.entityId) where.add('a.entity_id = ?', query.entityId);

    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<AuditRow>(
      this.dataSource.manager,
      `select a.*, count(*) over () as total
         from public.audit_logs a
         ${where.sql}
        order by a.occurred_at desc, a.id desc
        limit ${limit} offset ${offset}`,
      where.params,
    );

    return new Paginated(
      rows.map((r) => ({
        id: r.id,
        occurredAt: toVnDateTime(r.occurred_at),
        actor: { id: r.actor_id, username: r.actor_username, fullName: r.actor_full_name },
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        summary: r.summary,
        before: r.before_data,
        after: r.after_data,
        requestId: r.request_id,
      })),
      query.page,
      query.pageSize,
      rows[0]?.total ?? 0,
    );
  }
}
