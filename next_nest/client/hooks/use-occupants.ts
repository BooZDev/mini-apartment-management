"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { roomKeys } from "@/hooks/use-rooms"
import {
  createOccupant,
  exportOccupants,
  getOccupant,
  getRoomOccupants,
  getTenantRoom,
  moveOutOccupant,
  updateOccupant,
} from "@/lib/api/occupants"
import type { CreateOccupantPayload, MoveOutPayload, UpdateOccupantPayload } from "@/lib/types/occupants"

export const occupantKeys = {
  all: ["occupants"] as const,
  byRoom: (roomId: string, includeMovedOut: boolean) => ["occupants", "room", roomId, { includeMovedOut }] as const,
  detail: (occupantId: string) => ["occupants", "detail", occupantId] as const,
  tenantRoom: ["me", "room"] as const,
}

export function useRoomOccupants(roomId: string | null, includeMovedOut: boolean, enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.byRoom(roomId ?? "", includeMovedOut),
    queryFn: () => getRoomOccupants(roomId!, { includeMovedOut }),
    enabled: Boolean(roomId) && enabled,
  })
}

// OCC-03 ghi nhật ký mỗi lần xem, nên luôn lấy mới và không giữ lại trong bộ nhớ đệm
export function useOccupantDetail(occupantId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.detail(occupantId ?? ""),
    queryFn: () => getOccupant(occupantId!),
    enabled: Boolean(occupantId) && enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useTenantRoom(enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.tenantRoom,
    queryFn: getTenantRoom,
    enabled,
  })
}

/** Số người ở của phòng đổi theo, nên làm mới cả danh sách phòng. */
function useInvalidateOccupants() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: occupantKeys.all }),
      queryClient.invalidateQueries({ queryKey: roomKeys.all }),
    ])
}

export function useCreateOccupant(roomId: string) {
  const invalidate = useInvalidateOccupants()
  return useMutation({
    mutationFn: (payload: CreateOccupantPayload) => createOccupant(roomId, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateOccupant() {
  const invalidate = useInvalidateOccupants()
  return useMutation({
    mutationFn: ({ occupantId, payload }: { occupantId: string; payload: UpdateOccupantPayload }) =>
      updateOccupant(occupantId, payload),
    onSuccess: invalidate,
  })
}

export function useMoveOutOccupant() {
  const invalidate = useInvalidateOccupants()
  return useMutation({
    mutationFn: ({ occupantId, payload }: { occupantId: string; payload: MoveOutPayload }) =>
      moveOutOccupant(occupantId, payload),
    onSuccess: invalidate,
  })
}

export function useExportOccupants() {
  return useMutation({
    mutationFn: (params: { roomId?: string; includeMovedOut?: boolean }) => exportOccupants(params),
  })
}
