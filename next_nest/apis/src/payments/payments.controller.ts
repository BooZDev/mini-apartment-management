import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { ApproveDto, ReasonDto, RejectDto } from 'src/common/dto/decision.dto';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { CreatePaymentDto, FindCancellationRequestsDto, FindPaymentsDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiCookieAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // PAY-01 Ghi nhận thanh toán
  @Roles(Role.ACCOUNTANT)
  @Post('payments')
  @ApiOperation({
    summary: 'Ghi nhận thanh toán',
    description: 'PAY-01. Cần quyền ACCOUNTANT. Bắt buộc header Idempotency-Key; không nộp vượt số còn nợ',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID sinh mỗi lần mở form' })
  @ApiBody({ type: CreatePaymentDto })
  create(
    @Body() dto: CreatePaymentDto,
    @ReqCtx() ctx: RequestContext,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.create(dto, ctx, idempotencyKey);
  }

  // PAY-02 Danh sách thanh toán
  @Roles(Role.ACCOUNTANT, Role.MANAGER, Role.OWNER)
  @Get('payments')
  @ApiOperation({ summary: 'Danh sách thanh toán', description: 'PAY-02. Cần quyền ACCOUNTANT, MANAGER hoặc OWNER' })
  findAll(@Query() query: FindPaymentsDto) {
    return this.paymentsService.findAll(query);
  }

  // PAY-03 Chi tiết thanh toán
  @Roles(Role.ACCOUNTANT, Role.MANAGER, Role.OWNER)
  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Chi tiết thanh toán', description: 'PAY-03. Cần quyền ACCOUNTANT, MANAGER hoặc OWNER' })
  @ApiParam({ name: 'paymentId', description: 'ID thanh toán' })
  findOne(@Param('paymentId', ParseIdPipe) paymentId: string) {
    return this.paymentsService.findOne(paymentId);
  }

  // PAY-04 Biên lai
  @Roles(Role.ACCOUNTANT, Role.MANAGER)
  @Get('payments/:paymentId/receipt')
  @ApiOperation({ summary: 'Biên lai', description: 'PAY-04. Cần quyền ACCOUNTANT hoặc MANAGER' })
  @ApiParam({ name: 'paymentId', description: 'ID thanh toán' })
  receipt(@Param('paymentId', ParseIdPipe) paymentId: string) {
    return this.paymentsService.receipt(paymentId);
  }

  // PAY-05 Gửi yêu cầu hủy thanh toán
  @Roles(Role.ACCOUNTANT)
  @Post('payments/:paymentId/cancellation-requests')
  @ApiOperation({
    summary: 'Gửi yêu cầu hủy thanh toán',
    description: 'PAY-05. Cần quyền ACCOUNTANT. Thanh toán vẫn được tính cho đến khi duyệt hủy',
  })
  @ApiParam({ name: 'paymentId', description: 'ID thanh toán' })
  @ApiBody({ type: ReasonDto })
  requestCancellation(
    @Param('paymentId', ParseIdPipe) paymentId: string,
    @Body() dto: ReasonDto,
    @ReqCtx() ctx: RequestContext,
  ) {
    return this.paymentsService.requestCancellation(paymentId, dto, ctx);
  }

  // PAY-06 Danh sách yêu cầu hủy
  @Roles(Role.ACCOUNTANT, Role.MANAGER, Role.OWNER)
  @Get('cancellation-requests')
  @ApiOperation({ summary: 'Danh sách yêu cầu hủy', description: 'PAY-06. Cần quyền ACCOUNTANT, MANAGER hoặc OWNER' })
  findCancellations(@Query() query: FindCancellationRequestsDto) {
    return this.paymentsService.findCancellations(query);
  }

  // PAY-07 Duyệt hủy
  @Roles(Role.MANAGER, Role.OWNER)
  @Post('cancellation-requests/:requestId/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Duyệt hủy thanh toán', description: 'PAY-07. Cần quyền MANAGER hoặc OWNER; không tự duyệt yêu cầu mình gửi' })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu hủy' })
  @ApiBody({ type: ApproveDto, required: false })
  approve(@Param('requestId', ParseIdPipe) requestId: string, @Body() dto: ApproveDto, @ReqCtx() ctx: RequestContext) {
    return this.paymentsService.approveCancellation(requestId, dto, ctx);
  }

  // PAY-08 Từ chối hủy
  @Roles(Role.MANAGER, Role.OWNER)
  @Post('cancellation-requests/:requestId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Từ chối hủy thanh toán', description: 'PAY-08. Cần quyền MANAGER hoặc OWNER; bắt buộc ghi lý do' })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu hủy' })
  @ApiBody({ type: RejectDto })
  reject(@Param('requestId', ParseIdPipe) requestId: string, @Body() dto: RejectDto, @ReqCtx() ctx: RequestContext) {
    return this.paymentsService.rejectCancellation(requestId, dto, ctx);
  }
}
