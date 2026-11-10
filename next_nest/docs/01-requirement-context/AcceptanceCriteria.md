# Bước 4 – Acceptance Criteria

> Template WB-4, Bước 4. **v0.2 – 27/10/2026**, theo bài toán chung cư mini cho thuê.
> Cấu trúc **Given – When – Then**. Chỉ dùng quy tắc trong `BusinessRules.md`. Chỗ nào dùng **mặc định tạm** của câu hỏi để sau (Q-48…Q-60) thì ghi rõ để kiểm thử lại khi nhóm quyết định.
> Mục 1–3: ba story quan trọng nhất, đủ các loại tình huống của template. Mục 4: tra cứu AC của các story đã có đặc tả chi tiết trong `report/us/` (đánh số theo các file đó, cập nhật 10/11/2026). Mục 5: AC rút gọn cho US-04, US-23.

**Tình huống của template, áp vào bài toán cho thuê**

| Template | Tình huống tương đương |
|---|---|
| Bệnh nhân từ chối | Người thuê **không trả** hoặc **trả thiếu** |
| Không phản hồi đúng hạn | Hóa đơn **quá hạn**; người dùng **bỏ dở** thao tác |
| Khung giờ không còn | Hóa đơn **đã trả đủ**, **đã điều chỉnh**; phòng **đã có hợp đồng** |
| Dữ liệu không hợp lệ | Thiếu thông tin, số tiền hoặc chỉ số sai |

**Dữ liệu ví dụ dùng chung** (chỉ để minh họa, không phải bảng giá thật)

| Khoản | Cách tính | Đơn giá ví dụ |
|---|---|---|
| Tiền phòng P101 | Theo hợp đồng | 3.000.000 đ/tháng |
| Điện | Chỉ số × đơn giá | 3.456 đ/kWh |
| Nước | Theo khối | 25.000 đ/m³ |
| Wifi | Theo phòng | 100.000 đ/tháng |
| Vệ sinh | Theo người | 30.000 đ/người/tháng |
| Gửi xe máy | Theo xe | 100.000 đ/xe/tháng |

---

## 1. US-15 – Lập hóa đơn tháng cho các phòng đang thuê

*Là quản lý, tôi muốn lập hóa đơn tháng cho tất cả phòng đang thuê trong một lần, xem trước rồi phát hành, để không phải tính tay từng phòng.*

| AC ID | Loại | Given | When | Then | Quy tắc |
|---|---|---|---|---|---|
| AC-15-01 | Happy Path | Kỳ 11/2026. Phòng P101 có hợp đồng hiệu lực, 2 người ở, đăng ký 1 xe máy; chỉ số điện 1.200 → 1.350, nước 40 → 48; bảng giá như trên | Quản lý chọn lập hóa đơn kỳ 11/2026, xem trước, rồi phát hành | Mỗi phòng đang thuê có **đúng một** hóa đơn, mã do hệ thống sinh. Hóa đơn có từng dòng: khoản, số lượng, đơn giá, thành tiền. Trạng thái **chưa thanh toán**; có hạn thanh toán | BR-19…BR-23 |
| AC-15-02 | Ví dụ tính | Như AC-15-01 | Hệ thống tính hóa đơn P101 | Tiền phòng 3.000.000 + điện 150 × 3.456 = 518.400 + nước 8 × 25.000 = 200.000 + wifi 100.000 + vệ sinh 2 × 30.000 = 60.000 + gửi xe 100.000 = **3.978.400**. Tổng sau làm tròn đến 1.000 đ: **3.978.000** | BR-22 (hướng làm tròn mặc định: **gần nhất** – nhóm xác nhận) |
| AC-15-03 | Alternative | Phòng P102 trống, phòng P103 đang bảo trì | Lập hóa đơn kỳ 11/2026 | **Không** lập hóa đơn cho P102, P103 | BR-21 |
| AC-15-04 | Exception (thiếu dữ liệu) | Phòng P104 đang thuê nhưng chưa có chỉ số điện, nước kỳ 11 | Quản lý xem trước | Hệ thống **liệt kê các phòng thiếu chỉ số**. Mặc định tạm: không phát hành hóa đơn cho phòng thiếu chỉ số; các phòng đủ dữ liệu vẫn phát hành | BR-17; [Giả định] |
| AC-15-05 | Exception (trùng kỳ) | Phòng P101 đã có hóa đơn kỳ 11/2026 | Quản lý lập lại hóa đơn kỳ 11/2026 | **Không** tạo hóa đơn thứ hai cho P101 kỳ 11 | BR-20, BR-21 |
| AC-15-06 | Timeout (bỏ dở) | Quản lý đang ở bước xem trước | Quản lý thoát trước khi phát hành | **Không** hóa đơn nào được phát hành | Suy từ US-15 (xem trước rồi phát hành) |
| AC-15-07 | Conflict (giá thay đổi) | Hóa đơn kỳ 11 đã phát hành; Chủ nhà đổi giá điện, hiệu lực từ 01/12/2026 | Xem lại hóa đơn kỳ 11 | Hóa đơn kỳ 11 **giữ nguyên**; giá mới chỉ áp dụng từ kỳ 12 | BR-19 |
| AC-15-08 | Conflict (số người thay đổi) | Ngày 15/11, phòng P101 thêm một người ở | Lập hóa đơn kỳ 11 và kỳ 12 | Kỳ 11 tính **2 người** (người ở thêm giữa tháng tính từ kỳ sau); kỳ 12 tính **3 người** | BR-19, Q-49 |
| AC-15-09 | Phân quyền | Người dùng chỉ có vai trò Kế toán hoặc Người thuê | Thử lập hóa đơn | Bị từ chối | BR-02 |
| AC-15-10 | Lên lịch | Kế toán lên lịch kỳ 11/2026 với ngày thu 25/11/2026, hạn thanh toán 05/12/2026 | Quản lý phát hành hóa đơn kỳ đó | Hóa đơn có ngày thu 25/11/2026 và hạn 05/12/2026. Ngày thu không bắt buộc ở đầu hay cuối tháng | BR-20 |
| AC-15-11 | Exception (lịch sai) | Kế toán đang lên lịch một kỳ | Đặt hạn thanh toán trước ngày thu | Không lưu; báo lỗi | BR-20 |
| AC-15-12 | Phân quyền | Người dùng không có vai trò Kế toán | Thử lên lịch kỳ thu | Bị từ chối | BR-20 |
| AC-15-13 | Alternative (vào ở giữa tháng) | Kỳ 11/2026. Hợp đồng phòng P102 bắt đầu 20/11/2026, giá thuê 3.000.000 đ, 1 người ở, đăng ký wifi; chỉ số bàn giao điện 500, nước 30; chỉ số kỳ 11: điện 560, nước 33 | Quản lý xem trước hóa đơn kỳ 11 | Tháng 11 có 30 ngày, tính 11 ngày: tiền phòng 3.000.000 × 11 ÷ 30 = 1.100.000; wifi 100.000 × 11 ÷ 30 = 36.667; vệ sinh 30.000 × 11 ÷ 30 = 11.000; điện 60 × 3.456 = 207.360; nước 3 × 25.000 = 75.000. Tổng trước làm tròn 1.430.027, sau làm tròn **1.430.000**. Từ kỳ 12 tính tròn tháng | BR-21, Q-49 |

---

## 2. US-18 – Ghi nhận thanh toán

*Là kế toán, tôi muốn ghi nhận thanh toán (một phần hoặc toàn bộ, tiền mặt hoặc chuyển khoản) cho một hóa đơn, để công nợ luôn đúng.*

| AC ID | Loại | Given | When | Then | Quy tắc |
|---|---|---|---|---|---|
| AC-18-01 | Happy Path | Hóa đơn P101 kỳ 11 là 3.978.000 đ, chưa thanh toán | Kế toán ghi nhận 3.978.000 đ tiền mặt, người nộp là một người đang ở P101, ngày nộp hôm nay | Lưu thanh toán; hóa đơn chuyển **đã thanh toán**; có **biên lai** | BR-27…BR-29 |
| AC-18-02 | Alternative (trả một phần) | Như AC-18-01 | Ghi nhận 2.000.000 đ; sau đó ghi nhận tiếp 1.978.000 đ | Sau lần 1: **thanh toán một phần**, còn nợ 1.978.000 đ. Sau lần 2: **đã thanh toán** | BR-27 |
| AC-18-03 | Alternative (người nộp khác) | Như AC-18-01 | Ghi nhận bằng chuyển khoản, người nộp chọn "Khác" và nhập tên | Lưu thanh toán với hình thức chuyển khoản và tên đã nhập | BR-28, BR-29 |
| AC-18-04 | Exception (thiếu thông tin) | Kế toán ở màn hình ghi nhận | Nhấn lưu khi chưa chọn hóa đơn **hoặc** chưa chọn người nộp | Không lưu; thông báo "**Vui lòng nhập khoản nộp hợp lí!**" | [C9] Bảng 9-8 |
| AC-18-05 | Exception (đã trả đủ) | Hóa đơn đã ở trạng thái đã thanh toán | Ghi nhận thêm một khoản | Không lưu; thông báo hóa đơn đã được thanh toán đủ | BR-33 |
| AC-18-06 | Exception (nộp thừa) | Hóa đơn còn nợ 1.978.000 đ | Ghi nhận 2.500.000 đ | Không lưu; thông báo số tiền còn nợ (mặc định tạm **chặn nộp thừa**) | Q-57 |
| AC-18-07 | Exception (ngày sai) | – | Ngày nộp là ngày mai | Không lưu | BR-30 |
| AC-18-08 | Timeout (quá hạn) | Hóa đơn đã quá hạn, còn nợ | Ghi nhận đủ số còn nợ | Nhận thanh toán bình thường; trạng thái **đã thanh toán**; không tính phí phạt | BR-27; Q-25 |
| AC-18-09 | Conflict (ghi đồng thời) | Hóa đơn còn nợ 1.978.000 đ; hai kế toán cùng mở hóa đơn này | Cả hai cùng ghi nhận 1.978.000 đ gần như đồng thời | **Chỉ một** thanh toán được lưu; người còn lại nhận thông báo hóa đơn đã trả đủ | BR-33, Q-57 |
| AC-18-10 | Conflict (đã điều chỉnh) | Hóa đơn 3.978.000 đ có phiếu điều chỉnh −200.000 đ đã được duyệt | Kế toán xem số còn nợ | Số phải trả là **3.778.000 đ** | BR-25 |
| AC-18-11 | Phân quyền | Người dùng chỉ có vai trò Người thuê | Thử ghi nhận thanh toán | Bị từ chối | BR-07 |

---

## 3. US-22 – Công nợ theo phòng

*Là kế toán, tôi muốn xem công nợ theo phòng, gồm các hóa đơn quá hạn, để đôn đốc thu.*

| AC ID | Loại | Given | When | Then | Quy tắc |
|---|---|---|---|---|---|
| AC-22-01 | Happy Path | P101 còn nợ 1.978.000 đ (một hóa đơn trả một phần); P105 còn nợ 4.100.000 đ (một hóa đơn quá hạn) | Kế toán mở công nợ | Danh sách các phòng còn nợ, mỗi phòng có tổng nợ, số hóa đơn chưa trả đủ, đánh dấu **quá hạn** | BR-27, BR-32 |
| AC-22-02 | Alternative | Như trên | Lọc "chỉ quá hạn" | Chỉ hiển thị P105 | BR-27 |
| AC-22-03 | Exception (không nợ) | Mọi hóa đơn đã thanh toán | Mở công nợ | Danh sách rỗng, có thông báo không có công nợ | – |
| AC-22-04 | Timeout | Hóa đơn hạn 10/11/2026, đến 11/11 vẫn chưa trả đủ | Mở công nợ ngày 11/11 | Hóa đơn được đánh dấu **quá hạn**; người thuê nhận thông báo quá hạn (nếu US-32 đã có) | BR-27, BR-34, BR-20 |
| AC-22-05 | Conflict (hủy thanh toán) | P101 đã trả đủ; một thanh toán 2.000.000 đ bị hủy (Quản lý đã duyệt) | Mở công nợ | P101 xuất hiện lại với nợ 2.000.000 đ | BR-31 |
| AC-22-06 | Phân quyền | Người thuê phòng P101 | Thử xem công nợ toàn tòa hoặc của phòng khác | Bị từ chối; chỉ xem được hóa đơn của P101 (US-29) | BR-07 |

---

## 4. AC của các story có đặc tả chi tiết

Nguồn chuẩn là `report/us/detailed/us-xx.md` (dữ liệu nền, Given, When, Then đầy đủ) và `report/us/testcase/tc-xx.md` (test case). Mã AC đánh số theo các file đó. Bảng dưới chỉ để tra cứu mã và loại tình huống.

| Story | AC ID | Loại | Nguồn |
|---|---|---|---|
| **US-01** Đăng nhập | AC-01-01 | Happy Path (Đăng nhập đúng) | `us-01.md`, `tc-01.md` |
|  | AC-01-02 | Exception (Sai mật khẩu) |  |
|  | AC-01-03 | Exception (Sai tên đăng nhập) |  |
|  | AC-01-04 | Exception (Bỏ trống thông tin) |  |
|  | AC-01-05 | Exception (Tài khoản bị khóa) |  |
|  | AC-01-06 | Alternative (Nhiều vai trò) |  |
|  | AC-01-07 | Phân quyền (Chưa đăng nhập) |  |
|  | AC-01-08 | Phân quyền (Đăng nhập nhưng sai vai trò) |  |
|  | AC-01-09 | Alternative (Hợp đồng kết thúc chưa quá 30 ngày) |  |
|  | AC-01-10 | Exception (Đăng nhập sai nhiều lần) |  |
| **US-02** Đổi mật khẩu | AC-02-01 | Happy Path (Đổi thành công) | `us-02.md`, `tc-02.md` |
|  | AC-02-02 | Exception (Mật khẩu hiện tại sai) |  |
|  | AC-02-03 | Exception (Thiếu thông tin) |  |
|  | AC-02-04 | Exception (Xác nhận không khớp) |  |
|  | AC-02-05 | Exception (Mật khẩu mới không đủ mạnh) |  |
|  | AC-02-06 | Exception (Trùng mật khẩu cũ) |  |
|  | AC-02-07 | Phân quyền (Chưa đăng nhập) |  |
|  | AC-02-08 | Phân quyền (Chỉ đổi mật khẩu của chính mình) |  |
| **US-06** Quản lý phòng | AC-06-01 | Happy Path (Thêm phòng mới hợp lệ) | `us-06.md`, `tc-06.md` |
|  | AC-06-02 | Exception (Trùng mã phòng) |  |
|  | AC-06-03 | Exception (Thiếu thông tin hoặc số liệu không hợp lệ) |  |
|  | AC-06-04 | Conflict (Đổi trạng thái phòng đang có hợp đồng hiệu lực) |  |
|  | AC-06-05 | Alternative (Cập nhật thông tin & chuyển trạng thái bảo trì cho phòng trống) |  |
|  | AC-06-06 | Phân quyền |  |
| **US-07** Nhập hợp đồng đã ký giấy | AC-07-01 | Happy Path (Nhập hợp đồng hiệu lực ngay & cấp tài khoản) | `us-07.md`, `tc-07.md` |
|  | AC-07-02 | Exception (Trùng khoảng thời gian hợp đồng của cùng phòng) |  |
|  | AC-07-03 | Exception (Ngày kết thúc trước ngày bắt đầu) |  |
|  | AC-07-04 | Exception (Người đứng tên thiếu trường bắt buộc) |  |
|  | AC-07-05 | Alternative (Hợp đồng có ngày bắt đầu trong tương lai) |  |
|  | AC-07-06 | Alternative (Nhập bù hợp đồng đã ký và bắt đầu trong quá khứ) |  |
|  | AC-07-07 | Conflict (Sửa hợp đồng trước và sau khi có hóa đơn) |  |
|  | AC-07-08 | Phân quyền |  |
| **US-08** Người ở | AC-08-01 | Happy Path (Thêm người ở đủ thông tin) | `us-08.md`, `tc-08.md` |
|  | AC-08-02 | Exception (Thiếu CCCD hoặc trường bắt buộc) |  |
|  | AC-08-03 | Exception (Sai định dạng hoặc trùng CCCD trong cùng thời gian) |  |
|  | AC-08-04 | Alternative (Ghi nhận người rời đi & ẩn sau 1 năm) |  |
|  | AC-08-05 | Phân quyền & Bảo mật dữ liệu cá nhân |  |
| **US-10** Yêu cầu thay đổi người ở | AC-10-01 | Happy Path (Gửi yêu cầu thêm người) | `us-10.md`, `tc-10.md` |
|  | AC-10-02 | Happy Path (Duyệt yêu cầu) |  |
|  | AC-10-03 | Exception (Thiếu dữ liệu) |  |
|  | AC-10-04 | Conflict (Người đứng tên xin rời đi) |  |
|  | AC-10-05 | Phân quyền |  |
|  | AC-10-06 | Alternative (Từ chối, yêu cầu đã xử lý) |  |
|  | AC-10-07 | Exception (Hợp đồng đã kết thúc) |  |
| **US-11** Khai báo tạm trú | AC-11-01 | Happy Path (Đổi tình trạng) | `us-11.md`, `tc-11.md` |
|  | AC-11-02 | Exception (Không có chức năng cấp tạm trú) |  |
|  | AC-11-03 | Phân quyền (Sai vai trò sửa dữ liệu) |  |
|  | AC-11-04 | Phân quyền (Người thuê xem thông tin) |  |
| **US-13** Bảng giá | AC-13-01 | Happy Path (Thêm khoản thu hoặc mức giá mới) | `us-13.md`, `tc-13.md` |
|  | AC-13-02 | Conflict (Đổi giá sau khi hóa đơn đã phát hành & chặn sửa/xóa giá cũ) |  |
|  | AC-13-03 | Exception (Tên khoản thu để trống hoặc sai độ dài) |  |
|  | AC-13-04 | Exception (Đơn giá trống hoặc không phải số hợp lệ) |  |
|  | AC-13-05 | Exception (Trùng tên khoản thu hoặc trùng ngày hiệu lực) |  |
|  | AC-13-06 | Phân quyền |  |
| **US-14** Chỉ số điện nước | AC-14-01 | Happy Path (Tự lấy chỉ số cũ & ghi chỉ số hợp lệ) | `us-14.md`, `tc-14.md` |
|  | AC-14-02 | Exception (Bỏ trống hoặc sai định dạng chỉ số) |  |
|  | AC-14-03 | Exception (Chỉ số mới nhỏ hơn chỉ số cũ) |  |
|  | AC-14-04 | Conflict (Ghi lại cùng kỳ & khóa sau khi phát hành hóa đơn) |  |
|  | AC-14-05 | Exception & Phân quyền (Phòng trống hoặc sai vai trò) |  |
|  | AC-14-06 | Exception (Kỳ chưa được lên lịch) |  |
| **US-29** Người thuê xem hóa đơn | AC-29-01 | Happy Path (Xem danh sách hóa đơn & tổng còn phải trả) | `us-29.md`, `tc-29.md` |
|  | AC-29-02 | Happy Path (Xem chi tiết dòng hóa đơn đã chụp) |  |
|  | AC-29-03 | Happy Path (Xem lịch sử thanh toán & giao dịch đã hủy) |  |
|  | AC-29-04 | Phân quyền & Bảo mật theo phòng (Chặn xem phòng khác & chặn sửa/xóa) |  |
|  | AC-29-05 | Alternative (Phòng mới thuê chưa có hóa đơn phát hành) |  |
|  | AC-29-06 | Bảo mật dữ liệu người cùng phòng |  |

---

## 5. AC rút gọn cho các story chưa có đặc tả chi tiết

| Story | AC ID | Given / When | Then | Quy tắc |
|---|---|---|---|---|
| **US-09** Kết thúc, gia hạn hợp đồng | AC-09-01 | Hợp đồng P101 đến 30/11/2026; Quản lý gia hạn đến 30/11/2027 theo phụ lục PL-01 ký 25/11/2026 | Vẫn là hợp đồng cũ, ngày kết thúc mới 30/11/2027; tài khoản người thuê giữ nguyên; ghi nhật ký | BR-12 |
| | AC-09-02 | Phòng P101 đã có hợp đồng của người thuê mới bắt đầu 01/12/2026; Quản lý gia hạn hợp đồng cũ đến 31/12/2026 | Không lưu; báo thời gian trùng với hợp đồng khác của phòng | BR-11 |
| | AC-09-03 | Gia hạn kèm giá thuê mới 3.200.000 đ từ 01/12/2026 | Hóa đơn kỳ 11 vẫn 3.000.000 đ tiền phòng; từ kỳ 12 là 3.200.000 đ | BR-12, BR-19 |
| **US-04** Tạo tài khoản nhân viên | AC-04-01 | Quản trị hệ thống tạo tài khoản, gán vai trò Quản lý + Kế toán | Tài khoản có cả hai vai trò | BR-02, BR-03 |
| | AC-04-02 | Tên đăng nhập đã tồn tại | Không tạo; báo lỗi | – |
| | AC-04-03 | Người dùng không có vai trò Quản trị hệ thống thử tạo tài khoản | Bị từ chối | BR-03 |
| **US-23** Doanh thu theo tháng | AC-23-01 | Tháng 11 có các thanh toán hợp lệ tổng 50.000.000 đ, và một thanh toán đã hủy 2.000.000 đ | Chủ nhà xem doanh thu tháng 11 | Hiển thị **50.000.000 đ** (không tính thanh toán đã hủy). Mặc định tạm: doanh thu = **tiền thực thu** trong tháng | BR-31, BR-35; **Q-59** |
| | AC-23-02 | Tháng chưa có thanh toán | Xem doanh thu | Hiển thị 0 đ | – |

---

## 6. Human Checkpoint

| Việc cần làm | Kết quả |
|---|---|
| Rà soát AC | *Chờ nhóm* |
| AC kiểm thử, quan sát được | Đạt: mọi *Then* là trạng thái, con số, thông báo hoặc quyền truy cập cụ thể |
| Đánh dấu AC phụ thuộc mặc định tạm | AC-15-02 (hướng làm tròn), AC-15-04, AC-18-06, AC-18-09, AC-14-03, AC-14-04, AC-23-01 |
| Test case Chương 9 được giữ lại | AC-01-02, AC-01-03, AC-13-03, AC-13-04, AC-18-04, AC-18-05 |
| Phê duyệt trước khi thiết kế | *Chờ nhóm* |
