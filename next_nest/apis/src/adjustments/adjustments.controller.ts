import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ApproveDto, RejectDto } from 'src/common/dto/decision.dto';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { AdjustmentsService } from './adjustments.service';
import { CreateAdjustmentDto, FindAdjustmentsDto } from './dto/adjustment.dto';

@ApiTags('adjustments')
@ApiCookieAuth()
@Controller()
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  // ADJ-01 Lập phiếu điều chỉnh
  @Roles(Role.ACCOUNTANT)
  @Post('invoices/:invoiceId/adjustments')
  @ApiOperation({
    summary: 'Lập phiếu điều chỉnh',
    description: 'ADJ-01. Cần quyền ACCOUNTANT. Phiếu chưa duyệt không ảnh hưởng số còn nợ',
  })
  @ApiParam({ name: 'invoiceId', description: 'ID hóa đơn' })
  @ApiBody({ type: CreateAdjustmentDto })
  create(
    @Param('invoiceId', ParseIdPipe) invoiceId: string,
    @Body() dto: CreateAdjustmentDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.adjustmentsService.create(invoiceId, dto, ctx);
  }

  // ADJ-02 Danh sách phiếu điều chỉnh
  @Roles(Role.ACCOUNTANT, Role.MANAGER, Role.OWNER)
  @Get('adjustments')
  @ApiOperation({ summary: 'Danh sách phiếu điều chỉnh', description: 'ADJ-02. Cần quyền ACCOUNTANT, MANAGER hoặc OWNER' })
  findAll(@Query() query: FindAdjustmentsDto) {
    return this.adjustmentsService.findAll(query);
  }

  // ADJ-03 Duyệt phiếu
  @Roles(Role.MANAGER, Role.OWNER)
  @Post('adjustments/:adjustmentId/approve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Duyệt phiếu điều chỉnh',
    description: 'ADJ-03. Cần quyền MANAGER hoặc OWNER; không tự duyệt phiếu mình lập',
  })
  @ApiParam({ name: 'adjustmentId', description: 'ID phiếu điều chỉnh' })
  @ApiBody({ type: ApproveDto, required: false })
  approve(
    @Param('adjustmentId', ParseIdPipe) adjustmentId: string,
    @Body() dto: ApproveDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.adjustmentsService.approve(adjustmentId, dto, ctx);
  }

  // ADJ-04 Từ chối phiếu
  @Roles(Role.MANAGER, Role.OWNER)
  @Post('adjustments/:adjustmentId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Từ chối phiếu điều chỉnh', description: 'ADJ-04. Cần quyền MANAGER hoặc OWNER; bắt buộc ghi lý do' })
  @ApiParam({ name: 'adjustmentId', description: 'ID phiếu điều chỉnh' })
  @ApiBody({ type: RejectDto })
  reject(
    @Param('adjustmentId', ParseIdPipe) adjustmentId: string,
    @Body() dto: RejectDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.adjustmentsService.reject(adjustmentId, dto, ctx);
  }
}
