import { api } from "@/lib/api"
import type { CurrentUserProfile } from "@/lib/types/auth"

type ApiEnvelope<T> = {
  data: T
}

export async function getMe(): Promise<CurrentUserProfile> {
  const res = await api.get<ApiEnvelope<CurrentUserProfile>>("/auth/me")
  return res.data.data
}

export async function login(payload: { username: string; password: string }): Promise<CurrentUserProfile> {
  const res = await api.post<ApiEnvelope<{ user: CurrentUserProfile } | CurrentUserProfile>>("/auth/login", payload)
  const body = res.data.data
  if (body && typeof body === "object" && "user" in body) {
    return body.user
  }
  return body
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout")
}
