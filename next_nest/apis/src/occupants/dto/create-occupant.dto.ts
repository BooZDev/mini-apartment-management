import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { IsDateOnly } from 'src/common/decorators/validators.decorator';
import { OccupantInputDto } from './occupant-input.dto';

export class CreateOccupantDto extends OccupantInputDto {
  @ApiPropertyOptional({
    description: 'Hợp đồng; mặc định hợp đồng hiệu lực, nếu không có thì hợp đồng sắp hiệu lực của phòng',
  })
  @IsOptional()
  @IsUUID('all', { message: 'contractId không hợp lệ' })
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Ngày vào ở; mặc định là ngày muộn hơn giữa hôm nay và ngày bắt đầu hợp đồng',
    example: '2026-11-15',
  })
  @IsOptional()
  @IsDateOnly({ message: 'Ngày vào ở không hợp lệ' })
  moveInDate?: string;
}
