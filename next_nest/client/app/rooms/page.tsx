import type { Metadata } from "next"
import { RoomsPageClient } from "@/components/rooms/rooms-page-client"

export const metadata: Metadata = {
  title: "Danh sách phòng",
  description: "Danh sách phòng, diện tích, giá niêm yết và trạng thái bảo trì.",
}

export default function RoomsPage() {
  return <RoomsPageClient />
}
