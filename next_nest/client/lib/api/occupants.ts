import axios from "axios"
import { api, type ApiErrorBody, type Paginated } from "@/lib/api"
import type {
  CreateOccupantPayload,
  CurrentUser,
  MoveOutPayload,
  OccupantBasicSummary,
  OccupantDetail,
  OccupantFullSummary,
  RoomItem,
  TenantRoomResponse,
  UpdateOccupantPayload,
} from "@/lib/types/occupants"

type ApiEnvelope<T> = { data: T }

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<ApiEnvelope<CurrentUser>>("/auth/me")
  return data.data
}

export async function loginWithPassword(username: string, password: string): Promise<void> {
  await api.post("/auth/login", { username, password })
}

export async function logoutSession(): Promise<void> {
  await api.post("/auth/logout")
}

export async function fetchRooms(params?: { q?: string; status?: string; pageSize?: number }): Promise<RoomItem[]> {
  const { data } = await api.get<Paginated<RoomItem>>("/rooms", {
    params: { page: 1, pageSize: params?.pageSize ?? 100, q: params?.q, status: params?.status },
  })
  return data.data
}

export async function fetchRoomById(roomId: string): Promise<RoomItem> {
  const { data } = await api.get<ApiEnvelope<RoomItem>>(`/rooms/${roomId}`)
  return data.data
}

// OCC-01: Danh sách người ở của phòng (MANAGER -> FullSummary[], ACCOUNTANT -> BasicSummary[])
export async function fetchRoomOccupants(
  roomId: string,
  params?: { includeMovedOut?: boolean; contractId?: string },
): Promise<(OccupantFullSummary | OccupantBasicSummary)[]> {
  const { data } = await api.get<ApiEnvelope<(OccupantFullSummary | OccupantBasicSummary)[]>>(
    `/rooms/${roomId}/occupants`,
    {
      params: {
        includeMovedOut: params?.includeMovedOut ?? false,
        contractId: params?.contractId,
      },
    },
  )
  return data.data
}

// OCC-02: Thêm người ở (MANAGER)
export async function createOccupant(roomId: string, payload: CreateOccupantPayload): Promise<OccupantDetail> {
  const { data } = await api.post<ApiEnvelope<OccupantDetail>>(`/rooms/${roomId}/occupants`, payload)
  return data.data
}

// OCC-03: Chi tiết người ở - ghi nhật ký PERSONAL_DATA_VIEWED (MANAGER)
export async function fetchOccupantDetail(occupantId: string): Promise<OccupantDetail> {
  const { data } = await api.get<ApiEnvelope<OccupantDetail>>(`/occupants/${occupantId}`)
  return data.data
}

// OCC-04: Sửa người ở, tình trạng tạm trú (MANAGER)
export async function updateOccupant(occupantId: string, payload: UpdateOccupantPayload): Promise<OccupantDetail> {
  const { data } = await api.patch<ApiEnvelope<OccupantDetail>>(`/occupants/${occupantId}`, payload)
  return data.data
}

// OCC-05: Ghi nhận người rời đi (MANAGER)
export async function moveOutOccupant(occupantId: string, payload: MoveOutPayload): Promise<OccupantDetail> {
  const { data } = await api.post<ApiEnvelope<OccupantDetail>>(`/occupants/${occupantId}/move-out`, payload)
  return data.data
}

// OCC-06: Xuất danh sách người ở ra Excel - ghi nhật ký PERSONAL_DATA_EXPORTED (MANAGER)
export async function exportOccupantsExcel(params?: { roomId?: string; includeMovedOut?: boolean }): Promise<void> {
  const response = await api.get<Blob>("/occupants/export", {
    params: {
      roomId: params?.roomId,
      includeMovedOut: params?.includeMovedOut ?? false,
    },
    responseType: "blob",
  })

  const disposition = response.headers["content-disposition"] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] ?? "danh-sach-nguoi-o.xlsx"

  const url = URL.createObjectURL(response.data)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// TEN-01: Phòng của tôi (TENANT)
export async function fetchTenantRoom(): Promise<TenantRoomResponse> {
  const { data } = await api.get<ApiEnvelope<TenantRoomResponse>>("/me/room")
  return data.data
}

// TEN-07: Người thuê gửi yêu cầu thay đổi người ở
export async function createTenantOccupantRequest(payload: {
  title: string
  description?: string | null
  occupantChange: {
    action: "ADD" | "MOVE_OUT" | "UPDATE"
    occupantId?: string
    proposedData?: Record<string, unknown>
    moveOutDate?: string
  }
}) {
  const { data } = await api.post("/me/requests", {
    type: "OCCUPANT_CHANGE",
    ...payload,
  })
  return data
}

/** Trích xuất danh sách lỗi theo từng trường từ khuôn lỗi backend */
export function extractFieldErrors(error: unknown): { field: string; message: string }[] {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return []
  const details = error.response?.data?.error?.details
  if (!Array.isArray(details)) return []
  return details
    .filter((d): d is { field: string; code: string; message: string } => Boolean(d.field && d.message))
    .map((d) => ({ field: d.field, message: d.message }))
}
