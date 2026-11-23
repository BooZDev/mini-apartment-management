import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';

export class LockUserDto {
  @ApiPropertyOptional({ description: 'Lý do, tối đa 200 ký tự', example: 'Nhân viên nghỉ việc' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Lý do không hợp lệ' })
  @MaxLength(200, { message: 'Lý do tối đa 200 ký tự' })
  reason?: string | null;
}
