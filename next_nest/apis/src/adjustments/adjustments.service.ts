import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { ApproveDto, RejectDto } from 'src/common/dto/decision.dto';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { formatMoney } from 'src/common/utils/text.util';
import { ADJUSTMENT_SELECT, AdjustmentRow, toAdjustment } from './adjustment-view';
import { CreateAdjustmentDto, FindAdjustmentsDto } from './dto/adjustment.dto';

@Injectable()
export class AdjustmentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ADJ-01 Lập phiếu điều chỉnh: chưa duyệt thì không ảnh hưởng số còn nợ
  async create(invoiceId: string, dto: CreateAdjustmentDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await selectOne<{ code: string }>(manager, `select code from public.invoices where id = $1`, [invoiceId]);
      if (!invoice) throw new AppException('RESOURCE_NOT_FOUND');

      // Trigger chặn phiếu làm số phải trả nhỏ hơn số đã trả (ADJUSTMENT_BELOW_PAID)
      const row = await selectOne<{ id: string }>(
        manager,
        `insert into public.invoice_adjustments (invoice_id, amount, reason, requested_by)
         values ($1, $2, $3, $4) returning id`,
        [invoiceId, dto.amount, dto.reason, ctx.user.id],
      );
      await this.auditLogsService.log(manager, ctx, {
        action: 'ADJUSTMENT_CREATED',
        entityType: 'INVOICE_ADJUSTMENT',
        entityId: row!.id,
        summary: `Lập phiếu điều chỉnh ${formatMoney(dto.amount)} cho ${invoice.code}`,
        after: { invoiceCode: invoice.code, amount: dto.amount, reason: dto.reason },
      });
      return this.findOne(manager, row!.id);
    });
  }

  // ADJ-02 Danh sách phiếu điều chỉnh
  async findAll(query: FindAdjustmentsDto) {
    const where = new WhereBuilder();
    if (query.status) where.add('a.status = ?', query.status);
    if (query.invoiceId) where.add('a.invoice_id = ?', query.invoiceId);
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<AdjustmentRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${ADJUSTMENT_SELECT} ${where.sql}) x
        order by x.requested_at desc, x.id limit ${limit} offset ${offset}`,
      where.params,
    );
    return new Paginated(rows.map(toAdjustment), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // ADJ-03 Duyệt phiếu: số phải trả, còn nợ của hóa đơn tính lại ngay (trigger)
  approve(id: string, dto: ApproveDto, ctx: RequestContext) {
    return this.decide(id, 'APPROVED', dto.note ?? null, ctx);
  }

  // ADJ-04 Từ chối phiếu
  reject(id: string, dto: RejectDto, ctx: RequestContext) {
    return this.decide(id, 'REJECTED', dto.note, ctx);
  }

  private decide(id: string, status: 'APPROVED' | 'REJECTED', note: string | null, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'invoice_adjustments', id))) throw new AppException('RESOURCE_NOT_FOUND');
      const adjustment = await this.findOne(manager, id);
      if (adjustment.status !== 'PENDING') throw new AppException('REQUEST_ALREADY_PROCESSED');
      // Phiếu phải do người khác người lập duyệt
      if (status === 'APPROVED' && adjustment.requestedBy.id === ctx.user.id) {
        throw new AppException('SELF_APPROVAL_NOT_ALLOWED');
      }

      await manager.query(
        `update public.invoice_adjustments
            set status = $2, decided_by = $3, decided_at = now(), decision_note = $4
          where id = $1`,
        [id, status, ctx.user.id, note],
      );
      await this.auditLogsService.log(manager, ctx, {
        action: status === 'APPROVED' ? 'ADJUSTMENT_APPROVED' : 'ADJUSTMENT_REJECTED',
        entityType: 'INVOICE_ADJUSTMENT',
        entityId: id,
        summary: `${status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} phiếu điều chỉnh ${formatMoney(adjustment.amount)} của ${adjustment.invoiceCode}`,
        before: { status: 'PENDING' },
        after: { status, note },
      });
      return this.findOne(manager, id);
    });
  }

  private async findOne(manager: EntityManager, id: string) {
    const row = await selectOne<AdjustmentRow>(manager, `${ADJUSTMENT_SELECT} where a.id = $1`, [id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toAdjustment(row);
  }
}
