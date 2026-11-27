"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  FileText,
  KeyRound,
  LogOut,
  UserCircle2,
  Users,
  Zap,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ROLE_LABELS, type CurrentUser } from "@/lib/types/occupants"

interface AppShellProps {
  user: CurrentUser | null
  onLogout: () => void
  loggingOut?: boolean
  topBreadcrumb?: string
  children: React.ReactNode
}

const ACCOUNT_NAV = [
  { label: "Đổi mật khẩu", href: "/change-password", icon: KeyRound },
  { label: "Thông tin tài khoản", href: "/profile", icon: UserCircle2 },
]

const OPERATIONS_NAV = [
  { label: "Căn hộ & Phòng trọ", href: "/rooms", icon: Building2 },
  { label: "Quản lý người ở", href: "/occupants", icon: Users },
  { label: "Hợp đồng thuê", href: "/contracts", icon: FileText },
  { label: "Dịch vụ & Điện nước", href: "/services", icon: Zap },
]

export function AppShell({
  user,
  onLogout,
  loggingOut,
  topBreadcrumb = "Quản lý người ở",
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const primaryRoleLabel = user?.roles?.[0] ? ROLE_LABELS[user.roles[0]] : "Chưa đăng nhập"
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "?"

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b px-4 py-3">
          <Link href="/occupants" className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              BlueMoon
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tài khoản &amp; Hệ thống</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ACCOUNT_NAV.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Quản lý vận hành</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {OPERATIONS_NAV.map((item) => {
                  const Icon = item.icon
                  const active =
                    pathname === item.href ||
                    (item.href === "/occupants" && pathname.includes("/occupants"))
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-3">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-1">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-medium">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{primaryRoleLabel}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                onClick={onLogout}
                disabled={loggingOut}
              >
                <LogOut className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </span>
              </Button>
            </div>
          ) : (
            <p className="px-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              Chưa đăng nhập
            </p>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:inline-flex">
                  <span>Hệ thống</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:inline-flex" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{topBreadcrumb}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {user && (
            <div className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium leading-none">{user.fullName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-none">
                  @{user.username}
                </p>
              </div>
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
