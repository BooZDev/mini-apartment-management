import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuditLogsService } from './audit-logs.service';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto';

@ApiTags('audit-logs')
@ApiCookieAuth()
@Roles(Role.OWNER)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // AUD-01 Tra cứu nhật ký
  @Get()
  @ApiOperation({
    summary: 'Tra cứu nhật ký',
    description: 'AUD-01. Cần quyền OWNER. Chỉ đọc, không có thao tác sửa hay xóa nhật ký',
  })
  findAll(@Query() query: FindAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }
}
