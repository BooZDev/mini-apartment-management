# Bước 2 – Requirement Clarification Log

> Template WB-4, Bước 2.
> **Cập nhật 27/10/2026 (v0.2)**: nhóm đã chốt câu trả lời cho Q-01…Q-46. Các câu trả lời **đổi bài toán** từ "Ban quản trị chung cư BlueMoon thu phí, quản lý hộ khẩu" sang **"phần mềm quản lý chung cư mini cho thuê"**; giảng viên đã đồng ý. Câu hỏi được giữ nguyên văn để truy vết, cột *Câu trả lời / Quyết định* phản ánh bài toán mới.
> Bản điền chi tiết (kèm ý kiến ban đầu của nhóm) nằm trong [`ClarificationLog_TraLoi.xlsx`](ClarificationLog_TraLoi.xlsx). Bản phân tích theo đề cũ được lưu ở `doc/99-archive/v0.1-bluemoon-ban-quan-tri/`.

**Ký hiệu stakeholder**

| Mã | Stakeholder |
|---|---|
| KH | Trưởng Ban quản trị (đại diện khách hàng) |
| KT | Kế toán Ban quản trị (đại diện người dùng cuối) |
| TT | Tổ trưởng / Tổ phó |
| GV | Giảng viên học phần, với vai trò người đặt đề bài |
| PM | Quản lý dự án / nhóm phát triển |
| CN, QL | Chủ nhà, Quản lý (vai trò của bài toán mới; dùng cho nhóm câu hỏi L) |

Với chủ đề tự chọn, **nhóm đóng vai khách hàng**: người trả lời các câu Q-01…Q-46 là cả nhóm.

**Mức ưu tiên**: **Cao** = chặn việc viết User Story, Acceptance Criteria hoặc mô hình dữ liệu. **TB** = ảnh hưởng một phần chức năng. **Thấp** = có thể trả lời sau MVP.

---

## 1. Requirement Clarification Log

### A. Tác nhân, quyền hạn, tài khoản

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-01 | Danh sách vai trò người dùng không thống nhất: "Ban quản trị" [GT], "Tổ trưởng/Tổ phó, Kế toán" [C6], "nhân viên quản lý" [TLĐ][C7], "ban quản lý tòa nhà" [TLĐ], tài khoản "admin" [C9] | Hệ thống có chính xác những vai trò nào? Mỗi vai trò làm những việc gì? "Nhân viên quản lý" và "ban quản lý tòa nhà" có phải người dùng không? | Quyết định toàn bộ use case, phân quyền và màn hình | KH, GV | Cao | 5 vai trò: Quản trị hệ thống (tài khoản, phân quyền, cấu hình); Chủ nhà (doanh thu, chi phí, lợi nhuận, công nợ, báo cáo); Quản lý (phòng, người thuê, hợp đồng, hóa đơn, xử lý yêu cầu); Kế toán (ghi nhận thanh toán, hóa đơn, khoản thu, khoản chi, công nợ); Người thuê (xem hợp đồng, hóa đơn của mình, gửi yêu cầu sửa chữa, phản ánh). Một người có thể giữ nhiều vai trò. | Answered |
| Q-02 | Cư dân có dùng hệ thống hay không | Cư dân có được đăng nhập để xem lịch sử phí hoặc tự nộp phí như các story ở [C3] không, hay chỉ Ban quản trị dùng như [GT][TLĐ]? | Thay đổi lớn về phạm vi, bảo mật, kiến trúc | KH, GV | Cao | Có. Người thuê đăng nhập để xem hợp đồng, hóa đơn, lịch sử thanh toán và gửi yêu cầu. Thanh toán trực tuyến để phiên bản sau. | Answered |
| Q-03 | Quan hệ giữa Ban quản trị chung cư và tổ dân phố | Tổ trưởng/Tổ phó ở [C6] có phải thành viên Ban quản trị BlueMoon không? Toàn bộ chung cư là một tổ dân phố, hay một tổ gồm nhiều tòa? UC002 nói "các hộ trong tổ dân phố" | Xác định tập hộ thuộc phạm vi quản lý và tính phí | KH, TT | Cao | Không áp dụng: chỉ một tòa chung cư mini, không có tổ dân phố. | Không áp dụng |
| Q-04 | Quyền của Tổ phó | Tổ phó có được cập nhật dữ liệu hộ khẩu, hay chỉ tra cứu, thống kê (Hình 6-1 chỉ cho Tổ phó tra cứu, thống kê)? | Phân quyền | TT | TB | Không áp dụng: không còn vai trò Tổ phó. | Không áp dụng |
| Q-05 | Quyền xem chéo giữa hai module | Kế toán có được xem hoặc sửa thông tin nhân khẩu không? Tổ trưởng có được ghi nhận thu phí, xem số liệu thu không? | Phân quyền, bảo vệ dữ liệu cá nhân | KH | TB | Kế toán chỉ truy cập dữ liệu tài chính; thấy tên người thuê và số phòng, không thấy CCCD hay thông tin cá nhân khác. | Answered |
| Q-06 | Cách tạo tài khoản | Luồng (1) là "Đăng ký tài khoản" [GT] hay "Đăng nhập" [C9]? Tài khoản do người dùng tự đăng ký (màn hình Hình 7-13) hay được cấp sẵn ("tài khoản đã cung cấp" [GT]; Tổ trưởng phân quyền [C6])? Nếu tự đăng ký thì ai duyệt? | Quyết định có chức năng đăng ký hay không; rủi ro truy cập trái phép | KH, GV | Cao | Không có tự đăng ký. Quản trị hệ thống tạo tài khoản nhân viên; Quản lý tạo tài khoản người thuê khi ký hợp đồng; tài khoản người thuê bị khóa khi hợp đồng kết thúc. Người thuê chỉ xem dữ liệu tài chính nhưng được gửi yêu cầu. | Answered |
| Q-07 | Xử lý quên mật khẩu | Màn hình đăng nhập có liên kết "Quên mật khẩu" [C7]. Người dùng lấy lại mật khẩu bằng cách nào? Người dùng có email không? | Chức năng và phụ thuộc kênh liên lạc | KH | Thấp | Người dùng có số điện thoại, email không bắt buộc. Quên mật khẩu: Quản lý đặt lại; đặt lại qua email (Could) khi người dùng có email. | Answered |

### B. Căn hộ và hộ gia đình

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-08 | Đối tượng chịu phí | Phí được tính và thu theo **hộ gia đình/hộ khẩu** [C6][C7], theo **chủ sở hữu** [GT] hay theo **căn hộ** [TLĐ][C7-Hình 7-18]? | Là thực thể trung tâm của toàn bộ phần thu phí | KH, KT | Cao | Hóa đơn lập theo phòng, gắn với hợp đồng đang hiệu lực; khoản tính theo người dùng số người đang ở trong phòng. | Answered |
| Q-09 | Dữ liệu căn hộ | Có bao nhiêu căn hộ? Diện tích từng căn lấy từ đâu, ai cập nhật? Một căn có thể có nhiều hộ (thuê, ở ghép), hoặc một hộ có nhiều căn không? Căn chưa có người ở có phải đóng phí dịch vụ, phí quản lý không? | Phí dịch vụ và phí quản lý tính theo m² [GT] nhưng không mô hình nào có diện tích | KH, KT | Cao | Một tòa chung cư mini. Quản lý nhập phòng: mã phòng, tầng, diện tích, giá niêm yết, trạng thái (trống / đang thuê / bảo trì). Một phòng tại một thời điểm chỉ có một hợp đồng hiệu lực. | Answered |
| Q-10 | Phạm vi tầng | Kiot tầng 1, 4 tầng đế và tầng penthouse có thuộc phạm vi quản lý, thu phí không? Penthouse có đơn giá riêng không? | Danh sách đối tượng thu, đơn giá | KH | TB | Chỉ có căn hộ mini (không có kiot, penthouse). | Answered |
| Q-11 | Người thuê, người tạm trú | Người thuê căn hộ có được quản lý như một hộ không? Ai là người nộp phí: chủ sở hữu hay người thuê? | Đối tượng thu, dữ liệu nhân khẩu | KH, TT | TB | Mọi người ở đều là người thuê. Người đứng tên hợp đồng chịu trách nhiệm thanh toán; người ở cùng được ghi trong danh sách người ở của phòng. | Answered |

### C. Khoản thu và cách tính

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-12 | Danh mục phí bắt buộc | v1.0 gồm những khoản bắt buộc nào: phí dịch vụ, phí quản lý [GT], phí vệ sinh [C6]? Phí vệ sinh có nằm trong phí dịch vụ không ([GT] liệt kê vệ sinh là một phần công dụng của phí dịch vụ)? | Hai nguồn mô tả hai cơ chế thu khác nhau | KH, KT, GV | Cao | Danh mục: tiền phòng (theo hợp đồng); điện (chỉ số công tơ × đơn giá); nước (theo khối hoặc theo người); dịch vụ – wifi, vệ sinh, thang máy (theo phòng hoặc theo người); gửi xe (theo xe); phát sinh (nhập tay). | Answered |
| Q-13 | Đơn giá | Đơn giá phí dịch vụ của BlueMoon là bao nhiêu trong khoảng 2.500–16.500 đ/m²? Phí quản lý "từ 7.000 đ/m²" là một con số cố định hay thay đổi theo loại căn? Khi đổi đơn giá thì áp dụng từ kỳ nào? | Tính đúng số tiền; lịch sử đơn giá | KT | Cao | Chủ nhà nhập bảng giá; mỗi mức giá có ngày bắt đầu hiệu lực; đổi giá không ảnh hưởng hóa đơn đã phát hành. | Answered |
| Q-14 | Chu kỳ thu | Phí thu hằng tháng [GT] hay một lần mỗi năm (phí vệ sinh, "hàng năm khu chung cư thực hiện thu" [C6])? Hộ có được đóng trước nhiều kỳ không? | Đơn vị thời gian của khoản thu và đợt thu | KT | Cao | Hóa đơn theo tháng; được đóng trước nhiều kỳ tiền phòng. | Answered |
| Q-15 | Làm tròn | Diện tích lẻ (vd 82,3 m²) nhân đơn giá ra số lẻ thì làm tròn thế nào? | Số tiền chính xác, tránh tranh chấp | KT | TB | Tính chính xác đến đồng; tổng hóa đơn làm tròn đến 1.000 đ. | Answered |
| Q-16 | Ý nghĩa trường "Số tiền" | Trường "Số tiền" trên màn hình Tạo khoản thu (Hình 7-17) và trong bảng khoản thu [C7][C9] là đơn giá, số tiền cố định mỗi hộ, hay tổng số tiền? | Diễn giải dữ liệu nhập | KT, GV | Cao | 'Số tiền' của khoản thu là đơn giá trong bảng giá; số tiền trên hóa đơn được tính từ đơn giá. | Answered |
| Q-17 | Số nhân khẩu dùng để tính phí | Số nhân khẩu được chốt tại thời điểm nào (lúc tạo khoản thu?)? Có tính người tạm vắng, người tạm trú không? Nếu giữa kỳ có biến động thì số tiền đã lập có thay đổi không? | Tính đúng phí theo nhân khẩu | KT, TT | Cao | Đơn giá và số người ở chốt theo thời điểm hiệu lực; hóa đơn đã phát hành không đổi; thay đổi chỉ áp dụng từ kỳ sau. | Answered |
| Q-18 | "Khoản thu" và "đợt thu" | Hai khái niệm khác nhau thế nào (UC "Quản lý khoản thu" và UC "Quản lý đợt thu phí" [C6]; thống kê "mỗi đợt")? Khoản thu có hạn nộp không (ERD có "thời hạn" [C7])? | Mô hình dữ liệu cốt lõi của thu phí | KT, GV | Cao | Khoản thu là loại phí; đợt thu là kỳ hóa đơn theo tháng, có hạn thanh toán. | Answered |
| Q-19 | Sửa, xóa khoản thu | Khi đã có hộ nộp tiền cho một khoản thu, có được sửa số tiền hoặc xóa khoản thu đó không? | Toàn vẹn số liệu tài chính | KT, KH | Cao | Không sửa, xóa hóa đơn đã có thanh toán. Sửa sai bằng phiếu điều chỉnh (cộng hoặc trừ tiền) có ghi lý do. | Answered |
| Q-20 | Ràng buộc mã và tên khoản thu | Ràng buộc ở [C9] (mã là dãy 1–11 chữ số, tên 1–50 ký tự, số tiền dưới 11 chữ số) là quy định nghiệp vụ hay chỉ là ví dụ kiểm thử? | Kiểm tra dữ liệu, test case | GV | Thấp | Không theo ràng buộc Chương 9; mã hóa đơn do hệ thống tự sinh (ví dụ HD-202612-P101). | Answered |

### D. Ghi nhận nộp tiền

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-21 | Nộp nhiều lần, nộp thiếu | Với khoản bắt buộc, hộ có được nộp một phần hoặc nộp nhiều lần không? [C9] chặn ghi nhận lần hai ("Người này đã từng nộp khoản phí này!"), và màn hình Thu phí (Hình 7-19) **không có ô số tiền** | Quy tắc ghi nhận, trạng thái nợ | KT | Cao | Được thanh toán một phần nhiều lần hoặc trả hết trong hạn. Trạng thái: chưa thanh toán → thanh toán một phần → đã thanh toán; quá hạn nếu qua hạn mà chưa trả đủ. | Answered |
| Q-22 | Đơn vị ghi nhận | Ghi nhận nộp tiền theo **hộ** (ERD Hình 7-7: Hộ khẩu – nộp phí) hay theo **người nộp là nhân khẩu** ([C7] "Nhân khẩu nộp phí cho Khoản thu"; [C9] chọn người nộp)? | Tránh thu trùng khi hai người trong cùng hộ cùng nộp | KT, GV | Cao | Thanh toán gắn với hóa đơn của phòng; người nộp chọn từ danh sách người ở trong phòng, hoặc chọn 'Khác' và nhập tên. | Answered |
| Q-23 | Hình thức nộp và chứng từ | Chỉ tiền mặt [TLĐ], hay có cả chuyển khoản? Có cần in phiếu thu/biên lai, hay cần chữ ký người nộp như cột "ký nhận" trong sổ (Hình 1-1)? | Dữ liệu lưu, chứng từ | KT | TB | Tiền mặt và chuyển khoản (kế toán xác nhận thủ công); có biên lai để xem hoặc in. Cổng thanh toán trực tuyến để sau. | Answered |
| Q-24 | Sửa, hủy bản ghi nộp | Khi nhập sai thì ai được sửa hoặc hủy? Có phải lưu lại lịch sử (ai, lúc nào, lý do) không? | Kiểm soát gian lận, đối soát quỹ | KH, KT | Cao | Kế toán gửi yêu cầu điều chỉnh, Quản lý duyệt. Không xóa thanh toán, chỉ hủy kèm lý do. Mọi thay đổi ghi nhật ký, Chủ nhà xem được. | Answered |
| Q-25 | Ngày nộp và hạn nộp | Ngày nộp có được là ngày quá khứ hoặc tương lai không ([C9]: "không kiểm tra logic về ngày thu")? Nộp sau hạn có bị xử lý gì không? | Quy tắc kiểm tra, báo cáo quá hạn | KT | TB | Ngày thanh toán không được sau ngày hôm nay; qua hạn thì đánh dấu quá hạn. Phí phạt trễ hạn để phiên bản sau. | Answered |
| Q-26 | Theo dõi hộ chưa nộp | Có cần danh sách hộ chưa nộp hoặc nợ đọng, nhắc nợ, báo cáo công nợ không? (Hình 7-18 có cột trạng thái đã/chưa thanh toán) | Chức năng thống kê, nhắc nợ | KT, KH | TB | Có danh sách công nợ theo phòng; nhắc nợ bằng thông báo trong ứng dụng cho người thuê. | Answered |

### E. Khoản đóng góp

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-27 | Số tiền đóng góp | Khoản đóng góp có "số tiền tối thiểu, mặc định 0đ" (UC002 [C6]) hay "không quy định số tiền" [C6, mục 6.1]? Một hộ có được đóng nhiều lần trong một đợt không? | Kiểm tra số tiền, cách ghi nhận | KT | TB | Không áp dụng: chung cư mini cho thuê không có khoản đóng góp tự nguyện. | Không áp dụng |
| Q-28 | Hộ từ chối, báo cáo cho chính quyền | Có cần ghi nhận việc hộ từ chối ủng hộ không (Hình 6-3)? Số liệu đóng góp có phải báo cáo lại cho chính quyền hoặc tổ dân phố theo mẫu như Hình 1-1 không? | Dữ liệu cần lưu, mẫu báo cáo | KH, KT | TB | Không áp dụng (như Q-27). Luồng 'thống kê đóng góp' của đề gốc được thay bằng thống kê khoản thu và công nợ. | Không áp dụng |
| Q-29 | Nhiều quỹ trong một đợt | Một đợt vận động có thể gồm nhiều quỹ cùng lúc như sổ ở Hình 1-1 không? | Cấu trúc khoản thu đóng góp | KT | Thấp | Không áp dụng (như Q-27). | Không áp dụng |

### F. Thông báo

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-30 | Gửi thông báo thu tiền | Việc "gửi thông báo thu tiền" [GT][TLĐ] có thuộc phần mềm không? Nếu có thì qua kênh nào (in giấy, bảng tin, tin nhắn, email, Zalo) và nội dung gồm những gì? Cư dân có thông tin liên lạc trong hệ thống không? | Có thêm chức năng, tích hợp bên ngoài hay không | KH, KT | TB | Có: thông báo trong ứng dụng (hóa đơn mới, sắp đến hạn, quá hạn, yêu cầu đã xử lý). Email: Could. SMS, Zalo: để sau. | Answered |

### G. Hộ khẩu, nhân khẩu

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-31 | Trường thông tin bắt buộc | Danh sách trường thông tin của hộ khẩu và nhân khẩu là danh sách ở [C6] (có bí danh, nơi sinh, nguyên quán, nơi làm việc, thông tin lưu trú trước khi chuyển đến) hay ở [C7] (có giới tính, tôn giáo, ghi chú)? Trường nào bắt buộc? | Mô hình dữ liệu, form nhập | TT, GV | Cao | Người ở: họ tên, ngày sinh (lưu ngày sinh thay cho tuổi), giới tính, quê quán, số điện thoại, CCCD, quan hệ với người đứng tên hợp đồng, ngày vào ở, ngày rời đi, ghi chú. Bắt buộc: họ tên, ngày sinh, quê quán, CCCD. | Answered |
| Q-32 | Quy trình biến đổi nhân khẩu | Mọi thay đổi đều phải có yêu cầu của người dân và Tổ trưởng duyệt (Hình 6-1), hay Tổ trưởng cập nhật trực tiếp? Có cần lưu giấy tờ kèm theo không? Danh sách loại biến đổi đầy đủ là gì (Hình 6-2: thêm, thay đổi, đổi chủ hộ, tách hộ, tạm trú/tạm vắng; mục 6.1: thêm mới, thay đổi, đăng ký thường trú, đăng ký tạm trú; còn chuyển đi, qua đời?) | Luồng xử lý, trạng thái, dữ liệu lịch sử | TT | Cao | Người thuê gửi yêu cầu (thêm người, người rời đi, sửa thông tin); Quản lý duyệt. | Answered |
| Q-33 | Thẩm quyền tạm trú, tạm vắng | Hình 6-2 ghi "**cấp** tạm trú, tạm vắng". Ban quản trị/tổ dân phố cấp, hay chỉ **ghi nhận** thông tin đã đăng ký với cơ quan công an? | Đúng nghiệp vụ và pháp lý; trạng thái dữ liệu | TT, GV | TB | Chỉ ghi nhận tình trạng khai báo tạm trú (đã hoặc chưa khai báo với công an), không cấp. | Answered |
| Q-34 | Báo cáo cho cơ quan chức năng | Thông tin cung cấp cho cơ quan chức năng theo mẫu nào, định dạng gì, tần suất ra sao? | Chức năng xuất dữ liệu | TT, KH | TB | Xuất danh sách người ở (Excel) để khai báo tạm trú khi cần. Mức Could. | Answered |
| Q-35 | Thống kê nhân khẩu | Thống kê theo độ tuổi chia theo nhóm tuổi nào? "Thống kê theo khoảng thời gian" (Hình 6-2) là thống kê cái gì: số biến động, số nhân khẩu tại một thời điểm, hay khác? | Định nghĩa báo cáo | TT | TB | Thay bằng thống kê cho thuê: tỷ lệ lấp đầy, số phòng trống, số người ở, hợp đồng sắp hết hạn. | Answered |
| Q-36 | Lưu trữ, xóa dữ liệu | Dữ liệu của hộ hoặc nhân khẩu đã chuyển đi, đã mất được giữ bao lâu? Có được xóa không? | Lưu trữ lịch sử, bảo vệ dữ liệu cá nhân | KH, TT | TB | Dữ liệu tài chính giữ lâu dài; dữ liệu cá nhân của người đã chuyển đi giữ 1 năm rồi ẩn đi. | Answered |

### H. Thống kê, tra cứu, báo cáo

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-37 | Danh mục báo cáo | "Thống kê cơ bản" [GT] gồm chính xác những báo cáo nào? Có cần xuất file (nút "Xuất báo cáo" ở Hình 7-16), và xuất định dạng gì (Excel, PDF, bản in)? | Phạm vi chức năng thống kê | KH, KT | TB | Must: doanh thu theo tháng, công nợ. Should: thu – chi – lợi nhuận cho Chủ nhà, tỷ lệ lấp đầy. Xuất Excel: Could. | Answered |
| Q-38 | Tiêu chí tìm kiếm | Người dùng cần tìm hộ, nhân khẩu, khoản thu, bản ghi nộp theo những tiêu chí nào (tên, số hộ khẩu, mã căn hộ, CCCD, khoảng ngày…)? | Chức năng tra cứu | KT, TT | Thấp | Tìm theo mã phòng, tên người thuê (gõ không dấu vẫn tìm được), số điện thoại, mã hóa đơn. | Answered |

### I. Dữ liệu ban đầu

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-39 | Chuyển đổi dữ liệu | Dữ liệu hiện có trong sổ giấy và Excel do ai nhập vào hệ thống ([C4] loại trừ nhập liệu khỏi phạm vi)? Có cần chức năng nhập hàng loạt từ Excel không? Dữ liệu cũ (các tháng trước) có phải chuyển vào không? | Hệ thống không dùng được nếu không có dữ liệu hộ, nhân khẩu | KH, PM | Cao | Bắt đầu với dữ liệu mới; nhóm chuẩn bị dữ liệu mẫu cho demo (khoảng 20 phòng, 3 tháng hóa đơn). | Answered |

### J. Phiên bản 2.0

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-40 | Phí gửi xe, thu hộ | Phí ô tô "1.200.000 nghìn đồng/xe/tháng" [GT] có phải là 1.200.000 đồng không? Có tính xe đạp, xe điện không? Số tiền điện, nước, internet nhận từ đơn vị cung cấp ở dạng nào (giấy, file)? | Đơn giá, cách nhập liệu v2.0 | KH, KT | Thấp | Gửi xe là một loại phí trong bảng giá (tính theo số xe), không cần module riêng. | Answered |

### K. Phi chức năng, nền tảng, dự án

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-41 | Nền tảng bắt buộc | "Ứng dụng desktop, Java, MySQL tập trung" [GT] là ràng buộc bắt buộc của đề bài hay chỉ là dự kiến? Sprint Backlog mẫu ở [C3] lại có công việc "bắt sự kiện qua Javascript". Nhóm có được dùng nền tảng khác không? | Quyết định kiến trúc, công cụ, bàn giao | GV, KH | Cao | Ứng dụng web: Next.js + NestJS + PostgreSQL (TypeScript). Có bản triển khai thật và CI chạy kiểm thử tự động. | Answered |
| Q-42 | Số người dùng và mạng | Có bao nhiêu máy, bao nhiêu người dùng cùng lúc? Chỉ dùng trong mạng văn phòng hay cần truy cập từ xa? | Kiến trúc, hiệu năng, bảo mật | KH | TB | Ứng dụng web, truy cập từ xa, giao diện dùng tốt trên điện thoại; dưới khoảng 50 người dùng đồng thời. | Answered |
| Q-43 | Sao lưu và vận hành | Ai vận hành máy chủ MySQL? Có yêu cầu sao lưu định kỳ, khôi phục khi mất dữ liệu không? | Độ tin cậy, khả năng phục hồi | KH, PM | TB | Dùng dịch vụ PostgreSQL có sao lưu tự động hằng ngày; nhóm ghi lại quy trình khôi phục. | Answered |
| Q-44 | Trợ năng | Các yêu cầu tương thích phần mềm phóng to, đọc màn hình, màn hình cảm ứng [TLĐ] là bắt buộc hay mong muốn? | Phạm vi giao diện | KH, GV | Thấp | Mong muốn, không bắt buộc: điều khiển được bằng bàn phím, độ tương phản đủ, giao diện tương thích điện thoại. | Answered |
| Q-45 | Bảo vệ dữ liệu cá nhân | Ai được xem CCCD, ngày sinh, dân tộc, tôn giáo, nơi làm việc của cư dân? Có yêu cầu ghi nhật ký truy cập hoặc thay đổi không? | Tuân thủ pháp luật về dữ liệu cá nhân, phân quyền | KH | Cao | Chỉ Quản lý xem CCCD và thông tin cá nhân; Chủ nhà xem số liệu tổng hợp; người thuê chỉ xem dữ liệu của mình. Có nhật ký cho thao tác tiền và việc xem hoặc xuất dữ liệu cá nhân. | Answered |
| Q-46 | Tiêu chí thành công đo được | Ngoài "quản lý 100%" [C4], Ban quản trị đánh giá thành công bằng chỉ số nào (thời gian lập báo cáo tháng, số lỗi sai, thời gian học sử dụng…)? Pain point nào quan trọng nhất? | Tiêu chí nghiệm thu | KH, KT | TB | Thành công khi: (1) demo trọn luồng tạo phòng → hợp đồng → hóa đơn → thanh toán → công nợ; (2) lập hóa đơn tháng cho cả tòa dưới 10 phút; (3) test case Chương 9 đều đạt; (4) có bản triển khai thật. | Answered |
| Q-47 | Lịch trình thực tế | Các mốc ở [C4] (UAT 30/11/2023 và 15/12/2023, hoàn thành 30/12/2023) đã qua. Mốc thực tế theo học phần (tuần 14–16 [DCCT]) là những ngày nào? Sprint dài bao lâu? | Kế hoạch dự án, Agile Project Plan | GV, PM | Cao | Nhóm xác nhận ngày 27/10/2026: tuần này là **tuần 9**, hạn nộp **cuối tuần 16** (20/12/2026), nhóm **8 thành viên**. Sprint 0: 1 tuần; Sprint 1: 2 tuần không code; Sprint 2, 3: 2 tuần; Sprint 4: 1 tuần. Xem `03-project-plan/SprintPlan.md` | Answered |


### L. Câu hỏi để sau (xử lý trong sprint phát triển)

Phát sinh sau khi đổi bài toán. Nhóm quyết định trả lời khi phát triển; cột *Câu trả lời* ghi **mặc định tạm** để MVP không bị chặn.

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Ưu tiên | Câu trả lời / Quyết định | Status |
|---|---|---|---|---|---|---|---|
| Q-48 | Xử lý tiền cọc | Khi trả phòng, tiền cọc được hoàn hay khấu trừ (công nợ, hư hỏng) thế nào? Ai xác nhận? | Kết thúc hợp đồng, công nợ | CN, QL | TB | Mặc định tạm cho MVP: Chưa xử lý tự động; Quản lý ghi chú khi kết thúc hợp đồng | Open |
| Q-49 | Tháng lẻ ngày | Người thuê vào ở hoặc rời đi giữa tháng: tiền phòng tính theo số ngày hay tròn tháng? | Tính đúng hóa đơn | CN | TB | Tháng đầu của hợp đồng tính theo số ngày ở: tiền phòng và các khoản cố định hằng tháng = đơn giá × số ngày ở ÷ số ngày của tháng; điện nước theo chỉ số; người ở thêm giữa tháng tính từ kỳ sau; trả phòng giữa tháng xử lý khi thanh lý (Q-48). Nhóm chốt 10/11/2026. | Answered |
| Q-50 | Lịch lập hóa đơn | Hóa đơn tháng lập vào ngày nào? Hạn thanh toán mặc định bao nhiêu ngày? | Trạng thái quá hạn, thông báo | CN, QL | TB | Kế toán lên lịch cho từng kỳ: tháng thu, ngày thu, hạn thanh toán. Không cố định ở đầu hay cuối tháng, tùy từng tòa (nhóm chốt 09/11/2026). | Answered |
| Q-51 | Sai sót chỉ số công tơ | Chỉ số công tơ nhập sai, thay công tơ mới, chỉ số mới nhỏ hơn cũ: xử lý thế nào? | Tính đúng tiền điện, nước | QL | TB | Mặc định tạm cho MVP: Chặn chỉ số mới nhỏ hơn cũ; chỉ sửa được khi hóa đơn chưa phát hành | Open |
| Q-52 | Cách tính nước của tòa | Tòa đang tính nước theo khối (có công tơ) hay theo người? | Cấu hình bảng giá ban đầu | CN | TB | Tòa tính nước theo khối (công tơ, có chỉ số bàn giao); hệ thống vẫn cho cấu hình theo người nếu cần. Nhóm chốt 10/11/2026. | Answered |
| Q-53 | Gia hạn, chấm dứt sớm, chuyển phòng | Quy trình gia hạn, chấm dứt hợp đồng trước hạn và chuyển sang phòng khác là gì? | Vòng đời hợp đồng | CN, QL | Thấp | Gia hạn ngay trên hợp đồng đang có theo phụ lục (ngày kết thúc mới, số và ngày ký phụ lục, có thể đổi giá thuê từ ngày gia hạn), giữ nguyên tài khoản người thuê; chấm dứt sớm = kết thúc hợp đồng; chuyển phòng = kết thúc hợp đồng cũ và nhập hợp đồng mới. Nhóm chốt 10/11/2026. | Answered |
| Q-54 | Phân loại khoản chi | Khoản chi được phân loại thế nào (sửa chữa, điện nước chung, lương, khác)? | Báo cáo thu – chi – lợi nhuận | CN, KT | Thấp | Mặc định tạm cho MVP: Một danh sách loại chi do Chủ nhà cấu hình | Open |
| Q-55 | Yêu cầu sửa chữa | Yêu cầu sửa chữa có những trạng thái nào, thời hạn xử lý, có tính phí cho người thuê không? | Cổng người thuê | QL | Thấp | Mặc định tạm cho MVP: Mới → Đang xử lý → Hoàn thành / Từ chối; phí (nếu có) thêm vào hóa đơn dưới dạng khoản phát sinh | Open |
| Q-56 | Đóng trước nhiều kỳ | Khi đóng trước nhiều tháng: tạo sẵn hóa đơn các tháng sau, hay ghi nhận số dư trả trước? | Mô hình dữ liệu thanh toán | CN, KT | TB | Mặc định tạm cho MVP: MVP chưa hỗ trợ (US-21 mức Could) | Open |
| Q-57 | Nộp thừa | Có được nộp vượt số còn nợ của hóa đơn không? Nếu có, tiền thừa xử lý ra sao? | Quy tắc ghi nhận thanh toán | KT | TB | Mặc định tạm cho MVP: Chặn nộp vượt số còn nợ | Open |
| Q-58 | Mẫu hóa đơn, biên lai | Hóa đơn và biên lai cần những thông tin gì? Có mẫu in không? | Biên lai, xuất file | CN | Thấp | Mặc định tạm cho MVP: Thông tin tối thiểu: mã, phòng, kỳ, từng khoản, tổng, đã trả, còn nợ | Open |
| Q-59 | Cách tính doanh thu | Doanh thu tháng tính theo tiền thực thu trong tháng hay theo tổng hóa đơn đã phát hành trong tháng? | Báo cáo cho Chủ nhà | CN | TB | Mặc định tạm cho MVP: Tiền thực thu trong tháng (không tính thanh toán đã hủy) | Open |
| Q-60 | Hướng làm tròn | Tổng hóa đơn làm tròn đến 1.000 đ theo hướng nào: lên, xuống hay gần nhất? | Số tiền trên hóa đơn | CN | Thấp | Mặc định tạm cho MVP: Làm tròn gần nhất | Open |

---

## 2. Thống kê

| Trạng thái | Số câu | Ghi chú |
|---|---|---|
| Answered | 46 | Q-01…Q-46 (trừ 5 câu Không áp dụng), Q-47, Q-49, Q-50, Q-52 và Q-53 |
| Không áp dụng | 5 | Q-03, Q-04 (không còn tổ dân phố, Tổ phó); Q-27, Q-28, Q-29 (không còn khoản đóng góp) |
| Open | 9 | Q-48…Q-60 (trừ Q-49, Q-50, Q-52, Q-53), nhóm câu hỏi **để sau**; đều có mặc định tạm nên không chặn MVP |
| **Tổng** | **60** | |

Toàn bộ 22 câu mức **Cao** ban đầu đã được trả lời hoặc xác định không áp dụng. Không còn câu hỏi nào **chặn** việc thiết kế.

---

## 3. Ba quyết định quan trọng nhất (dùng cho slide)

1. **Q-01 + Q-02 + Q-06**: 5 vai trò (Quản trị hệ thống, Chủ nhà, Quản lý, Kế toán, Người thuê); người thuê có tài khoản do Quản lý cấp, chỉ xem dữ liệu tài chính và được gửi yêu cầu.
2. **Q-08 + Q-12 + Q-17**: hóa đơn tháng lập **theo phòng** gắn với hợp đồng; khoản thu gồm tiền phòng, điện, nước, dịch vụ, gửi xe, phát sinh; đơn giá và số người ở chốt theo thời điểm hiệu lực.
3. **Q-19 + Q-21 + Q-24**: không sửa, xóa dữ liệu tiền; sửa sai bằng phiếu điều chỉnh hoặc yêu cầu hủy do Quản lý duyệt; cho thanh toán một phần.

---

## 4. Human Checkpoint

| Việc cần làm | Kết quả |
|---|---|
| Review và hoàn thiện Clarification Log | ☑ Nhóm chốt ngày 27/10/2026, đồng ý toàn bộ đề xuất (kể cả cách xử lý 5 mâu thuẫn) |
| Bổ sung câu hỏi còn thiếu, loại bỏ câu hỏi không phù hợp | ☑ Thêm Q-48…Q-60 (để sau); 5 câu chuyển sang Không áp dụng |
| Xác định stakeholder và thu thập câu trả lời | ☑ Chủ đề tự chọn: nhóm là bên quyết định; giảng viên đồng ý đổi đề |
| Cập nhật log và chuyển sang bước User Stories | ☑ `UserStories.md` đã viết lại theo bài toán mới (v0.2) |
