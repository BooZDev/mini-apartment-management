"use client"

import { Building2, FileText, KeyRound, LogOut, UserCircle2, Users, Zap, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
import { useLogout } from "@/hooks/use-auth"
import { canViewRooms, formatPrimaryRole, type User } from "@/lib/types/auth"
import { getOccupantVisibility } from "@/lib/types/occupants"

export type Crumb = { label: string; href?: string }

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Chưa có màn hình thì chỉ báo đang phát triển. */
  ready?: boolean
  visible?: (user: User) => boolean
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Tài khoản & Hệ thống",
    items: [
      { label: "Đổi mật khẩu", href: "/change-password", icon: KeyRound },
      { label: "Thông tin tài khoản", href: "/account", icon: UserCircle2 },
    ],
  },
  {
    title: "Quản lý vận hành",
    items: [
      { label: "Căn hộ & Phòng trọ", href: "/rooms", icon: Building2, ready: true, visible: (u) => canViewRooms(u.roles) },
      {
        label: "Người ở",
        href: "/occupants",
        icon: Users,
        ready: true,
        visible: (u) => getOccupantVisibility(u.roles) !== "NONE",
      },
      { label: "Hợp đồng thuê", href: "/contracts", icon: FileText },
      { label: "Dịch vụ & Điện nước", href: "/utilities", icon: Zap },
    ],
  },
]

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function isActivePath(pathname: string, href: string) {
  if (href === "/occupants") return pathname === href || /^\/rooms\/[^/]+\/occupants/.test(pathname)
  return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.endsWith("/occupants"))
}

export function AppShell({ user, breadcrumbs, children }: { user: User; breadcrumbs: Crumb[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const logout = useLogout()
  const roleLabel = formatPrimaryRole(user.roles)
  const initials = initialsOf(user.fullName)

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-14 justify-center border-b">
          <Link href="/" className="flex items-center gap-2.5 px-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <span className="truncate text-sm font-bold tracking-tight text-primary group-data-[collapsible=icon]:hidden">
              QUẢN LÝ CHUNG CƯ MINI
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="py-2">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => !item.visible || item.visible(user))
            if (items.length === 0) return null
            return (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel className="uppercase tracking-wider">{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        {item.ready ? (
                          <SidebarMenuButton
                            asChild
                            tooltip={item.label}
                            isActive={isActivePath(pathname, item.href)}
                            className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            tooltip={item.label}
                            className="text-muted-foreground"
                            onClick={() => toast.info(`Chức năng "${item.label}" đang phát triển`)}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </SidebarContent>

        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Đăng xuất"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
                className="text-destructive hover:text-destructive"
              >
                <LogOut />
                <span>{logout.isPending ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <Fragment key={`${crumb.label}-${index}`}>
                      {index > 0 && <BreadcrumbSeparator className={isLast ? undefined : "hidden md:block"} />}
                      <BreadcrumbItem className={isLast ? undefined : "hidden md:inline-flex"}>
                        {isLast ? (
                          <BreadcrumbPage className="font-semibold">{crumb.label}</BreadcrumbPage>
                        ) : crumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link href={crumb.href}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <span>{crumb.label}</span>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2.5" title={`${user.fullName} (${roleLabel})`}>
            <div className="hidden text-right sm:block">
              <p className="text-xs leading-none font-medium">{user.fullName}</p>
              <p className="mt-1 text-[11px] leading-none text-muted-foreground">@{user.username}</p>
            </div>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
