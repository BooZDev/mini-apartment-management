# Bước 4 – Acceptance Criteria

> Template WB-4, Bước 4. **v0.2 – 27/10/2026**, theo bài toán chung cư mini cho thuê.
> Cấu trúc **Given – When – Then**. Chỉ dùng quy tắc trong `BusinessRules.md`. Chỗ nào dùng **mặc định tạm** của câu hỏi để sau (Q-48…Q-60) thì ghi rõ để kiểm thử lại khi nhóm quyết định.
> Mục 1–3: ba story quan trọng nhất, đủ các loại tình huống của template. Mục 4: AC rút gọn cho 10 story Must còn lại.

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
| AC-15-08 | Conflict (số người thay đổi) | Ngày 15/11, phòng P101 thêm một người ở | Lập hóa đơn kỳ 11 và kỳ 12 | Kỳ 11 tính **2 người** (tròn tháng, mặc định Q-49); kỳ 12 tính **3 người** | BR-19, Q-49 |
| AC-15-09 | Phân quyền | Người dùng chỉ có vai trò Kế toán hoặc Người thuê | Thử lập hóa đơn | Bị từ chối | BR-02 |

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
| AC-22-04 | Timeout | Hóa đơn hạn 10/11/2026, đến 11/11 vẫn chưa trả đủ | Mở công nợ ngày 11/11 | Hóa đơn được đánh dấu **quá hạn**; người thuê nhận thông báo quá hạn (nếu US-32 đã có) | BR-27, BR-34; Q-50 |
| AC-22-05 | Conflict (hủy thanh toán) | P101 đã trả đủ; một thanh toán 2.000.000 đ bị hủy (Quản lý đã duyệt) | Mở công nợ | P101 xuất hiện lại với nợ 2.000.000 đ | BR-31 |
| AC-22-06 | Phân quyền | Người thuê phòng P101 | Thử xem công nợ toàn tòa hoặc của phòng khác | Bị từ chối; chỉ xem được hóa đơn của P101 (US-29) | BR-07 |

---

## 4. AC rút gọn cho các story Must còn lại

| Story | AC ID | Given / When | Then | Quy tắc |
|---|---|---|---|---|
| **US-01** Đăng nhập | AC-01-01 | Đăng nhập đúng tên và mật khẩu | Vào giao diện theo vai trò | BR-01, BR-02 |
| | AC-01-02 | Sai mật khẩu | "Tài khoản hoặc mật khẩu không chính xác" | BR-05 ([C9] TC2) |
| | AC-01-03 | Sai tên đăng nhập | Cùng thông báo như AC-01-02 | BR-05 ([C9] TC3) |
| | AC-01-04 | Người thuê có hợp đồng đã kết thúc đăng nhập | Bị từ chối vì tài khoản đã khóa | BR-04 |
| | AC-01-05 | Người dùng có 2 vai trò (Chủ nhà + Quản lý) đăng nhập | Thấy chức năng của **cả hai** vai trò | BR-02 |
| **US-02** Đổi mật khẩu | AC-02-01 | Nhập đúng mật khẩu cũ và mật khẩu mới hợp lệ | Đổi thành công; lần đăng nhập sau dùng mật khẩu mới | – |
| | AC-02-02 | Mật khẩu cũ sai | Không đổi; báo lỗi | – |
| **US-04** Tạo tài khoản nhân viên | AC-04-01 | Quản trị hệ thống tạo tài khoản, gán vai trò Quản lý + Kế toán | Tài khoản có cả hai vai trò | BR-02, BR-03 |
| | AC-04-02 | Tên đăng nhập đã tồn tại | Không tạo; báo lỗi | – |
| | AC-04-03 | Người dùng không có vai trò Quản trị hệ thống thử tạo tài khoản | Bị từ chối | BR-03 |
| **US-06** Quản lý phòng | AC-06-01 | Quản lý thêm phòng đủ thông tin | Phòng ở trạng thái **trống** | BR-10 |
| | AC-06-02 | Mã phòng đã tồn tại | Không lưu; báo lỗi | BR-10 |
| | AC-06-03 | Phòng đang có hợp đồng hiệu lực, Quản lý đổi trạng thái sang trống | Bị từ chối | BR-11 |
| **US-07** Tạo hợp đồng | AC-07-01 | Phòng trống; Quản lý nhập đủ thông tin hợp đồng và người đứng tên | Phòng chuyển **đang thuê**; người đứng tên có tài khoản người thuê | BR-03, BR-12, BR-13 |
| | AC-07-02 | Phòng đã có hợp đồng hiệu lực | Không tạo hợp đồng thứ hai | BR-11 |
| | AC-07-03 | Ngày kết thúc trước ngày bắt đầu | Không lưu; báo lỗi | BR-12 |
| | AC-07-04 | Người đứng tên thiếu một trong các trường bắt buộc (họ tên, ngày sinh, quê quán, CCCD) | Không lưu; chỉ rõ trường thiếu | BR-14 |
| **US-08** Người ở | AC-08-01 | Quản lý thêm người ở đủ trường bắt buộc | Người ở được thêm vào phòng; được tính từ kỳ sau | BR-14, BR-19 |
| | AC-08-02 | Thiếu CCCD | Không lưu; chỉ rõ trường thiếu | BR-14 |
| | AC-08-03 | Kế toán mở danh sách người ở | **Không thấy** CCCD và thông tin cá nhân khác | BR-08, BR-09 |
| | AC-08-04 | Quản lý ghi nhận người rời đi ngày 20/11 | Kỳ 12 không tính người đó | BR-19, Q-49 |
| **US-13** Bảng giá | AC-13-01 | Chủ nhà thêm giá điện mới, hiệu lực 01/12/2026 | Kỳ 11 dùng giá cũ, kỳ 12 dùng giá mới | BR-18, BR-19 |
| | AC-13-02 | Tên khoản thu để trống | "**Hãy nhập vào 1 tên khoản thu hợp lệ!**" | BR-24 ([C9] Bảng 9-5) |
| | AC-13-03 | Đơn giá trống hoặc không phải số hợp lệ | "**Hãy nhập vào số tiền hợp lệ!**" | BR-24 ([C9] Bảng 9-5) |
| | AC-13-04 | Người không có vai trò Chủ nhà thử sửa bảng giá | Bị từ chối | BR-18 |
| **US-14** Chỉ số điện nước | AC-14-01 | Quản lý nhập chỉ số mới lớn hơn hoặc bằng chỉ số cũ | Lưu; dùng cho hóa đơn kỳ đó | BR-17 |
| | AC-14-02 | Chỉ số mới nhỏ hơn chỉ số cũ | Không lưu (mặc định tạm) | Q-51 |
| | AC-14-03 | Sửa chỉ số khi hóa đơn kỳ đó đã phát hành | Bị từ chối; phải dùng phiếu điều chỉnh | Q-51, BR-25 |
| **US-23** Doanh thu theo tháng | AC-23-01 | Tháng 11 có các thanh toán hợp lệ tổng 50.000.000 đ, và một thanh toán đã hủy 2.000.000 đ | Chủ nhà xem doanh thu tháng 11 | Hiển thị **50.000.000 đ** (không tính thanh toán đã hủy). Mặc định tạm: doanh thu = **tiền thực thu** trong tháng | BR-31, BR-35; **Q-59** |
| | AC-23-02 | Tháng chưa có thanh toán | Xem doanh thu | Hiển thị 0 đ | – |
| **US-29** Người thuê xem hóa đơn | AC-29-01 | Người thuê phòng P101 đăng nhập | Thấy hóa đơn, trạng thái, lịch sử thanh toán của **P101** | BR-07 |
| | AC-29-02 | Người thuê P101 thử mở hóa đơn của P102 (kể cả bằng đường dẫn trực tiếp) | Bị từ chối | BR-07 |
| | AC-29-03 | Người thuê xem danh sách người ở cùng phòng | **Không thấy** CCCD của người khác | BR-09 |

---

## 5. Human Checkpoint

| Việc cần làm | Kết quả |
|---|---|
| Rà soát AC | *Chờ nhóm* |
| AC kiểm thử, quan sát được | Đạt: mọi *Then* là trạng thái, con số, thông báo hoặc quyền truy cập cụ thể |
| Đánh dấu AC phụ thuộc mặc định tạm | AC-15-02 (hướng làm tròn), AC-15-04, AC-15-08, AC-18-06, AC-18-09, AC-22-04, AC-08-04, AC-14-02, AC-14-03, AC-23-01 |
| Test case Chương 9 được giữ lại | AC-01-02, AC-01-03, AC-13-02, AC-13-03, AC-18-04, AC-18-05 |
| Phê duyệt trước khi thiết kế | *Chờ nhóm* |
