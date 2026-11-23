import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Trim } from '../decorators/trim.decorator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Số trang, bắt đầu từ 1', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang không hợp lệ' })
  @Min(1, { message: 'Số trang phải từ 1 trở lên' })
  @Max(100_000, { message: 'Số trang quá lớn' })
  page: number = 1;

  @ApiPropertyOptional({ description: 'Số dòng mỗi trang, tối đa 100', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang không hợp lệ' })
  @Min(1, { message: 'Số dòng mỗi trang phải từ 1 trở lên' })
  @Max(100, { message: 'Số dòng mỗi trang tối đa 100' })
  pageSize: number = 20;
}

export class SearchPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Từ khóa, không phân biệt hoa thường và không dấu' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa không hợp lệ' })
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Tên trường sắp xếp; thêm dấu - phía trước để sắp giảm dần',
  })
  @IsOptional()
  @IsString({ message: 'Trường sắp xếp không hợp lệ' })
  @MaxLength(50, { message: 'Trường sắp xếp không hợp lệ' })
  sort?: string;
}
