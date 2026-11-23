import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from 'src/common/decorators/trim.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class FindNotificationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo đã đọc / chưa đọc' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isRead phải là true hoặc false' })
  isRead?: boolean;
}
