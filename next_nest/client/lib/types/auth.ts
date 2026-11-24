export type Role = "SYSTEM_ADMIN" | "OWNER" | "MANAGER" | "ACCOUNTANT" | "TENANT"

export type UserStatus = "ACTIVE" | "LOCKED" | "READ_ONLY"

export type TenantInfo = {
  roomId: string
  roomCode: string
  contractId: string
  occupantId: string
  readOnlyUntil: string | null
}

export type CurrentUserProfile = {
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
  MANAGER: "Quản lý vận hành",
  ACCOUNTANT: "Kế toán",
  TENANT: "Người thuê",
}

const ROOM_VIEW_ROLES: Role[] = ["MANAGER", "OWNER", "ACCOUNTANT"]

export function canViewRooms(roles: Role[] | undefined): boolean {
  if (!roles?.length) return false
  return roles.some((role) => ROOM_VIEW_ROLES.includes(role))
}

export function canManageRooms(roles: Role[] | undefined): boolean {
  if (!roles?.length) return false
  return roles.includes("MANAGER")
}

export function formatPrimaryRole(roles: Role[] | undefined): string {
  if (!roles?.length) return "Người dùng"
  const priority: Role[] = ["MANAGER", "OWNER", "ACCOUNTANT", "SYSTEM_ADMIN", "TENANT"]
  const primary = priority.find((r) => roles.includes(r)) ?? roles[0]
  return ROLE_LABELS[primary] ?? primary
}
