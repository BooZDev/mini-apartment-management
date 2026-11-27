import type { Metadata } from "next"
import { OccupantsWorkspace } from "@/components/occupants/occupants-workspace"

export const metadata: Metadata = {
  title: "Danh sách người ở theo phòng · BlueMoon",
  description: "Quản lý danh sách người ở, hồ sơ định danh và tình trạng tạm trú theo phòng.",
}

export default function OccupantsPage() {
  return <OccupantsWorkspace />
}
