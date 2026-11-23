import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CurrentUser, TenantInfo } from 'src/auth/types/current-user';
import { selectOne } from 'src/common/database/query.util';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { vnToday } from 'src/common/utils/date.util';
import { ContractsService } from 'src/contracts/contracts.service';
import { FindInvoicesDto } from 'src/invoices/dto/find-invoices.dto';
import { loadInvoice } from 'src/invoices/invoice-view';
import { InvoicesService } from 'src/invoices/invoices.service';
import { findOccupantsOfContracts, toOccupantSummary } from 'src/occupants/occupant-view';
import { FindPaymentsDto } from 'src/payments/dto/payment.dto';
import { loadReceipt } from 'src/payments/payment-view';
import { PaymentsService } from 'src/payments/payments.service';
import { CreateTenantRequestDto, FindTenantRequestsDto } from 'src/tenant-requests/dto/tenant-request.dto';
import { TenantRequestsService } from 'src/tenant-requests/tenant-requests.service';
import { MyInvoicesQueryDto } from './tenant-portal.dto';

/** Cổng người thuê: phòng, hợp đồng luôn lấy từ phiên đăng nhập, không nhận từ giao diện. */
@Injectable()
export class TenantPortalService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly contractsService: ContractsService,
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
    private readonly tenantRequestsService: TenantRequestsService,
  ) {}

  // TEN-01 Phòng của tôi
  async room(user: CurrentUser) {
    const tenant = tenantOf(user);
    const row = await selectOne<{
      code: string;
      floor: number;
      area_m2: number;
      id: string;
      start_date: string;
      end_date: string;
      monthly_rent: number;
      deposit: number;
      status: string;
    }>(
      this.dataSource.manager,
      `select r.code, r.floor, r.area_m2, c.id, c.start_date, c.end_date, c.monthly_rent, c.deposit,
              case when c.ended_on is not null then 'ENDED' when c.start_date > $2::date then 'UPCOMING' else 'ACTIVE' end as status
         from public.contracts c join public.rooms r on r.id = c.room_id
        where c.id = $1`,
      [tenant.contractId, vnToday()],
    );
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    const occupants = await findOccupantsOfContracts(this.dataSource.manager, [tenant.contractId], false);
    return {
      room: { code: row.code, floor: row.floor, areaM2: row.area_m2 },
      contract: {
        id: row.id,
        startDate: row.start_date,
        endDate: row.end_date,
        monthlyRent: row.monthly_rent,
        deposit: row.deposit,
        status: row.status,
      },
      occupants: occupants.map((o) => toOccupantSummary(o, 'NAME_ONLY')),
    };
  }

  // TEN-02 Hóa đơn của tôi, gồm cả hóa đơn thanh lý
  invoices(user: CurrentUser, query: MyInvoicesQueryDto) {
    return this.invoicesService.findAll(
      Object.assign(new FindInvoicesDto(), { page: query.page, pageSize: query.pageSize, status: query.status }),
      tenantOf(user).contractId,
    );
  }

  // TEN-03 Chi tiết hóa đơn của tôi: hóa đơn phòng khác trả 404
  invoice(user: CurrentUser, invoiceId: string) {
    return loadInvoice(this.dataSource.manager, invoiceId, { tenantContractId: tenantOf(user).contractId });
  }

  // TEN-04 Lịch sử thanh toán, không kèm người thu
  payments(user: CurrentUser, query: PaginationQueryDto) {
    return this.paymentsService.findAll(
      Object.assign(new FindPaymentsDto(), { page: query.page, pageSize: query.pageSize }),
      { contractId: tenantOf(user).contractId, hideRecordedBy: true },
    );
  }

  // TEN-05 Biên lai
  receipt(user: CurrentUser, paymentId: string) {
    return loadReceipt(this.dataSource.manager, paymentId, tenantOf(user).contractId);
  }

  // TEN-06 Hợp đồng của tôi: người ở chỉ có họ tên
  contract(user: CurrentUser) {
    return this.contractsService.findView(this.dataSource.manager, tenantOf(user).contractId, 'NAME_ONLY');
  }

  // TEN-07 Gửi yêu cầu
  createRequest(user: CurrentUser, dto: CreateTenantRequestDto) {
    return this.tenantRequestsService.create(user, dto);
  }

  // TEN-08 Yêu cầu đã gửi
  requests(user: CurrentUser, query: PaginationQueryDto) {
    return this.tenantRequestsService.findAll(
      Object.assign(new FindTenantRequestsDto(), { page: query.page, pageSize: query.pageSize }),
      tenantOf(user).contractId,
    );
  }
}

function tenantOf(user: CurrentUser): TenantInfo {
  if (!user.tenant) throw new AppException('RESOURCE_NOT_FOUND');
  return user.tenant;
}
