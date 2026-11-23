import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Độ mạnh của mật khẩu mới kiểm tra ở AuthService để trả đúng mã WEAK_PASSWORD
export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại', example: 'Abc@12345' })
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  @IsString({ message: 'Mật khẩu hiện tại không hợp lệ' })
  @MaxLength(200, { message: 'Mật khẩu hiện tại không hợp lệ' })
  currentPassword: string;

  @ApiProperty({
    description: '8 đến 72 ký tự, có cả chữ và số, khác mật khẩu hiện tại',
    example: 'MatKhauMoi2026',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString({ message: 'Mật khẩu mới không hợp lệ' })
  @MaxLength(200, { message: 'Mật khẩu mới không hợp lệ' })
  newPassword: string;
}
