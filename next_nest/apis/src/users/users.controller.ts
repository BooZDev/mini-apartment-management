import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { LockUserDto } from './dto/lock-user.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth()
@Roles(Role.SYSTEM_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // USR-01 Danh sách tài khoản
  @Get()
  @ApiOperation({
    summary: 'Danh sách tài khoản',
    description: 'USR-01. Cần quyền SYSTEM_ADMIN. Tìm theo tên đăng nhập, họ tên; sắp xếp mặc định theo username',
  })
  findAll(@Query() query: FindUsersDto) {
    return this.usersService.findAll(query);
  }

  // USR-02 Tạo tài khoản nhân viên
  @Post()
  @ApiOperation({
    summary: 'Tạo tài khoản nhân viên',
    description:
      'USR-02. Cần quyền SYSTEM_ADMIN. Trả mật khẩu tạm một lần duy nhất; tài khoản mới phải đổi mật khẩu khi đăng nhập',
  })
  @ApiBody({ type: CreateUserDto })
  create(@Body() dto: CreateUserDto, @ReqCtx() ctx: RequestContext) {
    return this.usersService.create(dto, ctx);
  }

  // USR-03 Chi tiết tài khoản
  @Get(':userId')
  @ApiOperation({ summary: 'Chi tiết tài khoản', description: 'USR-03. Cần quyền SYSTEM_ADMIN' })
  @ApiParam({ name: 'userId', description: 'ID tài khoản' })
  findOne(@Param('userId', ParseIdPipe) userId: string) {
    return this.usersService.findOne(userId);
  }

  // USR-04 Sửa thông tin tài khoản
  @Patch(':userId')
  @ApiOperation({
    summary: 'Sửa thông tin tài khoản',
    description: 'USR-04. Cần quyền SYSTEM_ADMIN. Chỉ gửi trường cần đổi; không đổi được tên đăng nhập',
  })
  @ApiParam({ name: 'userId', description: 'ID tài khoản' })
  @ApiBody({ type: UpdateUserDto })
  update(@Param('userId', ParseIdPipe) userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  // USR-05 Gán lại vai trò
  @Put(':userId/roles')
  @ApiOperation({
    summary: 'Gán lại vai trò',
    description:
      'USR-05. Cần quyền SYSTEM_ADMIN. Danh sách gửi lên thay thế toàn bộ vai trò; có hiệu lực từ yêu cầu kế tiếp của người đó',
  })
  @ApiParam({ name: 'userId', description: 'ID tài khoản' })
  @ApiBody({ type: UpdateRolesDto })
  replaceRoles(
    @Param('userId', ParseIdPipe) userId: string,
    @Body() dto: UpdateRolesDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.usersService.replaceRoles(userId, dto, ctx);
  }

  // USR-06 Khóa tài khoản
  @Post(':userId/lock')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Khóa tài khoản',
    description: 'USR-06. Cần quyền SYSTEM_ADMIN. Mọi phiên đang mở của tài khoản hết hiệu lực ngay',
  })
  @ApiParam({ name: 'userId', description: 'ID tài khoản' })
  @ApiBody({ type: LockUserDto, required: false })
  lock(
    @Param('userId', ParseIdPipe) userId: string,
    @Body() dto: LockUserDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.usersService.setLocked(userId, true, dto, ctx);
  }

  // USR-07 Mở khóa tài khoản
  @Post(':userId/unlock')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mở khóa tài khoản', description: 'USR-07. Cần quyền SYSTEM_ADMIN' })
  @ApiParam({ name: 'userId', description: 'ID tài khoản' })
  @ApiBody({ type: LockUserDto, required: false })
  unlock(
    @Param('userId', ParseIdPipe) userId: string,
    @Body() dto: LockUserDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.usersService.setLocked(userId, false, dto, ctx);
  }

  // USR-08 Đặt lại mật khẩu
  @Roles(Role.MANAGER, Role.SYSTEM_ADMIN)
  @Post(':userId/reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đặt lại mật khẩu',
    description:
      'USR-08. Cần quyền MANAGER hoặc SYSTEM_ADMIN. MANAGER chỉ đặt lại cho tài khoản người thuê. Trả mật khẩu tạm một lần duy nhất',
  })
  @ApiParam({ name: 'userId', description: 'ID tài khoản' })
  resetPassword(@Param('userId', ParseIdPipe) userId: string, @ReqCtx() ctx: RequestContext) {
    return this.usersService.resetPassword(userId, ctx);
  }
}
