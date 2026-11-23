import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsDateOnly, IsNotFutureDate } from 'src/common/decorators/validators.decorator';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';

export class RenewContractDto {
  @ApiProperty({ description: 'Ngày kết thúc mới, sau ngày kết thúc hiện tại', example: '2028-10-31' })
  @IsNotEmpty({ message: 'Ngày kết thúc mới không được để trống' })
  @IsDateOnly({ message: 'Ngày kết thúc mới không hợp lệ' })
  newEndDate: string;

  @ApiPropertyOptional({ description: 'Số phụ lục, 1 đến 50 ký tự', example: 'PL-01' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Số phụ lục không hợp lệ' })
  @Length(1, 50, { message: 'Số phụ lục tối đa 50 ký tự' })
  addendumNumber?: string | null;

  @ApiProperty({ description: 'Ngày ký phụ lục, không sau hôm nay', example: '2026-11-15' })
  @IsNotEmpty({ message: 'Ngày ký phụ lục không được để trống' })
  @IsDateOnly({ message: 'Ngày ký phụ lục không hợp lệ' })
  @IsNotFutureDate(false, { message: 'Ngày ký phụ lục không được sau hôm nay' })
  signedOn: string;

  @ApiPropertyOptional({
    description: 'Giá thuê mới, áp dụng từ ngày sau ngày kết thúc cũ; không gửi thì giữ giá cũ',
    example: 3200000,
  })
  @IsOptional()
  @IsInt({ message: 'Giá thuê mới phải là số nguyên (đồng)' })
  @Min(1, { message: 'Giá thuê mới phải lớn hơn 0' })
  @Max(MAX_MONEY, { message: 'Giá thuê mới tối đa 1.000.000.000' })
  newMonthlyRent?: number | null;

  @ApiPropertyOptional({ description: 'Ghi chú, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;
}
