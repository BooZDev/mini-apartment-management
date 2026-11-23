import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ToArray, Trim } from 'src/common/decorators/trim.decorator';

export const SEARCH_TYPES = ['rooms', 'occupants', 'invoices'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export class SearchDto {
  @ApiProperty({ description: 'Từ khóa, ít nhất 2 ký tự, không phân biệt hoa thường và không dấu', example: 'nguyen van a' })
  @Trim()
  @IsNotEmpty({ message: 'Từ khóa không được để trống' })
  @IsString({ message: 'Từ khóa không hợp lệ' })
  @Length(2, 100, { message: 'Từ khóa từ 2 đến 100 ký tự' })
  q: string;

  @ApiPropertyOptional({ description: 'Nhóm cần tìm, cách nhau bằng dấu phẩy; mặc định cả ba', example: 'rooms,occupants' })
  @IsOptional()
  @ToArray()
  @IsArray({ message: 'types không hợp lệ' })
  @IsIn(SEARCH_TYPES, { each: true, message: 'types chỉ gồm rooms, occupants, invoices' })
  types?: SearchType[];
}
