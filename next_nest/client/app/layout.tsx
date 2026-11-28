import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import Providers from "./providers"
import "./globals.css"

// Inter có bộ ký tự tiếng Việt
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: { default: "BlueMoon", template: "%s | BlueMoon" },
  description: "Phần mềm quản lý chung cư mini cho thuê",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
