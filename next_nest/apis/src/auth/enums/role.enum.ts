export enum Role {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  TENANT = 'TENANT',
}

// Vai trò của tài khoản nhân viên, gán được ở USR-02, USR-05
export const STAFF_ROLES = [
  Role.SYSTEM_ADMIN,
  Role.OWNER,
  Role.MANAGER,
  Role.ACCOUNTANT,
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
