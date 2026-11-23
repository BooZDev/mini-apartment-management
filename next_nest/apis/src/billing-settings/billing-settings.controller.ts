import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { BillingSettingsService } from './billing-settings.service';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';

@ApiTags('billing-settings')
@ApiCookieAuth()
@Controller('billing-settings')
export class BillingSettingsController {
  constructor(private readonly billingSettingsService: BillingSettingsService) {}

  // SET-01 Xem thiết lập lịch thu mặc định
  @Roles(Role.ACCOUNTANT, Role.MANAGER, Role.OWNER)
  @Get()
  @ApiOperation({
    summary: 'Xem thiết lập lịch thu mặc định của tòa',
    description: 'SET-01. Cần quyền ACCOUNTANT, MANAGER hoặc OWNER',
  })
  find() {
    return this.billingSettingsService.find();
  }

  // SET-02 Cập nhật thiết lập lịch thu mặc định
  @Roles(Role.ACCOUNTANT)
  @Put()
  @ApiOperation({
    summary: 'Cập nhật thiết lập lịch thu mặc định',
    description: 'SET-02. Cần quyền ACCOUNTANT. Chỉ là giá trị gợi ý khi lên lịch kỳ mới',
  })
  @ApiBody({ type: UpdateBillingSettingsDto })
  update(@Body() dto: UpdateBillingSettingsDto, @AuthUser() user: CurrentUser) {
    return this.billingSettingsService.update(dto, user.id);
  }
}
