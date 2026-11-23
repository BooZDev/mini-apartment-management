import { Role } from '../enums/role.enum';
import { UserStatus } from 'src/users/enums/user-status.enum';

export type TenantInfo = {
  roomId: string;
  roomCode: string;
  contractId: string;
  occupantId: string;
  // Ngày cuối còn đăng nhập được sau khi hợp đồng kết thúc
  readOnlyUntil: string | null;
};

export type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  roles: Role[];
  status: UserStatus;
  mustChangePassword: boolean;
  tenant: TenantInfo | null;
  sessionId: string;
};
