# Bước 6 – Prioritization (MoSCoW)

> Template WB-4, Bước 6. **v0.2 – 27/10/2026**, theo bài toán chung cư mini cho thuê.
> Nhóm đã đồng ý **danh sách MVP** khi chốt câu trả lời ngày 27/10/2026. Mức ưu tiên của các story Should, Could sẽ được xác nhận ở buổi Planning của từng sprint.
> **Story point đề xuất**: S = 2, M = 5, L = 8. Nhóm ước lượng lại bằng Planning Poker.

---

## 1. Prioritized Backlog

| User Story | AI đề xuất | Human quyết định | Lý do | Phụ thuộc | SP |
|---|---|---|---|---|---|
| US-01 Đăng nhập | **Must** | Đồng ý MVP (27/10) | Luồng (1) của học phần; mọi chức năng cần đăng nhập | – | 2 |
| US-02 Đổi mật khẩu | **Must** | Đồng ý MVP (27/10) | Bảo mật cơ bản cho ứng dụng truy cập từ internet | US-01 | 2 |
| US-03 Cập nhật thông tin cá nhân | Should | | Hữu ích, không chặn luồng chính | US-01 | 2 |
| US-04 Tạo tài khoản nhân viên, gán vai trò | **Must** | Đồng ý MVP (27/10) | Không có tự đăng ký (BR-03) | US-01 | 5 |
| US-05 Quản lý đặt lại mật khẩu | Should | | Có thể tạm để Quản trị hệ thống làm trực tiếp | US-04 | 2 |
| US-06 Quản lý phòng | **Must** | Đồng ý MVP (27/10) | Nền tảng của mọi nghiệp vụ | US-01 | 5 |
| US-07 Tạo hợp đồng + tài khoản người thuê | **Must** | Đồng ý MVP (27/10) | Hóa đơn gắn với hợp đồng (BR-21) | US-06, US-08 | 8 |
| US-08 Quản lý người ở | **Must** | Đồng ý MVP (27/10) | Tính phí theo người | US-06 | 5 |
| US-09 Kết thúc hợp đồng | Should | | Cần cho vòng đời thật, nhưng demo không bắt buộc | US-07; Q-48 | 5 |
| US-10 Yêu cầu thay đổi người ở | Should | | Có thể để Quản lý sửa trực tiếp trong MVP | US-08 | 5 |
| US-11 Trạng thái khai báo tạm trú | Could | | Một trường trạng thái, giá trị nghiệp vụ thấp với demo | US-08 | 2 |
| US-12 Xuất danh sách người ở | Could | | Dùng khi cần | US-08 | 2 |
| US-13 Bảng giá có hiệu lực | **Must** | Đồng ý MVP (27/10) | Luồng (2) "Tạo khoản thu"; giữ test case Chương 9 | US-01 | 5 |
| US-14 Ghi chỉ số điện nước | **Must** | Đồng ý MVP (27/10) | Cần cho tiền điện, nước | US-06, US-13 | 5 |
| US-15 Lập hóa đơn tháng | **Must** | Đồng ý MVP (27/10) | Giá trị cao nhất (G1); luồng (2) | US-07, US-08, US-13, US-14 | 8 |
| US-16 Khoản phát sinh | Should | | Linh hoạt nhưng không bắt buộc | US-15 | 2 |
| US-17 Phiếu điều chỉnh có duyệt | Should | | Cần cho minh bạch (G5), nhưng demo lõi chạy được khi chưa có | US-15 | 5 |
| US-18 Ghi nhận thanh toán | **Must** | Đồng ý MVP (27/10) | Luồng (3) "Thu phí" | US-15 | 5 |
| US-19 Biên lai | Should | | Chứng từ; cách làm đơn giản nhất là trang xem hoặc in | US-18 | 2 |
| US-20 Yêu cầu hủy thanh toán có duyệt | Should | | Sửa sai minh bạch | US-18 | 5 |
| US-21 Đóng trước nhiều kỳ | Could | | Chưa quyết định cách làm (Q-56) | US-18 | 5 |
| US-22 Công nợ theo phòng | **Must** | Đồng ý MVP (27/10) | Luồng (4) "Thống kê"; mục tiêu G2 | US-18 | 5 |
| US-23 Doanh thu theo tháng | **Must** | Đồng ý MVP (27/10) | Luồng (4); mục tiêu G4 | US-18 | 2 |
| US-24 Khoản chi | Should | | Cần cho lợi nhuận | US-01 | 2 |
| US-25 Thu – chi – lợi nhuận | Should | | Giá trị cao cho Chủ nhà, sau MVP | US-23, US-24 | 5 |
| US-26 Lấp đầy, phòng trống, hợp đồng sắp hết hạn | Should | | Tính từ dữ liệu sẵn có, chi phí thấp | US-06, US-07 | 2 |
| US-27 Tìm kiếm không dấu | Should | | Dữ liệu nhỏ; có thể tạm dùng bộ lọc | – | 2 |
| US-28 Xuất Excel | Could | | Tiện lợi | US-22, US-23 | 5 |
| US-29 Người thuê xem hóa đơn, lịch sử thanh toán | **Must** | Đồng ý MVP (27/10) | Quyết định Q-02; điểm khác biệt của sản phẩm | US-15, US-18 | 5 |
| US-30 Người thuê xem hợp đồng | Should | | Dễ làm khi đã có US-29 | US-07 | 2 |
| US-31 Yêu cầu sửa chữa, phản ánh | Should | | Tăng giá trị cổng người thuê | US-01 | 5 |
| US-32 Thông báo trong ứng dụng | Should | | Giảm nợ quá hạn; cần tác vụ định kỳ | US-15, US-22 | 5 |
| US-33 Xem nhật ký | Should | | Minh bạch (G5) | US-17, US-20 | 2 |
| US-34 Email | Could | | Phụ thuộc dịch vụ gửi mail | US-32 | 2 |
| US-35 Thanh toán trực tuyến | Won't | Đồng ý (Q-02) | Để phiên bản sau | – | 8 |
| US-36 Phạt trễ hạn | Won't | Đồng ý (Q-25) | Để phiên bản sau | – | 5 |
| US-37 SMS, Zalo | Won't | Đồng ý (Q-30) | Để phiên bản sau | – | 5 |

---

## 2. Tổng hợp

| Mức | Số story | Story point | Danh sách |
|---|---|---|---|
| **Must** | 13 | **62** | US-01, 02, 04, 06, 07, 08, 13, 14, 15, 18, 22, 23, 29 |
| Should | 16 | 53 | US-03, 05, 09, 10, 16, 17, 19, 20, 24, 25, 26, 27, 30, 31, 32, 33 |
| Could | 5 | 16 | US-11, 12, 21, 28, 34 |
| Won't | 3 | – | US-35, 36, 37 |
| **Tổng** | **37** | | |

---

## 3. MVP (dùng cho slide)

**Luồng demo**: Quản trị hệ thống tạo tài khoản → Quản lý tạo phòng → tạo hợp đồng và người ở → Chủ nhà thiết lập bảng giá → Quản lý ghi chỉ số, lập hóa đơn tháng → Kế toán ghi nhận thanh toán (có trả một phần) → xem công nợ, doanh thu → người thuê đăng nhập xem hóa đơn của mình.

**Phân bổ vào sprint lập trình** (chi tiết ở `03-project-plan/SprintPlan.md`)

| Sprint | Story | SP |
|---|---|---|
| Sprint 2 (tuần 12–13) | US-01, US-02, US-04, US-06, US-07, US-08, US-13 | 32 |
| Sprint 3 (tuần 14–15) | US-14, US-15, US-18, US-22, US-23, US-29 | 30 |
| Nếu kịp (Sprint 3–4) | US-19, US-30, US-32 (theo thứ tự) | 9 |

---

## 4. Thứ tự cắt giảm nếu chậm tiến độ

Lõi **không cắt**: US-01, US-06, US-07, US-08, US-13, US-15, US-18, US-22, US-29.

Nếu velocity Sprint 2 thấp, cắt hoặc thu gọn theo thứ tự:
1. US-23: chuyển sang mức Should (lấy tạm tổng thu từ màn hình công nợ).
2. US-02: chuyển sang mức Should.
3. US-04: thay bằng tài khoản tạo sẵn trong dữ liệu mẫu.
4. US-14: thu gọn thành nhập trực tiếp **số kWh, số khối** đã dùng thay vì nhập chỉ số (vẫn đúng BR-17 về kết quả tính tiền).

---

## 5. Câu hỏi thảo luận

| Câu hỏi | Ghi chú |
|---|---|
| AI và Human có chọn khác nhau không? | Nhóm đồng ý MVP do AI đề xuất. Điểm cần theo dõi: US-17 và US-20 (sửa sai minh bạch) đang xếp Should, dù mục tiêu G5 quan trọng |
| Quyết định nào AI khó tự xác định? | D-16 (không tự duyệt), D-17 (khóa tài khoản khi còn nợ), Q-56 (đóng trước nhiều kỳ). D-16, D-17 đã chốt ngày 09/11/2026 |
| Story nào AI đánh giá cao nhưng có thể chưa nên làm? | US-32 (thông báo): cần tác vụ định kỳ, tăng độ phức tạp hạ tầng |

---

## 6. Human Checkpoint

| Việc | Kết quả |
|---|---|
| Danh sách Must cho MVP | ☑ Nhóm đồng ý ngày 27/10/2026 |
| Mức Should, Could | ☐ Xác nhận ở Planning Sprint 2, Sprint 3 |
| Kế hoạch sprint | ☑ Cập nhật trong `03-project-plan/` |
