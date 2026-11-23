import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { BillingPeriodsService } from './billing-periods.service';
import {
  CreateBillingPeriodDto,
  CreateExtraChargeDto,
  IssueInvoicesDto,
  UpdateBillingPeriodDto,
} from './dto/billing-period.dto';

@ApiTags('billing-periods')
@ApiCookieAuth()
@Roles(Role.MANAGER)
@Controller('billing-periods')
export class BillingPeriodsController {
  constructor(private readonly billingPeriodsService: BillingPeriodsService) {}

  // BIL-01 Danh sách kỳ hóa đơn
  @Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
  @Get()
  @ApiOperation({ summary: 'Danh sách kỳ hóa đơn', description: 'BIL-01. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Sắp -period' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.billingPeriodsService.findAll(query);
  }

  // BIL-02 Lên lịch kỳ thu
  @Roles(Role.ACCOUNTANT)
  @Post()
  @ApiOperation({
    summary: 'Lên lịch kỳ thu',
    description: 'BIL-02. Cần quyền ACCOUNTANT. Ngày thu, hạn thanh toán mặc định theo thiết lập lịch thu của tòa',
  })
  @ApiBody({ type: CreateBillingPeriodDto })
  create(@Body() dto: CreateBillingPeriodDto, @AuthUser() user: CurrentUser) {
    return this.billingPeriodsService.create(dto, user.id);
  }

  // BIL-03 Chi tiết kỳ
  @Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
  @Get(':periodId')
  @ApiOperation({ summary: 'Chi tiết kỳ', description: 'BIL-03. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT' })
  @ApiParam({ name: 'periodId', description: 'ID kỳ hóa đơn' })
  findOne(@Param('periodId', ParseIdPipe) periodId: string) {
    return this.billingPeriodsService.findOne(periodId);
  }

  // BIL-04 Xem trước hóa đơn của kỳ
  @Get(':periodId/preview')
  @ApiOperation({ summary: 'Xem trước hóa đơn của kỳ', description: 'BIL-04. Cần quyền MANAGER. Không lưu gì' })
  @ApiParam({ name: 'periodId', description: 'ID kỳ hóa đơn' })
  preview(@Param('periodId', ParseIdPipe) periodId: string) {
    return this.billingPeriodsService.preview(periodId);
  }

  // BIL-05 Phát hành hóa đơn
  @Post(':periodId/issue')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Phát hành hóa đơn',
    description:
      'BIL-05. Cần quyền MANAGER. Tính lại tại lúc phát hành, mỗi phòng một giao dịch; phòng đã có hóa đơn nằm trong skipped',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'UUID sinh mỗi lần mở form (khuyến nghị)' })
  @ApiParam({ name: 'periodId', description: 'ID kỳ hóa đơn' })
  @ApiBody({ type: IssueInvoicesDto, required: false })
  issue(
    @Param('periodId', ParseIdPipe) periodId: string,
    @Body() dto: IssueInvoicesDto,
    @ReqCtx() ctx: RequestContext,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.billingPeriodsService.issue(periodId, dto, ctx, idempotencyKey);
  }

  // BIL-06 Thêm khoản phát sinh
  @Post(':periodId/extra-charges')
  @ApiOperation({
    summary: 'Thêm khoản phát sinh',
    description: 'BIL-06. Cần quyền MANAGER. Phòng đã có hóa đơn kỳ này thì dùng phiếu điều chỉnh',
  })
  @ApiParam({ name: 'periodId', description: 'ID kỳ hóa đơn' })
  @ApiBody({ type: CreateExtraChargeDto })
  createExtraCharge(
    @Param('periodId', ParseIdPipe) periodId: string,
    @Body() dto: CreateExtraChargeDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.billingPeriodsService.createExtraCharge(periodId, dto, ctx);
  }

  // BIL-07 Xóa khoản phát sinh
  @Delete(':periodId/extra-charges/:extraChargeId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa khoản phát sinh chưa phát hành', description: 'BIL-07. Cần quyền MANAGER' })
  @ApiParam({ name: 'periodId', description: 'ID kỳ hóa đơn' })
  @ApiParam({ name: 'extraChargeId', description: 'ID khoản phát sinh' })
  async deleteExtraCharge(
    @Param('periodId', ParseIdPipe) periodId: string,
    @Param('extraChargeId', ParseIdPipe) extraChargeId: string,
    @ReqCtx() ctx: RequestContext,
  ) {
    await this.billingPeriodsService.deleteExtraCharge(periodId, extraChargeId, ctx);
  }

  // BIL-08 Sửa lịch thu của kỳ
  @Roles(Role.ACCOUNTANT)
  @Patch(':periodId')
  @ApiOperation({ summary: 'Sửa lịch thu của kỳ', description: 'BIL-08. Cần quyền ACCOUNTANT. Kỳ đã có hóa đơn thì không sửa' })
  @ApiParam({ name: 'periodId', description: 'ID kỳ hóa đơn' })
  @ApiBody({ type: UpdateBillingPeriodDto })
  update(@Param('periodId', ParseIdPipe) periodId: string, @Body() dto: UpdateBillingPeriodDto) {
    return this.billingPeriodsService.update(periodId, dto);
  }
}
