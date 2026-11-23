import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from 'src/common/decorators/trim.decorator';

export class FindChargeTypesDto {
  @ApiPropertyOptional({ description: 'Lọc khoản thu đang dùng / đã ngừng' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;
}
