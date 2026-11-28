import { api, type Paginated } from "@/lib/api"
import type { CreateRoomPayload, Room, RoomsQueryParams, UpdateRoomPayload } from "@/lib/types/room"

type ApiEnvelope<T> = {
  data: T
}

export async function getRooms(params: RoomsQueryParams = {}): Promise<Paginated<Room>> {
  const query: Record<string, string | number> = {}
  if (params.q && params.q.trim() !== "") query.q = params.q.trim()
  if (params.floor !== undefined) query.floor = params.floor
  if (params.status) query.status = params.status
  if (params.page) query.page = params.page
  if (params.pageSize) query.pageSize = params.pageSize
  if (params.sort) query.sort = params.sort

  const res = await api.get<Paginated<Room>>("/rooms", { params: query })
  return res.data
}

export async function getRoom(roomId: string): Promise<Room> {
  const res = await api.get<ApiEnvelope<Room>>(`/rooms/${roomId}`)
  return res.data.data
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const res = await api.post<ApiEnvelope<Room>>("/rooms", payload)
  return res.data.data
}

export async function updateRoom(roomId: string, payload: UpdateRoomPayload): Promise<Room> {
  const res = await api.patch<ApiEnvelope<Room>>(`/rooms/${roomId}`, payload)
  return res.data.data
}
