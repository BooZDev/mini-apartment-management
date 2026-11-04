# Bước 1 – Business Context và Business Problem Canvas

> Template WB-4, Bước 1 và mục 1 *Tổng quan hệ thống* của quy trình phân tích.
> **v0.2 – 27/10/2026**: viết lại theo bài toán mới mà nhóm đã chốt. Bản theo đề cũ (BlueMoon, Ban quản trị) nằm ở `doc/99-archive/v0.1-bluemoon-ban-quan-tri/`.

**Task goal**: hiểu bài toán nghiệp vụ của **phần mềm quản lý chung cư mini cho thuê**.

**Nguồn trong file này**
- **[QĐ Q-xx]**: quyết định của nhóm ngày 27/10/2026, ghi trong `RequirementClarification.md`. Đây là nguồn chính của bài toán mới.
- **[GT], [C4], [C6], [C9], [TLĐ], [PR01], [DCCT]**: tài liệu học phần (xem `doc/README.md`). Dùng cho phần bắt buộc của học phần: 4 luồng nghiệp vụ, test case, tài liệu bàn giao.

---

## 1. Business Context

### 1.1. Vì sao đổi bài toán

| Nội dung | Chi tiết |
|---|---|
| Đề gốc | Ban quản trị chung cư BlueMoon thu phí các hộ, quản lý hộ khẩu, nhân khẩu [GT] |
| Bài toán mới | Quản lý **một tòa chung cư mini cho thuê**: phòng, người thuê, hợp đồng, hóa đơn tháng, thanh toán, công nợ, chi phí, lợi nhuận, yêu cầu sửa chữa [QĐ Q-01, Q-09, Q-10] |
| Lý do | Bài tập lớn theo khuynh hướng việc làm, chủ đề tự chọn. Phần mềm quản lý nhà trọ / chung cư mini là sản phẩm có thật trên thị trường |
| Xác nhận | Giảng viên đồng ý đổi đề (nhóm xác nhận ngày 27/10/2026) |
| Phần giữ lại từ đề gốc | 4 luồng nghiệp vụ được chấm [GT][C9]: **Đăng nhập – Tạo khoản thu – Thu phí – Thống kê**, ánh xạ ở mục 1.6 |

### 1.2. Bối cảnh tổ chức

| Thông tin | Nội dung | Nguồn |
|---|---|---|
| Đối tượng | **Một tòa** chung cư mini cho thuê, chỉ có căn hộ mini (không có kiot, penthouse) | [QĐ Q-09, Q-10] |
| Tên tòa | Giữ tên **BlueMoon** cho thống nhất với tài liệu học phần | [Giả định] |
| Số phòng | Chưa xác định; dữ liệu mẫu dự kiến khoảng 20 phòng | [QĐ Q-39] |
| Người vận hành | Chủ nhà, Quản lý, Kế toán; một người có thể kiêm nhiều vai trò | [QĐ Q-01] |
| Khách hàng của tòa | Người thuê phòng: người đứng tên hợp đồng và người ở cùng | [QĐ Q-11] |

### 1.3. Quy trình hiện tại (as-is)

Nhóm quyết định **bắt đầu với dữ liệu mới** [QĐ Q-39]; tài liệu không mô tả quy trình đang chạy của tòa nhà. Bảng dưới là quy trình **điển hình** của một chung cư mini quản lý thủ công. Đây là **[Giả định]**, dùng để hiểu pain point, cần nhóm xác nhận.

| Bước | Cách làm thủ công (giả định) |
|---|---|
| 1. Cho thuê | Ký hợp đồng giấy, ghi người ở vào sổ hoặc Excel |
| 2. Cuối tháng | Đi ghi chỉ số điện, nước từng phòng; tính tiền bằng tay hoặc Excel; nhắn tin báo tiền cho từng phòng |
| 3. Thu tiền | Nhận tiền mặt hoặc chuyển khoản, đánh dấu vào sổ |
| 4. Đối soát | Đối chiếu sao kê ngân hàng với sổ; tìm phòng còn nợ |
| 5. Báo cáo | Chủ nhà tự cộng doanh thu, chi phí để biết lãi lỗ |
| 6. Sự cố | Người thuê gọi điện hoặc nhắn tin báo hỏng; dễ bị quên |

### 1.4. Pain point

| # | Pain point | Căn cứ |
|---|---|---|
| P1 | Quản lý thủ công, Excel: hiệu quả thấp | [GT] (đề gốc), áp dụng tương tự |
| P2 | Tính tiền điện, nước, dịch vụ theo người dễ sai, mất thời gian mỗi tháng | [Giả định] suy từ [QĐ Q-12] |
| P3 | Khó biết phòng nào còn nợ, nợ bao nhiêu, quá hạn bao lâu | [Giả định] suy từ [QĐ Q-26] |
| P4 | Người thuê không tự tra được hóa đơn, lịch sử thanh toán, hợp đồng | [Giả định] suy từ [QĐ Q-02] |
| P5 | Chủ nhà không có số liệu doanh thu, chi phí, lợi nhuận tức thời | [Giả định] suy từ [QĐ Q-01] |
| P6 | Sửa tay số liệu tiền không để lại dấu vết | [Giả định] suy từ [QĐ Q-19, Q-24] |
| P7 | Yêu cầu sửa chữa, phản ánh bị thất lạc | [Giả định] suy từ [QĐ Q-01] |
| P8 | Người dùng chưa quen phần mềm, cần giao diện đơn giản | [TLĐ] (persona), áp dụng tương tự |

### 1.5. Stakeholder

| Stakeholder | Vai trò với hệ thống | Nhu cầu chính | Nguồn |
|---|---|---|---|
| **Chủ nhà** | Người dùng, người ra quyết định | Doanh thu, chi phí, lợi nhuận, công nợ; thiết lập bảng giá | [QĐ Q-01, Q-13] |
| **Quản lý** | Người dùng vận hành chính | Phòng, người ở, hợp đồng, hóa đơn, xử lý yêu cầu, duyệt điều chỉnh | [QĐ Q-01, Q-24] |
| **Kế toán** | Người dùng tài chính | Ghi nhận thanh toán, hóa đơn, khoản chi, công nợ | [QĐ Q-01, Q-05] |
| **Người thuê** | Người dùng ngoài, truy cập từ xa | Xem hợp đồng, hóa đơn, lịch sử thanh toán; gửi yêu cầu | [QĐ Q-01, Q-02] |
| **Quản trị hệ thống** | Người dùng kỹ thuật | Tài khoản, phân quyền, cấu hình | [QĐ Q-01] |
| Cơ quan công an địa phương | Bên ngoài | Thông tin khai báo tạm trú của người thuê (khi cần) | [QĐ Q-33, Q-34] |
| Nhóm sinh viên, giảng viên | Phát triển, đánh giá | Hoàn thành bài tập lớn, báo cáo, bảo vệ | [DCCT] |

### 1.6. Ánh xạ 4 luồng nghiệp vụ của đề gốc

| Luồng của đề gốc [GT] | Trong bài toán mới | Test case Chương 9 [C9] dùng lại |
|---|---|---|
| 1. Đăng nhập / Đăng ký tài khoản | Đăng nhập; tài khoản do Quản trị hệ thống và Quản lý cấp (không có tự đăng ký) [QĐ Q-06] | Bảng 9-4: đăng nhập đúng, sai mật khẩu, sai tên |
| 2. Tạo khoản thu | Thiết lập **bảng giá** khoản thu và **lập hóa đơn tháng** cho các phòng | Bảng 9-5: kiểm tra tên khoản thu, đơn giá (mã do hệ thống tự sinh [QĐ Q-20]) |
| 3. Thu phí | **Ghi nhận thanh toán** cho hóa đơn | Bảng 9-8: thiếu hóa đơn hoặc người nộp; hóa đơn đã thanh toán đủ |
| 4. Thống kê các khoản đóng góp | **Thống kê khoản thu và công nợ**; doanh thu theo tháng [QĐ Q-28, Q-37] | – |

### 1.7. Mục tiêu nghiệp vụ

| # | Mục tiêu | Căn cứ |
|---|---|---|
| G1 | Lập hóa đơn tháng cho **cả tòa** nhanh, đúng, theo bảng giá và chỉ số điện nước | [QĐ Q-12…Q-17, Q-46] |
| G2 | Biết ngay **công nợ** từng phòng, phòng nào quá hạn | [QĐ Q-21, Q-26] |
| G3 | Người thuê **tự xem** hóa đơn, hợp đồng, lịch sử thanh toán; gửi yêu cầu trực tuyến | [QĐ Q-02] |
| G4 | Chủ nhà có số liệu **doanh thu, chi phí, lợi nhuận, lấp đầy** | [QĐ Q-01, Q-35, Q-37] |
| G5 | Dữ liệu tiền **minh bạch**: không sửa, xóa ngầm; mọi điều chỉnh đều có duyệt và nhật ký | [QĐ Q-19, Q-24] |

### 1.8. Phạm vi

**Trong phạm vi MVP (Must)**: đăng nhập, phân quyền 5 vai trò; phòng; người ở; hợp đồng cơ bản; bảng giá; ghi chỉ số điện nước; lập hóa đơn tháng; ghi nhận thanh toán (cho trả một phần); công nợ; doanh thu theo tháng; người thuê xem hóa đơn và lịch sử thanh toán.

**Trong phạm vi nhưng sau MVP (Should / Could)**: phiếu điều chỉnh và yêu cầu hủy thanh toán có duyệt; khoản chi và báo cáo lợi nhuận; yêu cầu sửa chữa, phản ánh; thông báo trong ứng dụng; nhật ký; tỷ lệ lấp đầy; tìm kiếm không dấu; xuất Excel; email.

**Ngoài phạm vi phiên bản này** [QĐ]: thanh toán trực tuyến (Q-02, Q-23); phí phạt trễ hạn (Q-25); SMS, Zalo (Q-30); khoản đóng góp tự nguyện (Q-27); nhiều tòa nhà (Q-09); nhập dữ liệu cũ (Q-39).

### 1.9. Ràng buộc

| Loại | Ràng buộc | Nguồn |
|---|---|---|
| Nền tảng | Ứng dụng **web**: Next.js + NestJS + PostgreSQL (TypeScript); truy cập từ xa; tương thích điện thoại | [QĐ Q-41, Q-42] |
| Triển khai | Có bản triển khai thật; CI chạy kiểm thử tự động | [QĐ Q-41, Q-46] |
| Thời gian | Tuần 9 → hạn nộp cuối tuần 16 (20/12/2026); Sprint 1 không viết mã | [QĐ Q-47] |
| Nhân lực | 8 thành viên, phần lớn chưa biết lập trình | Nhóm cung cấp |
| Quy trình | Agile/Scrum | [PR01] |
| Học phần | Giữ 4 luồng nghiệp vụ và test case Chương 9; báo cáo, bảo vệ tại lớp | [GT][C9][DCCT] |
| Dữ liệu cá nhân | Chỉ Quản lý xem CCCD; có nhật ký | [QĐ Q-05, Q-45] |

### 1.10. Tiêu chí thành công [QĐ Q-46]

1. Demo trọn luồng: tạo phòng → hợp đồng → hóa đơn → thanh toán → công nợ.
2. Lập hóa đơn tháng cho cả tòa trong dưới 10 phút.
3. Toàn bộ test case Chương 9 (đã ánh xạ ở mục 1.6) đều đạt.
4. Có bản triển khai thật trên internet.

---

## 2. Giả định đang sử dụng

| ID | Giả định | Ảnh hưởng nếu sai |
|---|---|---|
| A-01 | Quy trình as-is ở mục 1.3 phản ánh đúng cách quản lý chung cư mini thủ công | Pain point có thể sai trọng tâm |
| A-02 | Giữ tên tòa BlueMoon | Chỉ ảnh hưởng tên gọi |
| A-03 | Quy mô khoảng 20 phòng, dưới 50 người dùng đồng thời | Yêu cầu hiệu năng |
| A-04 | Các câu Q-48…Q-60 dùng **mặc định tạm** cho tới khi nhóm quyết định trong sprint | Có thể phải sửa hóa đơn, thanh toán, hợp đồng |

---

## 3. Business Problem Canvas

| Nội dung | Kết quả |
|---|---|
| **Business Problem** | Chủ chung cư mini quản lý phòng, hợp đồng, tiền phòng, điện nước và công nợ bằng tay hoặc Excel: tốn thời gian, dễ sai, thiếu minh bạch; người thuê không tự tra được thông tin |
| **Pain Points** | P2 tính tiền hằng tháng dễ sai; P3 khó theo dõi công nợ; P4 người thuê không tự tra cứu được; P5 thiếu số liệu lãi lỗ; P6 sửa tiền không dấu vết |
| **Business Goal** | G1 lập hóa đơn nhanh và đúng; G2 công nợ tức thời; G3 cổng người thuê; G4 báo cáo cho chủ nhà; G5 dữ liệu tiền minh bạch |
| **Stakeholders** | Chủ nhà, Quản lý, Kế toán, Người thuê, Quản trị hệ thống; (ngoài) công an địa phương; nhóm và giảng viên |
| **Expected Value** | Giảm thời gian lập hóa đơn hằng tháng; giảm nợ quá hạn; người thuê tự phục vụ; chủ nhà thấy lãi lỗ; truy vết được mọi thay đổi về tiền |
| **In Scope** | MVP ở mục 1.8: tài khoản, phòng, người ở, hợp đồng, bảng giá, chỉ số, hóa đơn, thanh toán, công nợ, doanh thu, cổng người thuê |
| **Out of Scope** | Thanh toán trực tuyến, phạt trễ hạn, SMS/Zalo, đóng góp tự nguyện, nhiều tòa, nhập dữ liệu cũ |
| **Constraints** | Web Next.js + NestJS + PostgreSQL; 8 tuần, 4 tuần lập trình; nhóm mới học lập trình; giữ 4 luồng và test case của học phần |
| **Success Criteria** | Mục 1.10 |

---

## 4. Human Checkpoint

| Câu hỏi | Kết quả |
|---|---|
| Business Context đã phản ánh đúng bài toán chưa? | Theo quyết định ngày 27/10/2026. *Nhóm xác nhận lại quy trình as-is (A-01)* |
| Có thông tin nghiệp vụ quan trọng bị bỏ sót không? | Các điểm chưa quyết định đã đưa vào Q-48…Q-60 (để sau) |
| Có giả định cần xác nhận không? | A-01…A-04 |
| Canvas đủ để chuyển sang User Story chưa? | **Đủ** |
