"use client"

import { Calendar, FileText, Layers, Maximize2, Pencil, Users, Wallet } from "lucide-react"
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
import { useRoom } from "@/hooks/use-rooms"
import { errorMessage } from "@/lib/api"
import { EMPTY, formatArea, formatVnDate, formatVnDateTime, formatVnd } from "@/lib/format"
import type { Room } from "@/lib/types/room"
import { RoomStatusBadge } from "./room-status-badge"

export function RoomDetailDialog({
  roomId,
  open,
  onOpenChange,
  canManage,
  onEdit,
}: {
  roomId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  onEdit: (room: Room) => void
}) {
  const { data: room, isLoading, isError, error } = useRoom(open ? roomId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2.5 pr-6">
            <DialogTitle className="text-lg font-bold text-foreground">
              {room ? `Chi tiết phòng ${room.code}` : "Chi tiết phòng"}
            </DialogTitle>
            {room && (
              <RoomStatusBadge
                status={room.status}
                hasUpcomingContract={Boolean(room.upcomingContract)}
              />
            )}
          </div>
          <DialogDescription>
            Thông tin kỹ thuật, giá niêm yết và hợp đồng liên kết của phòng.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage(error, "Không thể tải chi tiết phòng")}
          </div>
        ) : room ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="size-3.5" />
                  Tầng
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">Tầng {room.floor}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Maximize2 className="size-3.5" />
                  Diện tích
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">{formatArea(room.areaM2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="size-3.5" />
                  Giá niêm yết
                </p>
                <p className="mt-1 text-base font-semibold text-primary">
                  {formatVnd(room.listedPrice)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  Người đang ở
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">{room.occupantCount} người</p>
              </div>
            </div>

            {room.activeContract && (
              <div className="rounded-lg border border-primary/20 bg-secondary/60 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <FileText className="size-3.5" />
                  Hợp đồng đang hiệu lực
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Người đứng tên: {room.activeContract.primaryTenantName ?? EMPTY}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  {formatVnDate(room.activeContract.startDate)} →{" "}
                  {formatVnDate(room.activeContract.endDate)}
                </p>
              </div>
            )}

            {room.upcomingContract && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3.5 dark:border-sky-400/30 dark:bg-sky-400/10">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-900 dark:text-sky-200">
                  <FileText className="size-3.5" />
                  Hợp đồng sắp hiệu lực
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Người đứng tên: {room.upcomingContract.primaryTenantName ?? EMPTY}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  {formatVnDate(room.upcomingContract.startDate)} →{" "}
                  {formatVnDate(room.upcomingContract.endDate)}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Ghi chú</p>
              <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {room.note ? room.note : <span className="text-muted-foreground">Không có ghi chú</span>}
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>Tạo lúc: {formatVnDateTime(room.createdAt)}</span>
              <span>Cập nhật: {formatVnDateTime(room.updatedAt)}</span>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          {room && canManage && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false)
                onEdit(room)
              }}
            >
              <Pencil className="size-3.5" />
              Chỉnh sửa phòng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
