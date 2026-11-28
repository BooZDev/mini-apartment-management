"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMe, login, logout } from "@/lib/api/auth"
import type { User } from "@/lib/types/auth"

export const authKeys = {
  me: ["auth", "me"] as const,
}

// AUTH-03; `null` sau khi đăng xuất
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: authKeys.me,
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" })
      queryClient.setQueryData(authKeys.me, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Không để lại dữ liệu của phiên cũ cho người đăng nhập sau
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" })
      queryClient.setQueryData(authKeys.me, null)
    },
  })
}
