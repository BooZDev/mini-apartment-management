# CSDL trên Supabase

Lược đồ theo `report/db/db.md`: 27 bảng, PostgreSQL 17. Mọi bảng bật RLS, không có policy; NestJS kết nối bằng vai trò `postgres`, không dùng Supabase Auth.

| File | Nội dung |
|---|---|
| `migrations/20261118100000_init_schema.sql` | Bảng, khóa, ràng buộc UK, CK, chỉ mục; không giao thời gian hợp đồng (IR-01) |
| `migrations/20261118100100_integrity_triggers.sql` | Trigger quy tắc liên bảng; tự tính số còn nợ của hóa đơn |
| `migrations/20261118100200_security_rls.sql` | Bật RLS, thu hồi quyền của `anon`, `authenticated` |
| `migrations/20261118100300_system_data.sql` | Một dòng `building_settings`, khoản thu "Tiền phòng" |
| `migrations/20261123100000_sessions_note_login_ip.sql` | Bảng `user_sessions` (refresh token), `contracts.note`, `login_attempts` theo tên đăng nhập và IP |
| `seed.sql` | Tài khoản mẫu cho môi trường phát triển (mật khẩu `Abc@12345`); chỉ `db reset` chạy, `db push` không chạy |

Đẩy lên Supabase:

```bash
cd next_nest
npx supabase login
npx supabase link --project-ref <mã dự án>
npx supabase db push
```

Chuỗi kết nối lấy ở Project Settings > Database, đặt trong biến môi trường của `apis`, không đưa vào mã nguồn.

## Lỗi CSDL sang mã lỗi API

Trigger báo SQLSTATE `P0001`, `message` là mã lỗi API dùng nguyên; riêng `DELETE_NOT_ALLOWED`, `IMMUTABLE_RECORD`, `DEPOSIT_EXCEEDED` là lỗi lập trình, trả `INTERNAL_ERROR`.

| Ràng buộc | Mã lỗi API |
|---|---|
| `contracts_period_overlap` | `CONTRACT_PERIOD_OVERLAP` |
| `users_username_uk` | `USERNAME_TAKEN` |
| `rooms_code_uk` | `ROOM_CODE_TAKEN` |
| `contracts_contract_number_uk` | `CONTRACT_NUMBER_TAKEN` |
| `charge_types_name_uk` | `CHARGE_NAME_TAKEN` |
| `charge_types_active_meter_uk` | `METER_TYPE_IN_USE` |
| `charge_prices_type_effective_uk` | `PRICE_EFFECTIVE_DATE_TAKEN` |
| `billing_periods_period_uk` | `PERIOD_ALREADY_EXISTS` |
| `invoices_room_period_uk` | Phòng vào `skipped` với `ALREADY_ISSUED` (BIL-05) |
| `invoices_settlement_uk` | `CONTRACT_ALREADY_ENDED` |
| `payment_cancellation_requests_pending_uk` | `CANCELLATION_ALREADY_PENDING` |
| `expense_categories_name_uk` | `CATEGORY_NAME_TAKEN` |
| CHECK khác | `VALIDATION_ERROR` |

Các quy tắc CSDL không tự kiểm tra (người đứng tên không rời đi khi hợp đồng còn hiệu lực, người thuê chỉ đọc 30 ngày, chỉ số cũ của kỳ, tính dòng hóa đơn và thanh lý) do `apis` làm trong cùng giao dịch.
