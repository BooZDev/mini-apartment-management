import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import type { CurrentUser } from 'src/auth/types/current-user';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiCookieAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // NTF-01 Thông báo của tôi
  @Get()
  @ApiOperation({
    summary: 'Thông báo của tôi',
    description: 'NTF-01. Mọi vai trò, chỉ thông báo của chính người gọi. `meta` có thêm `unreadCount`',
  })
  findMine(@AuthUser() user: CurrentUser, @Query() query: FindNotificationsDto) {
    return this.notificationsService.findMine(user.id, query);
  }

  // NTF-03 Đánh dấu tất cả đã đọc (khai báo trước :notificationId để không bị nhận nhầm là id)
  @Post('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc', description: 'NTF-03. Mọi vai trò' })
  async markAllRead(@AuthUser() user: CurrentUser) {
    await this.notificationsService.markAllRead(user.id);
  }

  // NTF-02 Đánh dấu đã đọc
  @Post(':notificationId/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Đánh dấu đã đọc', description: 'NTF-02. Mọi vai trò. Thông báo của người khác trả 404' })
  @ApiParam({ name: 'notificationId', description: 'ID thông báo' })
  async markRead(@AuthUser() user: CurrentUser, @Param('notificationId', ParseIdPipe) id: string) {
    await this.notificationsService.markRead(user.id, id);
  }
}
