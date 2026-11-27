"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage } from "@/lib/api"
import {
  createOccupant,
  createTenantOccupantRequest,
  exportOccupantsExcel,
  fetchCurrentUser,
  fetchOccupantDetail,
  fetchRoomOccupants,
  fetchRooms,
  fetchTenantRoom,
  loginWithPassword,
  logoutSession,
  moveOutOccupant,
  updateOccupant,
} from "@/lib/api/occupants"
import type {
  CreateOccupantPayload,
  MoveOutPayload,
  UpdateOccupantPayload,
} from "@/lib/types/occupants"

export const occupantKeys = {
  me: ["auth", "me"] as const,
  rooms: ["rooms", "all"] as const,
  roomOccupants: (roomId: string, includeMovedOut: boolean) =>
    ["rooms", roomId, "occupants", { includeMovedOut }] as const,
  detail: (occupantId: string) => ["occupants", occupantId] as const,
  tenantRoom: ["me", "room"] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: occupantKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginWithPassword(username, password),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: occupantKeys.me })
      toast.success("Đăng nhập thành công")
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Tên đăng nhập hoặc mật khẩu không đúng"))
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      qc.clear()
      toast.success("Đã đăng xuất")
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })
}

export function useRooms(enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.rooms,
    queryFn: () => fetchRooms({ pageSize: 100 }),
    enabled,
  })
}

export function useRoomOccupants(roomId: string | null, includeMovedOut: boolean, enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.roomOccupants(roomId ?? "", includeMovedOut),
    queryFn: () => fetchRoomOccupants(roomId!, { includeMovedOut }),
    enabled: Boolean(roomId) && enabled,
  })
}

export function useOccupantDetail(occupantId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.detail(occupantId ?? ""),
    queryFn: () => fetchOccupantDetail(occupantId!),
    enabled: Boolean(occupantId) && enabled,
    staleTime: 0, // Luôn lấy bản mới nhất và ghi nhật ký xem hồ sơ (OCC-03)
  })
}

export function useTenantRoom(enabled: boolean) {
  return useQuery({
    queryKey: occupantKeys.tenantRoom,
    queryFn: fetchTenantRoom,
    enabled,
  })
}

export function useCreateOccupant(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOccupantPayload) => createOccupant(roomId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rooms", roomId, "occupants"] })
      void qc.invalidateQueries({ queryKey: occupantKeys.rooms })
      toast.success("Đã thêm người ở mới vào phòng")
    },
  })
}

export function useUpdateOccupant(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ occupantId, payload }: { occupantId: string; payload: UpdateOccupantPayload }) =>
      updateOccupant(occupantId, payload),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ["rooms", roomId, "occupants"] })
      void qc.invalidateQueries({ queryKey: occupantKeys.detail(variables.occupantId) })
      toast.success("Đã cập nhật hồ sơ người ở")
    },
  })
}

export function useMoveOutOccupant(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ occupantId, payload }: { occupantId: string; payload: MoveOutPayload }) =>
      moveOutOccupant(occupantId, payload),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ["rooms", roomId, "occupants"] })
      void qc.invalidateQueries({ queryKey: occupantKeys.detail(variables.occupantId) })
      void qc.invalidateQueries({ queryKey: occupantKeys.rooms })
      toast.success("Đã ghi nhận người ở rời đi")
    },
  })
}

export function useExportOccupants() {
  return useMutation({
    mutationFn: (params?: { roomId?: string; includeMovedOut?: boolean }) => exportOccupantsExcel(params),
    onSuccess: () => {
      toast.success("Đã xuất danh sách người ở ra file Excel")
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Không thể xuất danh sách người ở"))
    },
  })
}

export function useCreateTenantRequest() {
  return useMutation({
    mutationFn: createTenantOccupantRequest,
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu thay đổi người ở tới Ban quản lý")
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Không thể gửi yêu cầu"))
    },
  })
}
