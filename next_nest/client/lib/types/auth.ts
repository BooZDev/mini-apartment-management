export type Role = "SYSTEM_ADMIN" | "OWNER" | "MANAGER" | "ACCOUNTANT" | "TENANT"

export type UserStatus = "ACTIVE" | "READ_ONLY" | "LOCKED"

export type TenantInfo = {
  roomId: string
  roomCode: string
  contractId: string
  occupantId: string
  readOnlyUntil: string | null
}

/** User của AUTH-01, AUTH-03. */
export type User = {
  id: string
  username: string
  fullName: string
  phone: string | null
  email: string | null
  roles: Role[]
  status: UserStatus
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  tenant: TenantInfo | null
}

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "Quản trị hệ thống",
  OWNER: "Chủ nhà",
  MANAGER: "Quản lý",
  ACCOUNTANT: "Kế toán",
  TENANT: "Người thuê",
}

export function hasAnyRole(roles: Role[] | undefined, allowed: Role[]): boolean {
  return Boolean(roles?.some((role) => allowed.includes(role)))
}

// ROOM-01, ROOM-03
export const canViewRooms = (roles?: Role[]) => hasAnyRole(roles, ["MANAGER", "OWNER", "ACCOUNTANT"])

// ROOM-02, ROOM-04
export const canManageRooms = (roles?: Role[]) => hasAnyRole(roles, ["MANAGER"])

/** Vai trò hiển thị dưới tên người dùng; tài khoản nhiều vai trò lấy vai trò vận hành chính. */
export function formatPrimaryRole(roles: Role[] | undefined): string {
  const priority: Role[] = ["MANAGER", "OWNER", "ACCOUNTANT", "SYSTEM_ADMIN", "TENANT"]
  const primary = priority.find((role) => roles?.includes(role))
  return primary ? ROLE_LABELS[primary] : "Người dùng"
}
