"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ForbiddenView({
  title = "Không có quyền truy cập",
  description = "Tài khoản của bạn không có quyền truy cập mục này. Vui lòng liên hệ Quản trị hệ thống nếu cần cấp quyền.",
  actionLabel,
  onAction,
}: {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card px-8 py-10 text-center shadow-xs">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="size-6" />
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {actionLabel && onAction && (
          <Button type="button" onClick={onAction} className="mt-6 h-10 px-5">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
