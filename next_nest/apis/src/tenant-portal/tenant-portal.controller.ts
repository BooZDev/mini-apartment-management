import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { CreateTenantRequestDto } from 'src/tenant-requests/dto/tenant-request.dto';
import { MyInvoicesQueryDto } from './tenant-portal.dto';
import { TenantPortalService } from './tenant-portal.service';

@ApiTags('me')
@ApiCookieAuth()
@Roles(Role.TENANT)
@Controller('me')
export class TenantPortalController {
  constructor(private readonly tenantPortalService: TenantPortalService) {}

  // TEN-01 Phòng của tôi
  @Get('room')
  @ApiOperation({ summary: 'Phòng của tôi', description: 'TEN-01. Người thuê. Không có CCCD hay thông tin cá nhân của người khác' })
  room(@AuthUser() user: CurrentUser) {
    return this.tenantPortalService.room(user);
  }

  // TEN-02 Hóa đơn của tôi
  @Get('invoices')
  @ApiOperation({ summary: 'Hóa đơn của tôi', description: 'TEN-02. Người thuê. Gồm cả hóa đơn thanh lý' })
  invoices(@AuthUser() user: CurrentUser, @Query() query: MyInvoicesQueryDto) {
    return this.tenantPortalService.invoices(user, query);
  }

  // TEN-03 Chi tiết một hóa đơn của tôi
  @Get('invoices/:invoiceId')
  @ApiOperation({
    summary: 'Chi tiết một hóa đơn của tôi',
    description: 'TEN-03. Người thuê. Chỉ phiếu điều chỉnh đã duyệt; hóa đơn phòng khác trả 404',
  })
  @ApiParam({ name: 'invoiceId', description: 'ID hóa đơn' })
  invoice(@AuthUser() user: CurrentUser, @Param('invoiceId', ParseIdPipe) invoiceId: string) {
    return this.tenantPortalService.invoice(user, invoiceId);
  }

  // TEN-04 Lịch sử thanh toán của tôi
  @Get('payments')
  @ApiOperation({ summary: 'Lịch sử thanh toán của tôi', description: 'TEN-04. Người thuê' })
  payments(@AuthUser() user: CurrentUser, @Query() query: PaginationQueryDto) {
    return this.tenantPortalService.payments(user, query);
  }

  // TEN-05 Biên lai
  @Get('payments/:paymentId/receipt')
  @ApiOperation({ summary: 'Biên lai', description: 'TEN-05. Người thuê' })
  @ApiParam({ name: 'paymentId', description: 'ID thanh toán' })
  receipt(@AuthUser() user: CurrentUser, @Param('paymentId', ParseIdPipe) paymentId: string) {
    return this.tenantPortalService.receipt(user, paymentId);
  }

  // TEN-06 Hợp đồng của tôi
  @Get('contract')
  @ApiOperation({ summary: 'Hợp đồng của tôi', description: 'TEN-06. Người thuê. Người ở chỉ có họ tên' })
  contract(@AuthUser() user: CurrentUser) {
    return this.tenantPortalService.contract(user);
  }

  // TEN-07 Gửi yêu cầu
  @Post('requests')
  @ApiOperation({
    summary: 'Gửi yêu cầu',
    description: 'TEN-07. Người thuê. Thay đổi người ở (chờ duyệt) hoặc sửa chữa; hợp đồng đã kết thúc chỉ còn quyền xem',
  })
  @ApiBody({ type: CreateTenantRequestDto })
  createRequest(@AuthUser() user: CurrentUser, @Body() dto: CreateTenantRequestDto) {
    return this.tenantPortalService.createRequest(user, dto);
  }

  // TEN-08 Yêu cầu đã gửi
  @Get('requests')
  @ApiOperation({ summary: 'Yêu cầu đã gửi', description: 'TEN-08. Người thuê' })
  requests(@AuthUser() user: CurrentUser, @Query() query: PaginationQueryDto) {
    return this.tenantPortalService.requests(user, query);
  }
}
