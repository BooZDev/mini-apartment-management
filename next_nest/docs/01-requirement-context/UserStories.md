# Bước 3 – User Story Backlog

> Template WB-4, Bước 3. **v0.2 – 27/10/2026**, theo bài toán chung cư mini cho thuê.
> Cấu trúc: **Là** [vai trò] – **Tôi muốn** [khả năng] – **Để** [giá trị]. Mỗi story có một mục tiêu, không chứa giải pháp kỹ thuật, và dẫn về quy tắc nghiệp vụ (BR) hoặc quyết định (QĐ).

**Vai trò** [QĐ Q-01]: **QT** Quản trị hệ thống · **CN** Chủ nhà · **QL** Quản lý · **KT** Kế toán · **NT** Người thuê. Một người có thể giữ nhiều vai trò (BR-02).

---

## 1. Backlog

### 1.1. Tài khoản, phân quyền

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-01 | Mọi vai trò | Là người dùng, tôi muốn **đăng nhập**, để dùng đúng các chức năng của vai trò mình | Bảo vệ dữ liệu tài chính, dữ liệu cá nhân | BR-01, BR-02, BR-05 | – |
| US-02 | Mọi vai trò | Là người dùng, tôi muốn **đổi mật khẩu**, để giữ an toàn tài khoản | Bảo mật | [GT] | – |
| US-03 | Mọi vai trò | Là người dùng, tôi muốn **cập nhật thông tin cá nhân** (SĐT, email), để được liên lạc đúng | Liên lạc | [GT] | – |
| US-04 | QT | Là quản trị hệ thống, tôi muốn **tạo tài khoản nhân viên và gán một hoặc nhiều vai trò**, để mỗi người chỉ làm phần việc của mình | Phân tách trách nhiệm | BR-02, BR-03 | – |
| US-05 | QL | Là quản lý, tôi muốn **đặt lại mật khẩu** cho người dùng quên mật khẩu, để họ dùng lại được | Giảm gián đoạn | BR-06 | – |

### 1.2. Phòng, người ở, hợp đồng

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-06 | QL | Là quản lý, tôi muốn **quản lý danh sách phòng** (mã, tầng, diện tích, giá niêm yết, trạng thái), để biết phòng nào đang trống | Nền tảng của mọi nghiệp vụ | BR-10 | – |
| US-07 | QL | Là quản lý, tôi muốn **tạo hợp đồng thuê** cho một phòng **và cấp tài khoản cho người đứng tên**, để bắt đầu tính tiền và cho người thuê tra cứu | Khởi đầu vòng đời thuê | BR-03, BR-11, BR-12, BR-13 | Q-53 |
| US-08 | QL | Là quản lý, tôi muốn **quản lý danh sách người ở** của phòng, để tính đúng các khoản theo người và nắm ai đang ở | Tính phí theo người, quản lý cư trú | BR-09, BR-14, BR-21 | – |
| US-09 | QL | Là quản lý, tôi muốn **kết thúc hợp đồng**, để phòng trở về trạng thái trống và tài khoản người thuê bị khóa | Đóng vòng đời thuê | BR-04, BR-11 | **Q-48** (tiền cọc), Q-53 |
| US-10 | NT, QL | Là người thuê, tôi muốn **gửi yêu cầu thay đổi người ở** để quản lý duyệt, để thông tin phòng luôn đúng | Dữ liệu người ở chính xác | BR-07, BR-15 | – |
| US-11 | QL | Là quản lý, tôi muốn **ghi nhận tình trạng khai báo tạm trú** của từng người ở, để biết ai chưa khai báo | Tuân thủ quy định cư trú | BR-16 | – |
| US-12 | QL | Là quản lý, tôi muốn **xuất danh sách người ở**, để khai báo tạm trú khi cần | Tiết kiệm thời gian | BR-09, BR-36 | – |

### 1.3. Khoản thu, chỉ số, hóa đơn

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-13 | CN | Là chủ nhà, tôi muốn **thiết lập bảng giá các khoản thu, có ngày hiệu lực**, để hóa đơn luôn tính đúng giá hiện hành | Luồng (2) "Tạo khoản thu" | BR-17, BR-18, BR-19, BR-24 | Q-52 |
| US-14 | QL | Là quản lý, tôi muốn **ghi chỉ số điện, nước hằng tháng** cho từng phòng, để tính tiền điện nước | Tính đúng tiền điện nước | BR-17 | **Q-51** |
| US-15 | QL | Là quản lý, tôi muốn **lập hóa đơn tháng cho tất cả phòng đang thuê** trong một lần, xem trước rồi phát hành, để không phải tính tay từng phòng | Mục tiêu G1; luồng (2) | BR-19…BR-23 | **Q-49, Q-50** |
| US-16 | QL | Là quản lý, tôi muốn **thêm khoản phát sinh** vào hóa đơn trước khi phát hành, để thu các khoản ngoài bảng giá | Linh hoạt | BR-17 | Q-55 |
| US-17 | KT, QL | Là kế toán, tôi muốn **lập phiếu điều chỉnh** cho hóa đơn đã phát hành để quản lý duyệt, để sửa sai mà vẫn minh bạch | Mục tiêu G5 | BR-25, BR-36 | – |

### 1.4. Thanh toán

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-18 | KT | Là kế toán, tôi muốn **ghi nhận thanh toán** (một phần hoặc toàn bộ, tiền mặt hoặc chuyển khoản) cho một hóa đơn, để công nợ luôn đúng | Luồng (3) "Thu phí"; mục tiêu G2 | BR-27…BR-30, BR-33 | **Q-57** |
| US-19 | KT, NT | Là kế toán hoặc người thuê, tôi muốn **xem và in biên lai**, để có chứng từ thanh toán | Minh bạch | BR-29 | Q-58 |
| US-20 | KT, QL | Là kế toán, tôi muốn **gửi yêu cầu hủy một thanh toán ghi sai** để quản lý duyệt, để sửa sai mà không mất dấu vết | Mục tiêu G5 | BR-31, BR-36 | – |
| US-21 | KT | Là kế toán, tôi muốn **ghi nhận tiền phòng đóng trước nhiều kỳ**, để người thuê trả trước được | Tiện cho người thuê | BR-26 | **Q-56** |

### 1.5. Công nợ, thu chi, báo cáo

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-22 | KT | Là kế toán, tôi muốn **xem công nợ theo phòng**, gồm các hóa đơn quá hạn, để đôn đốc thu | Luồng (4) "Thống kê"; mục tiêu G2 | BR-27, BR-32, BR-35 | Q-50 |
| US-23 | CN | Là chủ nhà, tôi muốn **xem doanh thu theo tháng**, để biết tình hình kinh doanh | Mục tiêu G4; luồng (4) | BR-35 | – |
| US-24 | KT | Là kế toán, tôi muốn **ghi nhận khoản chi** của tòa nhà, để tính được lợi nhuận | Mục tiêu G4 | BR-35 | Q-54 |
| US-25 | CN | Là chủ nhà, tôi muốn **xem báo cáo thu – chi – lợi nhuận**, để đánh giá hiệu quả cho thuê | Mục tiêu G4 | BR-35 | Q-54 |
| US-26 | CN, QL | Là chủ nhà, tôi muốn **xem tỷ lệ lấp đầy, phòng trống và hợp đồng sắp hết hạn**, để chủ động tìm khách | Giảm phòng trống | BR-35 | – |
| US-27 | QL, KT | Là quản lý hoặc kế toán, tôi muốn **tìm kiếm** theo mã phòng, tên người thuê (gõ không dấu cũng tìm được), SĐT, mã hóa đơn, để tra cứu nhanh | Tiết kiệm thời gian | [QĐ Q-38] | – |
| US-28 | CN, KT | Là chủ nhà hoặc kế toán, tôi muốn **xuất báo cáo ra Excel**, để lưu trữ và chia sẻ | Tiện lợi | [QĐ Q-37] | – |

### 1.6. Cổng người thuê

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-29 | NT | Là người thuê, tôi muốn **xem hóa đơn và lịch sử thanh toán của phòng mình**, để biết còn phải trả bao nhiêu | Mục tiêu G3 | BR-07, BR-27 | – |
| US-30 | NT | Là người thuê, tôi muốn **xem hợp đồng của mình**, để nắm điều khoản và ngày hết hạn | Mục tiêu G3 | BR-07, BR-12 | – |
| US-31 | NT, QL | Là người thuê, tôi muốn **gửi yêu cầu sửa chữa hoặc phản ánh** và theo dõi trạng thái, để sự cố được xử lý | Mục tiêu G3, pain point P7 | BR-07 | Q-55 |

### 1.7. Thông báo, nhật ký

| ID | Actor | User Story | Business Value | Nguồn | Phụ thuộc / câu hỏi để sau |
|---|---|---|---|---|---|
| US-32 | NT (và nhân viên) | Là người thuê, tôi muốn **nhận thông báo trong ứng dụng** khi có hóa đơn mới, sắp hạn, quá hạn, hoặc yêu cầu đã được xử lý, để không bỏ lỡ | Giảm nợ quá hạn | BR-32, BR-34 | Q-50 |
| US-33 | CN | Là chủ nhà, tôi muốn **xem nhật ký** các thao tác về tiền và việc xem, xuất dữ liệu cá nhân, để kiểm soát | Mục tiêu G5 | BR-36 | – |
| US-34 | NT | Là người thuê, tôi muốn **nhận thông báo qua email** (nếu có email), để biết cả khi không mở ứng dụng | Tiện lợi | BR-34 | – |

### 1.8. Để phiên bản sau

| ID | Actor | User Story | Lý do để sau |
|---|---|---|---|
| US-35 | NT | Là người thuê, tôi muốn **thanh toán trực tuyến** | [QĐ Q-02, Q-23] |
| US-36 | CN | Là chủ nhà, tôi muốn **tự động tính phí phạt trễ hạn** | [QĐ Q-25] |
| US-37 | NT | Là người thuê, tôi muốn **nhận thông báo qua SMS hoặc Zalo** | [QĐ Q-30] |

---

## 2. Nhận xét

- **Ánh xạ 4 luồng của học phần**: Đăng nhập (US-01); Tạo khoản thu (US-13, US-15); Thu phí (US-18); Thống kê (US-22, US-23).
- **Story lớn nhất**: US-15 (lập hóa đơn tháng) gom bảng giá, chỉ số, số người ở, làm tròn. Nên làm sau khi US-06, US-07, US-08, US-13, US-14 đã xong.
- **Yêu cầu và duyệt** xuất hiện ở 4 story: US-10, US-17, US-20, US-31. Nên phân tích chung một mô hình "yêu cầu – duyệt" (xem `02-system-analysis/03-UseCasesAndFlows.md`).
- **Số lượng**: 34 story trong phạm vi (US-01…US-34), 3 story để phiên bản sau (US-35…US-37).

---

## 3. Human Checkpoint

| Tiêu chí | AI tự kiểm | Nhóm xác nhận |
|---|---|---|
| Actor rõ ràng | Đạt: 5 vai trò theo Q-01 | ☐ |
| Không trộn với giải pháp kỹ thuật | Đạt | ☐ |
| Có giá trị nghiệp vụ | Đạt | ☐ |
| Không chứa quy tắc chưa quyết định | Đạt: các điểm chưa quyết định ghi Q-48…Q-60 (có mặc định tạm) | ☐ |
| Phát triển, kiểm thử độc lập được | Đạt một phần: chuỗi phụ thuộc US-06 → US-07 → US-15 → US-18 → US-22 | ☐ |
| Không trùng lặp | Đạt | ☐ |
| Phù hợp phạm vi phiên bản | Đạt: US-35…US-37 để sau | ☐ |
