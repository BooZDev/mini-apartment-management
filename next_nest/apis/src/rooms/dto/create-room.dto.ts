import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';

export const MAX_MONEY = 1_000_000_000;

export class CreateRoomDto {
  @ApiProperty({
    description: 'Mã phòng: 1 đến 20 ký tự gồm chữ không dấu, số, gạch ngang; lưu chữ in hoa',
    example: 'P101',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'Mã phòng không được để trống' })
  @IsString({ message: 'Mã phòng không hợp lệ' })
  @Matches(/^[A-Z0-9-]{1,20}$/, {
    message: 'Mã phòng gồm 1 đến 20 ký tự: chữ không dấu, số, gạch ngang',
  })
  code: string;

  @ApiProperty({ description: 'Tầng, 0 đến 100', example: 1 })
  @IsNotEmpty({ message: 'Tầng không được để trống' })
  @IsInt({ message: 'Tầng phải là số nguyên' })
  @Min(0, { message: 'Tầng từ 0 đến 100' })
  @Max(100, { message: 'Tầng từ 0 đến 100' })
  floor: number;

  @ApiProperty({ description: 'Diện tích (m²), lớn hơn 0, tối đa 1.000, 2 chữ số thập phân', example: 25 })
  @IsNotEmpty({ message: 'Diện tích không được để trống' })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }, { message: 'Diện tích không hợp lệ' })
  @IsPositive({ message: 'Diện tích phải lớn hơn 0' })
  @Max(1000, { message: 'Diện tích tối đa 1.000 m²' })
  areaM2: number;

  @ApiProperty({ description: 'Giá niêm yết (đồng), 0 đến 1.000.000.000', example: 3000000 })
  @IsNotEmpty({ message: 'Giá niêm yết không được để trống' })
  @IsInt({ message: 'Giá niêm yết phải là số nguyên (đồng)' })
  @Min(0, { message: 'Giá niêm yết không được âm' })
  @Max(MAX_MONEY, { message: 'Giá niêm yết tối đa 1.000.000.000' })
  listedPrice: number;

  @ApiPropertyOptional({ description: 'Ghi chú, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;
}
