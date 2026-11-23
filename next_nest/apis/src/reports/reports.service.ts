import { Injectable, StreamableFile } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/types/current-user';
import { DetailCode } from 'src/common/constants/error-codes';
import { selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { validationDetails } from 'src/common/pipes/validation.pipe';
import { addDays, compactDate, firstDayOf, periodsBetween, vnToday } from 'src/common/utils/date.util';
import { buildWorkbook, ExcelColumn } from 'src/common/utils/excel.util';
import { buildOrderBy } from 'src/common/utils/sort.util';
import { likeContains, sqlUnaccent } from 'src/common/utils/text.util';
import { DebtsQueryDto, MonthRangeDto, OccupancyQueryDto, ReportType } from './dto/report.dto';

type DebtRow = {
  room_id: string;
  room_code: string;
  contract_id: string;
  primary_tenant_name: string;
  contract_status: string;
  unpaid_invoice_count: number;
  total_balance: number;
  overdue_balance: number;
  oldest_due_date: string;
  total: number;
  sum_total_balance: number;
  sum_overdue_balance: number;
};

type RevenueRow = {
  month: string;
  total_collected: number;
  payment_count: number;
  cash_amount: number;
  bank_transfer_amount: number;
  deposit_amount: number;
  cancelled_amount: number;
};

// Công nợ thuộc hợp đồng, kể cả hợp đồng đã kết thúc; $1 là hôm nay
const DEBT_SELECT = `
  select c.room_id, r.code as room_code, c.id as contract_id, o.full_name as primary_tenant_name,
         case when c.ended_on is not null then 'ENDED' when c.start_date > $1::date then 'UPCOMING' else 'ACTIVE' end as contract_status,
         count(*) as unpaid_invoice_count,
         sum(i.balance) as total_balance,
         coalesce(sum(i.balance) filter (where $1::date > i.due_date), 0) as overdue_balance,
         min(i.due_date) as oldest_due_date
    from public.invoices i
    join public.contracts c on c.id = i.contract_id
    join public.rooms r on r.id = c.room_id
    join public.occupants o on o.id = c.primary_occupant_id
   where i.balance > 0
   group by c.id, c.room_id, r.code, o.full_name`;

const DEBT_SORT = {
  totalBalance: 'x.total_balance',
  overdueBalance: 'x.overdue_balance',
  roomCode: 'x.room_code',
  oldestDueDate: 'x.oldest_due_date',
};

// Doanh thu là tiền thực thu theo ngày nộp; thanh toán đã hủy chỉ để đối chiếu
const REVENUE_SELECT = `
  with months as (
    select to_char(m, 'YYYY-MM') as month
      from generate_series($1::date, $2::date, interval '1 month') m
  )
  select m.month,
         coalesce(sum(p.amount) filter (where p.status <> 'CANCELLED'), 0) as total_collected,
         count(p.id) filter (where p.status <> 'CANCELLED') as payment_count,
         coalesce(sum(p.amount) filter (where p.status <> 'CANCELLED' and p.method = 'CASH'), 0) as cash_amount,
         coalesce(sum(p.amount) filter (where p.status <> 'CANCELLED' and p.method = 'BANK_TRANSFER'), 0) as bank_transfer_amount,
         coalesce(sum(p.amount) filter (where p.status <> 'CANCELLED' and p.method = 'DEPOSIT'), 0) as deposit_amount,
         coalesce(sum(p.amount) filter (where p.status = 'CANCELLED'), 0) as cancelled_amount
    from months m
    left join public.payments p on to_char(p.paid_on, 'YYYY-MM') = m.month
   group by m.month
   order by m.month`;

const REPORT_ROLES: Record<ReportType, Role[]> = {
  [ReportType.DEBTS]: [Role.ACCOUNTANT, Role.OWNER],
  [ReportType.REVENUE]: [Role.OWNER],
  [ReportType.PROFIT]: [Role.OWNER],
  [ReportType.OCCUPANCY]: [Role.OWNER, Role.MANAGER],
};

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // RPT-01 Công nợ
  async debts(query: DebtsQueryDto, paginate = true) {
    const where = new WhereBuilder();
    where.param(vnToday());
    if (query.overdueOnly) where.add('x.overdue_balance > 0');
    if (query.q) {
      const like = likeContains(query.q);
      where.add(`(${sqlUnaccent('x.primary_tenant_name')} like ? escape '\\' or lower(x.room_code) like ? escape '\\')`, like, like);
    }
    const orderBy = buildOrderBy(query.sort, DEBT_SORT, '-totalBalance', 'x.room_code, x.contract_id');
    const page = paginate
      ? `limit ${where.param(query.pageSize)} offset ${where.param((query.page - 1) * query.pageSize)}`
      : '';

    const rows = await selectRows<DebtRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total,
              sum(x.total_balance) over () as sum_total_balance,
              sum(x.overdue_balance) over () as sum_overdue_balance
         from (${DEBT_SELECT}) x
         ${where.sql}
        order by ${orderBy} ${page}`,
      where.params,
    );
    const data = rows.map((r) => ({
      roomId: r.room_id,
      roomCode: r.room_code,
      contractId: r.contract_id,
      primaryTenantName: r.primary_tenant_name,
      contractStatus: r.contract_status,
      unpaidInvoiceCount: r.unpaid_invoice_count,
      totalBalance: r.total_balance,
      overdueBalance: r.overdue_balance,
      hasOverdue: r.overdue_balance > 0,
      oldestDueDate: r.oldest_due_date,
    }));
    const totals = {
      rowCount: rows[0]?.total ?? 0,
      totalBalance: rows[0]?.sum_total_balance ?? 0,
      overdueBalance: rows[0]?.sum_overdue_balance ?? 0,
    };
    return new Paginated(data, query.page, query.pageSize, totals.rowCount, { totals });
  }

  // RPT-02 Doanh thu theo tháng
  async revenue(query: MonthRangeDto) {
    assertMonthRange(query);
    const rows = await selectRows<RevenueRow>(this.dataSource.manager, REVENUE_SELECT, [
      firstDayOf(query.fromMonth),
      firstDayOf(query.toMonth),
    ]);
    return rows.map((r) => ({
      month: r.month,
      totalCollected: r.total_collected,
      paymentCount: r.payment_count,
      cashAmount: r.cash_amount,
      bankTransferAmount: r.bank_transfer_amount,
      depositAmount: r.deposit_amount,
      cancelledAmount: r.cancelled_amount,
    }));
  }

  // RPT-03 Thu, chi, lợi nhuận
  async profit(query: MonthRangeDto) {
    const revenue = await this.revenue(query);
    const expenses = await selectRows<{ month: string; category_name: string; amount: number }>(
      this.dataSource.manager,
      `select to_char(e.spent_on, 'YYYY-MM') as month, c.name as category_name, sum(e.amount) as amount
         from public.expenses e join public.expense_categories c on c.id = e.category_id
        where e.spent_on >= $1::date and e.spent_on < ($2::date + interval '1 month')
        group by 1, 2 order by 1, 2`,
      [firstDayOf(query.fromMonth), firstDayOf(query.toMonth)],
    );
    return revenue.map((r) => {
      const byCategory = expenses.filter((e) => e.month === r.month);
      const total = byCategory.reduce((sum, e) => sum + e.amount, 0);
      return {
        month: r.month,
        revenue: r.totalCollected,
        expenses: total,
        profit: r.totalCollected - total,
        expensesByCategory: byCategory.map((e) => ({ categoryName: e.category_name, amount: e.amount })),
      };
    });
  }

  // RPT-04 Lấp đầy, phòng trống, hợp đồng sắp hết hạn
  async occupancy(query: OccupancyQueryDto) {
    const today = vnToday();
    const counts = await selectOne<{ total: number; occupied: number; maintenance: number; occupants: number }>(
      this.dataSource.manager,
      `select count(*) as total,
              count(*) filter (where not r.is_under_maintenance and exists (
                select 1 from public.contracts c where c.room_id = r.id and c.ended_on is null and c.start_date <= $1::date
              )) as occupied,
              count(*) filter (where r.is_under_maintenance) as maintenance,
              (select count(*) from public.contract_occupants co join public.contracts c on c.id = co.contract_id
                where c.ended_on is null and c.start_date <= $1::date
                  and co.move_in_date <= $1::date and (co.move_out_date is null or co.move_out_date > $1::date)) as occupants
         from public.rooms r`,
      [today],
    );
    const expiring = await selectRows<{ contract_id: string; room_code: string; primary_tenant_name: string; end_date: string }>(
      this.dataSource.manager,
      `select c.id as contract_id, r.code as room_code, o.full_name as primary_tenant_name, c.end_date
         from public.contracts c
         join public.rooms r on r.id = c.room_id
         join public.occupants o on o.id = c.primary_occupant_id
        where c.ended_on is null and c.start_date <= $1::date and c.end_date between $1::date and $2::date
        order by c.end_date, r.code`,
      [today, addDays(today, query.expiringWithinDays)],
    );

    const total = counts?.total ?? 0;
    const maintenance = counts?.maintenance ?? 0;
    const occupied = counts?.occupied ?? 0;
    const usable = total - maintenance;
    return {
      totalRooms: total,
      occupiedRooms: occupied,
      vacantRooms: usable - occupied,
      maintenanceRooms: maintenance,
      occupancyRate: usable > 0 ? Math.round((occupied / usable) * 10_000) / 10_000 : 0,
      occupantCount: counts?.occupants ?? 0,
      expiringContracts: expiring.map((e) => ({
        contractId: e.contract_id,
        roomCode: e.room_code,
        primaryTenantName: e.primary_tenant_name,
        endDate: e.end_date,
      })),
    };
  }

  // RPT-05 Xuất báo cáo ra Excel
  async export(type: string, rawQuery: Record<string, unknown>, user: CurrentUser) {
    if (!Object.values(ReportType).includes(type as ReportType)) throw new AppException('RESOURCE_NOT_FOUND');
    const reportType = type as ReportType;
    if (!REPORT_ROLES[reportType].some((role) => user.roles.includes(role))) throw new AppException('FORBIDDEN');

    const name = `bao-cao-${reportType}-${compactDate(vnToday())}.xlsx`;
    const file = (buffer: Buffer) =>
      new StreamableFile(buffer, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="${name}"`,
      });

    switch (reportType) {
      case ReportType.DEBTS: {
        const query = await parseQuery(DebtsQueryDto, rawQuery);
        const { data } = await this.debts(query, false);
        return file(
          await buildWorkbook<(typeof data)[number]>('Công nợ', [
            { header: 'Phòng', value: (r) => r.roomCode, width: 10 },
            { header: 'Người đứng tên', value: (r) => r.primaryTenantName, width: 26 },
            { header: 'Trạng thái hợp đồng', value: (r) => r.contractStatus, width: 18 },
            { header: 'Số hóa đơn còn nợ', value: (r) => r.unpaidInvoiceCount, width: 16 },
            { header: 'Tổng còn nợ', value: (r) => r.totalBalance, width: 16 },
            { header: 'Nợ quá hạn', value: (r) => r.overdueBalance, width: 16 },
            { header: 'Hạn sớm nhất', value: (r) => r.oldestDueDate, width: 14 },
          ], data),
        );
      }
      case ReportType.REVENUE: {
        const rows = await this.revenue(await parseQuery(MonthRangeDto, rawQuery));
        return file(
          await buildWorkbook<(typeof rows)[number]>('Doanh thu', [
            { header: 'Tháng', value: (r) => r.month, width: 10 },
            { header: 'Tổng thực thu', value: (r) => r.totalCollected, width: 16 },
            { header: 'Số lần nộp', value: (r) => r.paymentCount, width: 12 },
            { header: 'Tiền mặt', value: (r) => r.cashAmount, width: 16 },
            { header: 'Chuyển khoản', value: (r) => r.bankTransferAmount, width: 16 },
            { header: 'Cấn trừ cọc', value: (r) => r.depositAmount, width: 16 },
            { header: 'Đã hủy (đối chiếu)', value: (r) => r.cancelledAmount, width: 18 },
          ], rows),
        );
      }
      case ReportType.PROFIT: {
        const rows = await this.profit(await parseQuery(MonthRangeDto, rawQuery));
        const columns: ExcelColumn<(typeof rows)[number]>[] = [
          { header: 'Tháng', value: (r) => r.month, width: 10 },
          { header: 'Doanh thu', value: (r) => r.revenue, width: 16 },
          { header: 'Chi phí', value: (r) => r.expenses, width: 16 },
          { header: 'Lợi nhuận', value: (r) => r.profit, width: 16 },
        ];
        return file(await buildWorkbook('Thu chi', columns, rows));
      }
      case ReportType.OCCUPANCY: {
        const report = await this.occupancy(await parseQuery(OccupancyQueryDto, rawQuery));
        return file(
          await buildWorkbook<(typeof report.expiringContracts)[number]>('Hợp đồng sắp hết hạn', [
            { header: 'Phòng', value: (r) => r.roomCode, width: 10 },
            { header: 'Người đứng tên', value: (r) => r.primaryTenantName, width: 26 },
            { header: 'Ngày hết hạn', value: (r) => r.endDate, width: 14 },
          ], report.expiringContracts),
        );
      }
    }
  }
}

function assertMonthRange(query: MonthRangeDto) {
  const months = query.fromMonth <= query.toMonth ? periodsBetween(query.fromMonth, query.toMonth).length : 0;
  if (months < 1 || months > 12) {
    throw AppException.field('toMonth', DetailCode.OUT_OF_RANGE, 'Khoảng tháng từ 1 đến 12 tháng, đến tháng không trước từ tháng');
  }
}

async function parseQuery<T extends object>(cls: new () => T, raw: Record<string, unknown>): Promise<T> {
  const dto = plainToInstance(cls, raw);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) throw new AppException('VALIDATION_ERROR', validationDetails(errors));
  return dto;
}
