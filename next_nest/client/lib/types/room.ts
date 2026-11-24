export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE"

export type ContractSummary = {
  id: string
  primaryTenantName: string | null
  startDate: string | null
  endDate: string | null
}

export type Room = {
  id: string
  code: string
  floor: number
  areaM2: number
  listedPrice: number
  status: RoomStatus
  isUnderMaintenance: boolean
  note: string | null
  activeContract: ContractSummary | null
  upcomingContract: ContractSummary | null
  occupantCount: number
  createdAt: string
  updatedAt: string
}

export type RoomSortField = "code" | "floor" | "areaM2" | "listedPrice" | "createdAt"

export type RoomsQueryParams = {
  q?: string
  floor?: number
  status?: RoomStatus
  page?: number
  pageSize?: number
  sort?: string
}

export type CreateRoomPayload = {
  code: string
  floor: number
  areaM2: number
  listedPrice: number
  note?: string | null
}

export type UpdateRoomPayload = {
  code?: string
  floor?: number
  areaM2?: number
  listedPrice?: number
  note?: string | null
  isUnderMaintenance?: boolean
}

export const ROOM_STATUS_OPTIONS: { value: RoomStatus; label: string }[] = [
  { value: "VACANT", label: "Còn trống" },
  { value: "OCCUPIED", label: "Đang thuê" },
  { value: "MAINTENANCE", label: "Đang bảo trì" },
]

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  VACANT: "Còn trống",
  OCCUPIED: "Đang thuê",
  MAINTENANCE: "Đang bảo trì",
}

const vndFormatter = new Intl.NumberFormat("vi-VN")

export function formatVnd(amount: number): string {
  return `${vndFormatter.format(amount)} ₫`
}

export function formatArea(areaM2: number): string {
  return `${Number(areaM2).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} m²`
}

export function formatVnDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!match) return dateStr
  return `${match[3]}/${match[2]}/${match[1]}`
}
