import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { STAFF_ROLES, StaffRole } from 'src/auth/enums/role.enum';
import { Trim } from 'src/common/decorators/trim.decorator';

export const USERNAME_PATTERN = /^[A-Za-z0-9._]{3,50}$/;
export const PHONE_PATTERN = /^0\d{9}$/;

export class CreateUserDto {
  @ApiProperty({
    description: 'Tên đăng nhập: 3 đến 50 ký tự gồm chữ không dấu, số, dấu chấm, gạch dưới',
    example: 'ketoan02',
  })
  @Trim()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString({ message: 'Tên đăng nhập không hợp lệ' })
  @Matches(USERNAME_PATTERN, {
    message: 'Tên đăng nhập gồm 3 đến 50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới',
  })
  username: string;

  @ApiProperty({ description: 'Họ tên', example: 'Lê Thị Thu' })
  @Trim()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString({ message: 'Họ tên không hợp lệ' })
  @Length(1, 100, { message: 'Họ tên tối đa 100 ký tự' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Số điện thoại 10 chữ số, bắt đầu bằng 0', example: '0912345678' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Số điện thoại không hợp lệ' })
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Email', example: 'thu.le@example.com' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(150, { message: 'Email tối đa 150 ký tự' })
  email?: string | null;

  @ApiProperty({
    description: 'Một hoặc nhiều vai trò nhân viên',
    enum: STAFF_ROLES,
    isArray: true,
    example: ['MANAGER', 'ACCOUNTANT'],
  })
  @IsArray({ message: 'Vai trò không hợp lệ' })
  @ArrayMinSize(1, { message: 'Cần ít nhất một vai trò' })
  @ArrayMaxSize(STAFF_ROLES.length, { message: 'Vai trò không hợp lệ' })
  @ArrayUnique({ message: 'Vai trò bị trùng' })
  @IsIn(STAFF_ROLES, {
    each: true,
    message: 'Vai trò chỉ gồm SYSTEM_ADMIN, OWNER, MANAGER, ACCOUNTANT',
  })
  roles: StaffRole[];
}
