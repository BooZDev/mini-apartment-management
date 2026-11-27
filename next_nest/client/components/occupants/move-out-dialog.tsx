"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Check, Info, UserMinus, UserX } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMoveOutOccupant } from "@/hooks/use-occupants"
import { errorMessage } from "@/lib/api"
import {
  formatVnDate,
  moveOutSchema,
  nextBillingMonth,
  todayIsoDate,
  type MoveOutFormValues,
  type OccupantFullSummary,
} from "@/lib/types/occupants"
import { cn } from "@/lib/utils"

interface MoveOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomCode: string
  occupant: OccupantFullSummary | null
  activeCount: number
}

export function MoveOutDialog({
  open,
  onOpenChange,
  roomId,
  roomCode,
  occupant,
  activeCount,
}: MoveOutDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const moveOutMutation = useMoveOutOccupant(roomId)

  const form = useForm<MoveOutFormValues>({
    resolver: zodResolver(moveOutSchema),
    defaultValues: { moveOutDate: todayIsoDate() },
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = form

  const selectedDate = watch("moveOutDate")

  useEffect(() => {
    if (open) {
      reset({ moveOutDate: todayIsoDate() })
      setServerError(null)
    }
  }, [open, reset])

  if (!occupant) return null

  const isPrimaryBlocked = occupant.isPrimary
  const isLastOccupant = activeCount <= 1
  const isBlocked = isPrimaryBlocked || isLastOccupant
  const { currentMonth, nextMonth } = nextBillingMonth(selectedDate || todayIsoDate())

  const onSubmit = async (values: MoveOutFormValues) => {
    if (isBlocked) return
    setServerError(null)

    if (values.moveOutDate < occupant.moveInDate) {
      setError("moveOutDate", {
        message: `Ngày rời đi không được trước ngày vào ở (${formatVnDate(occupant.moveInDate)})`,
      })
      return
    }

    try {
      await moveOutMutation.mutateAsync({
        occupantId: occupant.id,
        payload: { moveOutDate: values.moveOutDate },
      })
      onOpenChange(false)
    } catch (err) {
      setServerError(errorMessage(err, "Không thể ghi nhận người rời đi"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                isBlocked ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
              )}
            >
              {isBlocked ? <UserX className="size-5" /> : <UserMinus className="size-5" />}
            </div>
            <div>
              <DialogTitle>Ghi nhận người rời đi</DialogTitle>
              <DialogDescription>
                {isBlocked
                  ? `Phòng ${roomCode} · Người đứng tên hoặc thành viên duy nhất còn lại`
                  : `Phòng ${roomCode} · Lưu trữ lịch sử cư trú và điều chỉnh định mức`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {isBlocked && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">
                {isPrimaryBlocked
                  ? "Không thể ghi nhận người rời đi vì đây là người đứng tên hợp đồng. Vui lòng thực hiện thủ tục thanh lý hợp đồng thuê phòng (CTR-04)."
                  : "Không thể ghi nhận người rời đi vì đây là người ở cuối cùng trong hợp đồng hiệu lực. Vui lòng thực hiện thủ tục thanh lý hợp đồng thuê phòng."}
              </AlertDescription>
            </Alert>
          )}

          {serverError && !isBlocked && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Tên người rời đi</Label>
            <Input
              readOnly
              value={`${occupant.fullName} — ${occupant.isPrimary ? "Chủ hợp đồng" : "Người ở cùng"}`}
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phòng áp dụng</Label>
              <Input readOnly value={`Phòng ${roomCode}`} className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Ngày vào ở</Label>
              <Input readOnly value={formatVnDate(occupant.moveInDate)} className="bg-muted" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="moveOutDate">
                Ngày rời đi <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">Không sau hôm nay</span>
            </div>
            <Input
              id="moveOutDate"
              type="date"
              disabled={isBlocked}
              min={occupant.moveInDate}
              max={todayIsoDate()}
              aria-invalid={Boolean(errors.moveOutDate)}
              {...register("moveOutDate")}
            />
            {errors.moveOutDate && (
              <p className="text-xs text-destructive">{errors.moveOutDate.message}</p>
            )}
          </div>

          <Alert>
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              Kỳ <strong>{currentMonth}</strong> vẫn tính phí dịch vụ theo người (tròn tháng); từ
              kỳ <strong>{nextMonth}</strong> hệ thống sẽ tự động giảm trừ định mức nhân khẩu. Hồ
              sơ được lưu 1 năm trước khi ẩn dữ liệu cá nhân.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={moveOutMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isBlocked || moveOutMutation.isPending}>
              <Check className="mr-1.5 size-4" />
              {moveOutMutation.isPending ? "Đang xử lý..." : "Xác nhận người rời đi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
