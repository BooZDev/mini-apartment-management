import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SearchPaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { RoomStatus } from '../enums/room-status.enum';

export class FindRoomsDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus, { message: 'Trạng thái phòng không hợp lệ' })
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Lọc theo tầng', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tầng không hợp lệ' })
  @Min(0, { message: 'Tầng từ 0 đến 100' })
  @Max(100, { message: 'Tầng từ 0 đến 100' })
  floor?: number;
}
