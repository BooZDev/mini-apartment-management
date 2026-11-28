"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Check, Info, UserMinus, UserX } from "lucide-react"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
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
import { formatVnDate, todayIsoDate } from "@/lib/format"
import {
  moveOutBillingPeriods,
  moveOutSchema,
  type MoveOutFormValues,
  type OccupantFullSummary,
} from "@/lib/types/occupants"
import { cn } from "@/lib/utils"

/** OCC-05. Người đứng tên không ghi nhận rời đi được, phải kết thúc hợp đồng (CTR-04). */
export function MoveOutDialog({
  open,
  onOpenChange,
  roomCode,
  contractStartDate,
  occupant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomCode: string
  contractStartDate: string | null
  occupant: OccupantFullSummary | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {occupant && (
        <MoveOutContent
          key={occupant.id}
          roomCode={roomCode}
          contractStartDate={contractStartDate}
          occupant={occupant}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function MoveOutContent({
  roomCode,
  contractStartDate,
  occupant,
  onDone,
}: {
  roomCode: string
  contractStartDate: string | null
  occupant: OccupantFullSummary
  onDone: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const moveOut = useMoveOutOccupant()

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MoveOutFormValues>({
    resolver: zodResolver(moveOutSchema),
    defaultValues: { moveOutDate: todayIsoDate() },
  })
  const selectedDate = useWatch({ control, name: "moveOutDate" })

  const isBlocked = occupant.isPrimary
  const periods = moveOutBillingPeriods(occupant.moveInDate, selectedDate, contractStartDate)

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
      await moveOut.mutateAsync({ occupantId: occupant.id, payload: { moveOutDate: values.moveOutDate } })
      toast.success("Đã ghi nhận người rời đi")
      onDone()
    } catch (err) {
      setServerError(errorMessage(err, "Không thể ghi nhận người rời đi"))
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              isBlocked ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary",
            )}
          >
            {isBlocked ? <UserX className="size-5" /> : <UserMinus className="size-5" />}
          </div>
          <div>
            <DialogTitle>Ghi nhận người rời đi</DialogTitle>
            <DialogDescription>
              {isBlocked ? `Phòng ${roomCode} · Người đứng tên hợp đồng` : `Phòng ${roomCode} · Lưu lịch sử cư trú`}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {isBlocked && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">
              Người đứng tên rời đi thì cần kết thúc hợp đồng.
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
            value={`${occupant.fullName} (${occupant.isPrimary ? "Chủ hợp đồng" : "Người ở cùng"})`}
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
          {errors.moveOutDate && <p className="text-xs text-destructive">{errors.moveOutDate.message}</p>}
        </div>

        {!isBlocked && periods && (
          <Alert>
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              {periods.lastCounted ? (
                <>
                  Kỳ <strong>{periods.lastCounted}</strong> vẫn tính người này trong các khoản theo người; từ kỳ{" "}
                  <strong>{periods.firstExcluded}</strong> không tính nữa.
                </>
              ) : (
                "Người này chưa được tính vào kỳ hóa đơn nào."
              )}{" "}
              Dữ liệu cá nhân được giữ 1 năm kể từ ngày rời đi rồi ẩn.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={moveOut.isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" disabled={isBlocked || moveOut.isPending}>
            <Check className="size-4" />
            {moveOut.isPending ? "Đang xử lý..." : "Xác nhận người rời đi"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
