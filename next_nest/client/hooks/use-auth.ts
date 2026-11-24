"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMe, login, logout } from "@/lib/api/auth"

export const authKeys = {
  me: ["auth", "me"] as const,
}

export function useCurrentUser() {
  return useQuery({
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
      await queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries()
    },
  })
}
