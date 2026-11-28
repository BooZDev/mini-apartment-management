"use client"

import { BarChart3, Building2, Download, Search, Shield, UserMinus, UserPlus, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AuthGate } from "@/components/auth/auth-gate"
import { MoveOutDialog } from "@/components/occupants/move-out-dialog"
import { OccupantDetailDialog } from "@/components/occupants/occupant-detail-dialog"
import { OccupantFormDialog } from "@/components/occupants/occupant-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useExportOccupants, useRoomOccupants, useTenantRoom } from "@/hooks/use-occupants"
import { useRooms } from "@/hooks/use-rooms"
import { errorMessage } from "@/lib/api"
import { EMPTY, formatArea, formatDateRange, formatVnDate } from "@/lib/format"
import type { User } from "@/lib/types/auth"
import {
  CONTRACT_STATUS_LABELS,
  getOccupantVisibility,
  RESIDENCE_STATUS_LABELS,
  type OccupantBasicSummary,
  type OccupantFullSummary,
} from "@/lib/types/occupants"
import { ROOM_STATUS_LABELS } from "@/lib/types/room"
import { cn } from "@/lib/utils"

const BREADCRUMBS = [
  { label: "Quản lý vận hành" },
  { label: "Căn hộ & Phòng trọ" },
  { label: "Danh sách người ở theo phòng" },
]

export function OccupantsWorkspace({ initialRoomId }: { initialRoomId?: string }) {
  return (
    <AuthGate breadcrumbs={BREADCRUMBS} allow={(user) => getOccupantVisibility(user.roles) !== "NONE"}>
      {(user) => <OccupantsContent user={user} initialRoomId={initialRoomId} />}
    </AuthGate>
  )
}

function RoomSummaryBar({
  roomCode,
  floor,
  areaM2,
  contractText,
  statusLabel,
  highlight,
}: {
  roomCode: string
  floor: number
  areaM2: number
  contractText: string
  statusLabel: string
  highlight: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm font-semibold">
            <Building2 className="size-3.5" />
            Phòng {roomCode}
          </Badge>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <span className="text-muted-foreground">
            Quy cách:{" "}
            <strong className="font-medium text-foreground">
              Tầng {floor} ({formatArea(areaM2)})
            </strong>
          </span>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <span className="text-muted-foreground">
            Hợp đồng: <strong className="font-medium text-foreground">{contractText}</strong>
          </span>
        </div>
        <Badge variant={highlight ? "default" : "secondary"}>{statusLabel}</Badge>
      </CardContent>
    </Card>
  )
}

function OccupantsContent({ user, initialRoomId }: { user: User; initialRoomId?: string }) {
  const router = useRouter()
  const visibility = getOccupantVisibility(user.roles)
  const isManager = visibility === "FULL"
  const isAccountant = visibility === "BASIC"
  const isOwner = visibility === "AGGREGATE"
  const isTenant = visibility === "NAME_ONLY"

  const roomsQuery = useRooms({ page: 1, pageSize: 100, sort: "code" }, !isTenant)
  const tenantRoomQuery = useTenantRoom(isTenant)
  const exportOccupants = useExportOccupants()

  const [pickedRoomId, setPickedRoomId] = useState<string | null>(null)
  const [includeMovedOut, setIncludeMovedOut] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingOccupantId, setEditingOccupantId] = useState<string | null>(null)
  const [detailOccupantId, setDetailOccupantId] = useState<string | null>(null)
  const [moveOutTarget, setMoveOutTarget] = useState<OccupantFullSummary | null>(null)

  const rooms = useMemo(() => roomsQuery.data?.data ?? [], [roomsQuery.data])
  // Phòng trên đường dẫn được ưu tiên; nếu không có thì chọn phòng đang thuê đầu tiên
  const selectedRoomId =
    initialRoomId ?? pickedRoomId ?? (rooms.find((r) => r.status === "OCCUPIED") ?? rooms[0])?.id ?? null
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null

  const selectRoom = (roomId: string) => {
    if (initialRoomId) router.push(`/rooms/${roomId}/occupants`)
    else setPickedRoomId(roomId)
  }

  const occupantsQuery = useRoomOccupants(selectedRoomId, isManager && includeMovedOut, isManager || isAccountant)

  const managerOccupants = useMemo(() => {
    if (!isManager || !occupantsQuery.data) return []
    const rows = occupantsQuery.data as OccupantFullSummary[]
    const q = searchTerm.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.relationshipToPrimary?.toLowerCase().includes(q) ?? false) ||
        (r.phone?.includes(q) ?? false),
    )
  }, [isManager, occupantsQuery.data, searchTerm])

  const accountantOccupants = isAccountant ? ((occupantsQuery.data ?? []) as OccupantBasicSummary[]) : []

  const contract = selectedRoom?.activeContract ?? selectedRoom?.upcomingContract ?? null

  const openCreateDialog = () => {
    setFormMode("create")
    setEditingOccupantId(null)
    setFormOpen(true)
  }

  const openEditDialog = (occupantId: string) => {
    setFormMode("edit")
    setEditingOccupantId(occupantId)
    setFormOpen(true)
  }

  const handleExport = () => {
    if (!selectedRoom) return
    exportOccupants.mutate(
      { roomId: selectedRoom.id, includeMovedOut },
      {
        onSuccess: () => toast.success("Đã xuất danh sách người ở ra file Excel"),
        onError: (err) => toast.error(errorMessage(err, "Không thể xuất danh sách người ở")),
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Danh sách người ở theo phòng</h1>

        <div className="flex flex-wrap items-center gap-2">
          {(isManager || isAccountant) && rooms.length > 0 && (
            <Select value={selectedRoomId ?? ""} onValueChange={selectRoom}>
              <SelectTrigger className="w-52 bg-card">
                <SelectValue placeholder="Chọn phòng..." />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Phòng {r.code} · {r.occupantCount} người
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isManager && selectedRoom && (
            <Button variant="outline" disabled={exportOccupants.isPending} onClick={handleExport}>
              <Download className="size-4" />
              {exportOccupants.isPending ? "Đang xuất..." : "Xuất Excel"}
            </Button>
          )}
        </div>
      </div>

      {roomsQuery.isLoading && !isTenant && (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {(isManager || isAccountant) && selectedRoom && (
        <RoomSummaryBar
          roomCode={selectedRoom.code}
          floor={selectedRoom.floor}
          areaM2={selectedRoom.areaM2}
          contractText={
            contract
              ? `${contract.primaryTenantName ?? EMPTY} (${formatDateRange(contract.startDate, contract.endDate)})`
              : "Chưa có hợp đồng hiệu lực"
          }
          statusLabel={ROOM_STATUS_LABELS[selectedRoom.status]}
          highlight={selectedRoom.status === "OCCUPIED"}
        />
      )}

      {isManager && selectedRoom && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4" />
              Danh sách người ở · Phòng {selectedRoom.code}
            </CardTitle>
            <Button disabled={!contract} onClick={openCreateDialog}>
              <UserPlus className="size-4" />
              Thêm người ở
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo họ tên, quan hệ, SĐT..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="include-moved-out" checked={includeMovedOut} onCheckedChange={setIncludeMovedOut} />
                <Label htmlFor="include-moved-out" className="cursor-pointer text-sm">
                  Hiển thị cả người đã rời đi
                </Label>
              </div>
            </div>

            {!contract ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>Phòng {selectedRoom.code} chưa có hợp đồng</EmptyTitle>
                  <EmptyDescription>Cần lập hợp đồng thuê cho phòng trước khi thêm người ở.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : occupantsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : managerOccupants.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>Không có dữ liệu người ở</EmptyTitle>
                  <EmptyDescription>Không tìm thấy người ở phù hợp trong phòng {selectedRoom.code}.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Quan hệ chủ hộ</TableHead>
                      <TableHead>CCCD (Đã che)</TableHead>
                      <TableHead>Ngày vào</TableHead>
                      <TableHead>Tình trạng tạm trú</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managerOccupants.map((occ) => {
                      const movedOut = Boolean(occ.moveOutDate)
                      return (
                        <TableRow key={occ.id} className={cn(movedOut && "opacity-65")}>
                          <TableCell className="font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{occ.fullName}</span>
                              <Badge variant={occ.isPrimary ? "default" : "secondary"}>
                                {occ.isPrimary ? "Chủ hợp đồng" : "Người ở cùng"}
                              </Badge>
                              {movedOut && <Badge variant="outline">Đã rời {formatVnDate(occ.moveOutDate)}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {occ.isPrimary ? "Bản thân" : (occ.relationshipToPrimary ?? EMPTY)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">••••••••••••</TableCell>
                          <TableCell>{formatVnDate(occ.moveInDate)}</TableCell>
                          <TableCell>
                            <Badge variant={occ.residenceRegistrationStatus === "REGISTERED" ? "default" : "outline"}>
                              {RESIDENCE_STATUS_LABELS[occ.residenceRegistrationStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setDetailOccupantId(occ.id)}>
                                Xem hồ sơ
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(occ.id)}>
                                Sửa
                              </Button>
                              {!movedOut && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setMoveOutTarget(occ)}
                                  title="Ghi nhận người rời đi"
                                  aria-label={`Ghi nhận ${occ.fullName} rời đi`}
                                >
                                  <UserMinus className="size-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAccountant && selectedRoom && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              Danh sách người ở · Phòng {selectedRoom.code}
            </CardTitle>
            <Badge variant="outline">{accountantOccupants.length} người</Badge>
          </CardHeader>
          <CardContent>
            {occupantsQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : accountantOccupants.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>Chưa có người ở</EmptyTitle>
                  <EmptyDescription>Phòng {selectedRoom.code} hiện chưa có người ở.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã phòng</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Phân loại</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountantOccupants.map((occ) => (
                      <TableRow key={occ.id}>
                        <TableCell className="font-semibold">{occ.roomCode}</TableCell>
                        <TableCell className="font-medium">{occ.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {occ.isPrimary ? "Chủ hợp đồng" : "Người ở cùng"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isOwner && roomsQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              Tổng hợp người ở toàn tòa nhà
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Tổng số phòng", value: roomsQuery.data.meta.totalItems },
                { label: "Phòng đang cho thuê", value: rooms.filter((r) => r.status === "OCCUPIED").length },
                { label: "Tổng số người đang ở", value: rooms.reduce((sum, r) => sum + r.occupantCount, 0) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phòng</TableHead>
                    <TableHead>Tầng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Số người đang ở</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.code}</TableCell>
                      <TableCell>Tầng {r.floor}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "OCCUPIED" ? "default" : "secondary"}>
                          {ROOM_STATUS_LABELS[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{r.occupantCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isTenant &&
        (tenantRoomQuery.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : tenantRoomQuery.data ? (
          <div className="space-y-4">
            <RoomSummaryBar
              roomCode={tenantRoomQuery.data.room.code}
              floor={tenantRoomQuery.data.room.floor}
              areaM2={tenantRoomQuery.data.room.areaM2}
              contractText={formatDateRange(tenantRoomQuery.data.contract.startDate, tenantRoomQuery.data.contract.endDate)}
              statusLabel={CONTRACT_STATUS_LABELS[tenantRoomQuery.data.contract.status]}
              highlight={tenantRoomQuery.data.contract.status === "ACTIVE"}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Thành viên phòng {tenantRoomQuery.data.room.code}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Họ và tên</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead className="text-right">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantRoomQuery.data.occupants.map((occ, idx) => (
                        <TableRow key={`${occ.fullName}-${idx}`}>
                          <TableCell className="font-medium">
                            {occ.fullName}
                            {occ.isPrimary ? " (Bạn)" : ""}
                          </TableCell>
                          <TableCell>
                            <Badge variant={occ.isPrimary ? "default" : "secondary"}>
                              {occ.isPrimary ? "Chủ hợp đồng" : "Người ở cùng"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">Đang ở</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Không tìm thấy thông tin phòng</EmptyTitle>
              <EmptyDescription>
                {tenantRoomQuery.isError
                  ? errorMessage(tenantRoomQuery.error, "Không thể tải thông tin phòng")
                  : "Tài khoản hiện tại chưa gắn với phòng đang thuê nào."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ))}

      {isManager && selectedRoom && (
        <>
          <OccupantFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            room={selectedRoom}
            mode={formMode}
            occupantId={editingOccupantId}
          />
          <OccupantDetailDialog
            open={Boolean(detailOccupantId)}
            onOpenChange={(open) => {
              if (!open) setDetailOccupantId(null)
            }}
            occupantId={detailOccupantId}
            onEdit={(occ) => openEditDialog(occ.id)}
            onMoveOut={(occ) => setMoveOutTarget(occ)}
          />
          <MoveOutDialog
            open={Boolean(moveOutTarget)}
            onOpenChange={(open) => {
              if (!open) setMoveOutTarget(null)
            }}
            roomCode={selectedRoom.code}
            contractStartDate={contract?.startDate ?? null}
            occupant={moveOutTarget}
          />
        </>
      )}
    </div>
  )
}
