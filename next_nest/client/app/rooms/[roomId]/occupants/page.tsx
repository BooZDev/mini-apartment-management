import type { Metadata } from "next"
import { OccupantsWorkspace } from "@/components/occupants/occupants-workspace"

export const metadata: Metadata = {
  title: "Danh sách người ở theo phòng",
  description: "Người ở theo phòng, hồ sơ định danh và tình trạng tạm trú.",
}

export default async function RoomOccupantsPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return <OccupantsWorkspace initialRoomId={roomId} />
}
