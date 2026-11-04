# Business Rules – Quy tắc nghiệp vụ

**Trạng thái**

| Trạng thái | Ý nghĩa |
|---|---|
| **Đã chốt** | Nhóm đã quyết định |
| **Mặc định tạm** | Dùng cho MVP tới khi nhóm trả lời câu hỏi để sau (Q-48…Q-60) |

---

## 1. Quy tắc

### 1.1. Tài khoản, phân quyền

| ID | Quy tắc | Nguồn | Trạng thái |
|---|---|---|---|
| BR-01 | Mọi chức năng chỉ dùng được sau khi đăng nhập | [GT] | Đã chốt |
| BR-02 | Có 5 vai trò: **Quản trị hệ thống, Chủ nhà, Quản lý, Kế toán, Người thuê**; một người có thể giữ **nhiều vai trò** | [QĐ Q-01] | Đã chốt |
| BR-03 | **Không có tự đăng ký.** Quản trị hệ thống tạo tài khoản nhân viên; Quản lý tạo tài khoản người thuê khi ký hợp đồng | [QĐ Q-06] | Đã chốt |
| BR-04 | Tài khoản người thuê bị **khóa** khi hợp đồng kết thúc | [QĐ Q-06] | Đã chốt |
| BR-05 | Sai tên đăng nhập **hoặc** sai mật khẩu đều trả **cùng một** thông báo "Tài khoản hoặc mật khẩu không chính xác" | [C9] | Đã chốt |
| BR-06 | Quên mật khẩu: Quản lý đặt lại; đặt lại qua email (Could) chỉ khi người dùng có email | [QĐ Q-07] | Đã chốt |
| BR-07 | Người thuê **chỉ xem** dữ liệu tài chính của phòng mình; **được gửi** yêu cầu sửa chữa, phản ánh, thay đổi người ở | [QĐ Q-02, Q-06, Q-32] | Đã chốt |
| BR-08 | Kế toán chỉ truy cập dữ liệu tài chính; chỉ thấy tên người thuê và số phòng | [QĐ Q-05] | Đã chốt |
| BR-09 | **Chỉ Quản lý** xem CCCD và thông tin cá nhân; Chủ nhà xem số liệu tổng hợp | [QĐ Q-45] | Đã chốt |

### 1.2. Phòng, người ở, hợp đồng

| ID | Quy tắc | Nguồn | Trạng thái |
|---|---|---|---|
| BR-10 | Hệ thống quản lý **một tòa**. Phòng có mã phòng, tầng, diện tích, giá niêm yết, trạng thái (**trống / đang thuê / bảo trì**) | [QĐ Q-09, Q-10] | Đã chốt |
| BR-11 | Một phòng tại một thời điểm có **tối đa một hợp đồng hiệu lực** | [QĐ Q-09] | Đã chốt |
| BR-12 | Hợp đồng gồm: phòng, người đứng tên, ngày bắt đầu, ngày kết thúc, tiền cọc, giá thuê | [QĐ Q-01; đề xuất được chấp nhận] | Đã chốt |
| BR-13 | **Người đứng tên hợp đồng** chịu trách nhiệm thanh toán; người ở cùng được ghi trong danh sách người ở của phòng | [QĐ Q-11] | Đã chốt |
| BR-14 | Thông tin người ở: họ tên, ngày sinh, giới tính, quê quán, SĐT, CCCD, quan hệ với người đứng tên, ngày vào ở, ngày rời đi, ghi chú. **Bắt buộc**: họ tên, ngày sinh, quê quán, CCCD | [QĐ Q-31] | Đã chốt |
| BR-15 | Người thuê gửi yêu cầu thay đổi người ở (thêm người, người rời đi, sửa thông tin); **Quản lý duyệt** | [QĐ Q-32] | Đã chốt |
| BR-16 | Hệ thống chỉ **ghi nhận** tình trạng khai báo tạm trú, không cấp | [QĐ Q-33] | Đã chốt |

### 1.3. Khoản thu, bảng giá, hóa đơn

| ID | Quy tắc | Nguồn | Trạng thái |
|---|---|---|---|
| BR-17 | Danh mục khoản thu và cách tính: **tiền phòng** (theo hợp đồng); **điện** (chỉ số công tơ × đơn giá); **nước** (theo khối hoặc theo người); **dịch vụ** (theo phòng hoặc theo người); **gửi xe** (theo xe); **phát sinh** (nhập tay) | [QĐ Q-12, Q-40] | Đã chốt |
| BR-18 | **Chủ nhà** thiết lập bảng giá; mỗi mức giá có **ngày bắt đầu hiệu lực** | [QĐ Q-13] | Đã chốt |
| BR-19 | Đơn giá và số người ở được **chốt theo thời điểm hiệu lực**. Hóa đơn đã phát hành **không đổi**; thay đổi chỉ áp dụng từ kỳ sau | [QĐ Q-17] | Đã chốt |
| BR-20 | **Khoản thu** là loại phí; **kỳ hóa đơn** (đợt thu) là theo **tháng**, có **hạn thanh toán** | [QĐ Q-14, Q-18] | Đã chốt |
| BR-21 | Hóa đơn lập **theo phòng**, gắn với hợp đồng hiệu lực; khoản tính theo người dùng **số người đang ở** trong phòng | [QĐ Q-08] | Đã chốt |
| BR-22 | Tính chính xác đến đồng; **tổng hóa đơn làm tròn đến 1.000 đ** | [QĐ Q-15] | Đã chốt |
| BR-23 | Mã hóa đơn do hệ thống **tự sinh** | [QĐ Q-20] | Đã chốt |
| BR-24 | Kiểm tra dữ liệu khoản thu: tên khoản thu hợp lệ; đơn giá là số hợp lệ. Thông báo lỗi tương ứng như ở test case Chương 9 | [C9] (đã điều chỉnh: mã tự sinh) | Đã chốt |
| BR-25 | **Không sửa, xóa** hóa đơn đã có thanh toán. Sửa sai bằng **phiếu điều chỉnh** (cộng hoặc trừ tiền) có ghi lý do, **Quản lý duyệt** | [QĐ Q-19, Q-24] | Đã chốt |
| BR-26 | Được đóng trước nhiều kỳ tiền phòng | [QĐ Q-14] | Đã chốt (cách làm: Q-56) |

### 1.4. Thanh toán, công nợ

| ID | Quy tắc | Nguồn | Trạng thái |
|---|---|---|---|
| BR-27 | Được thanh toán **một phần, nhiều lần** hoặc trả hết. Trạng thái hóa đơn: **chưa thanh toán → thanh toán một phần → đã thanh toán**; **quá hạn** khi qua hạn mà chưa trả đủ | [QĐ Q-21, Q-25] | Đã chốt |
| BR-28 | Người nộp chọn từ danh sách người ở trong phòng, hoặc chọn "Khác" và nhập tên | [QĐ Q-22] | Đã chốt |
| BR-29 | Hình thức: **tiền mặt, chuyển khoản** (Kế toán xác nhận thủ công); có **biên lai** để xem, in | [QĐ Q-23] | Đã chốt |
| BR-30 | Ngày thanh toán **không được sau ngày hôm nay** | [QĐ Q-25] | Đã chốt |
| BR-31 | **Không xóa** thanh toán. Muốn hủy: Kế toán gửi yêu cầu kèm lý do, **Quản lý duyệt** | [QĐ Q-24] | Đã chốt |
| BR-32 | Công nợ theo phòng; nhắc nợ bằng **thông báo trong ứng dụng** | [QĐ Q-26] | Đã chốt |
| BR-33 | Hóa đơn đã thanh toán đủ thì không nhận thêm thanh toán | [C9] (Bảng 9-8, đã điều chỉnh) | Đã chốt |

### 1.5. Thông báo, báo cáo, dữ liệu

| ID | Quy tắc | Nguồn | Trạng thái |
|---|---|---|---|
| BR-34 | Thông báo trong ứng dụng khi: có hóa đơn mới, hóa đơn sắp đến hạn, quá hạn, yêu cầu đã được xử lý. Email: Could | [QĐ Q-30] | Đã chốt |
| BR-35 | Báo cáo bắt buộc: **doanh thu theo tháng**, **công nợ**. Nên có: thu – chi – lợi nhuận, tỷ lệ lấp đầy, phòng trống, hợp đồng sắp hết hạn | [QĐ Q-35, Q-37] | Đã chốt |
| BR-36 | Mọi thay đổi về tiền, mọi lần xem hoặc xuất dữ liệu cá nhân đều được **ghi nhật ký**; Chủ nhà xem được nhật ký | [QĐ Q-24, Q-45] | Đã chốt |
| BR-37 | Dữ liệu tài chính lưu lâu dài; dữ liệu cá nhân của người đã chuyển đi giữ **1 năm** rồi ẩn đi | [QĐ Q-36] | Đã chốt |

---

## 2. Quy tắc dùng mặc định tạm (chờ quyết định trong sprint)

| Câu hỏi | Chủ đề | Mặc định tạm cho MVP | Ảnh hưởng |
|---|---|---|---|
| Q-48 | Tiền cọc khi trả phòng | Chưa xử lý tự động; Quản lý ghi chú khi kết thúc hợp đồng | US-09 |
| Q-49 | Vào ở hoặc rời đi giữa tháng | Tính **tròn tháng** | US-15 |
| Q-50 | Ngày lập hóa đơn, hạn thanh toán | Lập **đầu tháng**, hạn **10 ngày** | US-15, US-22 |
| Q-51 | Chỉ số công tơ sai | **Chặn** chỉ số mới nhỏ hơn chỉ số cũ; chỉ sửa được khi hóa đơn chưa phát hành | US-14 |
| Q-52 | Cách tính nước của tòa | Hỗ trợ cả hai; dữ liệu mẫu dùng **theo khối** | US-13 |
| Q-53 | Gia hạn, chấm dứt sớm, chuyển phòng | Chuyển phòng = kết thúc hợp đồng cũ, tạo hợp đồng mới | US-07, US-09 |
| Q-54 | Loại khoản chi | Danh sách loại chi do Chủ nhà cấu hình | US-24 |
| Q-55 | Trạng thái yêu cầu sửa chữa | Mới → Đang xử lý → Hoàn thành / Từ chối | US-31 |
| Q-56 | Đóng trước nhiều kỳ | MVP **chưa hỗ trợ** (US-21 mức Could) | US-21 |
| Q-57 | Nộp thừa | **Chặn** nộp vượt số còn nợ | US-18 |
| Q-58 | Mẫu hóa đơn, biên lai | Tối thiểu: mã, phòng, kỳ, từng khoản, tổng, đã trả, còn nợ | US-19 |
| Q-59 | Cách tính doanh thu | Theo **tiền thực thu** trong tháng, không tính thanh toán đã hủy | US-23, US-25 |
| Q-60 | Hướng làm tròn tổng hóa đơn | Làm tròn **gần nhất** đến 1.000 đ | US-15 |

---
