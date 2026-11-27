import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindRoomsDto } from './dto/find-rooms.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiCookieAuth()
@Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // ROOM-01 Danh sách phòng
  @Get()
  @ApiOperation({
    summary: 'Danh sách phòng',
    description: 'ROOM-01. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Trạng thái VACANT/OCCUPIED suy ra từ hợp đồng',
  })
  findAll(@Query() query: FindRoomsDto) {
    return this.roomsService.findAll(query);
  }

  // ROOM-02 Thêm phòng
  @Roles(Role.MANAGER)
  @Post()
  @ApiOperation({ summary: 'Thêm phòng', description: 'ROOM-02. Cần quyền MANAGER' })
  @ApiBody({ type: CreateRoomDto })
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  // ROOM-03 Chi tiết phòng
  @Get(':roomId')
  @ApiOperation({ summary: 'Chi tiết phòng', description: 'ROOM-03. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT' })
  @ApiParam({ name: 'roomId', description: 'ID phòng' })
  findOne(@Param('roomId', ParseIdPipe) roomId: string) {
    return this.roomsService.findOne(roomId);
  }

  // ROOM-04 Sửa phòng, đặt hoặc bỏ bảo trì
  @Roles(Role.MANAGER)
  @Patch(':roomId')
  @ApiOperation({
    summary: 'Sửa phòng, đặt hoặc bỏ bảo trì',
    description:
      'ROOM-04. Cần quyền MANAGER. Không gửi `status` (do hợp đồng quyết định); chỉ đổi mã khi phòng chưa từng có hợp đồng',
  })
  @ApiParam({ name: 'roomId', description: 'ID phòng' })
  @ApiBody({ type: UpdateRoomDto })
  update(@Param('roomId', ParseIdPipe) roomId: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(roomId, dto);
  }
}
