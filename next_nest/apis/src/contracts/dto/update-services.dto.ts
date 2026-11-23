import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { IsPeriod, UniqueBy } from 'src/common/decorators/validators.decorator';
import { ContractServiceInputDto } from './create-contract.dto';

// CTR-05: thay danh sách cũ từ kỳ fromPeriod; kỳ đã phát hành không đổi
export class UpdateServicesDto {
  @ApiProperty({ description: 'Dịch vụ đăng ký, không trùng khoản thu', type: [ContractServiceInputDto] })
  @IsArray({ message: 'Danh sách dịch vụ không hợp lệ' })
  @ArrayMaxSize(20, { message: 'Tối đa 20 dịch vụ' })
  @UniqueBy('chargeTypeId', { message: 'Dịch vụ bị trùng khoản thu' })
  @ValidateNested({ each: true })
  @Type(() => ContractServiceInputDto)
  services: ContractServiceInputDto[];

  @ApiProperty({ description: 'Áp dụng từ kỳ (YYYY-MM), không sớm hơn kỳ chưa phát hành gần nhất', example: '2026-12' })
  @IsNotEmpty({ message: 'Kỳ áp dụng không được để trống' })
  @IsPeriod({ message: 'Kỳ áp dụng phải có dạng YYYY-MM' })
  fromPeriod: string;
}
