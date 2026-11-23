import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsDateOnly, UniqueBy } from 'src/common/decorators/validators.decorator';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';
import { MeterReadingInputDto } from './create-contract.dto';

export class SettlementExtraChargeDto {
  @ApiProperty({ description: 'Nội dung, 1 đến 100 ký tự', example: 'Sửa vòi nước' })
  @Trim()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString({ message: 'Nội dung không hợp lệ' })
  @Length(1, 100, { message: 'Nội dung tối đa 100 ký tự' })
  description: string;

  @ApiProperty({ description: 'Số tiền (đồng), lớn hơn 0', example: 150000 })
  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsInt({ message: 'Số tiền phải là số nguyên (đồng)' })
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  @Max(MAX_MONEY, { message: 'Số tiền tối đa 1.000.000.000' })
  amount: number;
}

// CTR-04 Kết thúc hợp đồng, thanh lý
export class EndContractDto {
  @ApiProperty({
    description: 'Ngày kết thúc thực tế, từ ngày bắt đầu đến hôm nay; hợp đồng chưa bắt đầu thì là hôm nay',
    example: '2026-11-10',
  })
  @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
  @IsDateOnly({ message: 'Ngày kết thúc không hợp lệ' })
  endedOn: string;

  @ApiPropertyOptional({
    description: 'Chỉ số trả phòng, bắt buộc với mỗi loại công tơ đang dùng; không gửi với hợp đồng chưa bắt đầu',
    type: [MeterReadingInputDto],
  })
  @IsOptional()
  @IsArray({ message: 'Chỉ số trả phòng không hợp lệ' })
  @ArrayMaxSize(2, { message: 'Mỗi loại công tơ một chỉ số' })
  @UniqueBy('meterType', { message: 'Mỗi loại công tơ chỉ một chỉ số' })
  @ValidateNested({ each: true })
  @Type(() => MeterReadingInputDto)
  finalReadings?: MeterReadingInputDto[];

  @ApiPropertyOptional({ description: 'Khoản phát sinh khi trả phòng', type: [SettlementExtraChargeDto] })
  @IsOptional()
  @IsArray({ message: 'Khoản phát sinh không hợp lệ' })
  @ArrayMaxSize(20, { message: 'Tối đa 20 khoản phát sinh' })
  @ValidateNested({ each: true })
  @Type(() => SettlementExtraChargeDto)
  extraCharges?: SettlementExtraChargeDto[];

  @ApiPropertyOptional({ description: 'Cấn trừ tiền cọc vào các khoản còn nợ của hợp đồng', default: true })
  @IsOptional()
  @IsBoolean({ message: 'applyDeposit phải là true hoặc false' })
  applyDeposit?: boolean;

  @ApiPropertyOptional({ description: 'Hạn thanh toán hóa đơn thanh lý; mặc định bằng ngày kết thúc', example: '2026-11-15' })
  @IsOptional()
  @IsDateOnly({ message: 'Hạn thanh toán không hợp lệ' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú khi kết thúc, tối đa 1.000 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(1000, { message: 'Ghi chú tối đa 1.000 ký tự' })
  endNote?: string | null;
}

// CTR-08 Xem trước thanh lý: như CTR-04, trừ endNote
export class SettlementPreviewDto extends OmitType(EndContractDto, ['endNote'] as const) {}
