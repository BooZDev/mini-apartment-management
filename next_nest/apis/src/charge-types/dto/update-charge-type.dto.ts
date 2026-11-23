import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsOptionalNotNull } from 'src/common/decorators/validators.decorator';
import { MeterType } from 'src/contracts/enums/contract.enum';
import { CalculationMethod } from '../enums/calculation-method.enum';

const INVALID_NAME = { message: 'Hãy nhập vào 1 tên khoản thu hợp lệ!' };

// CHG-03: cách tính, loại công tơ chỉ đổi được khi khoản thu chưa dùng trong hóa đơn
export class UpdateChargeTypeDto {
  @ApiPropertyOptional({ description: 'Tên khoản thu, 1 đến 50 ký tự', example: 'Gửi xe máy' })
  @IsOptionalNotNull()
  @Trim()
  @IsNotEmpty({ message: 'Tên khoản thu không được để trống', context: INVALID_NAME })
  @IsString({ message: 'Tên khoản thu không hợp lệ', context: INVALID_NAME })
  @Length(1, 50, { message: 'Tên khoản thu tối đa 50 ký tự', context: INVALID_NAME })
  name?: string;

  @ApiPropertyOptional({ description: 'Nhãn đơn vị, 1 đến 20 ký tự' })
  @IsOptionalNotNull()
  @Trim()
  @IsString({ message: 'Đơn vị không hợp lệ' })
  @Length(1, 20, { message: 'Đơn vị từ 1 đến 20 ký tự' })
  unit?: string;

  @ApiPropertyOptional({ description: 'Áp dụng cho mọi hợp đồng hay chỉ hợp đồng đăng ký' })
  @IsOptionalNotNull()
  @IsBoolean({ message: 'isMandatory phải là true hoặc false' })
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'false: ngừng dùng cho kỳ mới' })
  @IsOptionalNotNull()
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Cách tính (chỉ khi chưa dùng trong hóa đơn)', enum: CalculationMethod })
  @IsOptionalNotNull()
  @IsEnum(CalculationMethod, { message: 'Cách tính không hợp lệ' })
  calculationMethod?: CalculationMethod;

  @ApiPropertyOptional({ description: 'Loại công tơ; null khi bỏ cách tính METER', enum: MeterType, nullable: true })
  @IsOptional()
  @IsEnum(MeterType, { message: 'Loại công tơ chỉ gồm ELECTRICITY, WATER' })
  meterType?: MeterType | null;
}
