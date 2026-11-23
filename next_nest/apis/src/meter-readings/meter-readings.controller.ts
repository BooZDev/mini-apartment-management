import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { FindMeterReadingsDto, SaveMeterReadingsDto } from './dto/meter-reading.dto';
import { MeterReadingsService } from './meter-readings.service';

@ApiTags('meter-readings')
@ApiCookieAuth()
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  // MTR-01 Bảng chỉ số của một kỳ
  @Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
  @Get()
  @ApiOperation({
    summary: 'Bảng chỉ số của một kỳ',
    description: 'MTR-01. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Không phân trang',
  })
  findAll(@Query() query: FindMeterReadingsDto) {
    return this.meterReadingsService.findAll(query);
  }

  // MTR-02 Ghi chỉ số nhiều phòng một lần
  @Roles(Role.MANAGER)
  @Put()
  @ApiOperation({
    summary: 'Ghi chỉ số nhiều phòng một lần',
    description: 'MTR-02. Cần quyền MANAGER. Lưu tất cả hoặc không lưu dòng nào; phòng đã phát hành hóa đơn kỳ này thì bị khóa',
  })
  @ApiBody({ type: SaveMeterReadingsDto })
  save(@Body() dto: SaveMeterReadingsDto, @AuthUser() user: CurrentUser) {
    return this.meterReadingsService.save(dto, user.id);
  }
}
