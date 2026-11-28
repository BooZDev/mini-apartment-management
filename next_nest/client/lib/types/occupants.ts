import { z } from "zod"
import { todayIsoDate } from "@/lib/format"
import type { Role } from "@/lib/types/auth"

export type Gender = "MALE" | "FEMALE" | "OTHER"
export type ResidenceRegistrationStatus = "NOT_REGISTERED" | "REGISTERED"
export type ContractStatus = "UPCOMING" | "ACTIVE" | "ENDED"

/** OCC-01 với MANAGER. */
export type OccupantFullSummary = {
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

/** OCC-01 với ACCOUNTANT: chỉ tên và phòng. */
export type OccupantBasicSummary = {
  id: string
  roomCode: string
  fullName: string
  isPrimary: boolean
}

/** OCC-03. Người đã bị ẩn dữ liệu cá nhân chỉ còn `fullName`. */
export type OccupantDetail = OccupantFullSummary & {
  dateOfBirth: string | null
  gender: Gender | null
  hometown: string | null
  idNumber: string | null
  email: string | null
  note: string | null
  userId: string | null
}

/** TEN-01: người thuê chỉ thấy họ tên người cùng phòng. */
export type TenantRoom = {
  room: { code: string; floor: number; areaM2: number }
  contract: {
    id: string
    startDate: string
    endDate: string
    monthlyRent: number
    deposit: number
    status: ContractStatus
  }
  occupants: { fullName: string; isPrimary: boolean }[]
}

export type CreateOccupantPayload = {
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

export type UpdateOccupantPayload = Partial<Omit<CreateOccupantPayload, "contractId" | "moveInDate">> & {
  residenceRegistrationStatus?: ResidenceRegistrationStatus
}

export type MoveOutPayload = { moveOutDate: string }

/** Mức xem dữ liệu người ở theo vai trò (mục 2.6 đặc tả API). */
export type OccupantVisibility = "FULL" | "BASIC" | "AGGREGATE" | "NAME_ONLY" | "NONE"

export function getOccupantVisibility(roles: Role[] = []): OccupantVisibility {
  if (roles.includes("MANAGER")) return "FULL"
  if (roles.includes("ACCOUNTANT")) return "BASIC"
  if (roles.includes("OWNER")) return "AGGREGATE"
  if (roles.includes("TENANT")) return "NAME_ONLY"
  return "NONE"
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

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  UPCOMING: "Sắp hiệu lực",
  ACTIVE: "Đang hiệu lực",
  ENDED: "Đã kết thúc",
}

export function isOccupantAnonymized(detail: OccupantDetail): boolean {
  return Boolean(detail.moveOutDate) && !detail.idNumber && !detail.dateOfBirth
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function monthLabel(year: number, month: number) {
  return `${String(month).padStart(2, "0")}/${year}`
}

/**
 * Kỳ cuối còn tính người này trong các khoản theo người và kỳ đầu không tính nữa.
 * BIL-04 bước 4: kỳ M tính người có ngày vào không sau ngày chốt và ngày rời sau ngày chốt;
 * ngày chốt là ngày muộn hơn giữa ngày đầu tháng M và ngày bắt đầu hợp đồng.
 * Trả `lastCounted = null` khi người này chưa được tính kỳ nào.
 */
export function moveOutBillingPeriods(
  moveInDate: string,
  moveOutDate: string,
  contractStartDate?: string | null,
): { lastCounted: string | null; firstExcluded: string } | null {
  if (!ISO_DATE.test(moveInDate) || !ISO_DATE.test(moveOutDate) || moveOutDate < moveInDate) return null
  let [year, month] = moveInDate.split("-").map(Number)
  const [endYear, endMonth] = moveOutDate.split("-").map(Number)
  let last: [number, number] | null = null
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`
    const cutoff = contractStartDate && contractStartDate > firstDay ? contractStartDate : firstDay
    if (moveInDate <= cutoff && moveOutDate > cutoff) last = [year, month]
    month = month === 12 ? 1 : month + 1
    if (month === 1) year += 1
  }
  if (!last) return { lastCounted: null, firstExcluded: monthLabel(endYear, endMonth) }
  const [ly, lm] = last
  return {
    lastCounted: monthLabel(ly, lm),
    firstExcluded: lm === 12 ? monthLabel(ly + 1, 1) : monthLabel(ly, lm + 1),
  }
}

/** OccupantInput, thêm `moveInDate` (OCC-02) và `residenceRegistrationStatus` (OCC-04). */
export const occupantFormSchema = z.object({
  fullName: z.string().trim().min(1, "Họ và tên không được để trống").max(100, "Họ và tên tối đa 100 ký tự"),
  dateOfBirth: z
    .string()
    .min(1, "Ngày sinh không được để trống")
    .regex(ISO_DATE, "Ngày sinh không hợp lệ")
    .refine((val) => val < todayIsoDate(), "Ngày sinh phải trước hôm nay"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  hometown: z.string().trim().min(1, "Quê quán không được để trống").max(200, "Quê quán tối đa 200 ký tự"),
  idNumber: z
    .string()
    .trim()
    .min(1, "Số CCCD không được để trống")
    .regex(/^\d{12}$/, "Số CCCD phải gồm đúng 12 chữ số"),
  phone: z
    .string()
    .trim()
    .refine((val) => val === "" || /^0\d{9}$/.test(val), "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0"),
  email: z
    .string()
    .trim()
    .max(150, "Email tối đa 150 ký tự")
    .refine((val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Email không hợp lệ"),
  relationshipToPrimary: z.string().trim().max(50, "Quan hệ tối đa 50 ký tự"),
  moveInDate: z.string().refine((val) => val === "" || ISO_DATE.test(val), "Ngày vào ở không hợp lệ"),
  residenceRegistrationStatus: z.enum(["NOT_REGISTERED", "REGISTERED"]),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự"),
})

export type OccupantFormValues = z.infer<typeof occupantFormSchema>

export const moveOutSchema = z.object({
  moveOutDate: z
    .string()
    .min(1, "Ngày rời đi không được để trống")
    .regex(ISO_DATE, "Ngày rời đi không hợp lệ")
    .refine((val) => val <= todayIsoDate(), "Ngày rời đi không được sau hôm nay"),
})

export type MoveOutFormValues = z.infer<typeof moveOutSchema>
