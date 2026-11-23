import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/auth/decorators/public.decorator';
import { toVnDateTime } from 'src/common/utils/date.util';

@ApiTags('health')
@Controller('health')
export class HealthController {
  // SYS-01 Kiểm tra máy chủ
  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({
    summary: 'Kiểm tra máy chủ',
    description: 'SYS-01. Không cần đăng nhập. Không trả thông tin cấu hình',
  })
  check() {
    return { status: 'ok', version: '1.0.0', time: toVnDateTime(new Date()) };
  }
}
