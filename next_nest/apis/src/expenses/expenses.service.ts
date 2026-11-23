import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime } from 'src/common/utils/date.util';
import { formatMoney } from 'src/common/utils/text.util';
import { CreateExpenseCategoryDto, CreateExpenseDto, FindExpensesDto } from './dto/expense.dto';

type ExpenseRow = {
  id: string;
  spent_on: string;
  category_id: string;
  category_name: string;
  amount: number;
  description: string | null;
  recorded_by: string;
  recorded_by_name: string;
  recorded_at: Date;
  total?: number;
};

const EXPENSE_SELECT = `
  select e.id, e.spent_on, e.category_id, c.name as category_name, e.amount, e.description,
         e.recorded_by, u.full_name as recorded_by_name, e.recorded_at
    from public.expenses e
    join public.expense_categories c on c.id = e.category_id
    join public.users u on u.id = e.recorded_by`;

@Injectable()
export class ExpensesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // EXP-01 Danh sách loại chi
  findCategories() {
    return selectRows<{ id: string; name: string; isActive: boolean }>(
      this.dataSource.manager,
      `select id, name, is_active as "isActive" from public.expense_categories order by lower(name)`,
    );
  }

  // EXP-02 Thêm loại chi
  async createCategory(dto: CreateExpenseCategoryDto) {
    const row = await selectOne<{ id: string; name: string; isActive: boolean }>(
      this.dataSource.manager,
      `insert into public.expense_categories (name) values ($1) returning id, name, is_active as "isActive"`,
      [dto.name],
    );
    return row;
  }

  // EXP-03 Danh sách khoản chi
  async findAll(query: FindExpensesDto) {
    const where = new WhereBuilder();
    if (query.fromDate) where.add('e.spent_on >= ?', query.fromDate);
    if (query.toDate) where.add('e.spent_on <= ?', query.toDate);
    if (query.categoryId) where.add('e.category_id = ?', query.categoryId);
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<ExpenseRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${EXPENSE_SELECT} ${where.sql}) x
        order by x.spent_on desc, x.recorded_at desc limit ${limit} offset ${offset}`,
      where.params,
    );
    return new Paginated(rows.map(toExpense), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // EXP-04 Ghi khoản chi
  create(dto: CreateExpenseDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const category = await selectOne<{ name: string }>(
        manager,
        `select name from public.expense_categories where id = $1 and is_active`,
        [dto.categoryId],
      );
      if (!category) throw AppException.field('categoryId', DetailCode.INVALID_FORMAT, 'Loại chi không tồn tại');

      const row = await selectOne<{ id: string }>(
        manager,
        `insert into public.expenses (category_id, spent_on, amount, description, recorded_by)
         values ($1, $2, $3, $4, $5) returning id`,
        [dto.categoryId, dto.spentOn, dto.amount, dto.description ?? null, ctx.user.id],
      );
      await this.auditLogsService.log(manager, ctx, {
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        entityId: row!.id,
        summary: `Ghi khoản chi ${category.name} ${formatMoney(dto.amount)} ngày ${dto.spentOn}`,
        after: { category: category.name, amount: dto.amount, spentOn: dto.spentOn },
      });
      return this.findOne(manager, row!.id);
    });
  }

  private async findOne(manager: EntityManager, id: string) {
    const row = await selectOne<ExpenseRow>(manager, `${EXPENSE_SELECT} where e.id = $1`, [id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toExpense(row);
  }
}

function toExpense(r: ExpenseRow) {
  return {
    id: r.id,
    spentOn: r.spent_on,
    categoryId: r.category_id,
    categoryName: r.category_name,
    amount: r.amount,
    description: r.description,
    recordedBy: { id: r.recorded_by, fullName: r.recorded_by_name },
    recordedAt: toVnDateTime(r.recorded_at),
  };
}
