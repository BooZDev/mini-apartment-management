"use client"

import {
  Calendar,
  CreditCard,
  Edit3,
  Eye,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useOccupantDetail } from "@/hooks/use-occupants"
import {
  formatVnDate,
  GENDER_LABELS,
  isOccupantAnonymized,
  RESIDENCE_STATUS_LABELS,
  type OccupantDetail,
} from "@/lib/types/occupants"

interface OccupantDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  occupantId: string | null
  onEdit: (occupant: OccupantDetail) => void
  onMoveOut: (occupant: OccupantDetail) => void
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className={`text-right font-medium ${mono ? "font-mono tracking-wide" : ""}`}>
        {value}
      </span>
    </div>
  )
}

export function OccupantDetailDialog({
  open,
  onOpenChange,
  occupantId,
  onEdit,
  onMoveOut,
}: OccupantDetailDialogProps) {
  const { data: detail, isLoading, isError } = useOccupantDetail(occupantId, open)
  const anonymized = detail ? isOccupantAnonymized(detail) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle>{detail ? detail.fullName : "Hồ sơ chi tiết người ở"}</DialogTitle>
            {detail && (
              <Badge variant={detail.isPrimary ? "default" : "secondary"}>
                {detail.isPrimary ? "Chủ hợp đồng" : "Người ở cùng"}
              </Badge>
            )}
            {detail?.moveOutDate && <Badge variant="outline">Đã rời đi</Badge>}
          </div>
          <DialogDescription>
            {detail
              ? `Phòng ${detail.roomCode} · Thông tin định danh dành riêng cho Quản lý.`
              : "Đang tải hồ sơ định danh..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !detail ? (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertDescription>
              Không thể tải thông tin hồ sơ người ở. Vui lòng thử lại sau.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Eye className="size-4" />
              <AlertDescription className="text-xs">
                Lượt xem dữ liệu cá nhân (bao gồm số CCCD) đã được ghi vào nhật ký hệ thống (E20)
                theo quy định bảo mật.
              </AlertDescription>
            </Alert>

            {anonymized && (
              <Alert variant="destructive">
                <ShieldAlert className="size-4" />
                <AlertDescription className="text-xs">
                  Hồ sơ đã được ẩn dữ liệu cá nhân (CCCD, ngày sinh, SĐT) do người ở đã rời đi quá
                  1 năm (BR-37). Chỉ giữ họ tên để tra cứu hóa đơn cũ.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border px-4 py-1 divide-y">
              <InfoRow
                icon={CreditCard}
                label="Số CCCD"
                value={anonymized ? "Đã ẩn sau 1 năm" : (detail.idNumber ?? "—")}
                mono={!anonymized}
              />
              <InfoRow
                icon={Calendar}
                label="Ngày sinh"
                value={anonymized ? "Đã ẩn" : formatVnDate(detail.dateOfBirth)}
              />
              <InfoRow
                icon={Home}
                label="Giới tính"
                value={
                  anonymized
                    ? "Đã ẩn"
                    : detail.gender
                      ? GENDER_LABELS[detail.gender]
                      : "—"
                }
              />
              <InfoRow
                icon={MapPin}
                label="Quê quán / Thường trú"
                value={anonymized ? "Đã ẩn" : (detail.hometown ?? "—")}
              />
              <InfoRow
                icon={Phone}
                label="Số điện thoại"
                value={anonymized ? "Đã ẩn" : (detail.phone ?? "—")}
                mono={!anonymized}
              />
              <InfoRow
                icon={Mail}
                label="Email"
                value={anonymized ? "Đã ẩn" : (detail.email ?? "—")}
              />
            </div>

            <Separator />

            <div className="rounded-lg border bg-muted/30 px-4 py-1 divide-y">
              <InfoRow
                icon={Home}
                label="Quan hệ với chủ hợp đồng"
                value={detail.isPrimary ? "Bản thân" : (detail.relationshipToPrimary ?? "—")}
              />
              <InfoRow
                icon={Calendar}
                label="Ngày bắt đầu vào ở"
                value={formatVnDate(detail.moveInDate)}
              />
              {detail.moveOutDate && (
                <InfoRow
                  icon={Calendar}
                  label="Ngày rời đi"
                  value={formatVnDate(detail.moveOutDate)}
                />
              )}
              <div className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  Tình trạng tạm trú
                </span>
                <Badge
                  variant={
                    detail.residenceRegistrationStatus === "REGISTERED" ? "default" : "outline"
                  }
                >
                  {RESIDENCE_STATUS_LABELS[detail.residenceRegistrationStatus]}
                </Badge>
              </div>
              {detail.note && !anonymized && (
                <div className="py-2 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Ghi chú cư trú</p>
                  <p className="rounded-md border bg-background p-2.5 text-xs">{detail.note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {detail && !detail.moveOutDate && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onOpenChange(false)
                  onMoveOut(detail)
                }}
              >
                <UserMinus className="mr-1.5 size-4" />
                Ghi nhận rời đi
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            {detail && !anonymized && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(detail)
                }}
              >
                <Edit3 className="mr-1.5 size-4" />
                Chỉnh sửa
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
