import { api, type ApiData } from "@/lib/api"
import type {
  CreateOccupantPayload,
  MoveOutPayload,
  OccupantBasicSummary,
  OccupantDetail,
  OccupantFullSummary,
  TenantRoom,
  UpdateOccupantPayload,
} from "@/lib/types/occupants"

// OCC-01: MANAGER nhận đủ trường, ACCOUNTANT chỉ tên và phòng
export async function getRoomOccupants(
  roomId: string,
  params: { includeMovedOut?: boolean; contractId?: string } = {},
): Promise<(OccupantFullSummary | OccupantBasicSummary)[]> {
  const res = await api.get<ApiData<(OccupantFullSummary | OccupantBasicSummary)[]>>(
    `/rooms/${roomId}/occupants`,
    { params: { includeMovedOut: params.includeMovedOut ?? false, contractId: params.contractId } },
  )
  return res.data.data
}

// OCC-02
export async function createOccupant(roomId: string, payload: CreateOccupantPayload): Promise<OccupantDetail> {
  const res = await api.post<ApiData<OccupantDetail>>(`/rooms/${roomId}/occupants`, payload)
  return res.data.data
}

// OCC-03: mỗi lần gọi ghi nhật ký PERSONAL_DATA_VIEWED
export async function getOccupant(occupantId: string): Promise<OccupantDetail> {
  const res = await api.get<ApiData<OccupantDetail>>(`/occupants/${occupantId}`)
  return res.data.data
}

// OCC-04: chỉ gửi trường cần đổi
export async function updateOccupant(occupantId: string, payload: UpdateOccupantPayload): Promise<OccupantDetail> {
  const res = await api.patch<ApiData<OccupantDetail>>(`/occupants/${occupantId}`, payload)
  return res.data.data
}

// OCC-05
export async function moveOutOccupant(occupantId: string, payload: MoveOutPayload): Promise<OccupantDetail> {
  const res = await api.post<ApiData<OccupantDetail>>(`/occupants/${occupantId}/move-out`, payload)
  return res.data.data
}

// OCC-06: ghi nhật ký PERSONAL_DATA_EXPORTED
export async function exportOccupants(params: { roomId?: string; includeMovedOut?: boolean } = {}): Promise<void> {
  const res = await api.get<Blob>("/occupants/export", {
    params: { roomId: params.roomId, includeMovedOut: params.includeMovedOut ?? false },
    responseType: "blob",
  })
  const disposition = res.headers["content-disposition"] as string | undefined
  const filename = disposition?.match(/filename="?([^"]+)"?/i)?.[1] ?? "danh-sach-nguoi-o.xlsx"

  const url = URL.createObjectURL(res.data)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// TEN-01
export async function getTenantRoom(): Promise<TenantRoom> {
  const res = await api.get<ApiData<TenantRoom>>("/me/room")
  return res.data.data
}
