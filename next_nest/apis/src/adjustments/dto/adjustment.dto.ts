import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min, NotEquals } from 'class-validator';
import { ReasonDto } from 'src/common/dto/decision.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateAdjustmentDto extends ReasonDto {
  @ApiProperty({ description: 'Số tiền: dương là cộng thêm, âm là giảm trừ; khác 0', example: -200000 })
  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsInt({ message: 'Số tiền phải là số nguyên (đồng)' })
  @NotEquals(0, { message: 'Số tiền phải khác 0' })
  @Min(-MAX_MONEY, { message: 'Số tiền quá lớn' })
  @Max(MAX_MONEY, { message: 'Số tiền quá lớn' })
  amount: number;
}

export class FindAdjustmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Trạng thái', enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus, { message: 'Trạng thái chỉ gồm PENDING, APPROVED, REJECTED' })
  status?: ApprovalStatus;

  @ApiPropertyOptional({ description: 'ID hóa đơn' })
  @IsOptional()
  @IsUUID('all', { message: 'invoiceId không hợp lệ' })
  invoiceId?: string;
}
