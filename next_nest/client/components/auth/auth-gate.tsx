"use client"

import { ForbiddenView } from "@/components/auth/forbidden-view"
import { QuickLoginCard } from "@/components/auth/quick-login-card"
import { AppShell, type Crumb } from "@/components/layout/app-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentUser, useLogout } from "@/hooks/use-auth"
import { errorMessage, errorStatus } from "@/lib/api"
import type { User } from "@/lib/types/auth"

function CenteredPage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-1 items-center justify-center p-4">{children}</div>
}

/**
 * Trang cần đăng nhập: chưa đăng nhập thì hiện form đăng nhập; đang dùng mật khẩu được cấp
 * thì chặn (AUTH-04); vai trò không phù hợp thì báo không có quyền.
 */
export function AuthGate({
  breadcrumbs,
  allow,
  children,
}: {
  breadcrumbs: Crumb[]
  allow?: (user: User) => boolean
  children: (user: User) => React.ReactNode
}) {
  const { data: user, isPending, error, refetch } = useCurrentUser()
  const logout = useLogout()

  if (isPending) {
    return (
      <CenteredPage>
        <Spinner className="size-6 text-primary" />
      </CenteredPage>
    )
  }

  if (!user) {
    if (error && errorStatus(error) !== 401) {
      return (
        <CenteredPage>
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{errorMessage(error, "Không kết nối được máy chủ, vui lòng thử lại")}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </CenteredPage>
      )
    }
    return (
      <CenteredPage>
        <QuickLoginCard />
      </CenteredPage>
    )
  }

  if (user.mustChangePassword) {
    return (
      <AppShell user={user} breadcrumbs={[{ label: "Tài khoản & Hệ thống" }, { label: "Đổi mật khẩu" }]}>
        <ForbiddenView
          title="Cần đổi mật khẩu"
          description="Tài khoản đang dùng mật khẩu được cấp. Hãy đổi mật khẩu trước khi dùng các chức năng khác."
          actionLabel="Đăng xuất"
          onAction={() => logout.mutate()}
        />
      </AppShell>
    )
  }

  if (allow && !allow(user)) {
    return (
      <AppShell user={user} breadcrumbs={breadcrumbs}>
        <ForbiddenView />
      </AppShell>
    )
  }

  return (
    <AppShell user={user} breadcrumbs={breadcrumbs}>
      {children(user)}
    </AppShell>
  )
}
