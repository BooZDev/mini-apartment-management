"use client"

import { AlertCircle, Send } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateTenantRequest } from "@/hooks/use-occupants"

interface TenantRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomCode: string
}

export function TenantRequestDialog({ open, onOpenChange, roomCode }: TenantRequestDialogProps) {
  const [title, setTitle] = useState("")
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [hometown, setHometown] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [relationship, setRelationship] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mutation = useCreateTenantRequest()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 5) {
      setError("Tiêu đề yêu cầu cần tối thiểu 5 ký tự.")
      return
    }
    if (!fullName.trim() || !dateOfBirth || !hometown.trim() || !/^\d{12}$/.test(idNumber.trim())) {
      setError("Vui lòng nhập đầy đủ họ tên, ngày sinh, quê quán và số CCCD gồm 12 chữ số.")
      return
    }

    try {
      await mutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        occupantChange: {
          action: "ADD",
          proposedData: {
            fullName: fullName.trim(),
            dateOfBirth,
            hometown: hometown.trim(),
            idNumber: idNumber.trim(),
            relationshipToPrimary: relationship.trim() || undefined,
          },
        },
      })
      setTitle("")
      setFullName("")
      setDateOfBirth("")
      setHometown("")
      setIdNumber("")
      setRelationship("")
      setDescription("")
      onOpenChange(false)
    } catch {
      // Lỗi đã được toast trong hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gửi yêu cầu thêm người ở · Phòng {roomCode}</DialogTitle>
          <DialogDescription>
            Yêu cầu sẽ được gửi đến Ban quản lý để kiểm tra và phê duyệt theo quy định cư trú.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="req-title">
              Tiêu đề yêu cầu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-title"
              placeholder="VD: Xin đăng ký thêm người ở cùng phòng"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="req-name">
                Họ và tên người ở mới <span className="text-destructive">*</span>
              </Label>
              <Input
                id="req-name"
                placeholder="VD: Trần Văn B"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-dob">
                Ngày sinh <span className="text-destructive">*</span>
              </Label>
              <Input
                id="req-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="req-cccd">
                Số CCCD (12 chữ số) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="req-cccd"
                maxLength={12}
                inputMode="numeric"
                className="font-mono"
                placeholder="034200001234"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-rel">Quan hệ với chủ hợp đồng</Label>
              <Input
                id="req-rel"
                placeholder="VD: Bạn cùng phòng"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-hometown">
              Quê quán <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-hometown"
              placeholder="VD: Nam Định"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-desc">Ghi chú thêm</Label>
            <Textarea
              id="req-desc"
              rows={2}
              placeholder="Thời gian dự kiến dọn vào..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Send className="mr-1.5 size-4" />
              {mutation.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
