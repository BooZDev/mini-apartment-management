import { Badge } from "@/components/ui/badge"
import { ROOM_STATUS_LABELS, type RoomStatus } from "@/lib/types/room"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<RoomStatus, string> = {
  OCCUPIED: "border-primary/20 bg-secondary text-primary",
  VACANT: "border-border bg-card text-muted-foreground",
  MAINTENANCE: "border-amber-200 bg-amber-100 text-amber-900",
}

export function RoomStatusBadge({
  status,
  hasUpcomingContract = false,
  className,
}: {
  status: RoomStatus
  hasUpcomingContract?: boolean
  className?: string
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className={cn("h-6 rounded-md px-2.5 text-xs font-medium", STATUS_STYLES[status], className)}
      >
        {ROOM_STATUS_LABELS[status]}
      </Badge>
      {hasUpcomingContract && (
        <Badge
          variant="outline"
          className="h-6 rounded-md border-sky-200 bg-sky-50 px-2 text-[11px] font-medium text-sky-800"
        >
          Có HĐ sắp hiệu lực
        </Badge>
      )}
    </div>
  )
}
