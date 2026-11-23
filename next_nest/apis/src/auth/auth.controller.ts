import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { AllowPasswordChange } from './decorators/allow-password-change.decorator';
import { AuthUser } from './decorators/auth-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import type { CurrentUser } from './types/current-user';

// Route dò mật khẩu được: giới hạn theo IP chặt hơn mức chung
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // AUTH-01 Đăng nhập
  @Public()
  @Throttle(STRICT)
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập',
    description:
      'AUTH-01. Không cần đăng nhập. Đặt cookie access token (15 phút) và refresh token; sai 5 lần trong 15 phút thì tạm chặn 15 phút',
  })
  @ApiBody({ type: LoginDto })
  login(@Req() req: { user: { id: string } }, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(req.user.id, res);
  }

  // AUTH-05 Làm mới phiên
  @Public()
  @HttpCode(200)
  @Post('refresh')
  @ApiOperation({
    summary: 'Làm mới phiên',
    description:
      'AUTH-05. Dùng cookie refresh token, cấp access token mới và xoay vòng refresh token. Token cũ bị dùng lại thì hủy cả phiên',
  })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  // AUTH-02 Đăng xuất
  @Public()
  @HttpCode(204)
  @Post('logout')
  @ApiOperation({ summary: 'Đăng xuất', description: 'AUTH-02. Hủy phiên, xóa cookie; phiên đã hết hạn vẫn trả 204' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req, res);
  }

  // AUTH-03 Thông tin người dùng hiện tại
  @AllowPasswordChange()
  @ApiCookieAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Thông tin người dùng hiện tại',
    description: 'AUTH-03. Mọi vai trò. Người thuê có thêm thông tin phòng, hợp đồng',
  })
  me(@AuthUser() user: CurrentUser) {
    return this.usersService.findOne(user.id);
  }

  // AUTH-04 Đổi mật khẩu
  @AllowPasswordChange()
  @ApiCookieAuth()
  @Throttle(STRICT)
  @HttpCode(204)
  @Post('change-password')
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description: 'AUTH-04. Mọi vai trò. Các phiên khác bị đăng xuất, phiên hiện tại được giữ',
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @AuthUser() user: CurrentUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.changePassword(user, dto, res);
  }
}
