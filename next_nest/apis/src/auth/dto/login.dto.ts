import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Tên đăng nhập, không phân biệt hoa thường', example: 'quanly01' })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString({ message: 'Tên đăng nhập không hợp lệ' })
  @MaxLength(50, { message: 'Tên đăng nhập tối đa 50 ký tự' })
  username: string;

  @ApiProperty({ description: 'Mật khẩu', example: 'Abc@12345' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu không hợp lệ' })
  @MaxLength(200, { message: 'Mật khẩu không hợp lệ' })
  password: string;
}
