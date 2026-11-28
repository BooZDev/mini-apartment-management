/** Giá trị trống trên giao diện. */
export const EMPTY = "-"

const vndFormatter = new Intl.NumberFormat("vi-VN")

export function formatVnd(amount: number): string {
  return `${vndFormatter.format(amount)} ₫`
}

export function formatArea(areaM2: number): string {
  return `${Number(areaM2).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} m²`
}

/** `YYYY-MM-DD` (hoặc ISO) thành `DD/MM/YYYY`. */
export function formatVnDate(value: string | null | undefined): string {
  if (!value) return EMPTY
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

export function formatVnDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateRange(from: string | null | undefined, to: string | null | undefined): string {
  return `${formatVnDate(from)} - ${formatVnDate(to)}`
}

/** Hôm nay theo giờ Việt Nam, dạng `YYYY-MM-DD`. */
export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())
}
