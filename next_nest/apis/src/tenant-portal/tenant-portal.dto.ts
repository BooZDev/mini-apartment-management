import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { ToArray } from 'src/common/decorators/trim.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { InvoiceStatus } from 'src/invoices/dto/find-invoices.dto';

export class MyInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Trạng thái, nhiều giá trị cách nhau bằng dấu phẩy', example: 'UNPAID,OVERDUE' })
  @IsOptional()
  @ToArray()
  @IsArray({ message: 'Trạng thái không hợp lệ' })
  @IsEnum(InvoiceStatus, { each: true, message: 'Trạng thái chỉ gồm UNPAID, PARTIALLY_PAID, PAID, OVERDUE' })
  status?: InvoiceStatus[];
}
