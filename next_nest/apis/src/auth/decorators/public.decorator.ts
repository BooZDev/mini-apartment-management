import { SetMetadata } from '@nestjs/common';

// Route không cần đăng nhập
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
