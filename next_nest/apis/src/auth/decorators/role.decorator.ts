import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

// Quyền là hợp các vai trò: có một trong các vai trò là được gọi
export const ROLE_KEY = 'role';
export const Roles = (...roles: Role[]) => SetMetadata(ROLE_KEY, roles);
