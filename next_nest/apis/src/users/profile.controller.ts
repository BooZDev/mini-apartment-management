import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import type { CurrentUser } from 'src/auth/types/current-user';
import { UpdateProfileDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('me')
@ApiCookieAuth()
@Controller('me')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  // USR-09 Cập nhật thông tin cá nhân
  @Patch('profile')
  @ApiOperation({
    summary: 'Cập nhật thông tin cá nhân',
    description: 'USR-09. Mọi vai trò. Người thuê có hợp đồng đã kết thúc chỉ còn quyền xem',
  })
  @ApiBody({ type: UpdateProfileDto })
  updateProfile(@AuthUser() user: CurrentUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }
}
