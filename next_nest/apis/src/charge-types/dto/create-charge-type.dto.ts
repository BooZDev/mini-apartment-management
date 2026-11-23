import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { MeterType } from 'src/contracts/enums/contract.enum';
import { CREATABLE_METHODS } from '../enums/calculation-method.enum';
import { CreatePriceDto } from './create-price.dto';

const INVALID_NAME = { message: 'Hãy nhập vào 1 tên khoản thu hợp lệ!' };

export class CreateChargeTypeDto {
  @ApiProperty({ description: 'Tên khoản thu, 1 đến 50 ký tự, duy nhất', example: 'Gửi xe máy' })
  @Trim()
  @IsNotEmpty({ message: 'Tên khoản thu không được để trống', context: INVALID_NAME })
  @IsString({ message: 'Tên khoản thu không hợp lệ', context: INVALID_NAME })
  @Length(1, 50, { message: 'Tên khoản thu tối đa 50 ký tự', context: INVALID_NAME })
  name: string;

  @ApiProperty({
    description: 'Cách tính. Tiền phòng tạo sẵn; khoản phát sinh nhập ở BIL-06',
    enum: CREATABLE_METHODS,
    example: 'PER_VEHICLE',
  })
  @IsNotEmpty({ message: 'Cách tính không được để trống' })
  @IsIn(CREATABLE_METHODS, { message: 'Cách tính chỉ gồm METER, PER_PERSON, PER_ROOM, PER_VEHICLE' })
  calculationMethod: (typeof CREATABLE_METHODS)[number];

  @ApiPropertyOptional({ description: 'Loại công tơ, bắt buộc khi cách tính là METER', enum: MeterType })
  @ValidateIf((o: CreateChargeTypeDto) => o.calculationMethod === 'METER' || o.meterType !== undefined)
  @IsNotEmpty({ message: 'Khoản thu theo chỉ số cần chọn loại công tơ' })
  @IsEnum(MeterType, { message: 'Loại công tơ chỉ gồm ELECTRICITY, WATER' })
  meterType?: MeterType;

  @ApiPropertyOptional({ description: 'Nhãn đơn vị; mặc định theo cách tính (kWh, m³, người, phòng, xe)' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Đơn vị không hợp lệ' })
  @Length(1, 20, { message: 'Đơn vị từ 1 đến 20 ký tự' })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Mặc định true với METER, PER_PERSON; false với PER_ROOM, PER_VEHICLE',
  })
  @IsOptional()
  @IsBoolean({ message: 'isMandatory phải là true hoặc false' })
  isMandatory?: boolean;

  @ApiProperty({ description: 'Đơn giá ban đầu', type: CreatePriceDto })
  @IsNotEmptyObject({}, { message: 'Hãy nhập vào số tiền hợp lệ!', context: { message: 'Hãy nhập vào số tiền hợp lệ!' } })
  @ValidateNested()
  @Type(() => CreatePriceDto)
  initialPrice: CreatePriceDto;
}
