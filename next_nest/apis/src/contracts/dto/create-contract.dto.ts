import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DetailCode } from 'src/common/constants/error-codes';
import { Trim } from 'src/common/decorators/trim.decorator';
import {
  IsDateAfter,
  IsDateOnly,
  IsNotFutureDate,
  UniqueBy,
} from 'src/common/decorators/validators.decorator';
import { AdditionalOccupantDto, OccupantInputDto } from 'src/occupants/dto/occupant-input.dto';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';
import { USERNAME_PATTERN } from 'src/users/dto/create-user.dto';
import { MeterType } from '../enums/contract.enum';

export class MeterReadingInputDto {
  @ApiProperty({ description: 'Loại công tơ', enum: MeterType })
  @IsNotEmpty({ message: 'Loại công tơ không được để trống' })
  @IsEnum(MeterType, { message: 'Loại công tơ chỉ gồm ELECTRICITY, WATER' })
  meterType: MeterType;

  @ApiProperty({ description: 'Chỉ số (số nguyên, không âm)', example: 1200 })
  @IsNotEmpty({ message: 'Chỉ số không được để trống' })
  @IsInt({ message: 'Chỉ số phải là số nguyên' })
  @Min(0, { message: 'Chỉ số không được âm' })
  @Max(2_000_000_000, { message: 'Chỉ số quá lớn' })
  reading: number;
}

export class ContractServiceInputDto {
  @ApiProperty({ description: 'ID khoản thu không bắt buộc, đang dùng' })
  @IsNotEmpty({ message: 'Khoản thu không được để trống' })
  @IsUUID('all', { message: 'chargeTypeId không hợp lệ' })
  chargeTypeId: string;

  @ApiProperty({ description: 'Số lượng, ví dụ số xe; từ 1', example: 1 })
  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng từ 1 trở lên' })
  @Max(1000, { message: 'Số lượng tối đa 1.000' })
  quantity: number;
}

export class ContractTermsDto {
  @ApiPropertyOptional({ description: 'Số hợp đồng giấy, 1 đến 50 ký tự, duy nhất', example: 'HDG-P101-2026' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Số hợp đồng không hợp lệ' })
  @Length(1, 50, { message: 'Số hợp đồng tối đa 50 ký tự' })
  contractNumber?: string | null;

  @ApiProperty({ description: 'Ngày ký trên hợp đồng giấy, không sau hôm nay', example: '2026-10-25' })
  @IsNotEmpty({ message: 'Ngày ký không được để trống' })
  @IsDateOnly({ message: 'Ngày ký không hợp lệ' })
  @IsNotFutureDate(false, { message: 'Ngày ký không được sau hôm nay' })
  signedOn: string;

  @ApiProperty({ description: 'Ngày bắt đầu; có thể ở quá khứ, hôm nay hoặc tương lai', example: '2026-11-01' })
  @IsNotEmpty({ message: 'Ngày bắt đầu không được để trống' })
  @IsDateOnly({ message: 'Ngày bắt đầu không hợp lệ' })
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc, sau ngày bắt đầu', example: '2027-10-31' })
  @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
  @IsDateOnly({ message: 'Ngày kết thúc không hợp lệ' })
  @IsDateAfter('startDate', true, {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    context: { code: DetailCode.END_BEFORE_START },
  })
  endDate: string;

  @ApiProperty({ description: 'Giá thuê (đồng/tháng), lớn hơn 0', example: 3000000 })
  @IsNotEmpty({ message: 'Giá thuê không được để trống' })
  @IsInt({ message: 'Giá thuê phải là số nguyên (đồng)' })
  @Min(1, { message: 'Giá thuê phải lớn hơn 0' })
  @Max(MAX_MONEY, { message: 'Giá thuê tối đa 1.000.000.000' })
  monthlyRent: number;

  @ApiProperty({ description: 'Tiền cọc (đồng), không âm', example: 3000000 })
  @IsNotEmpty({ message: 'Tiền cọc không được để trống' })
  @IsInt({ message: 'Tiền cọc phải là số nguyên (đồng)' })
  @Min(0, { message: 'Tiền cọc không được âm' })
  @Max(MAX_MONEY, { message: 'Tiền cọc tối đa 1.000.000.000' })
  deposit: number;

  @ApiPropertyOptional({
    description: 'Chỉ số bàn giao; bắt buộc với mỗi loại công tơ đang dùng',
    type: [MeterReadingInputDto],
  })
  @IsOptional()
  @IsArray({ message: 'Chỉ số bàn giao không hợp lệ' })
  @ArrayMaxSize(2, { message: 'Mỗi loại công tơ một chỉ số' })
  @UniqueBy('meterType', { message: 'Mỗi loại công tơ chỉ một chỉ số' })
  @ValidateNested({ each: true })
  @Type(() => MeterReadingInputDto)
  initialReadings?: MeterReadingInputDto[];

  @ApiPropertyOptional({ description: 'Ghi chú, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;
}

export class CreateContractDto extends ContractTermsDto {
  @ApiProperty({ description: 'ID phòng' })
  @IsNotEmpty({ message: 'Phòng không được để trống' })
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId: string;

  @ApiProperty({ description: 'Người đứng tên hợp đồng', type: OccupantInputDto })
  @IsNotEmptyObject({}, { message: 'Thiếu thông tin người đứng tên', context: { code: DetailCode.REQUIRED } })
  @ValidateNested()
  @Type(() => OccupantInputDto)
  primaryTenant: OccupantInputDto;

  @ApiPropertyOptional({ description: 'Người ở cùng; mỗi người cần quan hệ với người đứng tên', type: [AdditionalOccupantDto] })
  @IsOptional()
  @IsArray({ message: 'Danh sách người ở cùng không hợp lệ' })
  @ArrayMaxSize(20, { message: 'Tối đa 20 người ở cùng' })
  @ValidateNested({ each: true })
  @Type(() => AdditionalOccupantDto)
  additionalOccupants?: AdditionalOccupantDto[];

  @ApiPropertyOptional({ description: 'Dịch vụ đăng ký, không trùng khoản thu', type: [ContractServiceInputDto] })
  @IsOptional()
  @IsArray({ message: 'Danh sách dịch vụ không hợp lệ' })
  @ArrayMaxSize(20, { message: 'Tối đa 20 dịch vụ' })
  @UniqueBy('chargeTypeId', { message: 'Dịch vụ bị trùng khoản thu' })
  @ValidateNested({ each: true })
  @Type(() => ContractServiceInputDto)
  services?: ContractServiceInputDto[];

  @ApiProperty({
    description: 'Tên đăng nhập của tài khoản người thuê; gợi ý dùng SĐT, đã tồn tại thì thêm hậu tố .2, .3',
    example: '0912345678',
  })
  @Trim()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString({ message: 'Tên đăng nhập không hợp lệ' })
  @Matches(USERNAME_PATTERN, {
    message: 'Tên đăng nhập gồm 3 đến 50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới',
  })
  tenantUsername: string;
}
