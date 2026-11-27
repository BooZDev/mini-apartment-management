import { z } from "zod"

export type Role = "SYSTEM_ADMIN" | "OWNER" | "MANAGER" | "ACCOUNTANT" | "TENANT"
export type Gender = "MALE" | "FEMALE" | "OTHER"
export type ResidenceRegistrationStatus = "NOT_REGISTERED" | "REGISTERED"
export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE"

export interface CurrentUser {
  id: string
  username: string
  fullName: string
  phone: string | null
  email: string | null
  roles: Role[]
  status: string
  mustChangePassword?: boolean
  room?: { id: string; code: string } | null
}

export interface RoomContractSummary {
  id: string
  primaryTenantName: string | null
  startDate: string | null
  endDate: string | null
}

export interface RoomItem {
  id: string
  code: string
  floor: number
  areaM2: number
  listedPrice: number
  status: RoomStatus
  isUnderMaintenance: boolean
  note: string | null
  activeContract: RoomContractSummary | null
  upcomingContract: RoomContractSummary | null
  occupantCount: number
}

// OCC-01 (MANAGER)
export interface OccupantFullSummary {
  id: string
  roomId: string
  roomCode: string
  contractId: string
  fullName: string
  isPrimary: boolean
  relationshipToPrimary: string | null
  phone: string | null
  moveInDate: string
  moveOutDate: string | null
  residenceRegistrationStatus: ResidenceRegistrationStatus
}

// OCC-01 (ACCOUNTANT)
export interface OccupantBasicSummary {
  id: string
  roomCode: string
  fullName: string
  isPrimary: boolean
}

// TEN-01 (TENANT)
export interface OccupantNameOnly {
  fullName: string
  isPrimary: boolean
}

// OCC-03 (MANAGER detail, logged to E20)
export interface OccupantDetail extends OccupantFullSummary {
  dateOfBirth: string | null
  gender: Gender | null
  hometown: string | null
  idNumber: string | null
  email: string | null
  note: string | null
  userId: string | null
}

export interface TenantRoomResponse {
  room: {
    code: string
    floor: number
    areaM2: number
  }
  contract: {
    id: string
    startDate: string
    endDate: string
    monthlyRent: number
    deposit: number
    status: "ACTIVE" | "UPCOMING" | "ENDED"
  }
  occupants: OccupantNameOnly[]
}

export interface CreateOccupantPayload {
  fullName: string
  dateOfBirth: string
  gender?: Gender | null
  hometown: string
  idNumber: string
  phone?: string | null
  email?: string | null
  note?: string | null
  relationshipToPrimary?: string | null
  contractId?: string
  moveInDate?: string
}

export interface UpdateOccupantPayload {
  fullName?: string
  dateOfBirth?: string
  gender?: Gender | null
  hometown?: string
  idNumber?: string
  phone?: string | null
  email?: string | null
  note?: string | null
  relationshipToPrimary?: string | null
  residenceRegistrationStatus?: ResidenceRegistrationStatus
}

export interface MoveOutPayload {
  moveOutDate: string
}

export type OccupantVisibility = "FULL" | "BASIC" | "NAME_ONLY" | "NONE"

export function getOccupantVisibility(roles: Role[] = []): OccupantVisibility {
  if (roles.includes("MANAGER")) return "FULL"
  if (roles.includes("ACCOUNTANT")) return "BASIC"
  if (roles.includes("TENANT")) return "NAME_ONLY"
  return "NONE"
}

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "Quản trị hệ thống",
  OWNER: "Chủ nhà",
  MANAGER: "Quản lý vận hành",
  ACCOUNTANT: "Kế toán",
  TENANT: "Người thuê",
}

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
}

export const RESIDENCE_STATUS_LABELS: Record<ResidenceRegistrationStatus, string> = {
  REGISTERED: "Đã khai báo",
  NOT_REGISTERED: "Chưa khai báo",
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  OCCUPIED: "Đang hoạt động",
  VACANT: "Phòng trống",
  MAINTENANCE: "Đang bảo trì",
}

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatVnDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function nextBillingMonth(iso: string): { currentMonth: string; nextMonth: string } {
  const [yStr, mStr] = iso.slice(0, 10).split("-")
  const y = Number(yStr)
  const m = Number(mStr)
  if (!y || !m) return { currentMonth: "hiện tại", nextMonth: "kế tiếp" }
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return {
    currentMonth: `${String(m).padStart(2, "0")}/${y}`,
    nextMonth: `${String(nextM).padStart(2, "0")}/${nextY}`,
  }
}

export function isOccupantAnonymized(detail: OccupantDetail): boolean {
  return Boolean(detail.moveOutDate) && !detail.idNumber && !detail.dateOfBirth && !detail.phone
}

// Validation schemas matching backend DTOs (OccupantInputDto, CreateOccupantDto, UpdateOccupantDto, MoveOutDto)
export const occupantFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Họ và tên không được để trống")
    .max(100, "Họ và tên tối đa 100 ký tự"),
  dateOfBirth: z
    .string()
    .min(1, "Ngày sinh không được để trống")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ")
    .refine((val) => val < todayIsoDate(), "Ngày sinh phải trước hôm nay"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  hometown: z
    .string()
    .trim()
    .min(1, "Quê quán không được để trống")
    .max(200, "Quê quán tối đa 200 ký tự"),
  idNumber: z
    .string()
    .trim()
    .min(1, "Số CCCD không được để trống")
    .regex(/^\d{12}$/, "Số CCCD phải gồm đúng 12 chữ số hợp lệ"),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^0\d{9}$/.test(val),
      "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0",
    ),
  email: z
    .string()
    .trim()
    .max(150, "Email tối đa 150 ký tự")
    .refine(
      (val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Email không hợp lệ",
    ),
  relationshipToPrimary: z.string().trim().max(50, "Quan hệ tối đa 50 ký tự"),
  moveInDate: z
    .string()
    .refine(
      (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
      "Ngày vào ở không hợp lệ",
    ),
  residenceRegistrationStatus: z.enum(["NOT_REGISTERED", "REGISTERED"]),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự"),
})

export type OccupantFormValues = z.infer<typeof occupantFormSchema>

export const moveOutSchema = z.object({
  moveOutDate: z
    .string()
    .min(1, "Ngày rời đi không được để trống")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày rời đi không hợp lệ")
    .refine((val) => val <= todayIsoDate(), "Ngày rời đi không được sau hôm nay"),
})

export type MoveOutFormValues = z.infer<typeof moveOutSchema>
