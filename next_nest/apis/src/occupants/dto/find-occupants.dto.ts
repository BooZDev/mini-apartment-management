import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from 'src/common/decorators/trim.decorator';

export class FindOccupantsDto {
  @ApiPropertyOptional({ description: 'Gồm cả người đã rời đi', default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'includeMovedOut phải là true hoặc false' })
  includeMovedOut?: boolean;

  @ApiPropertyOptional({
    description: 'Hợp đồng; mặc định hợp đồng hiệu lực, nếu không có thì hợp đồng sắp hiệu lực của phòng',
  })
  @IsOptional()
  @IsUUID('all', { message: 'contractId không hợp lệ' })
  contractId?: string;
}
