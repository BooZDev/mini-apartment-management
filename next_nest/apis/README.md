# apis: máy chủ NestJS

NestJS 12, TypeORM, PostgreSQL trên Supabase (chỉ dùng CSDL, xác thực tự làm). Đặc tả: `report/api/API-Specification.md` (92 endpoint); lược đồ: `supabase/migrations`.

## Chạy

```bash
pnpm install
cp .env.example .env        # điền DATABASE_URL, JWT_SECRET
pnpm start:dev              # http://localhost:3001/api/v1, Swagger: /server-api
```

Chưa có Supabase thì chạy `pnpm db:test`: CSDL trong bộ nhớ, đủ migration và tài khoản mẫu (mật khẩu `Abc@12345`), cổng 54329. Khi đó đặt `DATABASE_SSL=false`, `DATABASE_POOL_MAX=1`, `COOKIE_SECURE=false`.

## Kiểm thử

| Lệnh | Nội dung |
|---|---|
| `pnpm test` | Unit test: tính tiền, ngày giờ, mật khẩu, tìm không dấu, trạng thái tài khoản, ánh xạ lỗi, kiểm tra dữ liệu vào |
| `pnpm test:e2e` | Gọi API thật trên CSDL thử vừa khởi tạo, đủ các luồng nghiệp vụ. API chạy cổng 3101 với `TRUST_PROXY=1`, `COOKIE_SECURE=false`, `DATABASE_POOL_MAX=1`, `SCHEDULER=false` |
| `pnpm lint` | oxlint có kiểm tra kiểu |

## Cấu trúc

```
src/
  config/       biến môi trường, TypeORM
  entities/     entity khớp migration
  common/       mã lỗi, bộ lọc lỗi, khuôn phản hồi, middleware, decorator kiểm tra dữ liệu
  auth/         Passport local + JWT, refresh token, guard, Public, Roles
  billing/      tính hóa đơn tháng và thanh lý, kỳ hóa đơn
  scheduler/    tác vụ hằng ngày: thông báo hạn thanh toán, dọn phiên hết hạn
  <module>/     controller, service, dto/, enums/ theo nhóm API
```

## Bảo mật

- Access token 15 phút và refresh token xoay vòng, đều trong cookie `HttpOnly`, `SameSite=Lax`, `Secure`; token cũ bị dùng lại thì hủy phiên.
- bcrypt cost 12; sai 5 lần trong 15 phút với cùng tên đăng nhập từ cùng IP thì chặn IP đó; giới hạn yêu cầu theo IP.
- Mặc định mọi route cần đăng nhập; vai trò đọc lại từ CSDL ở mỗi yêu cầu; người thuê chỉ thấy dữ liệu hợp đồng của mình.
- Kiểm tra `Origin` khi ghi dữ liệu; trường lạ bị từ chối; SQL dùng tham số ràng buộc.
- Thao tác tiền trong một giao dịch, khóa dòng trước khi kiểm tra; số còn nợ do CSDL tính; chống gửi lặp bằng `Idempotency-Key`.
- Lỗi không lường trước chỉ trả thông báo chung; Swagger tắt ở production.

Giới hạn theo IP nằm trong bộ nhớ: chạy một instance.
