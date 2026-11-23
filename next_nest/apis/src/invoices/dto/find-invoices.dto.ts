import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ToArray } from 'src/common/decorators/trim.decorator';
import { IsPeriod } from 'src/common/decorators/validators.decorator';
import { SearchPaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export class FindInvoicesDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ description: 'ID kỳ hóa đơn' })
  @IsOptional()
  @IsUUID('all', { message: 'periodId không hợp lệ' })
  periodId?: string;

  @ApiPropertyOptional({ description: 'Kỳ (YYYY-MM)', example: '2026-11' })
  @IsOptional()
  @IsPeriod({ message: 'Kỳ phải có dạng YYYY-MM' })
  period?: string;

  @ApiPropertyOptional({ description: 'ID phòng' })
  @IsOptional()
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId?: string;

  @ApiPropertyOptional({ description: 'ID hợp đồng' })
  @IsOptional()
  @IsUUID('all', { message: 'contractId không hợp lệ' })
  contractId?: string;

  @ApiPropertyOptional({ description: 'Loại hóa đơn', enum: ['MONTHLY', 'SETTLEMENT'] })
  @IsOptional()
  @IsIn(['MONTHLY', 'SETTLEMENT'], { message: 'Loại hóa đơn chỉ gồm MONTHLY, SETTLEMENT' })
  invoiceType?: 'MONTHLY' | 'SETTLEMENT';

  @ApiPropertyOptional({ description: 'Trạng thái, nhiều giá trị cách nhau bằng dấu phẩy', example: 'UNPAID,OVERDUE' })
  @IsOptional()
  @ToArray()
  @IsArray({ message: 'Trạng thái không hợp lệ' })
  @IsEnum(InvoiceStatus, { each: true, message: 'Trạng thái chỉ gồm UNPAID, PARTIALLY_PAID, PAID, OVERDUE' })
  status?: InvoiceStatus[];
}
