import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { ChargeTypesService } from './charge-types.service';
import { CreateChargeTypeDto } from './dto/create-charge-type.dto';
import { CreatePriceDto } from './dto/create-price.dto';
import { FindChargeTypesDto } from './dto/find-charge-types.dto';
import { UpdateChargeTypeDto } from './dto/update-charge-type.dto';

@ApiTags('charge-types')
@ApiCookieAuth()
@Roles(Role.OWNER)
@Controller('charge-types')
export class ChargeTypesController {
  constructor(private readonly chargeTypesService: ChargeTypesService) {}

  // CHG-01 Danh sách khoản thu
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @Get()
  @ApiOperation({
    summary: 'Danh sách khoản thu kèm đơn giá hiện hành',
    description: 'CHG-01. Cần quyền OWNER, MANAGER hoặc ACCOUNTANT. Sắp theo tên',
  })
  findAll(@Query() query: FindChargeTypesDto) {
    return this.chargeTypesService.findAll(query);
  }

  // CHG-02 Thêm khoản thu
  @Post()
  @ApiOperation({ summary: 'Thêm khoản thu', description: 'CHG-02. Cần quyền OWNER' })
  @ApiBody({ type: CreateChargeTypeDto })
  create(@Body() dto: CreateChargeTypeDto, @ReqCtx() ctx: RequestContext) {
    return this.chargeTypesService.create(dto, ctx);
  }

  // CHG-03 Sửa, ngừng dùng khoản thu
  @Patch(':chargeTypeId')
  @ApiOperation({
    summary: 'Sửa, ngừng dùng khoản thu',
    description:
      'CHG-03. Cần quyền OWNER. Cách tính, loại công tơ không đổi được khi khoản thu đã dùng trong hóa đơn; khoản Tiền phòng không đổi cách tính, không ngừng dùng được',
  })
  @ApiParam({ name: 'chargeTypeId', description: 'ID khoản thu' })
  @ApiBody({ type: UpdateChargeTypeDto })
  update(
    @Param('chargeTypeId', ParseIdPipe) chargeTypeId: string,
    @Body() dto: UpdateChargeTypeDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.chargeTypesService.update(chargeTypeId, dto, ctx);
  }

  // CHG-04 Lịch sử đơn giá
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @Get(':chargeTypeId/prices')
  @ApiOperation({ summary: 'Lịch sử đơn giá', description: 'CHG-04. Cần quyền OWNER, MANAGER hoặc ACCOUNTANT' })
  @ApiParam({ name: 'chargeTypeId', description: 'ID khoản thu' })
  findPrices(@Param('chargeTypeId', ParseIdPipe) chargeTypeId: string) {
    return this.chargeTypesService.findPrices(chargeTypeId);
  }

  // CHG-05 Thêm đơn giá có ngày hiệu lực
  @Post(':chargeTypeId/prices')
  @ApiOperation({
    summary: 'Thêm đơn giá có ngày hiệu lực',
    description: 'CHG-05. Cần quyền OWNER. Hóa đơn đã phát hành không đổi',
  })
  @ApiParam({ name: 'chargeTypeId', description: 'ID khoản thu' })
  @ApiBody({ type: CreatePriceDto })
  createPrice(
    @Param('chargeTypeId', ParseIdPipe) chargeTypeId: string,
    @Body() dto: CreatePriceDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.chargeTypesService.createPrice(chargeTypeId, dto, ctx);
  }

  // CHG-06 Xóa đơn giá
  @Delete(':chargeTypeId/prices/:priceId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Xóa đơn giá chưa từng dùng',
    description: 'CHG-06. Cần quyền OWNER. Không xóa được đơn giá đã dùng hoặc đơn giá duy nhất của khoản thu',
  })
  @ApiParam({ name: 'chargeTypeId', description: 'ID khoản thu' })
  @ApiParam({ name: 'priceId', description: 'ID đơn giá' })
  async deletePrice(
    @Param('chargeTypeId', ParseIdPipe) chargeTypeId: string,
    @Param('priceId', ParseIdPipe) priceId: string,
    @ReqCtx() ctx: RequestContext,
  ) {
    await this.chargeTypesService.deletePrice(chargeTypeId, priceId, ctx);
  }
}
