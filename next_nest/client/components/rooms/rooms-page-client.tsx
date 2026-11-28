"use client"

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
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AuthGate } from "@/components/auth/auth-gate"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRooms } from "@/hooks/use-rooms"
import { errorMessage } from "@/lib/api"
import { formatArea, formatVnd } from "@/lib/format"
import { canManageRooms, canViewRooms, type User } from "@/lib/types/auth"
import { getOccupantVisibility } from "@/lib/types/occupants"
import { ROOM_STATUS_OPTIONS, type Room, type RoomSortField, type RoomStatus } from "@/lib/types/room"
import { cn } from "@/lib/utils"
import { RoomDetailDialog } from "./room-detail-dialog"
import { RoomFormDialog } from "./room-form-dialog"
import { RoomStatusBadge } from "./room-status-badge"

const ALL_VALUE = "ALL"
const DEFAULT_PAGE_SIZE = 10
const BASE_FLOORS = Array.from({ length: 16 }, (_, i) => i)

const BREADCRUMBS = [{ label: "Quản lý vận hành" }, { label: "Căn hộ & Phòng trọ" }, { label: "Danh sách phòng" }]

export function RoomsPageClient() {
  return (
    <AuthGate breadcrumbs={BREADCRUMBS} allow={(user) => canViewRooms(user.roles)}>
      {(user) => <RoomsContent user={user} />}
    </AuthGate>
  )
}

function RoomsContent({ user }: { user: User }) {
  const canManage = canManageRooms(user.roles)
  const occupantVisibility = getOccupantVisibility(user.roles)
  const canViewOccupants = occupantVisibility === "FULL" || occupantVisibility === "BASIC"

  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [floorFilter, setFloorFilter] = useState<string>(ALL_VALUE)
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE)
  const [sortField, setSortField] = useState<RoomSortField>("code")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

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

  const roomsQuery = useRooms({
    q: debouncedQuery || undefined,
    floor: floorFilter === ALL_VALUE ? undefined : Number(floorFilter),
    status: statusFilter === ALL_VALUE ? undefined : (statusFilter as RoomStatus),
    page,
    pageSize,
    sort: sortDir === "desc" ? `-${sortField}` : sortField,
  })

  const rooms = roomsQuery.data?.data ?? []
  const meta = roomsQuery.data?.meta

  const floorOptions = useMemo(() => {
    const floors = new Set<number>(BASE_FLOORS)
    for (const room of roomsQuery.data?.data ?? []) floors.add(room.floor)
    return Array.from(floors).sort((a, b) => a - b)
  }, [roomsQuery.data?.data])

  const hasActiveFilters = searchInput.trim() !== "" || floorFilter !== ALL_VALUE || statusFilter !== ALL_VALUE

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

  const sortIcon = (field: RoomSortField) => {
    if (sortField !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground" />
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5 text-primary" />
    ) : (
      <ArrowDown className="size-3.5 text-primary" />
    )
  }

  const sortableHead = (field: RoomSortField, label: string, alignRight = false) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", alignRight && "ml-auto")}
    >
      {label}
      {sortIcon(field)}
    </button>
  )

  const openCreateDialog = () => {
    setEditingRoom(null)
    setFormOpen(true)
  }

  const openEditDialog = (room: Room) => {
    setEditingRoom(room)
    setFormOpen(true)
  }

  const totalItems = meta?.totalItems ?? rooms.length
  const totalPages = Math.max(1, meta?.totalPages ?? 1)
  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalItems)

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Danh sách phòng</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hiện trạng sử dụng các phòng, thông tin phòng và trạng thái bảo trì.
            </p>
          </div>
          {canManage && (
            <Button type="button" onClick={openCreateDialog} className="h-10 shrink-0 px-4 shadow-xs">
              <Plus className="size-4" />
              Thêm phòng mới
            </Button>
          )}
        </div>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="filter-room-code" className="text-xs font-semibold">
                Tìm theo mã phòng
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
              <Label htmlFor="filter-floor" className="text-xs font-semibold">
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
                  {floorOptions.map((floor) => (
                    <SelectItem key={floor} value={String(floor)}>
                      Tầng {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs font-semibold">
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
              className="h-10 px-4"
            >
              <RotateCcw className="size-4" />
              Xóa bộ lọc
            </Button>
          </div>
        </section>

        {roomsQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{errorMessage(roomsQuery.error, "Không thể tải danh sách phòng")}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => roomsQuery.refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <div className={cn("transition-opacity", roomsQuery.isFetching && !roomsQuery.isLoading && "opacity-70")}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="h-11 px-5 text-xs font-semibold">{sortableHead("code", "Mã phòng")}</TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold">{sortableHead("floor", "Tầng")}</TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold">{sortableHead("areaM2", "Diện tích")}</TableHead>
                  <TableHead className="h-11 px-4 text-right text-xs font-semibold">
                    {sortableHead("listedPrice", "Giá niêm yết", true)}
                  </TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold">Tình trạng</TableHead>
                  <TableHead className="h-11 px-5 text-right text-xs font-semibold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomsQuery.isLoading ? (
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
                        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                          <Building2 className="size-6" />
                        </div>
                        <p className="text-sm font-semibold">
                          {hasActiveFilters ? "Không tìm thấy phòng phù hợp" : "Chưa có phòng nào"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {hasActiveFilters
                            ? "Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc hiện tại."
                            : canManage
                              ? 'Nhấn "Thêm phòng mới" để tạo danh sách phòng của tòa nhà.'
                              : "Danh sách phòng hiện đang trống."}
                        </p>
                        {hasActiveFilters && (
                          <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-4">
                            Xóa bộ lọc
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => {
                    const isVacantReady = room.status === "VACANT" && !room.upcomingContract && !room.activeContract
                    return (
                      <TableRow key={room.id} className="hover:bg-muted/40">
                        <TableCell className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => setDetailRoomId(room.id)}
                            className={cn(
                              "font-bold tracking-tight hover:underline",
                              room.status === "VACANT" && "text-primary",
                            )}
                          >
                            {room.code}
                          </button>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-muted-foreground">Tầng {room.floor}</TableCell>
                        <TableCell className="px-4 py-3.5 text-muted-foreground">{formatArea(room.areaM2)}</TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-medium tabular-nums">
                          {formatVnd(room.listedPrice)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <RoomStatusBadge status={room.status} hasUpcomingContract={Boolean(room.upcomingContract)} />
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {canViewOccupants && (room.activeContract || room.upcomingContract) && (
                              <Button asChild variant="outline" size="sm" className="h-8">
                                <Link href={`/rooms/${room.id}/occupants`}>
                                  <Users className="size-3.5" />
                                  Xem người ở ({room.occupantCount})
                                </Link>
                              </Button>
                            )}
                            {isVacantReady && canManage && (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8"
                                onClick={() => toast.info("Chức năng lập hợp đồng đang phát triển")}
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
                              <Eye className="size-4 text-muted-foreground" />
                            </Button>
                            {canManage && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(room)}
                                className="h-8"
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

          {!roomsQuery.isLoading && totalItems > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground sm:flex-row">
              <div className="flex items-center gap-3">
                <span>
                  Hiển thị{" "}
                  <strong>
                    {startIndex}-{endIndex}
                  </strong>{" "}
                  trong tổng số <strong>{totalItems}</strong> phòng
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Mỗi trang:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val))
                      setPage(1)
                    }}
                  >
                    <SelectTrigger size="sm" className="h-7 w-16 bg-card">
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

      {canManage && <RoomFormDialog open={formOpen} onOpenChange={setFormOpen} room={editingRoom} />}

      <RoomDetailDialog
        roomId={detailRoomId}
        open={Boolean(detailRoomId)}
        onOpenChange={(open) => {
          if (!open) setDetailRoomId(null)
        }}
        canManage={canManage}
        onEdit={openEditDialog}
      />
    </>
  )
}
