"use client"

import { ArrowLeft, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function ForbiddenView({
  title = "Không có quyền truy cập",
  description = "Tài khoản của bạn không có quyền truy cập mục này. Vui lòng liên hệ Quản trị viên nếu cần cấp quyền.",
  backHref = "/",
  backLabel = "Quay về trang hợp lệ",
  onBack,
}: {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
  onBack?: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-emerald-950/10 bg-white px-8 py-10 text-center shadow-xs">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-700">
          <Lock className="size-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="mt-6 flex justify-center">
          {onBack ? (
            <Button
              type="button"
              onClick={onBack}
              className="h-10 bg-[#124e3b] px-5 text-white hover:bg-[#0e3d2e]"
            >
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          ) : (
            <Button
              asChild
              className="h-10 bg-[#124e3b] px-5 text-white hover:bg-[#0e3d2e]"
            >
              <Link href={backHref}>
                <ArrowLeft className="size-4" />
                {backLabel}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
