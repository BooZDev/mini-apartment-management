# Đặc tả API phần mềm quản lý chung cư mini cho thuê

Phiên bản 0.9, ngày 23/11/2026.

Tài liệu mô tả API giữa ứng dụng giao diện (Next.js) và máy chủ ứng dụng (NestJS): endpoint, dữ liệu vào ra, quyền, lỗi và quy tắc xử lý.

---

## 1. Cách đọc tài liệu

Mỗi endpoint có mã dạng `NHÓM-số` (ví dụ `PAY-01`) và gồm các phần:

| Phần | Nội dung |
|---|---|
| Bảng thông tin | Phương thức và đường dẫn, vai trò được gọi, có ghi nhật ký hay không |
| Tham số | Tham số trên đường dẫn và tham số truy vấn |
| Dữ liệu vào | Trường của phần thân yêu cầu: kiểu, bắt buộc, ràng buộc |
| Phản hồi | Mã trạng thái thành công và đối tượng trả về (định nghĩa ở mục 4) |
| Lỗi | Mã lỗi nghiệp vụ có thể trả về (danh sách đầy đủ ở mục 6) |
| Quy tắc xử lý | Các bước máy chủ thực hiện, mô tả bằng lời |

Ký hiệu cột **Bắt buộc**: **Có** = phải gửi; **Không** = có thể bỏ; **Điều kiện** = bắt buộc trong trường hợp được ghi ở cột ràng buộc.

---

## 2. Quy ước chung

### 2.1. Địa chỉ, phiên bản, giao thức

| Mục | Quy ước |
|---|---|
| Đường dẫn gốc | `/api/v1` |
| Giao thức | Chỉ HTTPS ở bản triển khai |
| Định dạng | JSON, mã hóa UTF-8; trừ endpoint xuất file Excel |
| Kích thước phần thân yêu cầu | Tối đa 1 MB |
| Mã yêu cầu | Mỗi phản hồi có header `X-Request-Id` để tra log khi có lỗi |
| Chia sẻ tài nguyên khác nguồn (CORS) | Chỉ cho phép địa chỉ của ứng dụng Next.js, có gửi kèm cookie |

### 2.2. Kiểu dữ liệu

| Kiểu | Quy ước | Ví dụ |
|---|---|---|
| `id` | Chuỗi UUID do máy chủ sinh | `3f2b…-…` |
| `string` | Chuỗi; máy chủ bỏ khoảng trắng đầu và cuối | `P101` |
| `integer` | Số nguyên | `2` |
| `money` | Số nguyên, đơn vị **đồng**; không âm, trừ khi ghi rõ | `3978000` |
| `decimal` | Số thực, tối đa 2 chữ số thập phân | `18.5` |
| `boolean` | `true` hoặc `false` | `true` |
| `date` | Chuỗi `YYYY-MM-DD`, theo giờ Việt Nam | `2026-11-10` |
| `datetime` | Chuỗi ISO 8601 có múi giờ `+07:00` | `2026-11-01T08:30:00+07:00` |
| `period` | Kỳ hóa đơn, chuỗi `YYYY-MM` | `2026-11` |
| `enum` | Chuỗi chữ in hoa, giá trị ở mục 4.1 | `PARTIALLY_PAID` |
| `X[]` | Danh sách các phần tử kiểu X | `Role[]` |

**Quy ước tên trường**: tiếng Anh, dạng camelCase. Trường không có giá trị trả về `null`. Trường bị ẩn theo quyền (mục 2.6) **không xuất hiện** trong phản hồi.

### 2.3. Cấu trúc phản hồi

**Thành công**

| Trường | Kiểu | Mô tả |
|---|---|---|
| `data` | đối tượng hoặc danh sách | Dữ liệu trả về |
| `meta` | đối tượng | Chỉ có ở endpoint trả danh sách: `page`, `pageSize`, `totalItems`, `totalPages` |

Endpoint không có dữ liệu trả về dùng mã `204` và không có phần thân.

**Lỗi**

| Trường | Kiểu | Mô tả |
|---|---|---|
| `error.code` | string | Mã lỗi ổn định, giao diện dựa vào đây để xử lý (mục 6) |
| `error.message` | string | Thông báo tiếng Việt, hiển thị được ngay cho người dùng |
| `error.details` | đối tượng[] | Với lỗi dữ liệu vào: mỗi phần tử gồm `field` (tên trường, có thể dạng `items[2].currentReading`), `code`, `message` |
| `error.requestId` | string | Trùng với header `X-Request-Id` |

### 2.4. Phân trang, sắp xếp, lọc

| Tham số | Mặc định | Quy ước |
|---|---|---|
| `page` | 1 | Số trang, bắt đầu từ 1 |
| `pageSize` | 20 | Tối đa 100 |
| `sort` | Theo từng endpoint | Tên trường; thêm dấu `-` phía trước để sắp giảm dần, ví dụ `-paidOn` |
| `q` | Không có | Từ khóa; so khớp **không phân biệt hoa thường và không dấu** |

### 2.5. Mã trạng thái HTTP

| Mã | Dùng khi |
|---|---|
| 200 | Thành công, có dữ liệu trả về |
| 201 | Đã tạo mới |
| 204 | Thành công, không có dữ liệu trả về |
| 400 | Dữ liệu vào sai: thiếu trường, sai định dạng, vi phạm quy tắc kiểm tra của chính dữ liệu đó (ví dụ ngày nộp sau hôm nay) |
| 401 | Chưa đăng nhập, phiên hết hạn, hoặc sai thông tin đăng nhập |
| 403 | Đã đăng nhập nhưng không có quyền |
| 404 | Không tìm thấy, hoặc người thuê truy cập dữ liệu không thuộc phòng mình (mục 2.6) |
| 409 | Trạng thái hiện tại không cho phép thao tác: trùng dữ liệu, hóa đơn đã trả đủ, phòng đã có hợp đồng, dữ liệu vừa bị người khác thay đổi |
| 413 | Phần thân yêu cầu vượt 1 MB |
| 429 | Đăng nhập sai quá số lần cho phép, hoặc gửi quá nhiều yêu cầu trong thời gian ngắn |
| 500 | Lỗi máy chủ; thông báo chung, không lộ chi tiết kỹ thuật |

### 2.6. Xác thực, phiên, phân quyền

**Phiên đăng nhập**

| Mục | Quy ước |
|---|---|
| Cơ chế | Sau khi đăng nhập, máy chủ đặt hai cookie `HttpOnly`, `Secure`, `SameSite=Lax`: **access token** (hiệu lực 15 phút, gửi kèm mọi yêu cầu) và **refresh token** (chỉ gửi kèm các đường dẫn `/api/v1/auth`). Mã JavaScript của trang không đọc được hai cookie này |
| Gửi kèm | Mọi yêu cầu từ Next.js gửi kèm cookie |
| Làm mới | Gặp `401 UNAUTHENTICATED` thì giao diện gọi AUTH-05 một lần rồi gửi lại yêu cầu; AUTH-05 cũng `401` thì về trang đăng nhập. Refresh token đổi sau mỗi lần dùng; token cũ bị dùng lại thì hủy cả phiên |
| Hết hạn | 30 phút không hoạt động; tối đa 12 giờ kể từ khi đăng nhập. Đổi, đặt lại mật khẩu, khóa tài khoản thì phiên liên quan hết hiệu lực ngay |
| Chống giả mạo yêu cầu từ trang khác | Với yêu cầu thay đổi dữ liệu (POST, PUT, PATCH, DELETE), máy chủ kiểm tra header `Origin` khớp địa chỉ của ứng dụng |
| Đăng nhập sai | 5 lần sai liên tiếp trong 15 phút với cùng tên đăng nhập từ cùng một IP → tạm chặn IP đó 15 phút; chủ tài khoản ở máy khác vẫn đăng nhập được |
| Bắt buộc đổi mật khẩu | Khi `mustChangePassword = true`, chỉ gọi được AUTH-02 đến AUTH-05; endpoint khác trả `403 PASSWORD_CHANGE_REQUIRED` |

**Vai trò**

| Mã vai trò | Vai trò | Ghi chú |
|---|---|---|
| `SYSTEM_ADMIN` | Quản trị hệ thống (QT) | Tài khoản nhân viên, vai trò |
| `OWNER` | Chủ nhà (CN) | Bảng giá, báo cáo tài chính, nhật ký, duyệt điều chỉnh và hủy thanh toán |
| `MANAGER` | Quản lý (QL) | Phòng, người ở, hợp đồng, hóa đơn, duyệt |
| `ACCOUNTANT` | Kế toán (KT) | Lịch thu, thanh toán, công nợ, khoản chi |
| `TENANT` | Người thuê (NT) | Chỉ dùng các endpoint `/me/…`, AUTH, NTF |

Một tài khoản nhân viên có thể có **nhiều vai trò**; quyền là **hợp** các vai trò. Tài khoản người thuê chỉ có vai trò `TENANT`.

**Người thuê sau khi hợp đồng kết thúc**: trong 30 ngày kể từ `endedOn`, tài khoản ở trạng thái `READ_ONLY`, đăng nhập và xem được dữ liệu của mình. Các thao tác ghi (TEN-07, USR-09) trả `403 TENANT_READ_ONLY`; vẫn đổi được mật khẩu và đánh dấu đã đọc thông báo. Hết 30 ngày, tài khoản thành `LOCKED`, phiên đang mở cũng hết hiệu lực. Trạng thái này tính khi đọc.

**Hai lớp kiểm tra quyền** trên máy chủ cho mọi yêu cầu:
1. **Theo vai trò**: cột *Vai trò* của từng endpoint. Không có vai trò phù hợp → `403 FORBIDDEN`.
2. **Theo dữ liệu**: người thuê chỉ truy cập dữ liệu của **phòng có hợp đồng mình đứng tên**. Máy chủ xác định phòng từ phiên đăng nhập, **không** dùng mã phòng do giao diện gửi lên. Truy cập hóa đơn, thanh toán, yêu cầu không thuộc phòng mình → `404 RESOURCE_NOT_FOUND`, để không tiết lộ dữ liệu đó có tồn tại.

**Lọc trường dữ liệu cá nhân**:

| Trường của người ở | MANAGER | ACCOUNTANT | OWNER | TENANT |
|---|---|---|---|---|
| `fullName`, phòng | ✔ | ✔ | Chỉ số liệu tổng hợp | Họ tên người cùng phòng |
| `phone`, `relationshipToPrimary`, ngày vào, ngày rời | ✔ | Không | Không | Không |
| `idNumber`, `dateOfBirth`, `gender`, `hometown` | ✔, **chỉ** ở OCC-03 (có ghi nhật ký) | Không | Không | Không |

### 2.7. Chống gửi lặp (idempotency)

| Mục | Quy ước |
|---|---|
| Header | `Idempotency-Key`: chuỗi UUID do giao diện sinh **mỗi lần mở form** |
| Bắt buộc với | PAY-01 Ghi nhận thanh toán |
| Khuyến nghị với | CTR-02 Tạo hợp đồng, CTR-04 Kết thúc hợp đồng và thanh lý, BIL-05 Phát hành hóa đơn |
| Cùng khóa, cùng nội dung, trong 24 giờ | Trả lại **đúng kết quả lần đầu**, không tạo bản ghi mới |
| Cùng khóa, khác nội dung | `409 IDEMPOTENCY_KEY_REUSED` |
| Kết quả có mật khẩu tạm (CTR-02) | Gửi lặp trả `temporaryPassword = null` vì máy chủ không lưu mật khẩu tạm; cần cấp lại thì dùng USR-08 |

### 2.8. Giao dịch, ghi đồng thời, nhật ký

- Các thao tác nhiều bước (CTR-02, CTR-04, BIL-05, PAY-01, ADJ-03, PAY-07, REQ-03) chạy trong **một giao dịch CSDL**: hoặc thành công trọn vẹn, hoặc không thay đổi gì.
- Số phải trả, đã trả, còn nợ, trạng thái của hóa đơn do CSDL tự tính lại khi có thanh toán, đổi trạng thái thanh toán hoặc phiếu điều chỉnh (mục 4.3); máy chủ không tự ghi các giá trị này.
- Thao tác tiền **khóa theo hóa đơn** và tính lại số còn nợ ngay khi lưu. Người thao tác sau nhận lỗi `409` nếu dữ liệu đã thay đổi.
- Endpoint có ghi *Ghi nhật ký: Có* tạo một bản ghi nhật ký **trong cùng giao dịch**. Không có endpoint sửa hoặc xóa nhật ký.

### 2.9. Thời gian và tiền

- "Hôm nay", hạn thanh toán, kỳ hóa đơn đều tính theo múi giờ **Asia/Ho_Chi_Minh**.
- Thành tiền mỗi dòng hóa đơn = số lượng × đơn giá, là số nguyên đồng; riêng dòng tính theo ngày ở tháng đầu của hợp đồng thì nhân thêm tỷ lệ số ngày và làm tròn đến đồng (BIL-04 bước 6). Chỉ **tổng hóa đơn** được làm tròn đến 1.000 đ, theo hướng **gần nhất**: phần lẻ từ 500 đ trở lên làm tròn lên.

---

## 3. Danh mục endpoint

### 3.1. Xác thực

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| AUTH-01 | POST | `/auth/login` | Đăng nhập | Không cần đăng nhập |
| AUTH-02 | POST | `/auth/logout` | Đăng xuất | Mọi vai trò |
| AUTH-03 | GET | `/auth/me` | Thông tin người dùng hiện tại | Mọi vai trò |
| AUTH-04 | POST | `/auth/change-password` | Đổi mật khẩu | Mọi vai trò |
| AUTH-05 | POST | `/auth/refresh` | Làm mới phiên bằng refresh token | Không cần access token |

### 3.2. Tài khoản

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| USR-01 | GET | `/users` | Danh sách tài khoản | SYSTEM_ADMIN |
| USR-02 | POST | `/users` | Tạo tài khoản nhân viên | SYSTEM_ADMIN |
| USR-03 | GET | `/users/{userId}` | Chi tiết tài khoản | SYSTEM_ADMIN |
| USR-04 | PATCH | `/users/{userId}` | Sửa thông tin tài khoản | SYSTEM_ADMIN |
| USR-05 | PUT | `/users/{userId}/roles` | Gán lại vai trò | SYSTEM_ADMIN |
| USR-06 | POST | `/users/{userId}/lock` | Khóa tài khoản | SYSTEM_ADMIN |
| USR-07 | POST | `/users/{userId}/unlock` | Mở khóa tài khoản | SYSTEM_ADMIN |
| USR-08 | POST | `/users/{userId}/reset-password` | Đặt lại mật khẩu | MANAGER, SYSTEM_ADMIN |
| USR-09 | PATCH | `/me/profile` | Cập nhật thông tin cá nhân | Mọi vai trò |

### 3.3. Phòng

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| ROOM-01 | GET | `/rooms` | Danh sách phòng | MANAGER, OWNER, ACCOUNTANT |
| ROOM-02 | POST | `/rooms` | Thêm phòng | MANAGER |
| ROOM-03 | GET | `/rooms/{roomId}` | Chi tiết phòng | MANAGER, OWNER, ACCOUNTANT |
| ROOM-04 | PATCH | `/rooms/{roomId}` | Sửa phòng, đặt / bỏ bảo trì | MANAGER |

### 3.4. Hợp đồng

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| CTR-01 | GET | `/contracts` | Danh sách hợp đồng | MANAGER, OWNER, ACCOUNTANT |
| CTR-02 | POST | `/contracts` | Nhập hợp đồng đã ký giấy, tạo tài khoản người thuê | MANAGER |
| CTR-03 | GET | `/contracts/{contractId}` | Chi tiết hợp đồng | MANAGER, OWNER, ACCOUNTANT |
| CTR-04 | POST | `/contracts/{contractId}/end` | Kết thúc hợp đồng, thanh lý, cấn trừ tiền cọc | MANAGER |
| CTR-05 | PUT | `/contracts/{contractId}/services` | Cập nhật dịch vụ đăng ký | MANAGER |
| CTR-06 | PATCH | `/contracts/{contractId}` | Sửa thông tin hợp đồng nhập sai | MANAGER |
| CTR-07 | POST | `/contracts/{contractId}/renew` | Gia hạn hợp đồng theo phụ lục | MANAGER |
| CTR-08 | POST | `/contracts/{contractId}/settlement-preview` | Xem trước thanh lý, không lưu | MANAGER |

### 3.5. Người ở

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| OCC-01 | GET | `/rooms/{roomId}/occupants` | Danh sách người ở của phòng | MANAGER, ACCOUNTANT |
| OCC-02 | POST | `/rooms/{roomId}/occupants` | Thêm người ở | MANAGER |
| OCC-03 | GET | `/occupants/{occupantId}` | Chi tiết người ở (có CCCD) | MANAGER |
| OCC-04 | PATCH | `/occupants/{occupantId}` | Sửa người ở, tình trạng tạm trú | MANAGER |
| OCC-05 | POST | `/occupants/{occupantId}/move-out` | Ghi nhận người rời đi | MANAGER |
| OCC-06 | GET | `/occupants/export` | Xuất danh sách người ở ra Excel | MANAGER |

### 3.6. Bảng giá

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| CHG-01 | GET | `/charge-types` | Danh sách khoản thu kèm đơn giá hiện hành | OWNER, MANAGER, ACCOUNTANT |
| CHG-02 | POST | `/charge-types` | Thêm khoản thu | OWNER |
| CHG-03 | PATCH | `/charge-types/{chargeTypeId}` | Sửa, ngừng dùng khoản thu | OWNER |
| CHG-04 | GET | `/charge-types/{chargeTypeId}/prices` | Lịch sử đơn giá | OWNER, MANAGER, ACCOUNTANT |
| CHG-05 | POST | `/charge-types/{chargeTypeId}/prices` | Thêm đơn giá có ngày hiệu lực | OWNER |
| CHG-06 | DELETE | `/charge-types/{chargeTypeId}/prices/{priceId}` | Xóa đơn giá chưa từng dùng | OWNER |

### 3.7. Chỉ số

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| MTR-01 | GET | `/meter-readings` | Bảng chỉ số của một kỳ | MANAGER, OWNER, ACCOUNTANT |
| MTR-02 | PUT | `/meter-readings` | Ghi chỉ số nhiều phòng một lần | MANAGER |

### 3.8. Kỳ hóa đơn, hóa đơn

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| BIL-01 | GET | `/billing-periods` | Danh sách kỳ hóa đơn | MANAGER, OWNER, ACCOUNTANT |
| BIL-02 | POST | `/billing-periods` | Lên lịch kỳ thu | ACCOUNTANT |
| BIL-03 | GET | `/billing-periods/{periodId}` | Chi tiết kỳ | MANAGER, OWNER, ACCOUNTANT |
| BIL-04 | GET | `/billing-periods/{periodId}/preview` | Xem trước hóa đơn của kỳ | MANAGER |
| BIL-05 | POST | `/billing-periods/{periodId}/issue` | Phát hành hóa đơn | MANAGER |
| BIL-06 | POST | `/billing-periods/{periodId}/extra-charges` | Thêm khoản phát sinh | MANAGER |
| BIL-07 | DELETE | `/billing-periods/{periodId}/extra-charges/{extraChargeId}` | Xóa khoản phát sinh chưa phát hành | MANAGER |
| BIL-08 | PATCH | `/billing-periods/{periodId}` | Sửa lịch thu của kỳ | ACCOUNTANT |
| SET-01 | GET | `/billing-settings` | Xem thiết lập lịch thu mặc định của tòa | ACCOUNTANT, MANAGER, OWNER |
| SET-02 | PUT | `/billing-settings` | Cập nhật thiết lập lịch thu mặc định | ACCOUNTANT |
| INV-01 | GET | `/invoices` | Danh sách hóa đơn | MANAGER, OWNER, ACCOUNTANT |
| INV-02 | GET | `/invoices/{invoiceId}` | Chi tiết hóa đơn | MANAGER, OWNER, ACCOUNTANT |

### 3.9. Điều chỉnh hóa đơn

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| ADJ-01 | POST | `/invoices/{invoiceId}/adjustments` | Lập phiếu điều chỉnh | ACCOUNTANT |
| ADJ-02 | GET | `/adjustments` | Danh sách phiếu điều chỉnh | ACCOUNTANT, MANAGER, OWNER |
| ADJ-03 | POST | `/adjustments/{adjustmentId}/approve` | Duyệt phiếu | MANAGER, OWNER |
| ADJ-04 | POST | `/adjustments/{adjustmentId}/reject` | Từ chối phiếu | MANAGER, OWNER |

### 3.10. Thanh toán

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| PAY-01 | POST | `/payments` | Ghi nhận thanh toán | ACCOUNTANT |
| PAY-02 | GET | `/payments` | Danh sách thanh toán | ACCOUNTANT, MANAGER, OWNER |
| PAY-03 | GET | `/payments/{paymentId}` | Chi tiết thanh toán | ACCOUNTANT, MANAGER, OWNER |
| PAY-04 | GET | `/payments/{paymentId}/receipt` | Biên lai | ACCOUNTANT, MANAGER |
| PAY-05 | POST | `/payments/{paymentId}/cancellation-requests` | Gửi yêu cầu hủy thanh toán | ACCOUNTANT |
| PAY-06 | GET | `/cancellation-requests` | Danh sách yêu cầu hủy | ACCOUNTANT, MANAGER, OWNER |
| PAY-07 | POST | `/cancellation-requests/{requestId}/approve` | Duyệt hủy | MANAGER, OWNER |
| PAY-08 | POST | `/cancellation-requests/{requestId}/reject` | Từ chối hủy | MANAGER, OWNER |

### 3.11. Báo cáo, thu chi, tìm kiếm

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| RPT-01 | GET | `/reports/debts` | Công nợ | ACCOUNTANT, OWNER |
| RPT-02 | GET | `/reports/revenue` | Doanh thu theo tháng | OWNER |
| RPT-03 | GET | `/reports/profit` | Thu, chi, lợi nhuận | OWNER |
| RPT-04 | GET | `/reports/occupancy` | Lấp đầy, phòng trống, hợp đồng sắp hết hạn | OWNER, MANAGER |
| RPT-05 | GET | `/reports/{reportType}/export` | Xuất báo cáo ra Excel | Như báo cáo tương ứng |
| EXP-01 | GET | `/expense-categories` | Danh sách loại chi | OWNER, ACCOUNTANT |
| EXP-02 | POST | `/expense-categories` | Thêm loại chi | OWNER |
| EXP-03 | GET | `/expenses` | Danh sách khoản chi | ACCOUNTANT, OWNER |
| EXP-04 | POST | `/expenses` | Ghi khoản chi | ACCOUNTANT |
| SRCH-01 | GET | `/search` | Tìm kiếm không dấu | MANAGER, ACCOUNTANT |

### 3.12. Cổng người thuê, yêu cầu

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| TEN-01 | GET | `/me/room` | Phòng, hợp đồng tóm tắt, người cùng phòng | TENANT |
| TEN-02 | GET | `/me/invoices` | Hóa đơn của phòng mình | TENANT |
| TEN-03 | GET | `/me/invoices/{invoiceId}` | Chi tiết một hóa đơn | TENANT |
| TEN-04 | GET | `/me/payments` | Lịch sử thanh toán | TENANT |
| TEN-05 | GET | `/me/payments/{paymentId}/receipt` | Biên lai | TENANT |
| TEN-06 | GET | `/me/contract` | Hợp đồng của mình | TENANT |
| TEN-07 | POST | `/me/requests` | Gửi yêu cầu (thay đổi người ở, sửa chữa) | TENANT |
| TEN-08 | GET | `/me/requests` | Yêu cầu đã gửi | TENANT |
| REQ-01 | GET | `/requests` | Danh sách yêu cầu của người thuê | MANAGER |
| REQ-02 | GET | `/requests/{requestId}` | Chi tiết yêu cầu | MANAGER |
| REQ-03 | POST | `/requests/{requestId}/approve` | Duyệt yêu cầu thay đổi người ở | MANAGER |
| REQ-04 | POST | `/requests/{requestId}/reject` | Từ chối yêu cầu thay đổi người ở | MANAGER |
| REQ-05 | PATCH | `/requests/{requestId}/status` | Cập nhật trạng thái yêu cầu sửa chữa | MANAGER |

### 3.13. Thông báo, nhật ký, hệ thống

| Mã | Phương thức | Đường dẫn | Mô tả | Vai trò |
|---|---|---|---|---|
| NTF-01 | GET | `/notifications` | Thông báo của tôi | Mọi vai trò |
| NTF-02 | POST | `/notifications/{notificationId}/read` | Đánh dấu đã đọc | Mọi vai trò |
| NTF-03 | POST | `/notifications/read-all` | Đánh dấu tất cả đã đọc | Mọi vai trò |
| AUD-01 | GET | `/audit-logs` | Tra cứu nhật ký | OWNER |
| SYS-01 | GET | `/health` | Kiểm tra máy chủ còn hoạt động | Không cần đăng nhập |

---

## 4. Mô hình dữ liệu trao đổi

### 4.1. Giá trị liệt kê (enum)

| Enum | Giá trị | Ý nghĩa |
|---|---|---|
| `Role` | `SYSTEM_ADMIN`, `OWNER`, `MANAGER`, `ACCOUNTANT`, `TENANT` | Mục 2.6 |
| `UserStatus` | `ACTIVE`, `READ_ONLY`, `LOCKED` | Hoạt động; chỉ đọc (người thuê, 30 ngày sau khi hợp đồng kết thúc); bị khóa |
| `RoomStatus` | `VACANT`, `OCCUPIED`, `MAINTENANCE` | Trống, đang thuê, bảo trì. `VACANT`/`OCCUPIED` **suy ra** từ hợp đồng: phòng chỉ `OCCUPIED` **từ ngày bắt đầu** của hợp đồng; chỉ `MAINTENANCE` do QL đặt |
| `ContractStatus` | `UPCOMING`, `ACTIVE`, `ENDED` | Chưa đến ngày bắt đầu; hiệu lực; đã kết thúc. `UPCOMING`/`ACTIVE` **tính khi đọc** theo `startDate`. `ENDED` có `endedOn` trước `startDate` là hủy trước khi vào ở: giao diện hiển thị "Đã hủy", hợp đồng không chiếm thời gian nào của phòng |
| `Gender` | `MALE`, `FEMALE`, `OTHER` | Giới tính |
| `ResidenceRegistrationStatus` | `NOT_REGISTERED`, `REGISTERED` | Chưa / đã khai báo tạm trú |
| `CalculationMethod` | `CONTRACT_RENT`, `METER`, `PER_PERSON`, `PER_ROOM`, `PER_VEHICLE`, `MANUAL` | Theo hợp đồng; theo chỉ số; theo người; theo phòng; theo xe; nhập tay |
| `MeterType` | `ELECTRICITY`, `WATER` | Công tơ điện, nước |
| `InvoiceStatus` | `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` | Chưa thanh toán, thanh toán một phần, đã thanh toán, quá hạn. `OVERDUE` **tính khi đọc** (mục 4.3) |
| `PaymentMethod` | `CASH`, `BANK_TRANSFER`, `DEPOSIT` | Tiền mặt, chuyển khoản, cấn trừ tiền cọc khi thanh lý (chỉ do CTR-04 tạo, không hủy được) |
| `InvoiceType` | `MONTHLY`, `SETTLEMENT` | Hóa đơn tháng; hóa đơn thanh lý khi kết thúc hợp đồng |
| `PaymentStatus` | `VALID`, `PENDING_CANCELLATION`, `CANCELLED` | Hợp lệ; đang chờ duyệt hủy (vẫn được tính); đã hủy |
| `ApprovalStatus` | `PENDING`, `APPROVED`, `REJECTED` | Dùng cho phiếu điều chỉnh, yêu cầu hủy, yêu cầu thay đổi người ở |
| `RequestType` | `OCCUPANT_CHANGE`, `MAINTENANCE` | Thay đổi người ở; sửa chữa, phản ánh |
| `OccupantChangeAction` | `ADD`, `MOVE_OUT`, `UPDATE` | Thêm người, người rời đi, sửa thông tin |
| `MaintenanceStatus` | `NEW`, `IN_PROGRESS`, `DONE`, `REJECTED` | Mới, đang xử lý, hoàn thành, từ chối |
| `NotificationType` | `INVOICE_ISSUED`, `INVOICE_DUE_SOON`, `INVOICE_OVERDUE`, `REQUEST_PROCESSED` | Hóa đơn mới, sắp đến hạn, quá hạn, yêu cầu đã xử lý |
| `PreviewRoomStatus` | `READY`, `SKIPPED`, `ALREADY_ISSUED` | Trạng thái một phòng trong bản xem trước |
| `SkipReason` | `MISSING_METER_READING`, `MISSING_PRICE` | Lý do phòng chưa phát hành được |
| `ReportType` | `debts`, `revenue`, `profit`, `occupancy` | Dùng ở RPT-05 (chữ thường vì nằm trên đường dẫn) |

### 4.2. Đối tượng

#### User: Tài khoản

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `username` | string | Tên đăng nhập, duy nhất, không phân biệt hoa thường |
| `fullName` | string | Họ tên |
| `phone` | string \| null | |
| `email` | string \| null | |
| `roles` | Role[] | Một hoặc nhiều vai trò |
| `status` | UserStatus | |
| `mustChangePassword` | boolean | `true` khi đang dùng mật khẩu được cấp |
| `lastLoginAt` | datetime \| null | |
| `createdAt` | datetime | |
| `tenant` | đối tượng \| null | Chỉ có khi là người thuê: `roomId`, `roomCode`, `contractId`, `occupantId`, `readOnlyUntil` (date \| null: ngày cuối còn đăng nhập được sau khi hợp đồng kết thúc) |

#### Room: Phòng

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `code` | string | Mã phòng, duy nhất |
| `floor` | integer | Tầng |
| `areaM2` | decimal | Diện tích, m² |
| `listedPrice` | money | Giá niêm yết |
| `status` | RoomStatus | Chỉ đọc |
| `isUnderMaintenance` | boolean | QL đặt |
| `note` | string \| null | |
| `activeContract` | đối tượng \| null | `id`, `primaryTenantName`, `startDate`, `endDate` |
| `upcomingContract` | đối tượng \| null | Hợp đồng đã nhập, chưa đến ngày bắt đầu; cùng các trường như `activeContract` |
| `occupantCount` | integer | Số người đang ở |
| `createdAt`, `updatedAt` | datetime | |

#### OccupantSummary: Người ở (danh sách)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `roomId`, `roomCode` | id, string | |
| `contractId` | id | |
| `fullName` | string | |
| `isPrimary` | boolean | Người đứng tên hợp đồng |
| `relationshipToPrimary` | string \| null | Chỉ MANAGER |
| `phone` | string \| null | Chỉ MANAGER |
| `moveInDate` | date | Chỉ MANAGER |
| `moveOutDate` | date \| null | Chỉ MANAGER |
| `residenceRegistrationStatus` | ResidenceRegistrationStatus | Chỉ MANAGER |

#### OccupantDetail: Người ở (chi tiết, chỉ MANAGER)

Gồm toàn bộ trường của OccupantSummary, thêm:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `dateOfBirth` | date | Bắt buộc |
| `gender` | Gender \| null | |
| `hometown` | string | Quê quán, bắt buộc |
| `idNumber` | string | CCCD, bắt buộc |
| `email` | string \| null | |
| `note` | string \| null | |
| `userId` | id \| null | Tài khoản người thuê, nếu là người đứng tên |

#### OccupantInput: Dữ liệu người ở gửi lên

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `fullName` | string | Có | 1 đến 100 ký tự |
| `dateOfBirth` | date | Có | Trước hôm nay |
| `gender` | Gender | Không | |
| `hometown` | string | Có | 1 đến 200 ký tự |
| `idNumber` | string | Có | 12 chữ số; không trùng với người ở khác có **thời gian ở giao nhau**. Ngày rời đi không tính là còn ở, nên người trả phòng này và vào phòng khác trong cùng một ngày vẫn hợp lệ |
| `phone` | string | Không | 10 chữ số, bắt đầu bằng 0 |
| `email` | string | Không | Định dạng email |
| `relationshipToPrimary` | string | Không | Tối đa 50 ký tự; bỏ qua với người đứng tên |
| `note` | string | Không | Tối đa 500 ký tự |

#### Contract: Hợp đồng

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `roomId`, `roomCode` | id, string | |
| `contractNumber` | string \| null | Số hợp đồng giấy |
| `signedOn` | date | Ngày ký trên hợp đồng giấy |
| `primaryTenant` | đối tượng | `occupantId`, `fullName` |
| `startDate`, `endDate` | date | |
| `monthlyRent` | money | Giá thuê ban đầu theo hợp đồng |
| `currentMonthlyRent` | money | Giá thuê đang áp dụng hôm nay (sau các lần gia hạn có đổi giá) |
| `deposit` | money | Tiền cọc |
| `initialReadings` | đối tượng[] | Chỉ số công tơ bàn giao lúc nhận phòng; mỗi phần tử: `meterType`, `reading` |
| `status` | ContractStatus | |
| `note` | string \| null | Ghi chú khi nhập, sửa hợp đồng |
| `endedOn` | date \| null | Ngày kết thúc thực tế |
| `cancelledBeforeStart` | boolean | `true` khi `endedOn` trước `startDate` (hủy trước khi vào ở); tính khi đọc |
| `endNote` | string \| null | Ghi chú khi kết thúc |
| `finalReadings` | đối tượng[] | Chỉ số công tơ trả phòng khi thanh lý; mỗi phần tử: `meterType`, `reading`; rỗng khi chưa kết thúc |
| `settlementInvoiceId` | id \| null | Hóa đơn thanh lý, nếu có |
| `depositApplied` | money | Tổng tiền cọc đã cấn trừ vào hóa đơn |
| `depositRefundAmount` | money \| null | Số tiền cọc trả lại người thuê khi thanh lý |
| `services` | ContractService[] | Dịch vụ đăng ký |
| `occupants` | OccupantSummary[] | Lọc trường theo mục 2.6 |
| `tenantUserId` | id | Tài khoản người thuê |
| `renewals` | đối tượng[] | Các lần gia hạn: `addendumNumber`, `signedOn`, `previousEndDate`, `newEndDate`, `monthlyRent` (giá mới hoặc `null`), `effectiveFrom` |
| `createdAt` | datetime | |

#### ContractService: Dịch vụ đăng ký

| Trường | Kiểu | Mô tả |
|---|---|---|
| `chargeTypeId`, `chargeTypeName` | id, string | Khoản thu không bắt buộc (`isMandatory = false`) |
| `quantity` | integer | Số lượng, ví dụ số xe; ≥ 1 |
| `fromPeriod` | period | Áp dụng từ kỳ |
| `toPeriod` | period \| null | Áp dụng đến kỳ; `null` = đến khi hết hợp đồng |

#### ChargeType: Khoản thu

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `name` | string | Duy nhất, không phân biệt hoa thường |
| `calculationMethod` | CalculationMethod | Không đổi sau khi đã dùng trong hóa đơn |
| `meterType` | MeterType \| null | Chỉ có khi `METER` |
| `unit` | string | Nhãn đơn vị hiển thị: kWh, m³, người, phòng, xe, tháng |
| `isMandatory` | boolean | `true`: áp dụng cho mọi hợp đồng; `false`: chỉ khi hợp đồng đăng ký |
| `isActive` | boolean | `false`: không dùng cho kỳ mới |
| `currentPrice` | Price \| null | Đơn giá đang hiệu lực hôm nay; `null` với `CONTRACT_RENT` |

#### Price: Đơn giá

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `chargeTypeId` | id | |
| `unitPrice` | money | |
| `effectiveFrom` | date | Ngày bắt đầu hiệu lực |
| `isUsed` | boolean | Đã dùng trong hóa đơn đã phát hành |
| `createdBy` | đối tượng | `id`, `fullName` |
| `createdAt` | datetime | |

#### MeterReadingRow: Một dòng chỉ số

| Trường | Kiểu | Mô tả |
|---|---|---|
| `roomId`, `roomCode` | id, string | |
| `meterType` | MeterType | |
| `period` | period | |
| `previousReading` | integer \| null | Kỳ đầu tiên của hợp đồng: chỉ số bàn giao của hợp đồng. Các kỳ sau: chỉ số mới của kỳ trước của phòng; `null` nếu kỳ trước chưa ghi |
| `currentReading` | integer \| null | `null` nếu chưa ghi |
| `consumption` | integer \| null | `currentReading - previousReading` |
| `isLocked` | boolean | `true` khi hóa đơn của phòng trong kỳ đã phát hành |
| `recordedBy` | đối tượng \| null | `id`, `fullName` |
| `recordedAt` | datetime \| null | |

#### BillingPeriod: Kỳ hóa đơn

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `period` | period | Tháng thu, duy nhất |
| `billingDate` | date | Ngày thu do Kế toán đặt |
| `dueDate` | date | Hạn thanh toán do Kế toán đặt |
| `eligibleRoomCount` | integer | Số phòng cần hóa đơn trong kỳ (BIL-04 bước 1) |
| `issuedInvoiceCount` | integer | Số hóa đơn đã phát hành |
| `createdBy` | đối tượng | `id`, `fullName` |
| `createdAt` | datetime | |

#### BillingSettings: Thiết lập lịch thu mặc định của tòa

| Trường | Kiểu | Mô tả |
|---|---|---|
| `defaultBillingDay` | integer | Ngày thu gợi ý trong tháng, 1 đến 31. Tháng không có ngày này thì lấy ngày cuối tháng |
| `defaultPaymentTermDays` | integer | Số ngày từ ngày thu đến hạn thanh toán, 0 đến 60 |
| `updatedBy` | đối tượng \| null | `id`, `fullName` |
| `updatedAt` | datetime \| null | |

#### InvoiceLine: Dòng hóa đơn

| Trường | Kiểu | Mô tả |
|---|---|---|
| `chargeTypeId` | id \| null | `null` với khoản phát sinh |
| `description` | string | Tên khoản, ví dụ "Điện" |
| `calculationMethod` | CalculationMethod | |
| `quantity` | integer | Số lượng: kWh, m³, số người, số xe, 1 |
| `unit` | string | |
| `unitPrice` | money | |
| `amount` | money | `quantity × unitPrice`; dòng tính theo ngày: `quantity × unitPrice × daysCharged ÷ daysInPeriod`, làm tròn đến đồng |
| `previousReading`, `currentReading` | integer \| null | Chỉ có ở dòng `METER` |
| `daysCharged`, `daysInPeriod` | integer \| null | Chỉ có ở dòng tính theo ngày (tháng đầu của hợp đồng): số ngày tính và số ngày của tháng |

Sau khi phát hành, mọi giá trị của dòng được **chụp lại**, không đọc lại bảng giá.

#### InvoicePreview: Bản xem trước

| Trường | Kiểu | Mô tả |
|---|---|---|
| `periodId`, `period` | id, period | |
| `dueDate` | date | |
| `rooms` | đối tượng[] | Mỗi phòng: `roomId`, `roomCode`, `contractId`, `primaryTenantName`, `status` (PreviewRoomStatus), `skipReasons` (SkipReason[]), `missingItems` (string[], ví dụ "Chỉ số điện"), `lines` (InvoiceLine[]), `subtotal`, `roundingAmount`, `totalAmount`, `invoiceId` (chỉ có khi `ALREADY_ISSUED`) |
| `summary` | đối tượng | `readyCount`, `skippedCount`, `alreadyIssuedCount`, `readyTotalAmount` |

#### InvoiceSummary: Hóa đơn (danh sách)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `code` | string | Mã do hệ thống sinh: hóa đơn tháng `HD-YYYYMM-<mã phòng>`, ví dụ `HD-202611-P101`; hóa đơn thanh lý `TL-YYYYMMDD-<mã phòng>`, ví dụ `TL-20261110-P105` |
| `invoiceType` | InvoiceType | |
| `periodId`, `period` | id, period \| null | `null` với hóa đơn thanh lý |
| `roomId`, `roomCode` | id, string | |
| `contractId` | id | |
| `primaryTenantName` | string | |
| `issuedAt` | datetime | |
| `billingDate` | date | Ngày thu theo lịch của kỳ; hóa đơn thanh lý: ngày kết thúc thực tế |
| `dueDate` | date | |
| `totalAmount` | money | Tổng sau làm tròn |
| `adjustmentTotal` | integer | Tổng phiếu điều chỉnh **đã duyệt**, có thể âm |
| `amountDue` | money | Số phải trả |
| `paidAmount` | money | Đã trả |
| `balance` | money | Còn nợ |
| `status` | InvoiceStatus | |

#### Invoice: Hóa đơn (chi tiết)

Gồm toàn bộ trường của InvoiceSummary, thêm:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `lines` | InvoiceLine[] | |
| `subtotal` | money | Tổng trước làm tròn |
| `roundingAmount` | integer | `totalAmount - subtotal`, có thể âm |
| `adjustments` | Adjustment[] | Mọi phiếu, kể cả đang chờ, đã từ chối |
| `payments` | Payment[] | Mọi thanh toán, kể cả đã hủy |

#### Adjustment: Phiếu điều chỉnh

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `invoiceId`, `invoiceCode` | id, string | |
| `amount` | integer | Dương: cộng thêm; âm: giảm trừ; khác 0 |
| `reason` | string | |
| `status` | ApprovalStatus | |
| `requestedBy` | đối tượng | `id`, `fullName` |
| `requestedAt` | datetime | |
| `decidedBy` | đối tượng \| null | |
| `decidedAt` | datetime \| null | |
| `decisionNote` | string \| null | |

#### Payment: Thanh toán

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `receiptNumber` | string | Số biên lai, dạng `BL-YYYYMM-<4 chữ số>`, ví dụ `BL-202611-0001` |
| `invoiceId`, `invoiceCode` | id, string | |
| `roomCode` | string | |
| `amount` | money | > 0 |
| `method` | PaymentMethod | |
| `referenceCode` | string \| null | Mã giao dịch chuyển khoản |
| `payer` | đối tượng | `occupantId` (id \| null), `name` (string) |
| `paidOn` | date | Ngày nộp |
| `note` | string \| null | |
| `status` | PaymentStatus | |
| `recordedBy` | đối tượng | `id`, `fullName` |
| `recordedAt` | datetime | |
| `cancelledAt` | datetime \| null | |
| `cancelReason` | string \| null | |

#### Receipt: Biên lai

| Trường | Kiểu | Mô tả |
|---|---|---|
| `receiptNumber` | string | |
| `buildingName` | string | Tên tòa (cấu hình) |
| `roomCode`, `period`, `invoiceCode` | string | `period` là `null` với hóa đơn thanh lý |
| `lines` | đối tượng[] | `description`, `amount` của từng khoản trên hóa đơn |
| `amountDue` | money | Tổng phải trả của hóa đơn |
| `amount` | money | Số tiền của lần nộp này |
| `paidToDate` | money | Tổng đã trả tính đến lần nộp này |
| `balanceAfter` | money | Còn nợ sau lần nộp này |
| `method`, `paidOn`, `payerName` | | |
| `recordedByName` | string | Người thu |
| `status` | PaymentStatus | Biên lai của thanh toán đã hủy có ghi rõ "Đã hủy" |

#### CancellationRequest: Yêu cầu hủy thanh toán

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `paymentId`, `receiptNumber`, `invoiceCode` | id, string, string | |
| `amount` | money | Số tiền của thanh toán |
| `reason` | string | |
| `status` | ApprovalStatus | |
| `requestedBy`, `requestedAt`, `decidedBy`, `decidedAt`, `decisionNote` | | Như Adjustment |

#### TenantRequest: Yêu cầu của người thuê

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `type` | RequestType | |
| `roomId`, `roomCode` | id, string | |
| `title` | string | |
| `description` | string \| null | |
| `occupantChange` | đối tượng \| null | Chỉ có khi `OCCUPANT_CHANGE`: `action` (OccupantChangeAction), `occupantId`, `proposedData` (OccupantInput một phần), `moveOutDate` |
| `status` | ApprovalStatus hoặc MaintenanceStatus | Theo `type` |
| `submittedBy` | đối tượng | `id`, `fullName` |
| `submittedAt` | datetime | |
| `handledBy` | đối tượng \| null | |
| `handledAt` | datetime \| null | |
| `responseNote` | string \| null | Phản hồi của QL |

#### Notification: Thông báo

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `type` | NotificationType | |
| `title`, `message` | string | |
| `relatedType` | string \| null | `INVOICE` hoặc `REQUEST` |
| `relatedId` | id \| null | |
| `isRead` | boolean | |
| `createdAt` | datetime | |

#### AuditLog: Nhật ký

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `occurredAt` | datetime | |
| `actor` | đối tượng | `id`, `username`, `fullName` |
| `action` | string | Mục 4.4 |
| `entityType`, `entityId` | string, id | Đối tượng bị tác động |
| `summary` | string | Mô tả ngắn, ví dụ "Ghi nhận 2.000.000 đ cho HD-202611-P101" |
| `before`, `after` | đối tượng \| null | Giá trị trước và sau (không chứa mật khẩu) |
| `requestId` | string | |

#### Expense: Khoản chi

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | id | |
| `spentOn` | date | Không sau hôm nay |
| `categoryId`, `categoryName` | id, string | Loại chi |
| `amount` | money | > 0 |
| `description` | string \| null | |
| `recordedBy`, `recordedAt` | | |

### 4.3. Cách tính số tiền của hóa đơn

Các đại lượng dưới đây do CSDL tính lại mỗi khi thêm thanh toán, đổi trạng thái thanh toán, thêm hoặc duyệt phiếu điều chỉnh; máy chủ đọc kết quả, không tự ghi.

| Đại lượng | Cách tính |
|---|---|
| `adjustmentTotal` | Tổng `amount` của các phiếu điều chỉnh `APPROVED` |
| `amountDue` | `totalAmount + adjustmentTotal` |
| `paidAmount` | Tổng `amount` của thanh toán `VALID` và `PENDING_CANCELLATION` |
| `balance` | `amountDue - paidAmount` |
| `status` | `PAID` nếu `balance = 0`; nếu không: `OVERDUE` nếu hôm nay sau `dueDate`; nếu không: `PARTIALLY_PAID` nếu `paidAmount > 0`; còn lại `UNPAID` |

**Ví dụ**: `totalAmount` 3.978.000, một phiếu điều chỉnh -200.000 đã duyệt, chưa trả → `amountDue` 3.778.000, `balance` 3.778.000, `status` UNPAID.

### 4.4. Hành động ghi nhật ký

| `action` | Endpoint |
|---|---|
| `INVOICES_ISSUED` | BIL-05 |
| `PAYMENT_CREATED` | PAY-01 |
| `PAYMENT_CANCELLATION_REQUESTED`, `PAYMENT_CANCELLED`, `PAYMENT_CANCELLATION_REJECTED` | PAY-05, PAY-07, PAY-08 |
| `ADJUSTMENT_CREATED`, `ADJUSTMENT_APPROVED`, `ADJUSTMENT_REJECTED` | ADJ-01, ADJ-03, ADJ-04 |
| `CHARGE_TYPE_CREATED`, `CHARGE_TYPE_UPDATED`, `PRICE_CREATED`, `PRICE_DELETED` | CHG-02, CHG-03, CHG-05, CHG-06 |
| `EXTRA_CHARGE_CREATED`, `EXTRA_CHARGE_DELETED` | BIL-06, BIL-07 |
| `EXPENSE_CREATED` | EXP-04 |
| `PERSONAL_DATA_VIEWED`, `PERSONAL_DATA_EXPORTED` | OCC-03, OCC-06 |
| `CONTRACT_CREATED`, `CONTRACT_UPDATED`, `CONTRACT_RENEWED`, `CONTRACT_ENDED`, `OCCUPANT_CREATED`, `OCCUPANT_UPDATED`, `OCCUPANT_MOVED_OUT` | CTR-02, CTR-06, CTR-07, CTR-04, OCC-02, OCC-04, OCC-05, REQ-03 |
| `SETTLEMENT_ISSUED`, `DEPOSIT_APPLIED` | CTR-04 |
| `USER_CREATED`, `USER_ROLES_CHANGED`, `USER_LOCKED`, `USER_UNLOCKED`, `PASSWORD_RESET` | USR-02, USR-05, USR-06, USR-07, USR-08 |

---

## 5. Đặc tả chi tiết

### 5.1. Xác thực

#### AUTH-01 Đăng nhập

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/auth/login` |
| Vai trò | Không cần đăng nhập |
| Ghi nhật ký | Không |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `username` | string | Có | Không phân biệt hoa thường |
| `password` | string | Có | |

**Phản hồi**: `200`, `data` là **User**; máy chủ đặt cookie access token và refresh token. Token không nằm trong phần thân phản hồi.

**Lỗi**: `INVALID_CREDENTIALS` (401), `ACCOUNT_LOCKED` (403), `TOO_MANY_LOGIN_ATTEMPTS` (429), `VALIDATION_ERROR` (400).

**Quy tắc xử lý**
1. Nếu tên đăng nhập đang bị tạm chặn với IP này → `429`, không kiểm tra mật khẩu.
2. Tên đăng nhập không tồn tại **hoặc** mật khẩu sai → `401 INVALID_CREDENTIALS`, thông báo "Tài khoản hoặc mật khẩu không chính xác". Thời gian phản hồi của hai trường hợp như nhau. Tăng bộ đếm sai.
3. Mật khẩu đúng nhưng tài khoản `LOCKED` → `403 ACCOUNT_LOCKED`. Chỉ báo lỗi này **sau khi** mật khẩu đúng, nên không lộ tên đăng nhập. Tài khoản người thuê có hợp đồng đã kết thúc quá 30 ngày cũng là `LOCKED`; chưa quá 30 ngày thì đăng nhập được ở chế độ `READ_ONLY`.
4. Thành công: xóa bộ đếm sai, tạo phiên mới (mỗi lần đăng nhập là một phiên), cập nhật `lastLoginAt`. `roles` chứa **mọi** vai trò của tài khoản. Giao diện dựa vào `roles` và `mustChangePassword` để điều hướng.

#### AUTH-02 Đăng xuất

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/auth/logout` |
| Vai trò | Mọi vai trò |

**Phản hồi**: `204`. Máy chủ hủy phiên (refresh token hết hiệu lực, access token của phiên bị từ chối ngay) và xóa hai cookie. Gọi khi phiên đã hết hạn vẫn trả `204`.

#### AUTH-03 Thông tin người dùng hiện tại

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/auth/me` |
| Vai trò | Mọi vai trò |

**Phản hồi**: `200`, `data` là **User**. Với người thuê có thêm `tenant` (phòng, hợp đồng). Giao diện gọi khi tải trang để biết còn đăng nhập hay không.

**Lỗi**: `UNAUTHENTICATED` (401).

#### AUTH-04 Đổi mật khẩu

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/auth/change-password` |
| Vai trò | Mọi vai trò |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `currentPassword` | string | Có | |
| `newPassword` | string | Có | 8 đến 72 ký tự, có cả chữ và số, khác mật khẩu hiện tại |

**Phản hồi**: `204`.

**Lỗi**: `WRONG_CURRENT_PASSWORD` (400), `WEAK_PASSWORD` (400).

**Quy tắc xử lý**: lưu mật khẩu mới dạng băm; đặt `mustChangePassword = false`; hủy các phiên khác của tài khoản, giữ phiên hiện tại (cấp lại access token cho phiên này).

#### AUTH-05 Làm mới phiên

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/auth/refresh` |
| Vai trò | Không cần access token; dùng cookie refresh token |
| Ghi nhật ký | Không |

**Phản hồi**: `200`, `data` là **User**; máy chủ đặt access token mới và refresh token mới.

**Lỗi**: `UNAUTHENTICATED` (401): không có refresh token, token sai, phiên đã hủy, quá 30 phút không hoạt động hoặc quá 12 giờ từ khi đăng nhập, tài khoản bị khóa. Máy chủ xóa hai cookie.

**Quy tắc xử lý**
1. Khóa dòng phiên; phiên chưa hủy, chưa hết hạn.
2. Refresh token khớp token hiện tại của phiên, hoặc khớp token liền trước và vừa xoay vòng trong 15 giây (hai tab làm mới cùng lúc) → cấp token mới, token gửi lên hết hiệu lực.
3. Không khớp → hủy cả phiên, trả `401`.
4. Đọc lại tài khoản: bị khóa (kể cả người thuê hết 30 ngày chỉ đọc) → hủy phiên, trả `401`.

### 5.2. Tài khoản

#### USR-01 Danh sách tài khoản

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/users` |
| Vai trò | SYSTEM_ADMIN |

**Tham số truy vấn**: `q` (tên đăng nhập, họ tên), `role` (Role), `status` (UserStatus), `page`, `pageSize`, `sort` (mặc định `username`).

**Phản hồi**: `200`, `data` là **User[]**.

#### USR-02 Tạo tài khoản nhân viên

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/users` |
| Vai trò | SYSTEM_ADMIN |
| Ghi nhật ký | Có (`USER_CREATED`) |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `username` | string | Có | 3 đến 50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới; duy nhất |
| `fullName` | string | Có | 1 đến 100 ký tự |
| `phone` | string | Không | 10 chữ số, bắt đầu bằng 0 |
| `email` | string | Không | Định dạng email |
| `roles` | Role[] | Có | Ít nhất 1; chỉ gồm `SYSTEM_ADMIN`, `OWNER`, `MANAGER`, `ACCOUNTANT` |

**Phản hồi**: `201`, `data` gồm `user` (**User**) và `temporaryPassword` (string, chỉ trả **một lần**). Tài khoản mới có `mustChangePassword = true`.

**Lỗi**: `USERNAME_TAKEN` (409), `FORBIDDEN` (403), `VALIDATION_ERROR` (400).

**Ví dụ**: gửi `roles` = `MANAGER`, `ACCOUNTANT` → tài khoản có cả hai vai trò.

#### USR-03 Chi tiết tài khoản

`GET /api/v1/users/{userId}`. Vai trò: SYSTEM_ADMIN. Phản hồi `200` **User**. Lỗi `RESOURCE_NOT_FOUND` (404).

#### USR-04 Sửa thông tin tài khoản

| Mục | Nội dung |
|---|---|
| Endpoint | `PATCH /api/v1/users/{userId}` |
| Vai trò | SYSTEM_ADMIN |

**Dữ liệu vào** (chỉ gửi trường cần đổi): `fullName`, `phone`, `email` với ràng buộc như USR-02. Không đổi được `username`.

**Phản hồi**: `200` **User**.

#### USR-05 Gán lại vai trò

| Mục | Nội dung |
|---|---|
| Endpoint | `PUT /api/v1/users/{userId}/roles` |
| Vai trò | SYSTEM_ADMIN |
| Ghi nhật ký | Có (`USER_ROLES_CHANGED`) |

**Dữ liệu vào**: `roles` (Role[], bắt buộc, như USR-02). Danh sách gửi lên **thay thế** toàn bộ vai trò hiện có.

**Phản hồi**: `200` **User**.

**Lỗi**: `LAST_SYSTEM_ADMIN` (409) khi gỡ vai trò của Quản trị hệ thống cuối cùng đang hoạt động; `TENANT_ACCOUNT_NOT_EDITABLE` (409) khi tài khoản là người thuê.

**Quy tắc xử lý**: thay đổi có hiệu lực từ yêu cầu tiếp theo của người đó, không cần đăng nhập lại.

#### USR-06 Khóa tài khoản, USR-07 Mở khóa

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/users/{userId}/lock`; `POST /api/v1/users/{userId}/unlock` |
| Vai trò | SYSTEM_ADMIN |
| Ghi nhật ký | Có (`USER_LOCKED`, `USER_UNLOCKED`) |

**Dữ liệu vào**: `reason` (string, không bắt buộc, tối đa 200 ký tự).

**Phản hồi**: `200` **User**.

**Lỗi**: `CANNOT_LOCK_SELF` (409), `LAST_SYSTEM_ADMIN` (409), `TENANT_ACCESS_EXPIRED` (409, USR-07: hợp đồng của người thuê đã kết thúc quá 30 ngày).

**Quy tắc xử lý**: khóa tài khoản thì hủy mọi phiên đang mở của tài khoản đó ngay lập tức.

#### USR-08 Đặt lại mật khẩu

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/users/{userId}/reset-password` |
| Vai trò | MANAGER, SYSTEM_ADMIN |
| Ghi nhật ký | Có (`PASSWORD_RESET`) |

**Phản hồi**: `200`, `data.temporaryPassword` (chỉ trả một lần). Tài khoản có `mustChangePassword = true`; mọi phiên của tài khoản bị hủy.

**Lỗi**: `FORBIDDEN` (403) khi MANAGER đặt lại mật khẩu cho tài khoản không phải người thuê (tài khoản nhân viên do SYSTEM_ADMIN đặt lại); `CANNOT_RESET_SELF` (409).

#### USR-09 Cập nhật thông tin cá nhân

`PATCH /api/v1/me/profile`. Mọi vai trò. Dữ liệu vào: `phone`, `email` (ràng buộc như USR-02). Phản hồi `200` **User**. Lỗi `TENANT_READ_ONLY` (403).

### 5.3. Phòng

#### ROOM-01 Danh sách phòng

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/rooms` |
| Vai trò | MANAGER, OWNER, ACCOUNTANT |

**Tham số truy vấn**: `status` (RoomStatus), `floor` (integer), `q` (mã phòng), `page`, `pageSize`, `sort` (mặc định `code`).

**Phản hồi**: `200` **Room[]**.

#### ROOM-02 Thêm phòng

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/rooms` |
| Vai trò | MANAGER |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `code` | string | Có | 1 đến 20 ký tự: chữ không dấu, số, gạch ngang; duy nhất, không phân biệt hoa thường |
| `floor` | integer | Có | 0 đến 100 |
| `areaM2` | decimal | Có | > 0, tối đa 1.000 |
| `listedPrice` | money | Có | 0 đến 1.000.000.000 |
| `note` | string | Không | Tối đa 500 ký tự |

**Phản hồi**: `201` **Room**, `status = VACANT`.

**Lỗi**: `ROOM_CODE_TAKEN` (409), `VALIDATION_ERROR` (400).

#### ROOM-03 Chi tiết phòng

`GET /api/v1/rooms/{roomId}`. Vai trò: MANAGER, OWNER, ACCOUNTANT. Phản hồi `200` **Room**. Lỗi `RESOURCE_NOT_FOUND` (404).

#### ROOM-04 Sửa phòng, đặt hoặc bỏ bảo trì

| Mục | Nội dung |
|---|---|
| Endpoint | `PATCH /api/v1/rooms/{roomId}` |
| Vai trò | MANAGER |

**Dữ liệu vào** (chỉ gửi trường cần đổi): `floor`, `areaM2`, `listedPrice`, `note` (ràng buộc như ROOM-02); `code` (chỉ khi phòng **chưa từng** có hợp đồng); `isUnderMaintenance` (boolean).

**Phản hồi**: `200` **Room**.

**Lỗi**
- `READ_ONLY_FIELD` (400): gửi `status`. Trạng thái trống / đang thuê do hợp đồng quyết định, không đặt tay được.
- `ROOM_HAS_ACTIVE_CONTRACT` (409): đặt `isUnderMaintenance = true` khi phòng đang có hợp đồng hiệu lực hoặc sắp hiệu lực.
- `ROOM_CODE_LOCKED` (409): đổi `code` khi phòng đã từng có hợp đồng.

### 5.4. Hợp đồng

#### CTR-01 Danh sách hợp đồng

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/contracts` |
| Vai trò | MANAGER, OWNER, ACCOUNTANT |

**Tham số truy vấn**: `roomId`, `status` (ContractStatus), `expiringWithinDays` (integer: hợp đồng hiệu lực có `endDate` trong N ngày tới), `q` (tên người đứng tên, mã phòng), `page`, `pageSize`, `sort` (mặc định `-startDate`).

**Phản hồi**: `200` **Contract[]**, không kèm `occupants`.

#### CTR-02 Nhập hợp đồng đã ký giấy, tạo tài khoản người thuê

Hợp đồng được **ký giấy trước**; Quản lý nhập lên web **sau**. Đây là thao tác nhập lại một hợp đồng đã ký, nên `startDate` có thể ở quá khứ (nhập muộn), hôm nay hoặc tương lai.

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/contracts` |
| Vai trò | MANAGER |
| Header | `Idempotency-Key` (khuyến nghị) |
| Ghi nhật ký | Có (`CONTRACT_CREATED`) |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `roomId` | id | Có | Phòng tồn tại, không bảo trì; thời gian hợp đồng không giao với hợp đồng khác của phòng |
| `contractNumber` | string | Không | Số hợp đồng giấy, 1 đến 50 ký tự; duy nhất nếu có |
| `signedOn` | date | Có | Ngày ký trên hợp đồng giấy; không sau hôm nay |
| `startDate` | date | Có | Có thể ở quá khứ, hôm nay hoặc tương lai |
| `endDate` | date | Có | Sau `startDate` |
| `monthlyRent` | money | Có | > 0. Giao diện điền sẵn bằng `listedPrice` của phòng |
| `deposit` | money | Có | ≥ 0 |
| `initialReadings` | đối tượng[] | Điều kiện | Bắt buộc với mỗi loại công tơ đang dùng (có khoản thu `METER` đang dùng). Mỗi phần tử: `meterType`, `reading` (integer ≥ 0, lấy từ biên bản bàn giao). Là chỉ số cũ của kỳ đầu tiên của hợp đồng |
| `primaryTenant` | OccupantInput | Có | Đủ các trường bắt buộc của OccupantInput |
| `additionalOccupants` | OccupantInput[] | Không | Người ở cùng; mỗi người cần `relationshipToPrimary` |
| `services` | đối tượng[] | Không | Mỗi phần tử: `chargeTypeId` (khoản thu không bắt buộc, đang dùng), `quantity` (integer ≥ 1). Không trùng khoản thu |
| `tenantUsername` | string | Có | Như `username` ở USR-02; gợi ý dùng SĐT của người đứng tên. Tên gợi ý đã tồn tại (ví dụ tài khoản cũ của người thuê quay lại) thì giao diện gợi ý thêm hậu tố `.2`, `.3`… |
| `note` | string | Không | Tối đa 500 ký tự |

**Phản hồi**: `201`, `data` gồm `contract` (**Contract**) và `tenantAccount`: `userId`, `username`, `temporaryPassword` (chỉ trả một lần).

**Lỗi**
- `VALIDATION_ERROR` (400): thiếu trường; `details` chỉ rõ từng trường thiếu, ví dụ `primaryTenant.idNumber`, hoặc chỉ số bàn giao còn thiếu trong `initialReadings`; `endDate` có `code = END_BEFORE_START`; `signedOn` có `code = DATE_IN_FUTURE`.
- `CONTRACT_PERIOD_OVERLAP` (409): thời gian trùng với hợp đồng khác của phòng.
- `CONTRACT_NUMBER_TAKEN` (409).
- `ROOM_UNDER_MAINTENANCE` (409).
- `ID_NUMBER_TAKEN` (409): CCCD trùng với người ở khác trong cùng thời gian (ngày rời đi không tính là còn ở).
- `USERNAME_TAKEN` (409).

**Quy tắc xử lý** (một giao dịch)
1. Khóa phòng; kiểm tra phòng không bảo trì và khoảng [`startDate`, `endDate`] không giao với hợp đồng khác của phòng (hợp đồng đã kết thúc tính đến `endedOn`, hủy trước khi vào ở không chiếm khoảng nào). Hợp đồng mới bắt đầu **sau** ngày kết thúc của hợp đồng trước, nên nhập được trước khi người cũ trả phòng. Hai QL nhập cùng lúc thì chỉ một người thành công.
2. Tạo hợp đồng: `ACTIVE` nếu `startDate` không sau hôm nay; ngược lại `UPCOMING`.
3. Tạo người đứng tên (`isPrimary = true`) và người ở cùng, `moveInDate = startDate`.
4. Lưu dịch vụ đăng ký, `fromPeriod` = kỳ chứa `startDate`; lưu chỉ số bàn giao làm chỉ số cũ của kỳ đầu tiên (kỳ chứa `startDate`), kể cả khi phòng đã có chỉ số của người thuê trước.
5. Tạo tài khoản **mới** vai trò `TENANT` cho đúng hợp đồng này, kể cả người từng thuê trước đây; sinh mật khẩu tạm; `mustChangePassword = true`. Hợp đồng `UPCOMING` cũng được cấp tài khoản ngay.
6. Trạng thái phòng thành `OCCUPIED` **từ `startDate`**. Nếu `startDate` trong tương lai, phòng vẫn `VACANT` đến ngày đó.

**Nhập muộn**: `startDate` ở quá khứ thì phòng `OCCUPIED` ngay. Nếu kỳ đó đã phát hành cho các phòng khác, phòng này vẫn hiện `READY` ở BIL-04 và phát hành được bằng BIL-05.

#### CTR-03 Chi tiết hợp đồng

`GET /api/v1/contracts/{contractId}`. Vai trò: MANAGER, OWNER, ACCOUNTANT. Phản hồi `200` **Contract**, `occupants` lọc trường theo mục 2.6. Lỗi `RESOURCE_NOT_FOUND` (404).

#### CTR-04 Kết thúc hợp đồng, thanh lý

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/contracts/{contractId}/end` |
| Vai trò | MANAGER |
| Header | `Idempotency-Key` (khuyến nghị) |
| Ghi nhật ký | Có (`CONTRACT_ENDED`, `SETTLEMENT_ISSUED`, `DEPOSIT_APPLIED`) |

Kết thúc hợp đồng và thanh lý trong một thao tác: ghi chỉ số trả phòng, lập hóa đơn thanh lý, cấn trừ tiền cọc. Giao diện gọi CTR-08 để Quản lý xem trước, rồi mới gọi endpoint này.

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `endedOn` | date | Có | Từ `startDate` đến hôm nay. Hợp đồng `UPCOMING` thì là hôm nay, coi như hủy trước khi vào ở |
| `finalReadings` | đối tượng[] | Điều kiện | Bắt buộc với hợp đồng `ACTIVE`: mỗi loại công tơ có khoản thu `METER` đang dùng một phần tử `meterType`, `reading` (integer, không nhỏ hơn chỉ số gần nhất của phòng trong thời gian hợp đồng). Không gửi với hợp đồng `UPCOMING` |
| `extraCharges` | đối tượng[] | Không | Khoản phát sinh khi trả phòng: `description` (1 đến 100 ký tự), `amount` (money > 0). Ví dụ hư hỏng, vệ sinh phòng, phạt chấm dứt trước hạn theo hợp đồng |
| `applyDeposit` | boolean | Không | Mặc định `true`: cấn trừ tiền cọc vào các khoản còn nợ của hợp đồng. `false`: không cấn trừ, trả lại toàn bộ tiền cọc |
| `dueDate` | date | Không | Hạn thanh toán của hóa đơn thanh lý; mặc định bằng `endedOn`; không trước `endedOn` |
| `endNote` | string | Không | Tối đa 1.000 ký tự |

**Phản hồi**: `200`, `data` gồm `contract` (**Contract**), `settlementInvoice` (**Invoice**, `null` khi không có khoản nào phải thu), `deposit`: `amount`, `applied`, `refund`.

**Lỗi**: `CONTRACT_ALREADY_ENDED` (409); `VALIDATION_ERROR` (400): thiếu chỉ số trả phòng có `code = FINAL_READING_REQUIRED`, chỉ số nhỏ hơn chỉ số gần nhất có `code = READING_DECREASED`, `endedOn` ngoài khoảng cho phép có `code = OUT_OF_RANGE`; `IDEMPOTENCY_KEY_REUSED` (409).

**Quy tắc xử lý** (một giao dịch)
1. Khóa hợp đồng; hợp đồng chưa `ENDED`.
2. Tính các dòng của hóa đơn thanh lý theo CTR-08, bước 1 đến 4.
3. Ghi `endedOn`, chỉ số trả phòng, `endNote`; người ở chưa có ngày rời được ghi `moveOutDate = endedOn`; dịch vụ đăng ký kết thúc ở kỳ chứa `endedOn`; phòng thành `VACANT`.
4. Có ít nhất một dòng: lập hóa đơn `SETTLEMENT`, mã `TL-YYYYMMDD-<mã phòng>` theo `endedOn`, `billingDate = endedOn`; chụp các dòng; tạo thông báo `INVOICE_ISSUED` cho người thuê.
5. `applyDeposit = true` và tiền cọc lớn hơn 0: cấn trừ lần lượt vào hóa đơn thanh lý, rồi các hóa đơn còn nợ khác của hợp đồng theo `dueDate` sớm nhất. Mỗi lần là một **Payment** `method = DEPOSIT`, `paidOn = endedOn`, người nộp là người đứng tên, số tiền bằng số nhỏ hơn giữa phần cọc còn lại và số còn nợ của hóa đơn đó.
6. Ghi `depositRefundAmount` = tiền cọc trừ tổng đã cấn trừ. Cọc không đủ thì phần thiếu vẫn là công nợ của hợp đồng; Kế toán thu bằng PAY-01 như hóa đơn thường.
7. Tài khoản người thuê chuyển `READ_ONLY` trong 30 ngày kể từ `endedOn`, dù còn nợ hay đã trả hết, rồi thành `LOCKED`; trong 30 ngày đó người thuê xem được hóa đơn thanh lý.

Trả phòng giữa tháng **sau khi** hóa đơn tháng đó đã phát hành: hóa đơn thanh lý không có dòng tiền phòng của tháng đó; nếu hợp đồng quy định hoàn tiền những ngày chưa ở, Kế toán lập phiếu điều chỉnh giảm cho hóa đơn tháng (ADJ-01).

#### CTR-08 Xem trước thanh lý

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/contracts/{contractId}/settlement-preview` |
| Vai trò | MANAGER |
| Ghi nhật ký | Không (không lưu gì) |

**Dữ liệu vào**: như CTR-04, trừ `endNote`.

**Phản hồi**: `200` **SettlementPreview**:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `uncoveredFrom`, `uncoveredTo` | date \| null | Khoảng ngày chưa có hóa đơn tháng; `null` khi không có |
| `lines` | InvoiceLine[] | Các dòng của hóa đơn thanh lý |
| `subtotal`, `roundingAmount`, `totalAmount` | money, integer, money | Như hóa đơn tháng |
| `otherOutstanding` | money | Tổng còn nợ của các hóa đơn khác của hợp đồng |
| `deposit` | đối tượng | `amount` (tiền cọc), `applied` (sẽ cấn trừ), `refund` (sẽ trả lại) |
| `remainingDebt` | money | Công nợ của hợp đồng còn lại sau khi cấn trừ |

**Lỗi**: `CONTRACT_ALREADY_ENDED` (409), `VALIDATION_ERROR` (400) như CTR-04.

**Quy tắc tính**
1. **Khoảng chưa có hóa đơn tháng**: từ ngày sau ngày cuối của tháng có hóa đơn tháng gần nhất của hợp đồng (chưa có hóa đơn tháng nào thì từ `startDate`) đến `endedOn`. Rỗng nếu `endedOn` không sau ngày đó.
2. **Tiền phòng và khoản cố định**: với mỗi tháng thuộc khoảng ở bước 1, các dòng `CONTRACT_RENT`, `PER_PERSON`, `PER_ROOM`, `PER_VEHICLE` tính như BIL-04 bước 3 đến 6, ngày chốt là ngày đầu của khoảng trong tháng đó. Tháng không trọn tính theo số ngày: `daysCharged` = số ngày của khoảng trong tháng (tính cả hai đầu), `daysInPeriod` = số ngày của tháng.
3. **Điện, nước**: chỉ số cũ là chỉ số mới của kỳ gần nhất **đã phát hành hóa đơn** của phòng trong thời gian hợp đồng, chưa có kỳ nào thì là chỉ số bàn giao; chỉ số mới là chỉ số trả phòng; đơn giá hiệu lực tại `endedOn`. Không phụ thuộc khoảng ở bước 1.
4. **Khoản phát sinh**: mỗi phần tử `extraCharges` là một dòng `MANUAL`. Dòng có `quantity = 0` không xuất hiện. Tổng làm tròn như BIL-04 bước 8.
5. **Tiền cọc**: như CTR-04 bước 5, 6, tính trên số còn nợ hiện tại.

**Ví dụ**: phòng P105, giá thuê 3.000.000, tiền cọc 3.000.000, 2 người ở, đăng ký wifi và 1 xe máy. Hóa đơn tháng gần nhất là kỳ 2026-10, đã trả đủ; chỉ số kỳ 2026-10: điện 1.350, nước 48. Kết thúc 10/11/2026, chỉ số trả phòng: điện 1.400, nước 50; phát sinh "Sửa vòi nước" 150.000. Tháng 11 có 30 ngày, tính 10 ngày.

| Dòng | `quantity` | `unitPrice` | `daysCharged` / `daysInPeriod` | `amount` |
|---|---|---|---|---|
| Tiền phòng | 1 | 3.000.000 | 10 / 30 | 1.000.000 |
| Wifi | 1 | 100.000 | 10 / 30 | 33.333 |
| Vệ sinh | 2 | 30.000 | 10 / 30 | 20.000 |
| Gửi xe máy | 1 | 100.000 | 10 / 30 | 33.333 |
| Điện | 50 | 3.456 | Không áp dụng | 172.800 |
| Nước | 2 | 25.000 | Không áp dụng | 50.000 |
| Sửa vòi nước | 1 | 150.000 | Không áp dụng | 150.000 |
| `subtotal` | | | | **1.459.466** |
| `roundingAmount` | | | | -466 |
| `totalAmount` | | | | **1.459.000** |

Tiền cọc: `applied` = 1.459.000, `refund` = 1.541.000, `remainingDebt` = 0.

#### CTR-05 Cập nhật dịch vụ đăng ký

`PUT /api/v1/contracts/{contractId}/services`. Vai trò: MANAGER. Dữ liệu vào: `services` (như CTR-02), `fromPeriod` (period, không sớm hơn kỳ chưa phát hành gần nhất). Danh sách mới thay thế danh sách cũ **từ kỳ** `fromPeriod`; kỳ đã phát hành không đổi. Lỗi `CONTRACT_ALREADY_ENDED` (409), `PERIOD_ALREADY_ISSUED` (409).

#### CTR-06 Sửa thông tin hợp đồng nhập sai

| Mục | Nội dung |
|---|---|
| Endpoint | `PATCH /api/v1/contracts/{contractId}` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có (`CONTRACT_UPDATED`) |

Hợp đồng được nhập lại từ bản giấy nên dễ gõ sai. Endpoint này để sửa lỗi nhập, không dùng để thay đổi điều khoản đã ký.

**Dữ liệu vào** (chỉ gửi trường cần đổi): `contractNumber`, `signedOn`, `startDate`, `endDate`, `monthlyRent`, `deposit`, `initialReadings`, `note`, với ràng buộc như CTR-02. Thông tin người ở sửa bằng OCC-04.

**Phản hồi**: `200` **Contract**.

**Lỗi**: `CONTRACT_HAS_INVOICE` (409: đổi `startDate`, `monthlyRent` hoặc `initialReadings` khi hợp đồng đã có hóa đơn; sai về tiền trên hóa đơn dùng phiếu điều chỉnh, ADJ-01), `CONTRACT_PERIOD_OVERLAP` (409), `CONTRACT_NUMBER_TAKEN` (409), `CONTRACT_ALREADY_ENDED` (409), `VALIDATION_ERROR` (400).

**Quy tắc xử lý**: đổi `startDate` thì `moveInDate` của những người vào ở từ đầu hợp đồng đổi theo.

#### CTR-07 Gia hạn hợp đồng

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/contracts/{contractId}/renew` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có (`CONTRACT_RENEWED`) |

Gia hạn ngay trên hợp đồng đang có theo phụ lục đã ký; tài khoản người thuê, người ở và dịch vụ đăng ký giữ nguyên. Chuyển sang phòng khác thì kết thúc hợp đồng (CTR-04) rồi nhập hợp đồng mới (CTR-02).

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `newEndDate` | date | Có | Sau `endDate` hiện tại |
| `addendumNumber` | string | Không | Số phụ lục, 1 đến 50 ký tự |
| `signedOn` | date | Có | Ngày ký phụ lục; không sau hôm nay |
| `newMonthlyRent` | money | Không | > 0; giá thuê mới, áp dụng từ ngày sau `endDate` cũ. Không gửi thì giữ giá cũ |
| `note` | string | Không | Tối đa 500 ký tự |

**Phản hồi**: `200` **Contract**, có thêm lần gia hạn trong `renewals`.

**Lỗi**: `CONTRACT_ALREADY_ENDED` (409), `CONTRACT_PERIOD_OVERLAP` (409: thời gian gia hạn trùng hợp đồng khác của phòng, ví dụ hợp đồng của người thuê kế tiếp), `VALIDATION_ERROR` (400: `newEndDate` không sau `endDate` hiện tại thì `code = OUT_OF_RANGE`; `signedOn` sau hôm nay thì `code = DATE_IN_FUTURE`).

**Quy tắc xử lý** (một giao dịch): lưu lần gia hạn, cập nhật `endDate` của hợp đồng. Nếu có `newMonthlyRent`, BIL-04 dùng giá này cho các kỳ có ngày chốt từ ngày hiệu lực trở đi; hóa đơn các kỳ trước không đổi. Kỳ chuyển sang giá mới không chia theo ngày.

### 5.5. Người ở

#### OCC-01 Danh sách người ở của phòng

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/rooms/{roomId}/occupants` |
| Vai trò | MANAGER, ACCOUNTANT |

**Tham số truy vấn**: `includeMovedOut` (boolean, mặc định `false`); `contractId` (id, không bắt buộc; mặc định hợp đồng hiệu lực, nếu không có thì hợp đồng sắp hiệu lực).

**Phản hồi**: `200` **OccupantSummary[]**. Với ACCOUNTANT chỉ có `id`, `roomCode`, `fullName`, `isPrimary`. Danh sách **không** có CCCD với mọi vai trò.

#### OCC-02 Thêm người ở

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/rooms/{roomId}/occupants` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có (`OCCUPANT_CREATED`) |

**Dữ liệu vào**: các trường của **OccupantInput**, thêm `contractId` (id, không bắt buộc; mặc định hợp đồng hiệu lực, nếu không có thì hợp đồng sắp hiệu lực) và `moveInDate` (date, không bắt buộc, mặc định là ngày muộn hơn giữa hôm nay và `startDate`; không trước `startDate` của hợp đồng).

**Phản hồi**: `201` **OccupantDetail**.

**Lỗi**: `VALIDATION_ERROR` (400; thiếu CCCD → `details` có `field = idNumber`, `code = REQUIRED`), `ROOM_NOT_OCCUPIED` (409: phòng không có hợp đồng hiệu lực hoặc sắp hiệu lực), `ID_NUMBER_TAKEN` (409).

**Quy tắc xử lý**: người ở được gắn vào hợp đồng đã chọn. Người vào ở sau ngày đầu kỳ chỉ được tính từ kỳ sau (quy tắc số người ở, mục 5.8 BIL-04).

#### OCC-03 Chi tiết người ở

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/occupants/{occupantId}` |
| Vai trò | MANAGER |
| Ghi nhật ký | **Có** (`PERSONAL_DATA_VIEWED`) |

**Phản hồi**: `200` **OccupantDetail**. Người ở đã bị ẩn dữ liệu cá nhân chỉ còn `fullName`; các trường cá nhân là `null`.

**Lỗi**: `FORBIDDEN` (403) với vai trò khác MANAGER.

#### OCC-04 Sửa người ở

| Mục | Nội dung |
|---|---|
| Endpoint | `PATCH /api/v1/occupants/{occupantId}` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có (`OCCUPANT_UPDATED`) |

**Dữ liệu vào** (chỉ gửi trường cần đổi): trường của **OccupantInput**; `residenceRegistrationStatus`. Không đổi được `isPrimary`, `moveInDate`.

**Phản hồi**: `200` **OccupantDetail**. Lỗi như OCC-02.

#### OCC-05 Ghi nhận người rời đi

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/occupants/{occupantId}/move-out` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có (`OCCUPANT_MOVED_OUT`) |

**Dữ liệu vào**: `moveOutDate` (date, bắt buộc, từ `moveInDate` đến hôm nay).

**Phản hồi**: `200` **OccupantDetail**.

**Lỗi**: `PRIMARY_TENANT_CANNOT_MOVE_OUT` (409: người đứng tên rời đi thì phải kết thúc hợp đồng, CTR-04), `OCCUPANT_ALREADY_MOVED_OUT` (409).

**Ví dụ**: rời đi ngày 20/11/2026 → kỳ 12/2026 không tính người này.

#### OCC-06 Xuất danh sách người ở

`GET /api/v1/occupants/export`. Vai trò: MANAGER. Tham số: `roomId` (không bắt buộc), `includeMovedOut`. Phản hồi `200` là file Excel. Ghi nhật ký `PERSONAL_DATA_EXPORTED`.

### 5.6. Bảng giá

Khoản thu "Tiền phòng" (`CONTRACT_RENT`) được **tạo sẵn** khi khởi tạo hệ thống, lấy giá từ hợp đồng; không tạo thêm, không ngừng dùng được.

#### CHG-01 Danh sách khoản thu

`GET /api/v1/charge-types`. Vai trò: OWNER, MANAGER, ACCOUNTANT. Tham số: `isActive` (boolean). Phản hồi `200` **ChargeType[]**, sắp theo `name`.

#### CHG-02 Thêm khoản thu

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/charge-types` |
| Vai trò | OWNER |
| Ghi nhật ký | Có (`CHARGE_TYPE_CREATED`, `PRICE_CREATED`) |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `name` | string | Có | 1 đến 50 ký tự; duy nhất. Thiếu hoặc không hợp lệ → thông báo "**Hãy nhập vào 1 tên khoản thu hợp lệ!**" |
| `calculationMethod` | CalculationMethod | Có | Khác `CONTRACT_RENT` và `MANUAL` (khoản phát sinh nhập ở BIL-06, không cần khoản thu riêng) |
| `meterType` | MeterType | Điều kiện | Bắt buộc khi `METER`; mỗi `meterType` chỉ có một khoản thu đang dùng |
| `unit` | string | Không | Mặc định theo cách tính |
| `isMandatory` | boolean | Không | Mặc định `true` với `METER`, `PER_PERSON`; `false` với `PER_ROOM`, `PER_VEHICLE` |
| `initialPrice` | đối tượng | Có | `unitPrice` (money, 0 đến 1.000.000.000), `effectiveFrom` (date). `unitPrice` thiếu hoặc không phải số hợp lệ → "**Hãy nhập vào số tiền hợp lệ!**" |

**Phản hồi**: `201` **ChargeType**.

**Lỗi**: `CHARGE_NAME_TAKEN` (409), `METER_TYPE_IN_USE` (409), `FORBIDDEN` (403), `VALIDATION_ERROR` (400).

**Ví dụ**: tên "Gửi xe máy", `PER_VEHICLE`, `isMandatory = false`, đơn giá 100.000 hiệu lực 01/11/2026.

#### CHG-03 Sửa, ngừng dùng khoản thu

`PATCH /api/v1/charge-types/{chargeTypeId}`. Vai trò: OWNER. Dữ liệu vào: `name`, `unit`, `isMandatory`, `isActive`. `calculationMethod`, `meterType` không đổi được khi khoản thu đã dùng trong hóa đơn. Ghi nhật ký `CHARGE_TYPE_UPDATED`. Lỗi `CHARGE_NAME_TAKEN` (409), `CHARGE_TYPE_IN_USE` (409), `SYSTEM_CHARGE_TYPE` (409: sửa cách tính hoặc ngừng dùng "Tiền phòng").

#### CHG-04 Lịch sử đơn giá

`GET /api/v1/charge-types/{chargeTypeId}/prices`. Vai trò: OWNER, MANAGER, ACCOUNTANT. Phản hồi `200` **Price[]**, sắp theo `-effectiveFrom`.

#### CHG-05 Thêm đơn giá có ngày hiệu lực

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/charge-types/{chargeTypeId}/prices` |
| Vai trò | OWNER |
| Ghi nhật ký | Có (`PRICE_CREATED`) |

**Dữ liệu vào**: `unitPrice` (money, bắt buộc, 0 đến 1.000.000.000, thông báo lỗi như CHG-02); `effectiveFrom` (date, bắt buộc).

**Phản hồi**: `201` **Price**.

**Lỗi**: `PRICE_EFFECTIVE_DATE_TAKEN` (409: đã có đơn giá cùng ngày hiệu lực), `CHARGE_TYPE_HAS_NO_PRICE` (409: khoản `CONTRACT_RENT`).

**Quy tắc xử lý**: hóa đơn đã phát hành **không đổi**. Kỳ dùng đơn giá theo quy tắc ở BIL-04.

**Ví dụ**: thêm giá điện mới hiệu lực 01/12/2026 → kỳ 11/2026 dùng giá cũ, kỳ 12/2026 dùng giá mới.

#### CHG-06 Xóa đơn giá

`DELETE /api/v1/charge-types/{chargeTypeId}/prices/{priceId}`. Vai trò: OWNER. Phản hồi `204`. Chỉ xóa được khi `isUsed = false` và không phải đơn giá duy nhất của khoản thu; nếu không → `PRICE_IN_USE` (409). Ghi nhật ký `PRICE_DELETED`.

### 5.7. Chỉ số

#### MTR-01 Bảng chỉ số của một kỳ

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/meter-readings` |
| Vai trò | MANAGER, OWNER, ACCOUNTANT |

**Tham số truy vấn**: `period` (period, bắt buộc), `meterType` (không bắt buộc), `missingOnly` (boolean: chỉ dòng chưa ghi).

**Phản hồi**: `200` **MeterReadingRow[]**: mỗi phòng được lập hóa đơn trong kỳ (BIL-04 bước 1) × mỗi loại công tơ đang dùng một dòng. Không phân trang (khoảng 40 dòng).

#### MTR-02 Ghi chỉ số nhiều phòng một lần

| Mục | Nội dung |
|---|---|
| Endpoint | `PUT /api/v1/meter-readings` |
| Vai trò | MANAGER |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `period` | period | Có | Kỳ đã tạo (BIL-02) |
| `items` | đối tượng[] | Có | 1 đến 200 phần tử, không trùng (phòng, loại công tơ) |
| `items[].roomId` | id | Có | Phòng được lập hóa đơn trong kỳ |
| `items[].meterType` | MeterType | Có | |
| `items[].currentReading` | integer | Có | ≥ 0; ≥ chỉ số cũ |

**Phản hồi**: `200` **MeterReadingRow[]** của các dòng vừa ghi.

**Lỗi**
- `VALIDATION_ERROR` (400): `details` theo từng dòng, ví dụ `field = items[3].currentReading`, `code = READING_DECREASED`; kỳ trước của phòng chưa ghi chỉ số: `code = PREVIOUS_READING_MISSING`.
- `METER_READING_LOCKED` (409): có dòng thuộc phòng đã phát hành hóa đơn kỳ này; phải dùng phiếu điều chỉnh.
- `ROOM_NOT_OCCUPIED` (409): có dòng thuộc phòng không được lập hóa đơn trong kỳ (phòng trống, bảo trì).
- `PERIOD_NOT_FOUND` (404).

**Quy tắc xử lý**: **hoặc lưu tất cả, hoặc không lưu dòng nào**. Ghi lại dòng đã có là cập nhật, nếu chưa khóa.

### 5.8. Kỳ hóa đơn, hóa đơn

#### BIL-01 Danh sách kỳ, BIL-03 Chi tiết kỳ

`GET /api/v1/billing-periods` (sắp theo `-period`) và `GET /api/v1/billing-periods/{periodId}`. Vai trò: MANAGER, OWNER, ACCOUNTANT. Phản hồi `200` **BillingPeriod[]**, **BillingPeriod**.

#### BIL-02 Lên lịch kỳ thu

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/billing-periods` |
| Vai trò | ACCOUNTANT |

**Kế toán** quyết định tháng thu, ngày thu và hạn thanh toán của từng kỳ. Ngày thu không cố định ở đầu hay cuối tháng, tùy từng tòa.

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `period` | period | Có | Tháng thu; duy nhất |
| `billingDate` | date | Không | Ngày thu. Mặc định: ngày `defaultBillingDay` (SET-01) của tháng thu. Không bắt buộc nằm trong tháng thu |
| `dueDate` | date | Không | Hạn thanh toán. Mặc định: `billingDate` + `defaultPaymentTermDays`. Không trước `billingDate` |

**Phản hồi**: `201` **BillingPeriod**.

**Lỗi**: `PERIOD_ALREADY_EXISTS` (409), `VALIDATION_ERROR` (400; `dueDate` có `code = DUE_BEFORE_BILLING`), `FORBIDDEN` (403).

**Quy tắc xử lý**: kỳ phải được lên lịch trước khi QL ghi chỉ số (MTR-02) và phát hành (BIL-05). `billingDate` được in trên hóa đơn; hệ thống **không** tự phát hành và **không** chặn phát hành trước ngày này.

#### BIL-04 Xem trước hóa đơn của kỳ

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/billing-periods/{periodId}/preview` |
| Vai trò | MANAGER |
| Ghi nhật ký | Không (không lưu gì) |

**Phản hồi**: `200` **InvoicePreview**.

**Lỗi**: `PERIOD_NOT_FOUND` (404), `FORBIDDEN` (403).

**Quy tắc xử lý**

1. **Phòng được lập hóa đơn**: phòng có hợp đồng chưa kết thúc (`ACTIVE` hoặc `UPCOMING`) với `startDate` không sau ngày cuối tháng thu. Phòng trống, phòng bảo trì không xuất hiện. Phòng có cả hợp đồng cũ chưa thanh lý và hợp đồng mới thì lập cho hợp đồng mới; ngày ở của hợp đồng cũ tính ở hóa đơn thanh lý. Phòng đã có hóa đơn trong kỳ có trạng thái `ALREADY_ISSUED`.
2. **Ngày chốt** của mỗi phòng = ngày muộn hơn giữa *ngày đầu tháng thu* và *ngày bắt đầu hợp đồng*; không phụ thuộc `billingDate`.
3. **Đơn giá**: với mỗi khoản thu, dùng đơn giá có `effectiveFrom` muộn nhất mà không sau ngày chốt.
4. **Số người ở**: số người của hợp đồng có `moveInDate` không sau ngày chốt và chưa rời đi trước ngày chốt. Người ở thêm giữa tháng được tính từ kỳ sau.
5. **Khoản áp dụng**: khoản `isMandatory = true` đang dùng áp cho mọi hợp đồng; khoản không bắt buộc chỉ áp khi hợp đồng có trong `services` của kỳ đó; cộng các khoản phát sinh của phòng trong kỳ (BIL-06).
6. **Số lượng từng dòng**

| Cách tính | `quantity` | `unitPrice` |
|---|---|---|
| `CONTRACT_RENT` | 1 | Giá thuê tại ngày chốt: `monthlyRent`, hoặc giá mới của lần gia hạn đã có hiệu lực (CTR-07) |
| `METER` | `currentReading - previousReading` của kỳ | Đơn giá ở bước 3 |
| `PER_PERSON` | Số người ở (bước 4) | Đơn giá ở bước 3 |
| `PER_ROOM` | 1 | Đơn giá ở bước 3 |
| `PER_VEHICLE` | `quantity` trong `services` | Đơn giá ở bước 3 |
| `MANUAL` | 1 | Số tiền của khoản phát sinh |

Dòng có `quantity = 0` không xuất hiện.

**Tháng đầu của hợp đồng**: nếu `startDate` sau ngày đầu tháng thu, các dòng `CONTRACT_RENT`, `PER_PERSON`, `PER_ROOM`, `PER_VEHICLE` tính theo số ngày ở: `daysCharged` = số ngày từ `startDate` đến hết tháng (tính cả hai đầu), `daysInPeriod` = số ngày của tháng, `amount = quantity × unitPrice × daysCharged ÷ daysInPeriod` làm tròn đến đồng. Dòng `METER` (đã tính từ chỉ số bàn giao) và `MANUAL` không chia theo ngày. Các tháng sau tính tròn tháng.

7. **Thiếu dữ liệu**: thiếu chỉ số → `SKIPPED` với `MISSING_METER_READING`; khoản thu không có đơn giá hiệu lực → `MISSING_PRICE`. `missingItems` ghi rõ cái thiếu.
8. **Tổng**: `subtotal` = tổng `amount`; `totalAmount` = `subtotal` làm tròn đến 1.000 đ (mục 2.9); `roundingAmount` = `totalAmount - subtotal`.
9. Không lưu gì. Thoát ở bước này thì không có hóa đơn nào được phát hành.

**Ví dụ**: phòng P101, kỳ 2026-11, 2 người ở, đăng ký 1 xe máy, điện 1.200 → 1.350, nước 40 → 48.

| Dòng | `quantity` | `unitPrice` | `amount` |
|---|---|---|---|
| Tiền phòng | 1 | 3.000.000 | 3.000.000 |
| Điện | 150 | 3.456 | 518.400 |
| Nước | 8 | 25.000 | 200.000 |
| Wifi | 1 | 100.000 | 100.000 |
| Vệ sinh | 2 | 30.000 | 60.000 |
| Gửi xe máy | 1 | 100.000 | 100.000 |
| `subtotal` | | | **3.978.400** |
| `roundingAmount` | | | -400 |
| `totalAmount` | | | **3.978.000** |

**Ví dụ**: ngày 15/11 phòng P101 thêm một người. Kỳ 2026-11 (ngày chốt 01/11): `quantity` của "Vệ sinh" là 2. Kỳ 2026-12 (ngày chốt 01/12): là 3.

**Ví dụ** (tháng đầu của hợp đồng): phòng P102 có hợp đồng bắt đầu 20/11/2026, giá thuê 3.000.000, 1 người ở, đăng ký wifi; điện 500 → 560, nước 30 → 33. Tháng 11 có 30 ngày, tính 11 ngày.

| Dòng | `quantity` | `unitPrice` | `daysCharged` / `daysInPeriod` | `amount` |
|---|---|---|---|---|
| Tiền phòng | 1 | 3.000.000 | 11 / 30 | 1.100.000 |
| Điện | 60 | 3.456 | Không áp dụng | 207.360 |
| Nước | 3 | 25.000 | Không áp dụng | 75.000 |
| Wifi | 1 | 100.000 | 11 / 30 | 36.667 |
| Vệ sinh | 1 | 30.000 | 11 / 30 | 11.000 |
| `subtotal` | | | | **1.430.027** |
| `roundingAmount` | | | | -27 |
| `totalAmount` | | | | **1.430.000** |

#### BIL-05 Phát hành hóa đơn

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/billing-periods/{periodId}/issue` |
| Vai trò | MANAGER |
| Header | `Idempotency-Key` (khuyến nghị) |
| Ghi nhật ký | Có (`INVOICES_ISSUED`) |

**Dữ liệu vào**: `roomIds` (id[], không bắt buộc; không gửi = mọi phòng `READY`).

**Phản hồi**: `200`, `data` gồm `issued` (**InvoiceSummary[]**) và `skipped` (mỗi phần tử: `roomId`, `roomCode`, `reason` là `ALREADY_ISSUED`, `MISSING_METER_READING` hoặc `MISSING_PRICE`).

**Lỗi**: `PERIOD_NOT_FOUND` (404), `FORBIDDEN` (403).

**Quy tắc xử lý**
1. **Tính lại** như BIL-04 tại thời điểm phát hành; không dùng số liệu giao diện gửi lên.
2. Mỗi phòng phát hành trong **một giao dịch riêng**: trọn vẹn hoặc không có gì. Phòng lỗi không làm hỏng phòng khác.
3. CSDL bảo đảm mỗi (phòng, kỳ) chỉ có một hóa đơn. Phát hành lại, hoặc hai người phát hành cùng lúc, thì phòng đã có hóa đơn nằm trong `skipped` với `ALREADY_ISSUED`.
4. Sinh mã `HD-YYYYMM-<mã phòng>`; chụp lại các dòng; lấy `billingDate`, `dueDate` từ kỳ; `status = UNPAID`; khóa chỉ số của phòng trong kỳ.
5. Tạo thông báo `INVOICE_ISSUED` cho người thuê.

#### BIL-06 Thêm khoản phát sinh, BIL-07 Xóa khoản phát sinh

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/billing-periods/{periodId}/extra-charges`; `DELETE /api/v1/billing-periods/{periodId}/extra-charges/{extraChargeId}` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có (`EXTRA_CHARGE_CREATED`, `EXTRA_CHARGE_DELETED`) |

**Dữ liệu vào** (BIL-06): `roomId` (id, bắt buộc), `description` (string, 1 đến 100 ký tự), `amount` (money, > 0).

**Phản hồi**: BIL-06 `201` gồm `id`, `roomId`, `description`, `amount`; BIL-07 `204`.

**Lỗi**: `PERIOD_ALREADY_ISSUED` (409: phòng đã có hóa đơn kỳ này; dùng phiếu điều chỉnh), `ROOM_NOT_OCCUPIED` (409).

#### BIL-08 Sửa lịch thu của kỳ

| Mục | Nội dung |
|---|---|
| Endpoint | `PATCH /api/v1/billing-periods/{periodId}` |
| Vai trò | ACCOUNTANT |

**Dữ liệu vào** (chỉ gửi trường cần đổi): `billingDate`, `dueDate`, với ràng buộc như BIL-02. Không đổi được `period`.

**Phản hồi**: `200` **BillingPeriod**.

**Lỗi**: `PERIOD_ALREADY_ISSUED` (409: kỳ đã có hóa đơn phát hành), `VALIDATION_ERROR` (400), `PERIOD_NOT_FOUND` (404).

#### SET-01 Xem, SET-02 Cập nhật thiết lập lịch thu mặc định

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/billing-settings`; `PUT /api/v1/billing-settings` |
| Vai trò | SET-01: ACCOUNTANT, MANAGER, OWNER; SET-02: ACCOUNTANT |

**Dữ liệu vào** (SET-02)

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `defaultBillingDay` | integer | Có | 1 đến 31 |
| `defaultPaymentTermDays` | integer | Có | 0 đến 60 |

**Phản hồi**: `200` **BillingSettings**.

**Quy tắc xử lý**: đây chỉ là giá trị gợi ý khi lên lịch kỳ mới (BIL-02), mỗi tòa đặt theo cách thu của mình. Đổi thiết lập không ảnh hưởng các kỳ đã tạo. Giá trị khởi tạo: ngày 1, 10 ngày.

#### INV-01 Danh sách hóa đơn

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/invoices` |
| Vai trò | MANAGER, OWNER, ACCOUNTANT |

**Tham số truy vấn**: `periodId` hoặc `period`, `roomId`, `contractId`, `invoiceType`, `status` (InvoiceStatus, cho phép nhiều giá trị cách nhau bằng dấu phẩy), `q` (mã hóa đơn, mã phòng), `page`, `pageSize`, `sort` (mặc định `-billingDate`, rồi `roomCode`).

**Phản hồi**: `200` **InvoiceSummary[]**.

#### INV-02 Chi tiết hóa đơn

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/invoices/{invoiceId}` |
| Vai trò | MANAGER, OWNER, ACCOUNTANT |

**Phản hồi**: `200` **Invoice**. Lỗi `RESOURCE_NOT_FOUND` (404); người thuê gọi endpoint này → `403` (người thuê dùng TEN-03).

### 5.9. Điều chỉnh hóa đơn

#### ADJ-01 Lập phiếu điều chỉnh

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/invoices/{invoiceId}/adjustments` |
| Vai trò | ACCOUNTANT |
| Ghi nhật ký | Có (`ADJUSTMENT_CREATED`) |

**Dữ liệu vào**: `amount` (integer, khác 0, trị tuyệt đối không quá 1.000.000.000; âm là giảm trừ), `reason` (string, 5 đến 500 ký tự, bắt buộc).

**Phản hồi**: `201` **Adjustment** với `status = PENDING`. Phiếu chưa duyệt **không** ảnh hưởng số còn nợ.

**Lỗi**: `ADJUSTMENT_BELOW_PAID` (409: sau điều chỉnh, số phải trả nhỏ hơn số đã trả), `VALIDATION_ERROR` (400: thiếu lý do).

#### ADJ-02 Danh sách phiếu điều chỉnh

`GET /api/v1/adjustments`. Vai trò: ACCOUNTANT, MANAGER, OWNER. Tham số: `status`, `invoiceId`, `page`, `pageSize`. Phản hồi `200` **Adjustment[]**.

#### ADJ-03 Duyệt phiếu, ADJ-04 Từ chối phiếu

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/adjustments/{adjustmentId}/approve`; `POST /api/v1/adjustments/{adjustmentId}/reject` |
| Vai trò | MANAGER, OWNER |
| Ghi nhật ký | Có (`ADJUSTMENT_APPROVED`, `ADJUSTMENT_REJECTED`) |

**Dữ liệu vào**: `note` (string; không bắt buộc khi duyệt, **bắt buộc** khi từ chối, tối đa 500 ký tự).

**Phản hồi**: `200` **Adjustment**.

**Lỗi**: `REQUEST_ALREADY_PROCESSED` (409), `SELF_APPROVAL_NOT_ALLOWED` (403, khi duyệt: người duyệt là người lập phiếu; phiếu phải do Quản lý khác hoặc Chủ nhà duyệt), `ADJUSTMENT_BELOW_PAID` (409: kiểm tra lại khi duyệt).

**Quy tắc xử lý**: duyệt thì `amountDue`, `balance`, `status` của hóa đơn được tính lại ngay, trong cùng giao dịch.

### 5.10. Thanh toán

#### PAY-01 Ghi nhận thanh toán

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/payments` |
| Vai trò | ACCOUNTANT |
| Header | `Idempotency-Key` (**bắt buộc**) |
| Ghi nhật ký | Có (`PAYMENT_CREATED`) |

**Dữ liệu vào**

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `invoiceId` | id | Có | Hóa đơn đã phát hành |
| `amount` | money | Có | > 0; không vượt số còn nợ |
| `method` | PaymentMethod | Có | |
| `referenceCode` | string | Không | Tối đa 50 ký tự; nên nhập khi chuyển khoản |
| `payerOccupantId` | id | Điều kiện | Gửi **một trong hai** trường người nộp. Phải là người ở của phòng thuộc hóa đơn |
| `payerName` | string | Điều kiện | Khi chọn "Khác"; 1 đến 100 ký tự |
| `paidOn` | date | Có | Không sau hôm nay |
| `note` | string | Không | Tối đa 500 ký tự |

**Phản hồi**: `201`, `data` gồm `payment` (**Payment**) và `invoice`: `id`, `code`, `amountDue`, `paidAmount`, `balance`, `status`.

**Lỗi**

| Mã | HTTP | Khi nào |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Thiếu `invoiceId` hoặc thiếu người nộp: `message` là "**Vui lòng nhập khoản nộp hợp lí!**" |
| `VALIDATION_ERROR` | 400 | `paidOn` sau hôm nay: `details` có `code = DATE_IN_FUTURE` |
| `INVOICE_ALREADY_PAID` | 409 | Hóa đơn đã trả đủ |
| `AMOUNT_EXCEEDS_BALANCE` | 409 | Số tiền vượt số còn nợ; `details` có số còn nợ hiện tại |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Thiếu header |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Dùng lại khóa với nội dung khác |
| `FORBIDDEN` | 403 | Không có vai trò ACCOUNTANT |

**Quy tắc xử lý** (một giao dịch, khóa theo hóa đơn)
1. Kiểm tra `Idempotency-Key`: đã xử lý với cùng nội dung → trả lại kết quả cũ.
2. Khóa hóa đơn; tính `balance` **mới nhất** theo mục 4.3: có tính phiếu điều chỉnh đã duyệt, không tính thanh toán đã hủy.
3. `balance = 0` → `409 INVOICE_ALREADY_PAID`. Với hai kế toán ghi cùng lúc, người sau nhận lỗi này.
4. `amount > balance` → `409 AMOUNT_EXCEEDS_BALANCE`.
5. Lưu thanh toán `VALID`, sinh `receiptNumber`; cập nhật trạng thái hóa đơn. Hóa đơn quá hạn vẫn nhận thanh toán, không tính phí phạt.
6. Ghi nhật ký trong cùng giao dịch.

**Ví dụ**: hóa đơn 3.978.000. Lần 1 nộp 2.000.000 → `status = PARTIALLY_PAID`, `balance = 1.978.000`. Lần 2 nộp 1.978.000 → `status = PAID`, `balance = 0`.

#### PAY-02 Danh sách thanh toán

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/payments` |
| Vai trò | ACCOUNTANT, MANAGER, OWNER |

**Tham số truy vấn**: `invoiceId`, `roomId`, `fromDate`, `toDate` (theo `paidOn`), `method`, `status`, `page`, `pageSize`, `sort` (mặc định `-paidOn`).

**Phản hồi**: `200` **Payment[]**.

#### PAY-03 Chi tiết thanh toán

`GET /api/v1/payments/{paymentId}`. Vai trò: ACCOUNTANT, MANAGER, OWNER. Phản hồi `200` **Payment**.

#### PAY-04 Biên lai

`GET /api/v1/payments/{paymentId}/receipt`. Vai trò: ACCOUNTANT, MANAGER. Phản hồi `200` **Receipt**. Giao diện dựng trang in từ dữ liệu này.

#### PAY-05 Gửi yêu cầu hủy thanh toán

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/payments/{paymentId}/cancellation-requests` |
| Vai trò | ACCOUNTANT |
| Ghi nhật ký | Có (`PAYMENT_CANCELLATION_REQUESTED`) |

**Dữ liệu vào**: `reason` (string, 5 đến 500 ký tự, bắt buộc).

**Phản hồi**: `201` **CancellationRequest**. Thanh toán chuyển `PENDING_CANCELLATION` và **vẫn được tính** cho đến khi duyệt.

**Lỗi**: `PAYMENT_ALREADY_CANCELLED` (409), `CANCELLATION_ALREADY_PENDING` (409), `PAYMENT_NOT_CANCELLABLE` (409: khoản cấn trừ tiền cọc; sửa sai bằng phiếu điều chỉnh).

#### PAY-06 Danh sách yêu cầu hủy

`GET /api/v1/cancellation-requests`. Vai trò: ACCOUNTANT, MANAGER, OWNER. Tham số: `status`, `page`, `pageSize`. Phản hồi `200` **CancellationRequest[]**.

#### PAY-07 Duyệt hủy, PAY-08 Từ chối hủy

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/cancellation-requests/{requestId}/approve`; `POST /api/v1/cancellation-requests/{requestId}/reject` |
| Vai trò | MANAGER, OWNER |
| Ghi nhật ký | Có (`PAYMENT_CANCELLED`, `PAYMENT_CANCELLATION_REJECTED`) |

**Dữ liệu vào**: `note` (bắt buộc khi từ chối).

**Phản hồi**: `200` **CancellationRequest**.

**Lỗi**: `REQUEST_ALREADY_PROCESSED` (409), `SELF_APPROVAL_NOT_ALLOWED` (403, khi duyệt: người duyệt là người gửi yêu cầu).

**Quy tắc xử lý**: duyệt → thanh toán `CANCELLED`, ghi `cancelledAt`, `cancelReason`; hóa đơn tính lại số còn nợ và trạng thái; doanh thu không còn tính thanh toán này. Từ chối → thanh toán trở về `VALID`. Không có thao tác xóa thanh toán.

### 5.11. Báo cáo, thu chi, tìm kiếm

#### RPT-01 Công nợ

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/reports/debts` |
| Vai trò | ACCOUNTANT, OWNER |

**Tham số truy vấn**: `overdueOnly` (boolean, mặc định `false`), `q` (mã phòng, tên người đứng tên), `sort` (mặc định `-totalBalance`), `page`, `pageSize`.

**Phản hồi**: `200`; `data` là danh sách dòng, `meta` có thêm `totals`.

| Trường của một dòng | Kiểu | Mô tả |
|---|---|---|
| `roomId`, `roomCode` | id, string | |
| `contractId` | id | Công nợ thuộc **hợp đồng** (người đứng tên), kể cả hợp đồng đã kết thúc |
| `primaryTenantName` | string | |
| `contractStatus` | ContractStatus | |
| `unpaidInvoiceCount` | integer | Số hóa đơn còn nợ |
| `totalBalance` | money | Tổng còn nợ |
| `overdueBalance` | money | Phần còn nợ của hóa đơn quá hạn |
| `hasOverdue` | boolean | Đánh dấu quá hạn |
| `oldestDueDate` | date | Hạn sớm nhất trong các hóa đơn còn nợ |

`meta.totals`: `rowCount`, `totalBalance`, `overdueBalance`.

**Quy tắc xử lý**: chỉ gồm hợp đồng có ít nhất một hóa đơn `balance > 0`. Không có công nợ → `data` rỗng; giao diện hiển thị "Không có công nợ". Trạng thái quá hạn tính tại thời điểm gọi. Người thuê gọi → `403`.

#### RPT-02 Doanh thu theo tháng

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/reports/revenue` |
| Vai trò | OWNER |

**Tham số truy vấn**: `fromMonth`, `toMonth` (period, bắt buộc, tối đa 12 tháng).

**Phản hồi**: `200`, `data` là danh sách theo tháng:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `month` | period | |
| `totalCollected` | money | Tổng thanh toán `VALID` và `PENDING_CANCELLATION` có `paidOn` trong tháng |
| `paymentCount` | integer | |
| `cashAmount`, `bankTransferAmount`, `depositAmount` | money | Theo hình thức; `depositAmount` là tiền cọc cấn trừ khi thanh lý, tính vào doanh thu của tháng thanh lý |
| `cancelledAmount` | money | Tổng thanh toán đã hủy có `paidOn` trong tháng (để đối chiếu, không cộng vào doanh thu) |

**Quy tắc xử lý**: doanh thu = **tiền thực thu**. Tháng không có thanh toán vẫn có dòng với giá trị 0. Hủy một thanh toán của tháng trước sẽ làm doanh thu tháng đó giảm khi xem lại.

**Ví dụ**: tháng 2026-11 có thanh toán hợp lệ tổng 50.000.000 và một thanh toán đã hủy 2.000.000 → `totalCollected = 50.000.000`, `cancelledAmount = 2.000.000`.

#### RPT-03 Thu, chi, lợi nhuận

`GET /api/v1/reports/profit`. Vai trò: OWNER. Tham số: `fromMonth`, `toMonth`. Mỗi tháng: `month`, `revenue` (như RPT-02), `expenses` (tổng khoản chi theo `spentOn`), `profit` (= `revenue - expenses`, có thể âm), `expensesByCategory` (danh sách `categoryName`, `amount`).

#### RPT-04 Lấp đầy, phòng trống, hợp đồng sắp hết hạn

`GET /api/v1/reports/occupancy`. Vai trò: OWNER, MANAGER. Tham số: `expiringWithinDays` (mặc định 30). Phản hồi: `totalRooms`, `occupiedRooms`, `vacantRooms`, `maintenanceRooms`, `occupancyRate` (decimal 0 đến 1: phòng đang thuê / tổng phòng không bảo trì), `occupantCount`, `expiringContracts` (danh sách `contractId`, `roomCode`, `primaryTenantName`, `endDate`).

#### RPT-05 Xuất báo cáo ra Excel

`GET /api/v1/reports/{reportType}/export`. Vai trò như báo cáo tương ứng. `reportType` ∈ `debts`, `revenue`, `profit`, `occupancy`; tham số như báo cáo đó. Phản hồi `200` là file Excel, tên file có ngày xuất.

#### EXP-01…EXP-04 Loại chi, khoản chi

| Mã | Endpoint | Vai trò | Dữ liệu vào | Lỗi |
|---|---|---|---|---|
| EXP-01 | `GET /api/v1/expense-categories` | OWNER, ACCOUNTANT | Không có | Không có |
| EXP-02 | `POST /api/v1/expense-categories` | OWNER | `name` (1 đến 50 ký tự, duy nhất) | `CATEGORY_NAME_TAKEN` (409) |
| EXP-03 | `GET /api/v1/expenses` | ACCOUNTANT, OWNER | Tham số: `fromDate`, `toDate`, `categoryId`, `page`, `pageSize` | Không có |
| EXP-04 | `POST /api/v1/expenses` | ACCOUNTANT | `spentOn` (date ≤ hôm nay), `categoryId`, `amount` (money > 0), `description` (≤ 500 ký tự) | `VALIDATION_ERROR` (400) |

EXP-04 ghi nhật ký `EXPENSE_CREATED`.

#### SRCH-01 Tìm kiếm

`GET /api/v1/search`. Vai trò: MANAGER, ACCOUNTANT. Tham số: `q` (bắt buộc, ít nhất 2 ký tự; không phân biệt hoa thường, không dấu: "nguyen van a" tìm được "Nguyễn Văn A"), `types` (`rooms`, `occupants`, `invoices`; mặc định cả ba). Phản hồi: `rooms` (`id`, `code`, `status`), `occupants` (`id`, `fullName`, `roomCode`; thêm `phone` với MANAGER), `invoices` (`id`, `code`, `roomCode`, `status`); mỗi nhóm tối đa 10 kết quả. Tìm theo SĐT chỉ có hiệu lực với MANAGER.

### 5.12. Cổng người thuê, yêu cầu

Mọi endpoint `/me/…` xác định phòng và hợp đồng **từ phiên đăng nhập**. Không có tham số nào cho phép chỉ định phòng khác.

#### TEN-01 Phòng của tôi

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/me/room` |
| Vai trò | TENANT |

**Phản hồi**: `200`, `data` gồm `room` (`code`, `floor`, `areaM2`); `contract` (`id`, `startDate`, `endDate`, `monthlyRent`, `deposit`, `status`); `occupants` (chỉ `fullName`, `isPrimary`). **Không** có CCCD hay thông tin cá nhân của người khác.

#### TEN-02 Hóa đơn của tôi

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/me/invoices` |
| Vai trò | TENANT |

**Tham số truy vấn**: `status`, `page`, `pageSize` (mặc định sắp `-period`).

**Phản hồi**: `200` **InvoiceSummary[]**, chỉ hóa đơn thuộc hợp đồng của người thuê, gồm cả hóa đơn thanh lý.

#### TEN-03 Chi tiết một hóa đơn của tôi

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/me/invoices/{invoiceId}` |
| Vai trò | TENANT |

**Phản hồi**: `200` **Invoice**, trong đó `adjustments` chỉ gồm phiếu `APPROVED`; `payments` không có `recordedBy`.

**Lỗi**: `RESOURCE_NOT_FOUND` (404) khi hóa đơn không thuộc hợp đồng của người thuê, kể cả khi gõ trực tiếp mã trên đường dẫn.

#### TEN-04 Lịch sử thanh toán của tôi

`GET /api/v1/me/payments`. Vai trò: TENANT. Tham số: `page`, `pageSize`. Phản hồi `200` **Payment[]** của các hóa đơn thuộc hợp đồng, không có `recordedBy`.

#### TEN-05 Biên lai, TEN-06 Hợp đồng của tôi

`GET /api/v1/me/payments/{paymentId}/receipt` → **Receipt**; `GET /api/v1/me/contract` → **Contract** với `occupants` chỉ có `fullName`, `isPrimary`. Không thuộc hợp đồng của mình → `404`.

#### TEN-07 Gửi yêu cầu, TEN-08 Yêu cầu đã gửi

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/me/requests`; `GET /api/v1/me/requests` |
| Vai trò | TENANT |

**Dữ liệu vào** (TEN-07)

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `type` | RequestType | Có | |
| `title` | string | Có | 5 đến 100 ký tự |
| `description` | string | Không | Tối đa 1.000 ký tự |
| `occupantChange.action` | OccupantChangeAction | Điều kiện | Bắt buộc khi `OCCUPANT_CHANGE` |
| `occupantChange.occupantId` | id | Điều kiện | Bắt buộc khi `MOVE_OUT`, `UPDATE`; phải là người ở phòng mình |
| `occupantChange.proposedData` | OccupantInput | Điều kiện | Bắt buộc khi `ADD` (đủ trường bắt buộc) và `UPDATE` (trường cần đổi) |
| `occupantChange.moveOutDate` | date | Điều kiện | Bắt buộc khi `MOVE_OUT` |

**Phản hồi**: TEN-07 `201` **TenantRequest**, trạng thái ban đầu `PENDING` (thay đổi người ở) hoặc `NEW` (sửa chữa). TEN-08 `200` **TenantRequest[]**.

**Lỗi**: `VALIDATION_ERROR` (400), `RESOURCE_NOT_FOUND` (404: `occupantId` không thuộc phòng mình), `TENANT_READ_ONLY` (403: hợp đồng đã kết thúc).

#### REQ-01 Danh sách yêu cầu, REQ-02 Chi tiết yêu cầu

`GET /api/v1/requests` (tham số `type`, `status`, `roomId`, `page`, `pageSize`) và `GET /api/v1/requests/{requestId}`. Vai trò: MANAGER. Phản hồi **TenantRequest[]**, **TenantRequest**. Với MANAGER, `proposedData` hiển thị đầy đủ để đối chiếu.

#### REQ-03 Duyệt, REQ-04 Từ chối yêu cầu thay đổi người ở

| Mục | Nội dung |
|---|---|
| Endpoint | `POST /api/v1/requests/{requestId}/approve`; `POST /api/v1/requests/{requestId}/reject` |
| Vai trò | MANAGER |
| Ghi nhật ký | Có khi duyệt (`OCCUPANT_CREATED`, `OCCUPANT_UPDATED` hoặc `OCCUPANT_MOVED_OUT`) |

**Dữ liệu vào**: `responseNote` (bắt buộc khi từ chối).

**Phản hồi**: `200` **TenantRequest**.

**Lỗi**: `REQUEST_ALREADY_PROCESSED` (409), `INVALID_REQUEST_TYPE` (409: yêu cầu sửa chữa dùng REQ-05); khi duyệt, dữ liệu đề xuất không hợp lệ → lỗi như OCC-02, OCC-04, OCC-05, yêu cầu vẫn ở `PENDING`.

**Quy tắc xử lý**: duyệt thì áp dụng thay đổi qua chức năng người ở (OCC-02, OCC-04, OCC-05) trong **cùng giao dịch**; tạo thông báo `REQUEST_PROCESSED` cho người gửi.

#### REQ-05 Cập nhật trạng thái yêu cầu sửa chữa

`PATCH /api/v1/requests/{requestId}/status`. Vai trò: MANAGER. Dữ liệu vào: `status` (MaintenanceStatus), `responseNote` (bắt buộc khi `REJECTED`). Chuyển trạng thái hợp lệ: `NEW` → `IN_PROGRESS` hoặc `REJECTED`; `IN_PROGRESS` → `DONE` hoặc `REJECTED`. Chuyển khác → `INVALID_STATUS_TRANSITION` (409). Khi `DONE` hoặc `REJECTED`: tạo thông báo cho người gửi. Phí sửa chữa (nếu có) thêm bằng BIL-06.

### 5.13. Thông báo, nhật ký, hệ thống

#### NTF-01…NTF-03 Thông báo

| Mã | Endpoint | Mô tả |
|---|---|---|
| NTF-01 | `GET /api/v1/notifications` | Thông báo của chính người gọi. Tham số: `isRead`, `page`, `pageSize`. `meta` có thêm `unreadCount` |
| NTF-02 | `POST /api/v1/notifications/{notificationId}/read` | Đánh dấu đã đọc; `204`. Thông báo của người khác → `404` |
| NTF-03 | `POST /api/v1/notifications/read-all` | Đánh dấu tất cả đã đọc; `204` |

Mọi vai trò.

**Nguồn tạo thông báo** (không qua API, chạy trên máy chủ):

| Loại | Khi nào | Người nhận |
|---|---|---|
| `INVOICE_ISSUED` | BIL-05 phát hành hóa đơn | Người thuê của phòng |
| `INVOICE_DUE_SOON` | Tác vụ định kỳ hằng ngày: còn 3 ngày đến hạn và còn nợ | Người thuê |
| `INVOICE_OVERDUE` | Tác vụ định kỳ: ngày đầu tiên sau hạn mà còn nợ | Người thuê |
| `REQUEST_PROCESSED` | REQ-03, REQ-04, REQ-05 | Người gửi yêu cầu |

Mỗi (hóa đơn, loại thông báo) chỉ tạo **một** thông báo, kể cả khi tác vụ định kỳ chạy lại.

#### AUD-01 Tra cứu nhật ký

`GET /api/v1/audit-logs`. Vai trò: OWNER. Tham số: `fromDate`, `toDate`, `actorId`, `action`, `entityType`, `entityId`, `page`, `pageSize` (mặc định sắp `-occurredAt`). Phản hồi `200` **AuditLog[]**. Chỉ đọc; không có endpoint sửa, xóa nhật ký.

#### SYS-01 Kiểm tra máy chủ

`GET /api/v1/health`. Không cần đăng nhập. Phản hồi `200` gồm `status` (`ok`), `version`, `time`. Không trả thông tin cấu hình. Dùng để kiểm tra máy chủ còn hoạt động.

---

## 6. Bảng mã lỗi

| Mã lỗi | HTTP | Thông báo (tiếng Việt) | Endpoint |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | "Dữ liệu không hợp lệ" kèm `details`; một số trường có thông báo riêng (bảng dưới) | Mọi endpoint có dữ liệu vào |
| `READ_ONLY_FIELD` | 400 | "Trường này không được sửa trực tiếp" | ROOM-04 |
| `WRONG_CURRENT_PASSWORD` | 400 | "Mật khẩu hiện tại không đúng" | AUTH-04 |
| `WEAK_PASSWORD` | 400 | "Mật khẩu mới cần ít nhất 8 ký tự, gồm cả chữ và số, khác mật khẩu cũ" | AUTH-04 |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | "Thiếu mã chống gửi lặp" | PAY-01 |
| `INVALID_CREDENTIALS` | 401 | "Tài khoản hoặc mật khẩu không chính xác" | AUTH-01 |
| `UNAUTHENTICATED` | 401 | "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" | Mọi endpoint cần đăng nhập, AUTH-05 |
| `FORBIDDEN` | 403 | "Bạn không có quyền thực hiện thao tác này" | Mọi endpoint |
| `ACCOUNT_LOCKED` | 403 | "Tài khoản đã bị khóa" | AUTH-01 |
| `PASSWORD_CHANGE_REQUIRED` | 403 | "Bạn cần đổi mật khẩu trước khi tiếp tục" | Mọi endpoint trừ AUTH-02 đến AUTH-05 |
| `SELF_APPROVAL_NOT_ALLOWED` | 403 | "Bạn không thể tự duyệt yêu cầu do chính mình gửi" | ADJ-03, PAY-07 |
| `TENANT_READ_ONLY` | 403 | "Hợp đồng đã kết thúc, tài khoản chỉ còn quyền xem" | TEN-07, USR-09 |
| `RESOURCE_NOT_FOUND` | 404 | "Không tìm thấy dữ liệu" | Mọi endpoint có `{id}` |
| `PERIOD_NOT_FOUND` | 404 | "Kỳ hóa đơn không tồn tại" | MTR-02, BIL-04, BIL-05 |
| `USERNAME_TAKEN` | 409 | "Tên đăng nhập đã tồn tại" | USR-02, CTR-02 |
| `LAST_SYSTEM_ADMIN` | 409 | "Hệ thống phải còn ít nhất một Quản trị hệ thống đang hoạt động" | USR-05, USR-06 |
| `CANNOT_LOCK_SELF` | 409 | "Bạn không thể tự khóa tài khoản của mình" | USR-06 |
| `CANNOT_RESET_SELF` | 409 | "Hãy dùng chức năng đổi mật khẩu" | USR-08 |
| `TENANT_ACCOUNT_NOT_EDITABLE` | 409 | "Không đổi vai trò của tài khoản người thuê" | USR-05 |
| `TENANT_ACCESS_EXPIRED` | 409 | "Hợp đồng đã kết thúc quá 30 ngày, không mở khóa được" | USR-07 |
| `ROOM_CODE_TAKEN` | 409 | "Mã phòng đã tồn tại" | ROOM-02, ROOM-04 |
| `ROOM_CODE_LOCKED` | 409 | "Phòng đã có hợp đồng, không đổi được mã phòng" | ROOM-04 |
| `ROOM_HAS_ACTIVE_CONTRACT` | 409 | "Phòng đang có hợp đồng hiệu lực hoặc sắp hiệu lực" | ROOM-04 |
| `ROOM_UNDER_MAINTENANCE` | 409 | "Phòng đang bảo trì" | CTR-02 |
| `ROOM_NOT_OCCUPIED` | 409 | "Phòng không có hợp đồng hiệu lực hoặc sắp hiệu lực" | OCC-02, MTR-02, BIL-06 |
| `ID_NUMBER_TAKEN` | 409 | "Số CCCD trùng với một người ở khác trong cùng thời gian" | CTR-02, OCC-02, OCC-04 |
| `CONTRACT_ALREADY_ENDED` | 409 | "Hợp đồng đã kết thúc" | CTR-04, CTR-05, CTR-06, CTR-07, CTR-08 |
| `CONTRACT_PERIOD_OVERLAP` | 409 | "Thời gian hợp đồng trùng với hợp đồng khác của phòng" | CTR-02, CTR-06, CTR-07 |
| `CONTRACT_NUMBER_TAKEN` | 409 | "Số hợp đồng đã tồn tại" | CTR-02, CTR-06 |
| `CONTRACT_HAS_INVOICE` | 409 | "Hợp đồng đã có hóa đơn, không đổi được ngày bắt đầu, giá thuê hoặc chỉ số bàn giao" | CTR-06 |
| `PRIMARY_TENANT_CANNOT_MOVE_OUT` | 409 | "Người đứng tên rời đi thì cần kết thúc hợp đồng" | OCC-05 |
| `OCCUPANT_ALREADY_MOVED_OUT` | 409 | "Người này đã được ghi nhận rời đi" | OCC-05 |
| `CHARGE_NAME_TAKEN` | 409 | "Tên khoản thu đã tồn tại" | CHG-02, CHG-03 |
| `METER_TYPE_IN_USE` | 409 | "Đã có khoản thu đang dùng cho loại công tơ này" | CHG-02 |
| `CHARGE_TYPE_IN_USE` | 409 | "Khoản thu đã dùng trong hóa đơn, không đổi được cách tính" | CHG-03 |
| `SYSTEM_CHARGE_TYPE` | 409 | "Không sửa cách tính hoặc ngừng dùng khoản Tiền phòng" | CHG-03 |
| `CHARGE_TYPE_HAS_NO_PRICE` | 409 | "Khoản thu này không dùng bảng giá" | CHG-05 |
| `PRICE_EFFECTIVE_DATE_TAKEN` | 409 | "Đã có đơn giá với ngày hiệu lực này" | CHG-05 |
| `PRICE_IN_USE` | 409 | "Đơn giá đã được dùng, không xóa được" | CHG-06 |
| `METER_READING_LOCKED` | 409 | "Hóa đơn kỳ này đã phát hành, hãy dùng phiếu điều chỉnh" | MTR-02 |
| `PERIOD_ALREADY_EXISTS` | 409 | "Kỳ hóa đơn đã tồn tại" | BIL-02 |
| `PERIOD_ALREADY_ISSUED` | 409 | "Đã có hóa đơn phát hành trong kỳ này" | BIL-06, BIL-07, BIL-08, CTR-05 |
| `INVOICE_ALREADY_PAID` | 409 | "Hóa đơn đã được thanh toán đủ" | PAY-01 |
| `AMOUNT_EXCEEDS_BALANCE` | 409 | "Số tiền vượt quá số còn nợ" (kèm số còn nợ) | PAY-01 |
| `IDEMPOTENCY_KEY_REUSED` | 409 | "Yêu cầu trùng mã nhưng khác nội dung" | PAY-01, CTR-02, BIL-05 |
| `ADJUSTMENT_BELOW_PAID` | 409 | "Sau điều chỉnh, số phải trả nhỏ hơn số đã thanh toán" | ADJ-01, ADJ-03 |
| `REQUEST_ALREADY_PROCESSED` | 409 | "Yêu cầu đã được xử lý" | ADJ-03, ADJ-04, PAY-07, PAY-08, REQ-03, REQ-04 |
| `PAYMENT_ALREADY_CANCELLED` | 409 | "Thanh toán đã bị hủy" | PAY-05 |
| `PAYMENT_NOT_CANCELLABLE` | 409 | "Khoản cấn trừ tiền cọc không hủy được, hãy dùng phiếu điều chỉnh" | PAY-05 |
| `CANCELLATION_ALREADY_PENDING` | 409 | "Thanh toán này đang có yêu cầu hủy chờ duyệt" | PAY-05 |
| `CATEGORY_NAME_TAKEN` | 409 | "Tên loại chi đã tồn tại" | EXP-02 |
| `INVALID_REQUEST_TYPE` | 409 | "Thao tác không áp dụng cho loại yêu cầu này" | REQ-03, REQ-04, REQ-05 |
| `INVALID_STATUS_TRANSITION` | 409 | "Không chuyển được sang trạng thái này" | REQ-05 |
| `CONCURRENT_UPDATE` | 409 | "Dữ liệu vừa được thay đổi, vui lòng tải lại và thử lại" | Mọi endpoint ghi dữ liệu |
| `PAYLOAD_TOO_LARGE` | 413 | "Dữ liệu gửi lên quá lớn" | Mọi endpoint có dữ liệu vào |
| `TOO_MANY_LOGIN_ATTEMPTS` | 429 | "Bạn đã đăng nhập sai nhiều lần, vui lòng thử lại sau 15 phút" | AUTH-01 |
| `TOO_MANY_REQUESTS` | 429 | "Thao tác quá nhanh, vui lòng thử lại sau ít phút" | Mọi endpoint (120 yêu cầu mỗi phút mỗi IP; đăng nhập, đổi mật khẩu 10) |
| `INTERNAL_ERROR` | 500 | "Hệ thống gặp lỗi, vui lòng thử lại sau" | Mọi endpoint |

**Mã lỗi chi tiết** trong `details[].code`: `REQUIRED`, `INVALID_FORMAT`, `TOO_SHORT`, `TOO_LONG`, `OUT_OF_RANGE`, `DUPLICATE_ITEM`, `END_BEFORE_START`, `DUE_BEFORE_BILLING`, `DATE_IN_FUTURE`, `READING_DECREASED`, `PREVIOUS_READING_MISSING`.

**Thông báo**:

| Thông báo | Endpoint | Trường hợp |
|---|---|---|
| "Tài khoản hoặc mật khẩu không chính xác" | AUTH-01 | Sai tên đăng nhập hoặc mật khẩu |
| "Hãy nhập vào 1 tên khoản thu hợp lệ!" | CHG-02 | `name` thiếu hoặc không hợp lệ |
| "Hãy nhập vào số tiền hợp lệ!" | CHG-02, CHG-05 | `unitPrice` thiếu hoặc không phải số hợp lệ |
| "Vui lòng nhập khoản nộp hợp lí!" | PAY-01 | Thiếu hóa đơn hoặc người nộp |
