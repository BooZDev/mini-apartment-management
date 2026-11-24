import type { Metadata } from "next"
import { RoomsPageClient } from "@/components/rooms/rooms-page-client"

export const metadata: Metadata = {
  title: "Danh sách phòng | BlueMoon",
  description: "Quản lý danh sách phòng, thông tin diện tích, giá niêm yết và trạng thái bảo trì.",
}

export default function RoomsPage() {
  return <RoomsPageClient />
}
