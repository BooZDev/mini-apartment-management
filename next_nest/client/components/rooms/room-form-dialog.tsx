"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { AlertCircle, Info, Wrench } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCreateRoom, useUpdateRoom } from "@/hooks/use-rooms"
import { errorCode, errorMessage, type ApiErrorBody } from "@/lib/api"
import { formatVnd } from "@/lib/format"
import type { Room, UpdateRoomPayload } from "@/lib/types/room"
import {
  ROOM_VALIDATION_SUMMARY,
  roomFormSchema,
  type RoomFormInput,
  type RoomFormValues,
} from "@/lib/validations/room.schema"
import { RoomStatusBadge } from "./room-status-badge"

const FORM_FIELDS = new Set(["code", "floor", "areaM2", "listedPrice", "note", "isUnderMaintenance"])

function buildDefaultValues(room: Room | null): RoomFormInput {
  if (!room) {
    return {
      code: "",
      floor: "",
      areaM2: "",
      listedPrice: "",
      note: "",
      isUnderMaintenance: false,
    }
  }
  return {
    code: room.code,
    floor: String(room.floor),
    areaM2: String(room.areaM2),
    listedPrice: String(room.listedPrice),
    note: room.note ?? "",
    isUnderMaintenance: room.isUnderMaintenance,
  }
}

export function RoomFormDialog({
  open,
  onOpenChange,
  room,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <RoomFormDialogContent
          key={room ? `edit-${room.id}-${room.updatedAt}` : "create"}
          room={room}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function RoomFormDialogContent({
  room,
  onClose,
}: {
  room: Room | null
  onClose: () => void
}) {
  const isEdit = room !== null
  const [serverError, setServerError] = useState<string | null>(null)
  const [showValidationSummary, setShowValidationSummary] = useState(false)

  const createMutation = useCreateRoom()
  const updateMutation = useUpdateRoom()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RoomFormInput, unknown, RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: buildDefaultValues(room),
  })

  const watchedPrice = useWatch({ control, name: "listedPrice" })
  const parsedPricePreview = (() => {
    const trimmed = watchedPrice?.trim() ?? ""
    if (!trimmed) return null
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < 0) return null
    return formatVnd(n)
  })()

  const hasOpenContract = Boolean(room?.activeContract || room?.upcomingContract)

  const handleApiError = (err: unknown) => {
    const code = errorCode(err)
    const msg = errorMessage(err, "Không thể lưu thông tin phòng")

    if (code === "ROOM_CODE_TAKEN" || code === "ROOM_CODE_LOCKED") {
      setError("code", { message: msg })
      setServerError(msg)
      return
    }

    if (code === "ROOM_HAS_ACTIVE_CONTRACT") {
      setServerError(msg)
      toast.error(msg)
      return
    }

    if (axios.isAxiosError<ApiErrorBody>(err)) {
      const details = err.response?.data?.error?.details ?? []
      let mappedAnyField = false
      for (const detail of details) {
        if (detail.field && FORM_FIELDS.has(detail.field)) {
          setError(detail.field as keyof RoomFormInput, { message: detail.message })
          mappedAnyField = true
        }
      }
      if (code === "VALIDATION_ERROR") {
        setServerError(mappedAnyField ? ROOM_VALIDATION_SUMMARY : msg)
        return
      }
    }

    setServerError(msg)
    toast.error(msg)
  }

  const onValidSubmit = (values: RoomFormValues) => {
    setServerError(null)
    setShowValidationSummary(false)

    const floor = Number(values.floor.trim())
    const areaM2 = Number(values.areaM2.trim())
    const listedPrice = Number(values.listedPrice.trim())
    const normalizedNote = values.note?.trim() ? values.note.trim() : null

    if (!isEdit) {
      createMutation.mutate(
        {
          code: values.code,
          floor,
          areaM2,
          listedPrice,
          note: normalizedNote,
        },
        {
          onSuccess: () => {
            toast.success("Thêm phòng thành công!")
            onClose()
          },
          onError: handleApiError,
        },
      )
      return
    }

    // ROOM-04: chỉ gửi trường đã đổi, không gửi `status`
    const payload: UpdateRoomPayload = {}
    if (values.code !== room.code) payload.code = values.code
    if (floor !== room.floor) payload.floor = floor
    if (areaM2 !== room.areaM2) payload.areaM2 = areaM2
    if (listedPrice !== room.listedPrice) payload.listedPrice = listedPrice
    if (normalizedNote !== (room.note ?? null)) payload.note = normalizedNote
    if (values.isUnderMaintenance !== room.isUnderMaintenance) {
      payload.isUnderMaintenance = values.isUnderMaintenance
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi nào để lưu")
      onClose()
      return
    }

    updateMutation.mutate(
      { roomId: room.id, payload },
      {
        onSuccess: () => {
          toast.success("Cập nhật thông tin phòng thành công!")
          onClose()
        },
        onError: handleApiError,
      },
    )
  }

  const onInvalidSubmit = () => {
    setServerError(null)
    setShowValidationSummary(true)
  }

  return (
    <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {isEdit ? `Cập nhật phòng ${room.code}` : "Thêm phòng mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin phòng hoặc trạng thái bảo trì. Giá niêm yết mới chỉ áp dụng làm mặc định cho hợp đồng mới."
              : "Nhập thông tin phòng mới. Phòng mới tạo ở trạng thái Còn trống."}
          </DialogDescription>
        </DialogHeader>

        {(serverError || showValidationSummary) && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              {serverError ?? ROOM_VALIDATION_SUMMARY}
            </AlertDescription>
          </Alert>
        )}

        <form noValidate onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} className="space-y-4">
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Trạng thái hiện tại</p>
                <p className="text-[11px] text-muted-foreground">
                  Trống / Đang thuê do hợp đồng quyết định, không chỉnh sửa trực tiếp.
                </p>
              </div>
              <RoomStatusBadge
                status={room.status}
                hasUpcomingContract={Boolean(room.upcomingContract)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="room-code">
                Mã phòng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="room-code"
                placeholder="VD: P201"
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
              {errors.code ? (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isEdit
                    ? "Chỉ đổi được khi phòng chưa từng có hợp đồng."
                    : "Chữ không dấu, số, gạch ngang (tự viết hoa)."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-floor">
                Tầng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="room-floor"
                inputMode="numeric"
                placeholder="VD: 2 (từ 0 đến 100)"
                aria-invalid={Boolean(errors.floor)}
                {...register("floor")}
              />
              {errors.floor && <p className="text-xs text-destructive">{errors.floor.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-area">
                Diện tích (m²) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="room-area"
                inputMode="decimal"
                placeholder="VD: 30"
                aria-invalid={Boolean(errors.areaM2)}
                {...register("areaM2")}
              />
              {errors.areaM2 && <p className="text-xs text-destructive">{errors.areaM2.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-price">
                Giá niêm yết (đ/tháng) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="room-price"
                inputMode="numeric"
                placeholder="VD: 3500000"
                aria-invalid={Boolean(errors.listedPrice)}
                {...register("listedPrice")}
              />
              {errors.listedPrice ? (
                <p className="text-xs text-destructive">{errors.listedPrice.message}</p>
              ) : parsedPricePreview ? (
                <p className="text-[11px] font-medium text-primary">{parsedPricePreview} / tháng</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room-note">Ghi chú</Label>
            <Textarea
              id="room-note"
              rows={3}
              placeholder="Ghi chú thêm về nội thất, hướng phòng hoặc lý do bảo trì (tối đa 500 ký tự)..."
              aria-invalid={Boolean(errors.note)}
              {...register("note")}
            />
            {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
          </div>

          {isEdit && (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-400/30 dark:bg-amber-400/10">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="room-maintenance"
                    className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                  >
                    <Wrench className="size-4 text-amber-700 dark:text-amber-300" />
                    Trạng thái bảo trì
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Bật để chuyển phòng sang <strong>Đang bảo trì</strong>, tắt để đưa phòng về{" "}
                    <strong>Còn trống</strong>.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="isUnderMaintenance"
                  render={({ field }) => (
                    <Switch
                      id="room-maintenance"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              {hasOpenContract && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <Info className="size-3.5 shrink-0" />
                  Phòng đang có hợp đồng hiệu lực hoặc sắp hiệu lực, hệ thống sẽ chặn nếu đặt bảo trì.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm phòng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  )
}
