import type { Metadata } from "next"
import { OccupantsWorkspace } from "@/components/occupants/occupants-workspace"

export const metadata: Metadata = {
  title: "Danh sách người ở theo phòng",
  description: "Người ở theo phòng, hồ sơ định danh và tình trạng tạm trú.",
}

export default function OccupantsPage() {
  return <OccupantsWorkspace />
}
