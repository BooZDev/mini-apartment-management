import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

// Khuôn lỗi của API: { error: { code, message, details, requestId } }
export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details: { field?: string; code: string; message: string }[]
    requestId?: string
  }
}

export type ApiData<T> = { data: T }

export type Paginated<T> = {
  data: T[]
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number; [key: string]: unknown }
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  // Phiên nằm trong cookie HttpOnly, trình duyệt tự gửi kèm
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"]
let refreshing: Promise<void> | null = null

// Access token hết hạn: gọi AUTH-05 một lần (dùng chung cho các yêu cầu cùng lúc) rồi gửi lại
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthPath = AUTH_PATHS.some((p) => config?.url?.startsWith(p))
    if (error.response?.status !== 401 || !config || config._retried || isAuthPath) {
      return Promise.reject(error)
    }

    config._retried = true
    refreshing ??= api
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshing = null
      })
    await refreshing
    return api(config)
  },
)

/** Thông báo lỗi hiển thị được cho người dùng. */
export function errorMessage(error: unknown, fallback = "Hệ thống gặp lỗi, vui lòng thử lại sau") {
  if (axios.isAxiosError<ApiErrorBody>(error)) return error.response?.data?.error?.message ?? fallback
  return fallback
}

export function errorCode(error: unknown) {
  return axios.isAxiosError<ApiErrorBody>(error) ? error.response?.data?.error?.code : undefined
}

export function errorStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/** Lỗi theo từng trường của dữ liệu vào (VALIDATION_ERROR). */
export function fieldErrors(error: unknown): { field: string; message: string }[] {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return []
  const details = error.response?.data?.error?.details ?? []
  return details.flatMap((d) => (d.field ? [{ field: d.field, message: d.message }] : []))
}
