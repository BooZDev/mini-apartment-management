"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Building2, FileText, Save, User, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateOccupant,
  useOccupantDetail,
  useUpdateOccupant,
} from "@/hooks/use-occupants"
import { errorMessage } from "@/lib/api"
import { extractFieldErrors } from "@/lib/api/occupants"
import {
  formatVnDate,
  occupantFormSchema,
  todayIsoDate,
  type Gender,
  type OccupantFormValues,
  type RoomItem,
} from "@/lib/types/occupants"
import { cn } from "@/lib/utils"

interface OccupantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: RoomItem
  mode: "create" | "edit"
  occupantId?: string | null
}

const DEFAULT_VALUES: OccupantFormValues = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  hometown: "",
  idNumber: "",
  phone: "",
  email: "",
  relationshipToPrimary: "",
  moveInDate: "",
  residenceRegistrationStatus: "NOT_REGISTERED",
  note: "",
}

export function OccupantFormDialog({
  open,
  onOpenChange,
  room,
  mode,
  occupantId,
}: OccupantFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const contract = room.activeContract ?? room.upcomingContract

  const detailQuery = useOccupantDetail(
    occupantId ?? null,
    open && mode === "edit" && Boolean(occupantId),
  )
  const createMutation = useCreateOccupant(room.id)
  const updateMutation = useUpdateOccupant(room.id)

  const form = useForm<OccupantFormValues>({
    resolver: zodResolver(occupantFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = form

  const genderValue = watch("gender")
  const residenceStatusValue = watch("residenceRegistrationStatus")

  useEffect(() => {
    if (!open) {
      setServerError(null)
      return
    }

    if (mode === "create") {
      const today = todayIsoDate()
      const defaultMoveIn =
        contract?.startDate && contract.startDate > today ? contract.startDate : today
      reset({
        ...DEFAULT_VALUES,
        moveInDate: defaultMoveIn,
      })
      setServerError(null)
    } else if (mode === "edit" && detailQuery.data) {
      const d = detailQuery.data
      reset({
        fullName: d.fullName ?? "",
        dateOfBirth: d.dateOfBirth ?? "",
        gender: d.gender ?? "",
        hometown: d.hometown ?? "",
        idNumber: d.idNumber ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        relationshipToPrimary: d.relationshipToPrimary ?? "",
        moveInDate: d.moveInDate ?? "",
        residenceRegistrationStatus: d.residenceRegistrationStatus ?? "NOT_REGISTERED",
        note: d.note ?? "",
      })
      setServerError(null)
    }
  }, [open, mode, detailQuery.data, contract?.startDate, reset])

  const isPending = createMutation.isPending || updateMutation.isPending
  const hasAnyError = Object.keys(errors).length > 0 || Boolean(serverError)
  const isPrimaryEdit = mode === "edit" && Boolean(detailQuery.data?.isPrimary)

  const onSubmit = async (values: OccupantFormValues) => {
    setServerError(null)
    try {
      const genderPayload: Gender | null =
        values.gender === "MALE" || values.gender === "FEMALE" || values.gender === "OTHER"
          ? values.gender
          : null

      if (mode === "create") {
        await createMutation.mutateAsync({
          fullName: values.fullName.trim(),
          dateOfBirth: values.dateOfBirth,
          gender: genderPayload,
          hometown: values.hometown.trim(),
          idNumber: values.idNumber.trim(),
          phone: values.phone.trim() || null,
          email: values.email.trim() || null,
          relationshipToPrimary: values.relationshipToPrimary.trim() || null,
          moveInDate: values.moveInDate || undefined,
          contractId: contract?.id,
          note: values.note.trim() || null,
        })
      } else if (occupantId) {
        await updateMutation.mutateAsync({
          occupantId,
          payload: {
            fullName: values.fullName.trim(),
            dateOfBirth: values.dateOfBirth,
            gender: genderPayload,
            hometown: values.hometown.trim(),
            idNumber: values.idNumber.trim(),
            phone: values.phone.trim() || null,
            email: values.email.trim() || null,
            relationshipToPrimary: isPrimaryEdit
              ? undefined
              : values.relationshipToPrimary.trim() || null,
            residenceRegistrationStatus: values.residenceRegistrationStatus,
            note: values.note.trim() || null,
          },
        })
      }
      onOpenChange(false)
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      for (const fe of fieldErrors) {
        if (fe.field in DEFAULT_VALUES) {
          setError(fe.field as keyof OccupantFormValues, { message: fe.message })
        }
      }
      setServerError(errorMessage(err, "Thông tin chưa hợp lệ, vui lòng kiểm tra lại"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle>
                {mode === "create"
                  ? `Thêm người ở · Phòng ${room.code}`
                  : `Cập nhật hồ sơ người ở · Phòng ${room.code}`}
              </DialogTitle>
              <DialogDescription>
                Quản lý thông tin cư trú thực tế của từng nhân khẩu trong phòng.
              </DialogDescription>
            </div>
            <Badge variant="outline">
              {mode === "create" ? "Đang tạo mới" : "Chỉnh sửa hồ sơ"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Room & contract context */}
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Mã phòng / Diện tích</p>
              <p className="truncate text-sm font-medium">
                Phòng {room.code} (Tầng {room.floor} · {room.areaM2}m²)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Hợp đồng hiệu lực</p>
              <p className="truncate text-sm font-medium">
                {contract
                  ? `${formatVnDate(contract.startDate)} – ${formatVnDate(contract.endDate)}`
                  : "Chưa có hợp đồng"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Đại diện hợp đồng</p>
              <p className="truncate text-sm font-medium">
                {contract?.primaryTenantName ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {mode === "edit" && detailQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {hasAnyError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  {serverError ??
                    "Thông tin chưa hợp lệ, vui lòng kiểm tra và sửa lại các trường bị lỗi."}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* 1. Thông tin cá nhân */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <UserPlus className="size-4" />
                      1. Thông tin cá nhân
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">(*) Bắt buộc</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">
                      Họ và tên <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="VD: Nguyễn Văn A"
                      aria-invalid={Boolean(errors.fullName)}
                      {...register("fullName")}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dateOfBirth">
                        Ngày sinh <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        max={todayIsoDate()}
                        aria-invalid={Boolean(errors.dateOfBirth)}
                        {...register("dateOfBirth")}
                      />
                      {errors.dateOfBirth && (
                        <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Giới tính</Label>
                      <Select
                        value={genderValue || "UNSPECIFIED"}
                        onValueChange={(val) =>
                          setValue("gender", val === "UNSPECIFIED" ? "" : (val as Gender))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn giới tính" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNSPECIFIED">Không chọn</SelectItem>
                          <SelectItem value="MALE">Nam</SelectItem>
                          <SelectItem value="FEMALE">Nữ</SelectItem>
                          <SelectItem value="OTHER">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="idNumber">
                        Số CCCD (12 chữ số) <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">12 chữ số</span>
                    </div>
                    <Input
                      id="idNumber"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="VD: 034200001234"
                      className="font-mono"
                      aria-invalid={Boolean(errors.idNumber)}
                      {...register("idNumber")}
                    />
                    {errors.idNumber && (
                      <p className="text-xs text-destructive">{errors.idNumber.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <Input
                        id="phone"
                        inputMode="tel"
                        maxLength={10}
                        placeholder="0912345678"
                        aria-invalid={Boolean(errors.phone)}
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ten@example.com"
                        aria-invalid={Boolean(errors.email)}
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="hometown">
                      Quê quán / Thường trú theo CCCD <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="hometown"
                      placeholder="VD: Xã An Bình, Huyện Nam Sách, Hải Dương"
                      aria-invalid={Boolean(errors.hometown)}
                      {...register("hometown")}
                    />
                    {errors.hometown && (
                      <p className="text-xs text-destructive">{errors.hometown.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Thông tin cư trú */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Building2 className="size-4" />
                    2. Thông tin cư trú
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="relationshipToPrimary">Quan hệ với người đứng tên</Label>
                    <Input
                      id="relationshipToPrimary"
                      disabled={isPrimaryEdit}
                      placeholder={
                        isPrimaryEdit ? "Bản thân (Chủ hợp đồng)" : "VD: Bạn cùng phòng, Em trai..."
                      }
                      {...register("relationshipToPrimary")}
                    />
                    {errors.relationshipToPrimary && (
                      <p className="text-xs text-destructive">
                        {errors.relationshipToPrimary.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="moveInDate">Ngày bắt đầu vào ở</Label>
                    <Input
                      id="moveInDate"
                      type="date"
                      disabled={mode === "edit"}
                      min={contract?.startDate ?? undefined}
                      max={contract?.endDate ?? undefined}
                      aria-invalid={Boolean(errors.moveInDate)}
                      {...register("moveInDate")}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {mode === "edit"
                        ? "Ngày vào ở không thể thay đổi sau khi tạo hồ sơ."
                        : "Phải nằm trong thời hạn hợp đồng. Vào ở giữa tháng tính phí từ kỳ sau."}
                    </p>
                    {errors.moveInDate && (
                      <p className="text-xs text-destructive">{errors.moveInDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <Label>Tình trạng tạm trú</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {mode === "create" ? "Mặc định: Chưa khai báo" : "2 lựa chọn"}
                      </span>
                    </div>

                    <RadioGroup
                      value={residenceStatusValue}
                      disabled={mode === "create"}
                      onValueChange={(val) =>
                        setValue(
                          "residenceRegistrationStatus",
                          val as "NOT_REGISTERED" | "REGISTERED",
                        )
                      }
                      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-background p-2.5",
                          residenceStatusValue === "NOT_REGISTERED" && "border-primary",
                          mode === "create" && "cursor-not-allowed opacity-70",
                        )}
                      >
                        <RadioGroupItem value="NOT_REGISTERED" className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Chưa khai báo</p>
                          <p className="text-[11px] text-muted-foreground">Chưa gửi cơ quan</p>
                        </div>
                      </label>

                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-background p-2.5",
                          residenceStatusValue === "REGISTERED" && "border-primary",
                          mode === "create" && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <RadioGroupItem value="REGISTERED" className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Đã khai báo</p>
                          <p className="text-[11px] text-muted-foreground">Hồ sơ hợp lệ</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="note">Ghi chú cư trú &amp; bàn giao</Label>
                    <Textarea
                      id="note"
                      rows={3}
                      placeholder="VD: Bàn giao chìa khóa, thẻ từ, biển số xe..."
                      {...register("note")}
                    />
                    {errors.note && (
                      <p className="text-xs text-destructive">{errors.note.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isPending}>
                <Save className="mr-1.5 size-4" />
                {isPending
                  ? "Đang lưu..."
                  : mode === "create"
                    ? "Lưu hồ sơ người ở"
                    : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
