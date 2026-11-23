import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsDateAfter, IsDateOnly, IsNotFutureDate } from 'src/common/decorators/validators.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Tên loại chi, 1 đến 50 ký tự, duy nhất', example: 'Sửa chữa' })
  @Trim()
  @IsNotEmpty({ message: 'Tên loại chi không được để trống' })
  @IsString({ message: 'Tên loại chi không hợp lệ' })
  @Length(1, 50, { message: 'Tên loại chi tối đa 50 ký tự' })
  name: string;
}

export class CreateExpenseDto {
  @ApiProperty({ description: 'Ngày chi, không sau hôm nay', example: '2026-11-15' })
  @IsNotEmpty({ message: 'Ngày chi không được để trống' })
  @IsDateOnly({ message: 'Ngày chi không hợp lệ' })
  @IsNotFutureDate(false, { message: 'Ngày chi không được sau hôm nay' })
  spentOn: string;

  @ApiProperty({ description: 'ID loại chi' })
  @IsNotEmpty({ message: 'Loại chi không được để trống' })
  @IsUUID('all', { message: 'categoryId không hợp lệ' })
  categoryId: string;

  @ApiProperty({ description: 'Số tiền (đồng), lớn hơn 0', example: 500000 })
  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsInt({ message: 'Số tiền phải là số nguyên (đồng)' })
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  @Max(MAX_MONEY * 10, { message: 'Số tiền quá lớn' })
  amount: number;

  @ApiPropertyOptional({ description: 'Mô tả, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Mô tả không hợp lệ' })
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  description?: string | null;
}

export class FindExpensesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Từ ngày chi', example: '2026-11-01' })
  @IsOptional()
  @IsDateOnly({ message: 'Từ ngày không hợp lệ' })
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày chi', example: '2026-11-30' })
  @IsOptional()
  @IsDateOnly({ message: 'Đến ngày không hợp lệ' })
  @IsDateAfter('fromDate', false, { message: 'Đến ngày không được trước từ ngày' })
  toDate?: string;

  @ApiPropertyOptional({ description: 'ID loại chi' })
  @IsOptional()
  @IsUUID('all', { message: 'categoryId không hợp lệ' })
  categoryId?: string;
}
