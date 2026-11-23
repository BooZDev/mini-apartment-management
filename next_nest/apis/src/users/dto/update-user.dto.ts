import { ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsOptionalNotNull } from 'src/common/decorators/validators.decorator';
import { CreateUserDto } from './create-user.dto';

// USR-04: không đổi được username
export class UpdateUserDto extends PickType(CreateUserDto, ['phone', 'email'] as const) {
  @ApiPropertyOptional({ description: 'Họ tên', example: 'Lê Thị Thu' })
  @IsOptionalNotNull()
  @Trim()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString({ message: 'Họ tên không hợp lệ' })
  @Length(1, 100, { message: 'Họ tên tối đa 100 ký tự' })
  fullName?: string;
}

export class UpdateProfileDto extends PickType(CreateUserDto, ['phone', 'email'] as const) {}
