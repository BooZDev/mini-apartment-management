"use client"

import {
  BarChart3,
  Building2,
  Download,
  Lock,
  MessageSquarePlus,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { MoveOutDialog } from "@/components/occupants/move-out-dialog"
import { OccupantDetailDialog } from "@/components/occupants/occupant-detail-dialog"
import { OccupantFormDialog } from "@/components/occupants/occupant-form-dialog"
import { TenantRequestDialog } from "@/components/occupants/tenant-request-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useCurrentUser,
  useExportOccupants,
  useLogin,
  useLogout,
  useRoomOccupants,
  useRooms,
  useTenantRoom,
} from "@/hooks/use-occupants"
import {
  formatVnDate,
  getOccupantVisibility,
  RESIDENCE_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  type OccupantBasicSummary,
  type OccupantFullSummary,
  type RoomItem,
} from "@/lib/types/occupants"
import { cn } from "@/lib/utils"

interface OccupantsWorkspaceProps {
  initialRoomId?: string
}

function QuickLoginCard() {
  const [username, setUsername] = useState("quanly01")
  const [password, setPassword] = useState("")
  const loginMutation = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    loginMutation.mutate({ username: username.trim(), password })
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Lock className="size-5" />
          </div>
          <CardTitle>Đăng nhập hệ thống</CardTitle>
          <CardDescription>
            Vui lòng đăng nhập để truy cập danh sách người ở theo phân quyền của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-username">Tên đăng nhập</Label>
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: quanly01, ketoan01, chunha01, nguoithue_p101"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Mật khẩu</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function RoomSummaryBar({
  roomCode,
  floor,
  areaM2,
  contractRange,
  statusLabel,
  isActive,
}: {
  roomCode: string
  floor: number
  areaM2: number
  contractRange: string
  statusLabel: string
  isActive: boolean
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
              Tầng {floor} ({areaM2}m²)
            </strong>
          </span>

          <Separator orientation="vertical" className="hidden h-4 sm:block" />

          <span className="text-muted-foreground">
            Hợp đồng: <strong className="font-medium text-foreground">{contractRange}</strong>
          </span>
        </div>

        <Badge variant={isActive ? "default" : "secondary"}>{statusLabel}</Badge>
      </CardContent>
    </Card>
  )
}

export function OccupantsWorkspace({ initialRoomId }: OccupantsWorkspaceProps) {
  const userQuery = useCurrentUser()
  const logoutMutation = useLogout()
  const exportMutation = useExportOccupants()

  const user = userQuery.data ?? null
  const visibility = getOccupantVisibility(user?.roles ?? [])
  const isManager = visibility === "FULL"
  const isAccountant = visibility === "BASIC"
  const isTenant = visibility === "NAME_ONLY"
  const isOwner = Boolean(user?.roles?.includes("OWNER")) && !isManager && !isAccountant
  const canListRooms = Boolean(
    user?.roles?.some((r) => r === "MANAGER" || r === "ACCOUNTANT" || r === "OWNER"),
  )

  const roomsQuery = useRooms(Boolean(user) && canListRooms)
  const tenantRoomQuery = useTenantRoom(Boolean(user) && isTenant)

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId ?? null)
  const [includeMovedOut, setIncludeMovedOut] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Dialog states
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingOccupantId, setEditingOccupantId] = useState<string | null>(null)
  const [detailOccupantId, setDetailOccupantId] = useState<string | null>(null)
  const [moveOutTarget, setMoveOutTarget] = useState<OccupantFullSummary | null>(null)
  const [tenantRequestOpen, setTenantRequestOpen] = useState(false)

  useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId)
      return
    }
    if (!selectedRoomId && roomsQuery.data && roomsQuery.data.length > 0) {
      const occupied = roomsQuery.data.find((r) => r.status === "OCCUPIED")
      setSelectedRoomId((occupied ?? roomsQuery.data[0]).id)
    }
  }, [initialRoomId, selectedRoomId, roomsQuery.data])

  const selectedRoom: RoomItem | null = useMemo(() => {
    if (!roomsQuery.data || !selectedRoomId) return null
    return roomsQuery.data.find((r) => r.id === selectedRoomId) ?? null
  }, [roomsQuery.data, selectedRoomId])

  const occupantsQuery = useRoomOccupants(
    selectedRoomId,
    includeMovedOut,
    Boolean(user) && (isManager || isAccountant),
  )

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

  const activeManagerCount = useMemo(() => {
    if (!isManager || !occupantsQuery.data) return 0
    return (occupantsQuery.data as OccupantFullSummary[]).filter((r) => !r.moveOutDate).length
  }, [isManager, occupantsQuery.data])

  const accountantOccupants = useMemo(() => {
    if (!isAccountant || !occupantsQuery.data) return []
    return occupantsQuery.data as OccupantBasicSummary[]
  }, [isAccountant, occupantsQuery.data])

  const openCreateDialog = () => {
    setFormMode("create")
    setEditingOccupantId(null)
    setFormOpen(true)
  }

  const openEditDialog = (id: string) => {
    setFormMode("edit")
    setEditingOccupantId(id)
    setFormOpen(true)
  }

  const activeContract = selectedRoom?.activeContract ?? selectedRoom?.upcomingContract ?? null
  const hasOpenContract = Boolean(activeContract)

  return (
    <AppShell
      user={user}
      onLogout={() => logoutMutation.mutate()}
      loggingOut={logoutMutation.isPending}
      topBreadcrumb="Quản lý người ở"
    >
      {userQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : !user ? (
        <QuickLoginCard />
      ) : (
        <div className="space-y-5">
          {/* Page Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <span>Quản lý vận hành</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <span>Căn hộ &amp; Phòng trọ</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Danh sách người ở theo phòng</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 className="text-2xl font-bold tracking-tight">Danh sách người ở theo phòng</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canListRooms && roomsQuery.data && roomsQuery.data.length > 0 && (
                <Select
                  value={selectedRoomId ?? ""}
                  onValueChange={(val) => setSelectedRoomId(val)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Chọn phòng..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roomsQuery.data.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        Phòng {r.code} · {r.occupantCount} người
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isManager && selectedRoom && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportMutation.isPending}
                  onClick={() =>
                    exportMutation.mutate({
                      roomId: selectedRoom.id,
                      includeMovedOut,
                    })
                  }
                >
                  <Download className="mr-1.5 size-4" />
                  {exportMutation.isPending ? "Đang xuất..." : "Xuất Excel"}
                </Button>
              )}
            </div>
          </div>

          {/* Room Summary Bar */}
          {canListRooms && selectedRoom && (
            <RoomSummaryBar
              roomCode={selectedRoom.code}
              floor={selectedRoom.floor}
              areaM2={selectedRoom.areaM2}
              contractRange={
                activeContract
                  ? `${activeContract.primaryTenantName ?? "Hợp đồng"} (${formatVnDate(activeContract.startDate)} – ${formatVnDate(activeContract.endDate)})`
                  : "Chưa có hợp đồng hiệu lực"
              }
              statusLabel={ROOM_STATUS_LABELS[selectedRoom.status]}
              isActive={selectedRoom.status === "OCCUPIED"}
            />
          )}

          {/* 1. PHÂN HỆ QUẢN LÝ (MANAGER) */}
          {isManager && selectedRoom && (
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="size-4" />
                  Danh sách người ở · Phòng {selectedRoom.code}
                </CardTitle>

                <Button disabled={!hasOpenContract} onClick={openCreateDialog}>
                  <UserPlus className="mr-1.5 size-4" />
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
                    <Switch
                      id="include-moved-out"
                      checked={includeMovedOut}
                      onCheckedChange={setIncludeMovedOut}
                    />
                    <Label htmlFor="include-moved-out" className="cursor-pointer text-sm">
                      Hiển thị cả người đã rời đi
                    </Label>
                  </div>
                </div>

                {!hasOpenContract ? (
                  <Empty className="border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users />
                      </EmptyMedia>
                      <EmptyTitle>Phòng {selectedRoom.code} chưa có hợp đồng</EmptyTitle>
                      <EmptyDescription>
                        Cần lập hợp đồng thuê cho phòng trước khi thêm danh sách người ở.
                      </EmptyDescription>
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
                      <EmptyDescription>
                        Không tìm thấy người ở phù hợp trong phòng {selectedRoom.code}.
                      </EmptyDescription>
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
                                  {movedOut && (
                                    <Badge variant="outline">
                                      Đã rời {formatVnDate(occ.moveOutDate)}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-muted-foreground">
                                {occ.isPrimary ? "Bản thân" : (occ.relationshipToPrimary ?? "—")}
                              </TableCell>

                              <TableCell className="font-mono text-xs text-muted-foreground">
                                ••••••••••••
                              </TableCell>

                              <TableCell>{formatVnDate(occ.moveInDate)}</TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    occ.residenceRegistrationStatus === "REGISTERED"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {RESIDENCE_STATUS_LABELS[occ.residenceRegistrationStatus]}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDetailOccupantId(occ.id)}
                                  >
                                    Xem hồ sơ
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(occ.id)}
                                  >
                                    Sửa
                                  </Button>
                                  {!movedOut && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setMoveOutTarget(occ)}
                                      title="Ghi nhận người rời đi"
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

          {/* 2. PHÂN HỆ KẾ TOÁN (ACCOUNTANT) */}
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
                      <EmptyDescription>
                        Phòng {selectedRoom.code} hiện chưa có người ở đang hoạt động.
                      </EmptyDescription>
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
                          <TableHead className="text-center">Số người tính phí</TableHead>
                          <TableHead className="text-right">Trạng thái</TableHead>
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
                            <TableCell className="text-center font-mono font-medium">01</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">Đang ở</Badge>
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

          {/* 3. PHÂN HỆ CHỦ NHÀ (OWNER - AGGREGATE ONLY) */}
          {isOwner && roomsQuery.data && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4" />
                  Tổng hợp nhân khẩu toàn tòa nhà
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Tổng số phòng</p>
                      <p className="mt-1 text-2xl font-bold">{roomsQuery.data.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Phòng đang cho thuê</p>
                      <p className="mt-1 text-2xl font-bold">
                        {roomsQuery.data.filter((r) => r.status === "OCCUPIED").length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Tổng nhân khẩu đang ở</p>
                      <p className="mt-1 text-2xl font-bold">
                        {roomsQuery.data.reduce((sum, r) => sum + r.occupantCount, 0)}
                      </p>
                    </CardContent>
                  </Card>
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
                      {roomsQuery.data.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-semibold">{r.code}</TableCell>
                          <TableCell>Tầng {r.floor}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "OCCUPIED" ? "default" : "secondary"}>
                              {ROOM_STATUS_LABELS[r.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {String(r.occupantCount).padStart(2, "0")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. PHÂN HỆ NGƯỜI THUÊ (TENANT) */}
          {isTenant && (
            <>
              {tenantRoomQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : tenantRoomQuery.data ? (
                <div className="space-y-4">
                  <RoomSummaryBar
                    roomCode={tenantRoomQuery.data.room.code}
                    floor={tenantRoomQuery.data.room.floor}
                    areaM2={tenantRoomQuery.data.room.areaM2}
                    contractRange={`${formatVnDate(tenantRoomQuery.data.contract.startDate)} – ${formatVnDate(tenantRoomQuery.data.contract.endDate)}`}
                    statusLabel={
                      tenantRoomQuery.data.contract.status === "ACTIVE"
                        ? "Đang hoạt động"
                        : tenantRoomQuery.data.contract.status === "UPCOMING"
                          ? "Sắp hiệu lực"
                          : "Đã kết thúc"
                    }
                    isActive={tenantRoomQuery.data.contract.status === "ACTIVE"}
                  />

                  <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="size-4" />
                        Thành viên phòng {tenantRoomQuery.data.room.code}
                      </CardTitle>

                      {tenantRoomQuery.data.contract.status !== "ENDED" && (
                        <Button variant="outline" onClick={() => setTenantRequestOpen(true)}>
                          <MessageSquarePlus className="mr-1.5 size-4" />
                          Gửi yêu cầu thay đổi người ở
                        </Button>
                      )}
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
                                  {occ.isPrimary && occ.fullName === user.fullName ? " (Bạn)" : ""}
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

                  <TenantRequestDialog
                    open={tenantRequestOpen}
                    onOpenChange={setTenantRequestOpen}
                    roomCode={tenantRoomQuery.data.room.code}
                  />
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>Không tìm thấy thông tin phòng</EmptyTitle>
                    <EmptyDescription>
                      Tài khoản hiện tại chưa được gắn với phòng đang thuê nào.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </>
          )}

          {/* Modals for MANAGER */}
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
                roomId={selectedRoom.id}
                roomCode={selectedRoom.code}
                occupant={moveOutTarget}
                activeCount={activeManagerCount}
              />
            </>
          )}
        </div>
      )}
    </AppShell>
  )
}
