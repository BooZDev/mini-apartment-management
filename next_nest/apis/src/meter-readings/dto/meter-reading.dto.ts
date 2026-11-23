import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ToBoolean } from 'src/common/decorators/trim.decorator';
import { IsPeriod, UniqueBy } from 'src/common/decorators/validators.decorator';
import { MeterType } from 'src/contracts/enums/contract.enum';

export class FindMeterReadingsDto {
  @ApiProperty({ description: 'Kỳ (YYYY-MM)', example: '2026-11' })
  @IsNotEmpty({ message: 'Kỳ không được để trống' })
  @IsPeriod({ message: 'Kỳ phải có dạng YYYY-MM' })
  period: string;

  @ApiPropertyOptional({ description: 'Loại công tơ', enum: MeterType })
  @IsOptional()
  @IsEnum(MeterType, { message: 'Loại công tơ chỉ gồm ELECTRICITY, WATER' })
  meterType?: MeterType;

  @ApiPropertyOptional({ description: 'Chỉ dòng chưa ghi' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'missingOnly phải là true hoặc false' })
  missingOnly?: boolean;
}

export class MeterReadingItemDto {
  @ApiProperty({ description: 'ID phòng' })
  @IsNotEmpty({ message: 'Phòng không được để trống' })
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId: string;

  @ApiProperty({ description: 'Loại công tơ', enum: MeterType })
  @IsNotEmpty({ message: 'Loại công tơ không được để trống' })
  @IsEnum(MeterType, { message: 'Loại công tơ chỉ gồm ELECTRICITY, WATER' })
  meterType: MeterType;

  @ApiProperty({ description: 'Chỉ số mới, không nhỏ hơn chỉ số cũ', example: 1350 })
  @IsNotEmpty({ message: 'Chỉ số mới không được để trống' })
  @IsInt({ message: 'Chỉ số phải là số nguyên' })
  @Min(0, { message: 'Chỉ số không được âm' })
  @Max(2_000_000_000, { message: 'Chỉ số quá lớn' })
  currentReading: number;
}

export class SaveMeterReadingsDto {
  @ApiProperty({ description: 'Kỳ đã lên lịch (YYYY-MM)', example: '2026-11' })
  @IsNotEmpty({ message: 'Kỳ không được để trống' })
  @IsPeriod({ message: 'Kỳ phải có dạng YYYY-MM' })
  period: string;

  @ApiProperty({ description: 'Chỉ số của nhiều phòng, không trùng (phòng, loại công tơ)', type: [MeterReadingItemDto] })
  @IsArray({ message: 'Danh sách chỉ số không hợp lệ' })
  @ArrayMinSize(1, { message: 'Cần ít nhất một chỉ số' })
  @ArrayMaxSize(200, { message: 'Tối đa 200 dòng một lần' })
  @UniqueBy(['roomId', 'meterType'], { message: 'Trùng phòng và loại công tơ' })
  @ValidateNested({ each: true })
  @Type(() => MeterReadingItemDto)
  items: MeterReadingItemDto[];
}
