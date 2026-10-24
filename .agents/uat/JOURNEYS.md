# Một ngày làm việc thật — ca liên vai

Owner: Nhi; Hiệp điều phối các agent persona. Chạy tuần tự trên cùng fixture được bàn giao bằng ID; không dùng tài khoản Admin cho mọi bước. Mặc định NOT RUN.

| ID | Kịch bản | Điểm nghiệm thu |
| --- | --- | --- |
| J01 | Manager tạo Project/Campaign → Leader nhận PIC → giao task/subtask → Staff nhận thông báo và hoàn thành → Leader kiểm tra → Manager xem báo cáo | Không cần thao tác ngoài hệ thống để hoàn thành; cùng bản ghi và tiến độ nhất quán ở từng vai |
| J02 | Đang gõ comment/cập nhật việc thì mất mạng → retry → reload → vai khác mở lại | Không báo thành công giả, không mất draft, không nhân đôi dữ liệu; trạng thái cuối khớp server |
| J03 | Leader sửa lịch/đổi người giao khi Staff đang mở panel cũ | Quyền và lịch được kiểm tra lại khi ghi; không ghi đè thay đổi mới bằng phiên cũ |
| J04 | Staff A gửi comment → Staff B nhận popup/chuông/Profile/push nếu đã cấp quyền → mở một kênh | Mọi kênh cùng deep link/recipient; đọc đồng bộ; không gửi nhầm người hay nhân đôi sự kiện |
| J05 | Hết ngày: hoàn thành việc, xem báo cáo tuần, filter ranh giới ngày/tuần/múi giờ | Done còn trong lịch sử; timestamp là sự kiện thật; tổng/danh sách nhất quán; không suy completed_at từ deadline |
| J06 | Đăng xuất/phiên hết hạn, quay lại tab cũ, mở link trực tiếp; chạy desktop/mobile Light và Dark | Không bypass đăng nhập, không lộ dữ liệu phiên trước; thông báo lỗi rõ, thao tác chính vẫn tiếp cận được |

Ghi thêm ma sát sử dụng: bước gây nhầm, nhãn không rõ, thao tác thừa, việc người dùng không biết làm tiếp. Phân biệt bug vi phạm yêu cầu với đề xuất UX. Đừng tự đặt SLA thời gian chưa được thống nhất; đo và ghi thời gian/điều kiện thực tế.
