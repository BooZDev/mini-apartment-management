import { SetMetadata } from '@nestjs/common';

// Route gọi được khi tài khoản đang bắt buộc đổi mật khẩu
export const ALLOW_PASSWORD_CHANGE_KEY = 'allowPasswordChange';
export const AllowPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);
