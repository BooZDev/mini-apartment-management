import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { vnToday } from 'src/common/utils/date.util';
import { buildOrderBy } from 'src/common/utils/sort.util';
import { likeContains } from 'src/common/utils/text.util';
import { FindInvoicesDto } from './dto/find-invoices.dto';
import { INVOICE_SELECT, INVOICE_STATUS_SQL, InvoiceRow, loadInvoice, toInvoiceSummary } from './invoice-view';

const SORT_FIELDS = {
  billingDate: 'x.billing_date',
  dueDate: 'x.due_date',
  roomCode: 'x.room_code',
  balance: 'x.balance',
  totalAmount: 'x.total_amount',
  issuedAt: 'x.issued_at',
};

@Injectable()
export class InvoicesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // INV-01 Danh sách hóa đơn; TEN-02 dùng cùng hàm với contractId của người thuê
  async findAll(query: FindInvoicesDto, tenantContractId?: string) {
    const where = new WhereBuilder();
    where.param(vnToday());
    const contractId = tenantContractId ?? query.contractId;
    if (query.periodId) where.add('i.period_id = ?', query.periodId);
    if (query.period) where.add('bp.period = ?', query.period);
    if (query.roomId) where.add('i.room_id = ?', query.roomId);
    if (contractId) where.add('i.contract_id = ?', contractId);
    if (query.invoiceType) where.add('i.invoice_type = ?', query.invoiceType);
    if (query.status?.length) where.add(`(${query.status.map((s) => INVOICE_STATUS_SQL[s]).join(' or ')})`);
    if (query.q) {
      const like = likeContains(query.q);
      where.add(`(lower(i.code) like ? escape '\\' or lower(r.code) like ? escape '\\')`, like, like);
    }

    const orderBy = buildOrderBy(query.sort, SORT_FIELDS, '-billingDate', 'x.room_code, x.id');
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<InvoiceRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${INVOICE_SELECT} ${where.sql}) x
        order by ${orderBy} limit ${limit} offset ${offset}`,
      where.params,
    );
    return new Paginated(rows.map(toInvoiceSummary), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // INV-02 Chi tiết hóa đơn
  findOne(id: string) {
    return loadInvoice(this.dataSource.manager, id);
  }
}
