import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { FindTenantRequestsDto, ResponseNoteDto, UpdateMaintenanceStatusDto } from './dto/tenant-request.dto';
import { TenantRequestsService } from './tenant-requests.service';

@ApiTags('requests')
@ApiCookieAuth()
@Roles(Role.MANAGER)
@Controller('requests')
export class TenantRequestsController {
  constructor(private readonly tenantRequestsService: TenantRequestsService) {}

  // REQ-01 Danh sách yêu cầu của người thuê
  @Get()
  @ApiOperation({ summary: 'Danh sách yêu cầu của người thuê', description: 'REQ-01. Cần quyền MANAGER' })
  findAll(@Query() query: FindTenantRequestsDto) {
    return this.tenantRequestsService.findAll(query);
  }

  // REQ-02 Chi tiết yêu cầu
  @Get(':requestId')
  @ApiOperation({ summary: 'Chi tiết yêu cầu', description: 'REQ-02. Cần quyền MANAGER. proposedData hiển thị đầy đủ để đối chiếu' })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu' })
  findOne(@Param('requestId', ParseIdPipe) requestId: string) {
    return this.tenantRequestsService.findOne(requestId);
  }

  // REQ-03 Duyệt yêu cầu thay đổi người ở
  @Post(':requestId/approve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Duyệt yêu cầu thay đổi người ở',
    description: 'REQ-03. Cần quyền MANAGER. Áp dụng thay đổi trong cùng giao dịch; dữ liệu không hợp lệ thì yêu cầu vẫn chờ duyệt',
  })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu' })
  @ApiBody({ type: ResponseNoteDto, required: false })
  approve(@Param('requestId', ParseIdPipe) requestId: string, @Body() dto: ResponseNoteDto, @ReqCtx() ctx: RequestContext) {
    return this.tenantRequestsService.approve(requestId, dto, ctx);
  }

  // REQ-04 Từ chối yêu cầu thay đổi người ở
  @Post(':requestId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Từ chối yêu cầu thay đổi người ở', description: 'REQ-04. Cần quyền MANAGER; bắt buộc ghi phản hồi' })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu' })
  @ApiBody({ type: ResponseNoteDto })
  reject(@Param('requestId', ParseIdPipe) requestId: string, @Body() dto: ResponseNoteDto, @ReqCtx() ctx: RequestContext) {
    return this.tenantRequestsService.reject(requestId, dto, ctx);
  }

  // REQ-05 Cập nhật trạng thái yêu cầu sửa chữa
  @Patch(':requestId/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái yêu cầu sửa chữa',
    description: 'REQ-05. Cần quyền MANAGER. NEW → IN_PROGRESS hoặc REJECTED; IN_PROGRESS → DONE hoặc REJECTED',
  })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu' })
  @ApiBody({ type: UpdateMaintenanceStatusDto })
  updateStatus(
    @Param('requestId', ParseIdPipe) requestId: string,
    @Body() dto: UpdateMaintenanceStatusDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.tenantRequestsService.updateStatus(requestId, dto, ctx);
  }
}
