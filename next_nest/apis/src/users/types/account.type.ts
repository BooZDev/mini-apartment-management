import { Role } from 'src/auth/enums/role.enum';
import { TenantInfo } from 'src/auth/types/current-user';
import { UserStatus } from '../enums/user-status.enum';

export type AccountRow = {
  id: string;
  username: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'LOCKED';
  must_change_password: boolean;
  session_version: number;
  last_login_at: Date | null;
  created_at: Date;
  roles: Role[];
  contract_id: string | null;
  room_id: string | null;
  room_code: string | null;
  primary_occupant_id: string | null;
  ended_on: string | null;
  total?: number;
};

export type UserResponse = {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  roles: Role[];
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  tenant: TenantInfo | null;
};
