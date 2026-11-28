"use client"

import axios from "axios"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSignature,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ForbiddenView } from "@/components/auth/forbidden-view"
import { QuickLoginCard } from "@/components/auth/quick-login-card"
import { AppShell } from "@/components/layout/app-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCurrentUser, useLogout } from "@/hooks/use-auth"
import { useRooms } from "@/hooks/use-rooms"
import { errorCode, errorMessage } from "@/lib/api"
import { canManageRooms, canViewRooms } from "@/lib/types/auth"
import {
  formatArea,
  formatVnd,
  ROOM_STATUS_OPTIONS,
  type Room,
  type RoomSortField,
  type RoomStatus,
} from "@/lib/types/room"
import { cn } from "@/lib/utils"
import { RoomDetailDialog } from "./room-detail-dialog"
import { RoomFormDialog } from "./room-form-dialog"
import { RoomStatusBadge } from "./room-status-badge"

const ALL_VALUE = "ALL"
const DEFAULT_PAGE_SIZE = 10
const BASE_FLOORS = Array.from({ length: 16 }, (_, i) => i)

export function RoomsPageClient() {
  const { data: user, isLoading: isAuthLoading, isError: isAuthError, error: authError } = useCurrentUser()
  const logoutMutation = useLogout()

  // Filter, sort & pagination state
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [floorFilter, setFloorFilter] = useState<string>(ALL_VALUE)
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE)
  const [sortField, setSortField] = useState<RoomSortField>("code")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [detailRoomId, setDetailRoomId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const canView = canViewRooms(user?.roles)
  const canManage = canManageRooms(user?.roles)
  const isRoomsQueryEnabled = Boolean(user && !user.mustChangePassword && canView)

  const sortParam = sortDir === "desc" ? `-${sortField}` : sortField
  const parsedFloor = floorFilter === ALL_VALUE ? undefined : Number(floorFilter)
  const parsedStatus = statusFilter === ALL_VALUE ? undefined : (statusFilter as RoomStatus)

  const {
    data: roomsResponse,
    isLoading: isRoomsLoading,
    isFetching: isRoomsFetching,
    isError: isRoomsError,
    error: roomsError,
    refetch: refetchRooms,
  } = useRooms(
    {
      q: debouncedQuery || undefined,
      floor: parsedFloor,
      status: parsedStatus,
      page,
      pageSize,
      sort: sortParam,
    },
    isRoomsQueryEnabled,
  )

  const rooms = roomsResponse?.data ?? []
  const meta = roomsResponse?.meta

  const floorOptions = useMemo(() => {
    const set = new Set<number>(BASE_FLOORS)
    for (const r of roomsResponse?.data ?? []) set.add(r.floor)
    return Array.from(set).sort((a, b) => a - b)
  }, [roomsResponse?.data])

  const hasActiveFilters =
    searchInput.trim() !== "" || floorFilter !== ALL_VALUE || statusFilter !== ALL_VALUE

  const resetFilters = () => {
    setSearchInput("")
    setDebouncedQuery("")
    setFloorFilter(ALL_VALUE)
    setStatusFilter(ALL_VALUE)
    setPage(1)
  }

  const toggleSort = (field: RoomSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1)
  }

  const renderSortIcon = (field: RoomSortField) => {
    if (sortField !== field) return <ArrowUpDown className="size-3.5 text-slate-400" />
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5 text-[#124e3b]" />
    ) : (
      <ArrowDown className="size-3.5 text-[#124e3b]" />
    )
  }

  const openCreateDialog = () => {
    setEditingRoom(null)
    setFormOpen(true)
  }

  const openEditDialog = (room: Room) => {
    setEditingRoom(room)
    setFormOpen(true)
  }

  const breadcrumbs = [
    { label: "Quản lý vận hành" },
    { label: "Căn hộ & Phòng trọ" },
    { label: "Danh sách phòng" },
  ]

  // 1. Auth loading
  if (isAuthLoading) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
        <div className="space-y-5">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </AppShell>
    )
  }

  // 2. Unauthenticated (401)
  const authHttpStatus = axios.isAxiosError(authError) ? authError.response?.status : undefined
  if (isAuthError && (authHttpStatus === 401 || errorCode(authError) === "UNAUTHENTICATED")) {
    return (
      <AppShell breadcrumbs={[{ label: "Hệ thống" }, { label: "Đăng nhập" }]}>
        <QuickLoginCard />
      </AppShell>
    )
  }

  // 3. Other auth/network errors
  if (isAuthError || !user) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription>
            {errorMessage(authError, "Không thể kết nối tới máy chủ API. Hãy kiểm tra backend đang chạy.")}
          </AlertDescription>
        </Alert>
      </AppShell>
    )
  }

  // 4. Must change password
  if (user.mustChangePassword) {
    return (
      <AppShell user={user} breadcrumbs={[{ label: "Hệ thống" }, { label: "Tài khoản & Hệ thống" }]}>
        <ForbiddenView
          title="Yêu cầu đổi mật khẩu"
          description="Tài khoản của bạn cần đổi mật khẩu lần đầu trước khi sử dụng chức năng quản lý phòng."
          backLabel="Đăng xuất"
          onBack={() => logoutMutation.mutate()}
        />
      </AppShell>
    )
  }

  // 5. Forbidden (403 — e.g. TENANT or role without room view permission)
  const roomsForbidden =
    isRoomsError && axios.isAxiosError(roomsError) && roomsError.response?.status === 403
  if (!canView || roomsForbidden) {
    return (
      <AppShell user={user} breadcrumbs={[{ label: "Hệ thống" }, { label: "Tài khoản & Hệ thống" }]}>
        <ForbiddenView
          backLabel="Đăng xuất để đổi tài khoản"
          onBack={() => logoutMutation.mutate()}
        />
      </AppShell>
    )
  }

  const totalItems = meta?.totalItems ?? rooms.length
  const totalPages = Math.max(1, meta?.totalPages ?? 1)
  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalItems)

  return (
    <AppShell user={user} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Danh sách phòng</h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản lý hiện trạng sử dụng các phòng, cập nhật thông tin phòng, đặt bảo trì hoặc xem
              chi tiết hợp đồng.
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              onClick={openCreateDialog}
              className="h-10 shrink-0 bg-[#124e3b] px-4 text-white shadow-xs hover:bg-[#0e3d2e]"
            >
              <Plus className="size-4" />
              Thêm phòng mới
            </Button>
          )}
        </div>

        {/* Filter Card — matches M04 design */}
        <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="filter-room-code" className="text-xs font-semibold text-slate-700">
                Tìm theo mã phòng
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="filter-room-code"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nhập mã phòng (ví dụ: P101, P201)..."
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-floor" className="text-xs font-semibold text-slate-700">
                Tầng
              </Label>
              <Select
                value={floorFilter}
                onValueChange={(value) => {
                  setFloorFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="filter-floor" className="h-10 w-full">
                  <SelectValue placeholder="Tất cả các tầng" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL_VALUE}>Tất cả các tầng</SelectItem>
                  {floorOptions.map((fl) => (
                    <SelectItem key={fl} value={String(fl)}>
                      Tầng {fl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs font-semibold text-slate-700">
                Tình trạng
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="filter-status" className="h-10 w-full">
                  <SelectValue placeholder="Tất cả tình trạng" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL_VALUE}>Tất cả tình trạng</SelectItem>
                  {ROOM_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="h-10 bg-emerald-900/10 px-4 text-emerald-950 hover:bg-emerald-900/15 disabled:opacity-50"
            >
              <RotateCcw className="size-4" />
              Xóa bộ lọc
            </Button>
          </div>
        </section>

        {/* Error banner */}
        {isRoomsError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{errorMessage(roomsError, "Không thể tải danh sách phòng")}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => refetchRooms()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Table Card */}
        <section className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-xs">
          <div className={cn("transition-opacity", isRoomsFetching && !isRoomsLoading && "opacity-70")}>
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/50">
                  <TableHead className="h-11 px-5 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("code")}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Mã phòng
                      {renderSortIcon("code")}
                    </button>
                  </TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("floor")}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Tầng
                      {renderSortIcon("floor")}
                    </button>
                  </TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("areaM2")}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Diện tích
                      {renderSortIcon("areaM2")}
                    </button>
                  </TableHead>
                  <TableHead className="h-11 px-4 text-right text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("listedPrice")}
                      className="ml-auto inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Giá niêm yết
                      {renderSortIcon("listedPrice")}
                    </button>
                  </TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold text-slate-600">
                    Tình trạng
                  </TableHead>
                  <TableHead className="h-11 px-5 text-right text-xs font-semibold text-slate-600">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRoomsLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="px-5 py-3.5">
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <Skeleton className="h-5 w-14" />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <Skeleton className="ml-auto h-5 w-24" />
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <Skeleton className="h-6 w-24 rounded-md" />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rooms.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="px-6 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                          <Building2 className="size-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {hasActiveFilters ? "Không tìm thấy phòng phù hợp" : "Chưa có phòng nào"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {hasActiveFilters
                            ? "Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc hiện tại."
                            : canManage
                              ? "Nhấn \"Thêm phòng mới\" để khởi tạo danh sách phòng cho tòa nhà."
                              : "Danh sách phòng hiện đang trống."}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="mt-4"
                          >
                            Xóa bộ lọc
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => {
                    const isVacantReady =
                      room.status === "VACANT" && !room.upcomingContract && !room.activeContract
                    return (
                      <TableRow key={room.id} className="hover:bg-emerald-50/35">
                        <TableCell className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => setDetailRoomId(room.id)}
                            className={cn(
                              "font-bold tracking-tight hover:underline",
                              room.status === "VACANT" ? "text-[#124e3b]" : "text-slate-900",
                            )}
                          >
                            {room.code}
                          </button>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-700">
                          Tầng {room.floor}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-700">
                          {formatArea(room.areaM2)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-medium text-slate-900 tabular-nums">
                          {formatVnd(room.listedPrice)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <RoomStatusBadge
                            status={room.status}
                            hasUpcomingContract={Boolean(room.upcomingContract)}
                          />
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {room.status === "OCCUPIED" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDetailRoomId(room.id)}
                                className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                <Users className="size-3.5" />
                                Xem người ở ({room.occupantCount})
                              </Button>
                            )}
                            {isVacantReady && canManage && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  toast.info(
                                    `Chức năng lập hợp đồng cho phòng ${room.code} thuộc US-07.`,
                                  )
                                }
                                className="h-8 bg-[#124e3b] text-white hover:bg-[#0e3d2e]"
                              >
                                <FileSignature className="size-3.5" />
                                Lập hợp đồng
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDetailRoomId(room.id)}
                              title="Xem chi tiết phòng"
                              aria-label={`Xem chi tiết phòng ${room.code}`}
                            >
                              <Eye className="size-4 text-slate-600" />
                            </Button>
                            {canManage && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(room)}
                                className="h-8 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-[#124e3b]"
                              >
                                <Pencil className="size-3.5" />
                                Sửa
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!isRoomsLoading && totalItems > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-emerald-950/10 bg-slate-50/50 px-5 py-3 text-xs text-slate-600 sm:flex-row">
              <div className="flex items-center gap-3">
                <span>
                  Hiển thị <strong>{startIndex}</strong>–<strong>{endIndex}</strong> trong tổng số{" "}
                  <strong>{totalItems}</strong> phòng
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Hiển thị:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val))
                      setPage(1)
                    }}
                  >
                    <SelectTrigger size="sm" className="h-7 w-16 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {[10, 20, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  Trang <strong>{page}</strong> / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Room Dialog */}
      {canManage && (
        <RoomFormDialog open={formOpen} onOpenChange={setFormOpen} room={editingRoom} />
      )}

      {/* Room Detail Dialog */}
      <RoomDetailDialog
        roomId={detailRoomId}
        open={Boolean(detailRoomId)}
        onOpenChange={(open) => {
          if (!open) setDetailRoomId(null)
        }}
        canManage={canManage}
        onEdit={openEditDialog}
      />
    </AppShell>
  )
}
