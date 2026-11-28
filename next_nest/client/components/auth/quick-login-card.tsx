"use client"

import { Building2, LogIn } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLogin } from "@/hooks/use-auth"
import { errorMessage } from "@/lib/api"

/** Đăng nhập tạm thời, dùng chung cho mọi trang cho đến khi có màn M01. */
export function QuickLoginCard() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const login = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!username.trim() || !password) {
      setFormError("Vui lòng nhập tên đăng nhập và mật khẩu")
      return
    }
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: () => toast.success("Đăng nhập thành công!"),
        onError: (err) => setFormError(errorMessage(err, "Tài khoản hoặc mật khẩu không chính xác")),
      },
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xs">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-6" />
        </div>
        <h1 className="text-xl font-bold">Đăng nhập hệ thống</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vui lòng đăng nhập để tiếp tục.</p>
      </div>

      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-username">Tên đăng nhập</Label>
          <Input
            id="login-username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password">Mật khẩu</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={login.isPending} className="h-10 w-full">
          <LogIn className="size-4" />
          {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </div>
  )
}
