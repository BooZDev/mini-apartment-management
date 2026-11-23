import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Role } from 'src/auth/enums/role.enum';
import { SearchPaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UserStatus } from '../enums/user-status.enum';

export class FindUsersDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo vai trò', enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò không hợp lệ' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
  status?: UserStatus;
}
