# Bước 5 – Requirement Review và Gap Analysis

> Template WB-4, Bước 5. **v0.2 – 27/10/2026**: rà soát Requirement Package của bài toán chung cư mini cho thuê (`BusinessProblem.md`, `RequirementClarification.md`, `BusinessRules.md`, `UserStories.md`, `AcceptanceCriteria.md`).
> Chỉ nêu vấn đề, tác động và việc cần quyết định; không tự sửa quy tắc.
> **Hệ thống hiện có**: không có (phần mềm mới, dữ liệu mới [QĐ Q-39]).

---

## 1. Requirement Review Report

| ID | Loại | Mô tả | Mức ảnh hưởng | Đề xuất xử lý | Human cần quyết định |
|---|---|---|---|---|---|
| R-01 | Feasibility | **Phạm vi so với năng lực**: 34 story trong phạm vi (13 Must, khoảng 62 story point) chỉ có **4 tuần lập trình**, trong khi phần lớn thành viên chưa biết code | **High** | Giữ đúng 13 story Must; có thứ tự cắt giảm (`PrioritizedBacklog.md` mục 4); đo velocity ngay ở Sprint 2 | ☐ |
| R-02 | Security | **Người thuê truy cập qua internet**: nguy cơ xem hóa đơn, hợp đồng của phòng khác nếu chỉ ẩn trên giao diện | **High** | Kiểm tra quyền theo **phòng của người thuê** ở phía máy chủ cho mọi yêu cầu (AC-29-02, AC-22-06) | – |
| R-03 | Privacy | **CCCD và dữ liệu cá nhân** của người thuê được lưu trên hệ thống truy cập từ internet. Phải tuân thủ quy định pháp luật Việt Nam về bảo vệ dữ liệu cá nhân (nhóm xác nhận văn bản hiện hành) | **High** | Chỉ Quản lý xem (BR-09); ghi nhật ký xem, xuất (BR-36); ẩn sau 1 năm (BR-37); không đưa dữ liệu thật vào bản demo | ☐ Dữ liệu demo chỉ dùng dữ liệu giả |
| R-04 | Ambiguous | **Tự duyệt khi kiêm nhiều vai trò**: một người vừa là Kế toán vừa là Quản lý có thể tự gửi rồi tự duyệt phiếu điều chỉnh hoặc yêu cầu hủy thanh toán, làm mất tác dụng của việc duyệt (BR-25, BR-31) | Medium | Đề xuất quy tắc: **người gửi yêu cầu không được tự duyệt**; nếu tòa chỉ có một người quản lý thì Chủ nhà duyệt | ☐ **D-16** |
| R-05 | Conflict | **Khóa tài khoản khi kết thúc hợp đồng** (BR-04) nhưng người thuê có thể **còn nợ** và cần xem hóa đơn cuối | Medium | Đề xuất: khóa sau khi tất toán, hoặc cho xem (chỉ đọc) thêm 30 ngày | ☐ **D-17** |
| R-06 | Missing | **11 điểm chưa quyết định** (Q-48…Q-58), cộng Q-59 (doanh thu), Q-60 (làm tròn); đều đang dùng mặc định tạm | Medium | Quyết định ở buổi Planning của sprint làm story liên quan; kiểm thử lại các AC phụ thuộc | – |
| R-07 | Missing | **Phát hành hóa đơn khi thiếu chỉ số**: AC-15-04 đang dùng giả định (phòng thiếu chỉ số không được phát hành, các phòng khác vẫn phát hành) | Medium | Xác nhận ở Sprint 3 | ☐ |
| R-08 | Conflict (học phần) | Test case Chương 9 "**mã khoản thu bị trùng**" không còn áp dụng vì mã do hệ thống tự sinh (BR-23) | Medium | Thay bằng test case tương đương: "tên khoản thu đã tồn tại trong bảng giá"; ghi rõ trong tài liệu kiểm thử | ☐ |
| R-09 | NFR | Chưa có: chính sách mật khẩu, thời gian hết phiên, giới hạn số lần đăng nhập sai, bắt buộc HTTPS | Medium | Đề xuất ở `02-system-analysis/02-NonFunctionalRequirements.md` | ☐ |
| R-10 | Feasibility | Bản triển khai dùng gói hosting miễn phí có thể bị giới hạn (ngủ khi không dùng, dung lượng, sao lưu) | Medium | Chọn dịch vụ có sao lưu (Q-43); kiểm tra giới hạn trước Sprint 2 | – |
| R-11 | Ambiguous | **Doanh thu** tính theo tiền thực thu hay theo hóa đơn phát hành (Q-59) | Low | Mặc định: tiền thực thu; báo cáo có thể hiển thị cả hai | – |
| R-12 | Ambiguous | **Hướng làm tròn** tổng hóa đơn (Q-60) | Low | Mặc định: gần nhất | – |
| R-13 | Missing | Thời điểm chuyển **quá hạn** và nhắc **sắp đến hạn** cần một tác vụ chạy định kỳ | Low | Ghi nhận ở phân tích kiến trúc (`04`) | – |
| R-14 | Duplicate | Mô hình **yêu cầu – duyệt** lặp ở 4 story (US-10, US-17, US-20, US-31) | Low | Phân tích chung một vòng đời yêu cầu (`03-UseCasesAndFlows.md`) | – |
| R-15 | Ambiguous | Người thuê thấy những gì về **người ở cùng phòng** | Low | Chỉ thấy họ tên; không thấy CCCD, ngày sinh (AC-29-03) | – |
| R-16 | Missing | **Chuyển khoản** do kế toán xác nhận thủ công: chưa có bước đối soát với sao kê ngân hàng | Low | Ghi số tham chiếu giao dịch khi ghi nhận; đối soát tự động để sau | – |
| R-17 | Missing | Đăng xuất, hết phiên trên **điện thoại dùng chung** của người thuê | Low | Gộp vào R-09 | – |
| R-18 | Assumption | Quy trình as-is là giả định (A-01) | Low | Nhóm xác nhận khi viết báo cáo | – |
| R-19 | Fairness | Danh sách nợ chỉ hiển thị cho nhân viên; thông báo nhắc nợ chỉ gửi người thuê của phòng đó | Low | Đã đảm bảo qua BR-07, BR-32 | – |

**Tổng hợp**: 19 vấn đề (3 High, 7 Medium, 9 Low). Không còn mâu thuẫn mức High về **nghiệp vụ**. Hai vấn đề High còn lại thuộc về **bảo mật, dữ liệu cá nhân** (R-02, R-03) và **năng lực** (R-01).

---

## 2. Ba vấn đề quan trọng nhất (dùng cho slide)

| # | Vấn đề | Cách nhóm xử lý |
|---|---|---|
| 1 | R-01 Phạm vi so với 4 tuần lập trình | Chỉ cam kết 13 story Must; có thứ tự cắt giảm; ghép cặp lập trình |
| 2 | R-02 Người thuê xem được dữ liệu phòng khác | Kiểm tra quyền theo phòng ở phía máy chủ; có test case riêng (AC-29-02) |
| 3 | R-04 Tự duyệt khi kiêm nhiều vai trò | Đề xuất quy tắc "người gửi không tự duyệt" (D-16) |

---

## 3. Top Risk Review

| # | Tình huống | Tương ứng template | Tác động | Mitigation (mức thiết kế) | Human quyết định? |
|---|---|---|---|---|---|
| T-1 | Hai kế toán cùng ghi nhận thanh toán cho một hóa đơn gần như đồng thời | Hai bệnh nhân cùng nhận một slot | Thu vượt số nợ, sai công nợ | Kiểm tra số còn nợ **tại thời điểm lưu**, ở nơi lưu dữ liệu tập trung; người sau nhận thông báo (AC-18-09) | Không (đã có BR-33, Q-57) |
| T-2 | Thông báo hóa đơn hoặc nhắc hạn không tới người thuê, nhưng hạn vẫn tính | Thông báo lỗi mà offer vẫn đếm giờ | Quá hạn oan, tranh chấp | Hóa đơn luôn xem được trên cổng người thuê; lưu thời điểm gửi thông báo; không phạt trễ hạn ở phiên bản này (Q-25) | Không |
| T-3 | Ghi nhận thanh toán vào hóa đơn vừa được duyệt điều chỉnh, hoặc thanh toán vừa bị hủy | Chấp nhận offer đã hết hạn | Số còn nợ sai | Tính số còn nợ từ tổng sau điều chỉnh và các thanh toán còn hiệu lực ngay khi lưu (AC-18-10, AC-22-05) | Không |
| T-4 | Người thuê đổi tham số trên đường dẫn để xem hóa đơn phòng khác | (bổ sung) | Lộ dữ liệu tài chính, cá nhân | Kiểm tra quyền theo phòng ở máy chủ (R-02) | Không |
| T-5 | Người giữ nhiều vai trò tự duyệt yêu cầu điều chỉnh của mình | (bổ sung) | Gian lận, mất minh bạch | Quy tắc "không tự duyệt" (R-04) | **Có: D-16** |

---

## 4. Human Checkpoint

| Tiêu chí | AI tự đánh giá | Nhóm xác nhận |
|---|---|---|
| Không còn yêu cầu mơ hồ, mâu thuẫn mức cao | Đạt về nghiệp vụ; còn D-16, D-17 mức Medium | ☐ |
| Assumption, Open Question đã xử lý hoặc ghi nhận | Đạt: 13 câu để sau đều có mặc định tạm | ☐ |
| User Story và AC nhất quán | Đạt: 13 story Must đều có AC | ☐ |
| Đã xem xét NFR quan trọng | Đạt một phần: R-09 | ☐ |
| Đã đánh giá Security, Privacy, Fairness | R-02, R-03, R-04, R-19 | ☐ |
| Sẵn sàng cho thiết kế kiến trúc | **Sẵn sàng**, sau khi quyết định D-16, D-17 (có thể quyết định ngay ở đầu Sprint 1) | ☐ |
