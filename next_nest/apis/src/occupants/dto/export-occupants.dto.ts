import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ToBoolean } from 'src/common/decorators/trim.decorator';

export class ExportOccupantsDto {
  @ApiPropertyOptional({ description: 'Chỉ xuất người ở của phòng này' })
  @IsOptional()
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId?: string;

  @ApiPropertyOptional({ description: 'Gồm cả người đã rời đi', default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'includeMovedOut phải là true hoặc false' })
  includeMovedOut?: boolean;
}
