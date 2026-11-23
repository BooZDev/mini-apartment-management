import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IsOptionalNotNull } from 'src/common/decorators/validators.decorator';
import { ResidenceRegistrationStatus } from '../enums/occupant.enum';
import { OccupantInputDto } from './occupant-input.dto';

// OCC-04: không đổi được isPrimary, moveInDate
export class UpdateOccupantDto extends PartialType(OccupantInputDto, { skipNullProperties: false }) {
  @ApiPropertyOptional({ description: 'Tình trạng khai báo tạm trú', enum: ResidenceRegistrationStatus })
  @IsOptionalNotNull()
  @IsEnum(ResidenceRegistrationStatus, { message: 'Tình trạng tạm trú chỉ gồm NOT_REGISTERED, REGISTERED' })
  residenceRegistrationStatus?: ResidenceRegistrationStatus;
}
