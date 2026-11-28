import { api, type ApiData } from "@/lib/api"
import type { User } from "@/lib/types/auth"

// AUTH-03
export async function getMe(): Promise<User> {
  const res = await api.get<ApiData<User>>("/auth/me")
  return res.data.data
}

// AUTH-01
export async function login(payload: { username: string; password: string }): Promise<User> {
  const res = await api.post<ApiData<User>>("/auth/login", payload)
  return res.data.data
}

// AUTH-02
export async function logout(): Promise<void> {
  await api.post("/auth/logout")
}
