"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  Menu,
  User,
  UserCircle2,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useLogout } from "@/hooks/use-auth"
import { errorMessage } from "@/lib/api"
import { formatPrimaryRole, type CurrentUserProfile } from "@/lib/types/auth"
import { cn } from "@/lib/utils"

type BreadcrumbSegment = {
  label: string
  href?: string
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

const ACCOUNT_NAV: NavItem[] = [
  { label: "Đổi mật khẩu", href: "/change-password", icon: KeyRound, disabled: true },
  { label: "Thông tin tài khoản", href: "/account", icon: UserCircle2, disabled: true },
]

const OPERATION_NAV: NavItem[] = [
  { label: "Căn hộ & Phòng trọ", href: "/rooms", icon: Building2 },
  { label: "Hợp đồng thuê", href: "/contracts", icon: FileText, disabled: true },
  { label: "Dịch vụ & Điện nước", href: "/utilities", icon: Zap, disabled: true },
]

function SidebarBody({
  user,
  pathname,
  onNavigate,
}: {
  user?: CurrentUserProfile
  pathname: string
  onNavigate?: () => void
}) {
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Đã đăng xuất")
      },
      onError: (err) => {
        toast.error(errorMessage(err, "Không thể đăng xuất"))
      },
    })
  }

  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        if (item.disabled) {
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => toast.info(`Tính năng "${item.label}" thuộc User Story khác trong Sprint.`)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50/80 hover:text-emerald-950"
            >
              <Icon className="size-4 shrink-0 text-slate-500" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[#124e3b] text-white shadow-xs"
                : "text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-950",
            )}
          >
            <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-emerald-950/10 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-[#124e3b] text-white">
          <Building2 className="size-4" />
        </div>
        <span className="truncate text-sm font-bold tracking-tight text-[#124e3b]">
          QUẢN LÝ CHUNG CƯ MINI
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {renderGroup("Tài khoản & Hệ thống", ACCOUNT_NAV)}
        {renderGroup("Quản lý vận hành", OPERATION_NAV)}
      </nav>

      <div className="border-t border-emerald-950/10 p-3">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#124e3b] text-white">
                <User className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                <p className="truncate text-xs text-slate-500">{formatPrimaryRole(user.roles)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="size-4" />
              <span>{logoutMutation.isPending ? "Đang đăng xuất..." : "Đăng xuất"}</span>
            </button>
          </div>
        ) : (
          <p className="px-2 py-1 text-xs text-slate-500">Chưa đăng nhập</p>
        )}
      </div>
    </div>
  )
}

export function AppShell({
  user,
  breadcrumbs,
  children,
}: {
  user?: CurrentUserProfile
  breadcrumbs: BreadcrumbSegment[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f2fbf7]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-emerald-950/10 md:block">
        <SidebarBody user={user} pathname={pathname} />
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-emerald-950/10 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Mở menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Điều hướng hệ thống</SheetTitle>
                </SheetHeader>
                <SidebarBody user={user} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1
                return (
                  <span key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="size-3.5 shrink-0 text-slate-400" />}
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="truncate text-slate-500 hover:text-slate-800">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "truncate",
                          isLast ? "font-semibold text-slate-900" : "text-slate-500",
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </span>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {user && (
              <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                {user.username}
              </span>
            )}
            <div
              className="flex size-8 items-center justify-center rounded-full bg-[#124e3b] text-white"
              title={user ? `${user.fullName} (${formatPrimaryRole(user.roles)})` : "Tài khoản"}
            >
              <User className="size-4" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  )
}
