import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ParseIdPipe } from 'src/common/pipes/parse-id.pipe';
import { FindInvoicesDto } from './dto/find-invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiCookieAuth()
@Roles(Role.MANAGER, Role.OWNER, Role.ACCOUNTANT)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // INV-01 Danh sách hóa đơn
  @Get()
  @ApiOperation({
    summary: 'Danh sách hóa đơn',
    description: 'INV-01. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Sắp mặc định -billingDate rồi roomCode',
  })
  findAll(@Query() query: FindInvoicesDto) {
    return this.invoicesService.findAll(query);
  }

  // INV-02 Chi tiết hóa đơn
  @Get(':invoiceId')
  @ApiOperation({
    summary: 'Chi tiết hóa đơn',
    description: 'INV-02. Cần quyền MANAGER, OWNER hoặc ACCOUNTANT. Người thuê dùng TEN-03',
  })
  @ApiParam({ name: 'invoiceId', description: 'ID hóa đơn' })
  findOne(@Param('invoiceId', ParseIdPipe) invoiceId: string) {
    return this.invoicesService.findOne(invoiceId);
  }
}
