import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { CreateOccupantDto } from './dto/create-occupant.dto';
import { ExportOccupantsDto } from './dto/export-occupants.dto';
import { FindOccupantsDto } from './dto/find-occupants.dto';
import { MoveOutDto } from './dto/move-out.dto';
import { UpdateOccupantDto } from './dto/update-occupant.dto';
import { OccupantsService } from './occupants.service';

@ApiTags('occupants')
@ApiCookieAuth()
@Roles(Role.MANAGER)
@Controller()
export class OccupantsController {
  constructor(private readonly occupantsService: OccupantsService) {}

  // OCC-01 Danh sách người ở của phòng
  @Roles(Role.MANAGER, Role.ACCOUNTANT)
  @Get('rooms/:roomId/occupants')
  @ApiOperation({
    summary: 'Danh sách người ở của phòng',
    description:
      'OCC-01. Cần quyền MANAGER hoặc ACCOUNTANT. ACCOUNTANT chỉ thấy id, roomCode, fullName, isPrimary; danh sách không có CCCD với mọi vai trò',
  })
  @ApiParam({ name: 'roomId', description: 'ID phòng' })
  findByRoom(
    @Param('roomId', ParseIdPipe) roomId: string,
    @Query() query: FindOccupantsDto,
    @AuthUser() user: CurrentUser,
  ) {
    return this.occupantsService.findByRoom(roomId, query, user);
  }

  // OCC-02 Thêm người ở
  @Post('rooms/:roomId/occupants')
  @ApiOperation({ summary: 'Thêm người ở', description: 'OCC-02. Cần quyền MANAGER' })
  @ApiParam({ name: 'roomId', description: 'ID phòng' })
  @ApiBody({ type: CreateOccupantDto })
  create(
    @Param('roomId', ParseIdPipe) roomId: string,
    @Body() dto: CreateOccupantDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.occupantsService.create(roomId, dto, ctx);
  }

  // OCC-06 Xuất danh sách người ở (khai báo trước :occupantId)
  @Get('occupants/export')
  @ApiOperation({
    summary: 'Xuất danh sách người ở ra Excel',
    description: 'OCC-06. Chỉ MANAGER. Có CCCD nên được ghi nhật ký PERSONAL_DATA_EXPORTED',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  export(@Query() query: ExportOccupantsDto, @ReqCtx() ctx: RequestContext) {
    return this.occupantsService.export(query, ctx);
  }

  // OCC-03 Chi tiết người ở
  @Get('occupants/:occupantId')
  @ApiOperation({
    summary: 'Chi tiết người ở (có CCCD)',
    description: 'OCC-03. Chỉ MANAGER. Mỗi lần xem được ghi nhật ký PERSONAL_DATA_VIEWED',
  })
  @ApiParam({ name: 'occupantId', description: 'ID người ở' })
  findOne(@Param('occupantId', ParseIdPipe) occupantId: string, @ReqCtx() ctx: RequestContext) {
    return this.occupantsService.findOne(occupantId, ctx);
  }

  // OCC-04 Sửa người ở
  @Patch('occupants/:occupantId')
  @ApiOperation({
    summary: 'Sửa người ở, tình trạng tạm trú',
    description: 'OCC-04. Cần quyền MANAGER. Không đổi được isPrimary, moveInDate',
  })
  @ApiParam({ name: 'occupantId', description: 'ID người ở' })
  @ApiBody({ type: UpdateOccupantDto })
  update(
    @Param('occupantId', ParseIdPipe) occupantId: string,
    @Body() dto: UpdateOccupantDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.occupantsService.update(occupantId, dto, ctx);
  }

  // OCC-05 Ghi nhận người rời đi
  @Post('occupants/:occupantId/move-out')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ghi nhận người rời đi',
    description: 'OCC-05. Cần quyền MANAGER. Người đứng tên rời đi thì kết thúc hợp đồng (CTR-04)',
  })
  @ApiParam({ name: 'occupantId', description: 'ID người ở' })
  @ApiBody({ type: MoveOutDto })
  moveOut(
    @Param('occupantId', ParseIdPipe) occupantId: string,
    @Body() dto: MoveOutDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.occupantsService.moveOut(occupantId, dto, ctx);
  }
}
