import { api, type ApiData, type Paginated } from "@/lib/api"
import type { CreateRoomPayload, Room, RoomsQueryParams, UpdateRoomPayload } from "@/lib/types/room"

// ROOM-01
export async function getRooms(params: RoomsQueryParams = {}): Promise<Paginated<Room>> {
  const res = await api.get<Paginated<Room>>("/rooms", {
    params: { ...params, q: params.q?.trim() || undefined },
  })
  return res.data
}

// ROOM-03
export async function getRoom(roomId: string): Promise<Room> {
  const res = await api.get<ApiData<Room>>(`/rooms/${roomId}`)
  return res.data.data
}

// ROOM-02
export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const res = await api.post<ApiData<Room>>("/rooms", payload)
  return res.data.data
}

// ROOM-04: chỉ gửi trường cần đổi, không gửi `status`
export async function updateRoom(roomId: string, payload: UpdateRoomPayload): Promise<Room> {
  const res = await api.patch<ApiData<Room>>(`/rooms/${roomId}`, payload)
  return res.data.data
}
