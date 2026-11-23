import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { DetailCode } from 'src/common/constants/error-codes';
import { IsDateAfter, IsDateOnly } from 'src/common/decorators/validators.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class FindAuditLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)', example: '2026-11-01' })
  @IsOptional()
  @IsDateOnly({ message: 'Từ ngày không hợp lệ' })
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD), tính cả ngày này', example: '2026-11-30' })
  @IsOptional()
  @IsDateOnly({ message: 'Đến ngày không hợp lệ' })
  @IsDateAfter('fromDate', false, {
    message: 'Đến ngày không được trước từ ngày',
    context: { code: DetailCode.END_BEFORE_START },
  })
  toDate?: string;

  @ApiPropertyOptional({ description: 'ID người thao tác' })
  @IsOptional()
  @IsUUID('all', { message: 'actorId không hợp lệ' })
  actorId?: string;

  @ApiPropertyOptional({ description: 'Hành động, ví dụ PAYMENT_CREATED' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z_]{1,50}$/, { message: 'Hành động không hợp lệ' })
  action?: string;

  @ApiPropertyOptional({ description: 'Loại đối tượng, ví dụ CONTRACT' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Loại đối tượng không hợp lệ' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID đối tượng' })
  @IsOptional()
  @IsUUID('all', { message: 'entityId không hợp lệ' })
  entityId?: string;
}
