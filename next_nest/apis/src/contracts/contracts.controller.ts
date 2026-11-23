import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { EndContractDto, SettlementPreviewDto } from './dto/end-contract.dto';
import { FindContractsDto } from './dto/find-contracts.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateServicesDto } from './dto/update-services.dto';
import { SettlementService } from './settlement.service';

@ApiTags('contracts')
@ApiCookieAuth()
@Roles(Role.MANAGER)
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly settlementService: SettlementService,
  ) {}

  // CTR-01 Danh sách hợp đồng
  @Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
  @Get()
  @ApiOperation({
    summary: 'Danh sách hợp đồng',
    description: 'CTR-01. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Không kèm người ở; sắp mặc định -startDate',
  })
  findAll(@Query() query: FindContractsDto) {
    return this.contractsService.findAll(query);
  }

  // CTR-02 Nhập hợp đồng đã ký giấy, tạo tài khoản người thuê
  @Post()
  @ApiOperation({
    summary: 'Nhập hợp đồng đã ký giấy, tạo tài khoản người thuê',
    description:
      'CTR-02. Cần quyền MANAGER. Một giao dịch: hợp đồng, người ở, dịch vụ, chỉ số bàn giao và tài khoản người thuê mới. Mật khẩu tạm chỉ trả một lần',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'UUID sinh mỗi lần mở form (khuyến nghị)' })
  @ApiBody({ type: CreateContractDto })
  create(
    @Body() dto: CreateContractDto,
    @ReqCtx() ctx: RequestContext,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.contractsService.create(dto, ctx, idempotencyKey);
  }

  // CTR-03 Chi tiết hợp đồng
  @Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
  @Get(':contractId')
  @ApiOperation({
    summary: 'Chi tiết hợp đồng',
    description: 'CTR-03. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Người ở lọc trường theo vai trò',
  })
  @ApiParam({ name: 'contractId', description: 'ID hợp đồng' })
  findOne(@Param('contractId', ParseIdPipe) contractId: string, @AuthUser() user: CurrentUser) {
    return this.contractsService.findOne(contractId, user);
  }

  // CTR-08 Xem trước thanh lý
  @Post(':contractId/settlement-preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Xem trước thanh lý',
    description: 'CTR-08. Cần quyền MANAGER. Tính hóa đơn thanh lý và cấn trừ tiền cọc, không lưu gì',
  })
  @ApiParam({ name: 'contractId', description: 'ID hợp đồng' })
  @ApiBody({ type: SettlementPreviewDto })
  settlementPreview(@Param('contractId', ParseIdPipe) contractId: string, @Body() dto: SettlementPreviewDto) {
    return this.settlementService.preview(contractId, dto);
  }

  // CTR-04 Kết thúc hợp đồng, thanh lý
  @Post(':contractId/end')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Kết thúc hợp đồng, thanh lý, cấn trừ tiền cọc',
    description:
      'CTR-04. Cần quyền MANAGER. Một giao dịch: chỉ số trả phòng, hóa đơn thanh lý, cấn trừ cọc; tài khoản người thuê chỉ đọc 30 ngày',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'UUID sinh mỗi lần mở form (khuyến nghị)' })
  @ApiParam({ name: 'contractId', description: 'ID hợp đồng' })
  @ApiBody({ type: EndContractDto })
  end(
    @Param('contractId', ParseIdPipe) contractId: string,
    @Body() dto: EndContractDto,
    @ReqCtx() ctx: RequestContext,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.settlementService.end(contractId, dto, ctx, idempotencyKey);
  }

  // CTR-05 Cập nhật dịch vụ đăng ký
  @Put(':contractId/services')
  @ApiOperation({
    summary: 'Cập nhật dịch vụ đăng ký',
    description: 'CTR-05. Cần quyền MANAGER. Danh sách mới thay thế danh sách cũ từ kỳ fromPeriod; kỳ đã phát hành không đổi',
  })
  @ApiParam({ name: 'contractId', description: 'ID hợp đồng' })
  @ApiBody({ type: UpdateServicesDto })
  updateServices(@Param('contractId', ParseIdPipe) contractId: string, @Body() dto: UpdateServicesDto) {
    return this.contractsService.updateServices(contractId, dto);
  }

  // CTR-06 Sửa thông tin hợp đồng nhập sai
  @Patch(':contractId')
  @ApiOperation({
    summary: 'Sửa thông tin hợp đồng nhập sai',
    description:
      'CTR-06. Cần quyền MANAGER. Hợp đồng đã có hóa đơn thì không đổi được ngày bắt đầu, giá thuê, chỉ số bàn giao',
  })
  @ApiParam({ name: 'contractId', description: 'ID hợp đồng' })
  @ApiBody({ type: UpdateContractDto })
  update(
    @Param('contractId', ParseIdPipe) contractId: string,
    @Body() dto: UpdateContractDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.contractsService.update(contractId, dto, ctx);
  }

  // CTR-07 Gia hạn hợp đồng
  @Post(':contractId/renew')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Gia hạn hợp đồng theo phụ lục',
    description: 'CTR-07. Cần quyền MANAGER. Tài khoản người thuê, người ở, dịch vụ giữ nguyên',
  })
  @ApiParam({ name: 'contractId', description: 'ID hợp đồng' })
  @ApiBody({ type: RenewContractDto })
  renew(
    @Param('contractId', ParseIdPipe) contractId: string,
    @Body() dto: RenewContractDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.contractsService.renew(contractId, dto, ctx);
  }
}
