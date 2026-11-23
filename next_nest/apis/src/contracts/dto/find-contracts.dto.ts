import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SearchPaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ContractStatus } from '../enums/contract.enum';

export class FindContractsDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo phòng' })
  @IsOptional()
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus, { message: 'Trạng thái hợp đồng không hợp lệ' })
  status?: ContractStatus;

  @ApiPropertyOptional({ description: 'Hợp đồng hiệu lực có ngày kết thúc trong N ngày tới', example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số ngày không hợp lệ' })
  @Min(0, { message: 'Số ngày từ 0 đến 3650' })
  @Max(3650, { message: 'Số ngày từ 0 đến 3650' })
  expiringWithinDays?: number;
}
