"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createRoom, getRoom, getRooms, updateRoom } from "@/lib/api/rooms"
import type { CreateRoomPayload, RoomsQueryParams, UpdateRoomPayload } from "@/lib/types/room"

export const roomKeys = {
  all: ["rooms"] as const,
  list: (params: RoomsQueryParams) => ["rooms", "list", params] as const,
  detail: (roomId: string) => ["rooms", "detail", roomId] as const,
}

export function useRooms(params: RoomsQueryParams, enabled = true) {
  return useQuery({
    queryKey: roomKeys.list(params),
    queryFn: () => getRooms(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useRoom(roomId: string | null) {
  return useQuery({
    queryKey: roomKeys.detail(roomId ?? ""),
    queryFn: () => getRoom(roomId!),
    enabled: Boolean(roomId),
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRoomPayload) => createRoom(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, payload }: { roomId: string; payload: UpdateRoomPayload }) => updateRoom(roomId, payload),
    onSuccess: (room) => {
      queryClient.setQueryData(roomKeys.detail(room.id), room)
      return queryClient.invalidateQueries({ queryKey: roomKeys.all })
    },
  })
}
