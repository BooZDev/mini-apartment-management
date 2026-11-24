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
import { formatArea, formatVnDate, formatVnd, type Room } from "@/lib/types/room"
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
            <DialogTitle className="text-lg font-bold text-slate-900">
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage(error, "Không thể tải chi tiết phòng")}
          </div>
        ) : room ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Layers className="size-3.5" />
                  Tầng
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">Tầng {room.floor}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Maximize2 className="size-3.5" />
                  Diện tích
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{formatArea(room.areaM2)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Wallet className="size-3.5" />
                  Giá niêm yết
                </p>
                <p className="mt-1 text-base font-semibold text-[#124e3b]">
                  {formatVnd(room.listedPrice)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="size-3.5" />
                  Người đang ở
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{room.occupantCount} người</p>
              </div>
            </div>

            {room.activeContract && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <FileText className="size-3.5" />
                  Hợp đồng đang hiệu lực
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  Người đứng tên: {room.activeContract.primaryTenantName ?? "—"}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar className="size-3.5" />
                  {formatVnDate(room.activeContract.startDate)} →{" "}
                  {formatVnDate(room.activeContract.endDate)}
                </p>
              </div>
            )}

            {room.upcomingContract && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-900">
                  <FileText className="size-3.5" />
                  Hợp đồng sắp hiệu lực
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  Người đứng tên: {room.upcomingContract.primaryTenantName ?? "—"}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar className="size-3.5" />
                  {formatVnDate(room.upcomingContract.startDate)} →{" "}
                  {formatVnDate(room.upcomingContract.endDate)}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Ghi chú</p>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {room.note ? room.note : <span className="text-slate-400">Không có ghi chú</span>}
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>Tạo lúc: {room.createdAt}</span>
              <span>Cập nhật: {room.updatedAt}</span>
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
              className="bg-[#124e3b] text-white hover:bg-[#0e3d2e]"
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
