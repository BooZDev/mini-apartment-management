export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE"

export type RoomContractSummary = {
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
  activeContract: RoomContractSummary | null
  upcomingContract: RoomContractSummary | null
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

export type UpdateRoomPayload = Partial<CreateRoomPayload> & {
  isUnderMaintenance?: boolean
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  VACANT: "Còn trống",
  OCCUPIED: "Đang thuê",
  MAINTENANCE: "Đang bảo trì",
}

export const ROOM_STATUS_OPTIONS = (Object.keys(ROOM_STATUS_LABELS) as RoomStatus[]).map((value) => ({
  value,
  label: ROOM_STATUS_LABELS[value],
}))
