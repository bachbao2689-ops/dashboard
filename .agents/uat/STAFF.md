# Ca nghiệm thu Staff

Owner: Nhi (Persona: Staff). Chạy Staff A/B, Staff chưa có phòng ban, assignee, creator/PIC và mention-only theo fixture. Tên Staff là persona nghiệp vụ; xác minh role thực tế (source có thể dùng member), không tự tạo role mới. Mặc định NOT RUN.

| ID | Thao tác | Kết quả cần đối chiếu |
| --- | --- | --- |
| ST01 | Đăng nhập đầu ngày, mở Dashboard/My Tasks, lọc việc hôm nay/quá hạn | Nhìn ra việc cần làm; số liệu khớp danh sách và quyền |
| ST02 | Staff có phòng ban và chưa có phòng ban mở team/filter/CSV/direct link | Có phòng ban chỉ phạm vi team được phép; chưa có phòng ban chỉ cá nhân; server không lộ dữ liệu ngoài phạm vi |
| ST03 | Nhận task từ notification, mở task/subtask và parent liên quan | Link mở đúng loại/ID; không nhầm UUID; không mở rộng quyền parent ngoài quy định |
| ST04 | Hoàn thành subtask được giao, reload và xem lịch sử | Lưu bền vững, timestamp thật, tác động tiến độ đúng; không hoàn thành hộ việc không có quyền |
| ST05 | Comment, sửa comment mình, thử sửa của người khác; thử mạng lỗi | Chỉ sửa của mình; thất bại giữ draft; retry không tạo comment trùng |
| ST06 | Được mention ở task ngoài phạm vi team, mở link rồi thử parent khác | Chỉ mở nội dung được cấp; không tự có quyền toàn parent hoặc team khác |
| ST07 | Nhận nhiều notification, mở một mục rồi reload | Chỉ mục đúng được đánh dấu đọc; badge tính đủ; actor không tự nhận sự kiện mình |
| ST08 | Trên mobile mở detail, dropdown, nhập comment với bàn phím và đóng/mở | CTA/footer không bị che, popup không crop; focus/touch target dùng được |
| ST09 | Mượn tài sản nếu role được phép, xem yêu cầu của mình và thử ID người khác | Không lộ lịch sử ngoài quyền; gửi lặp không tạo xử lý kép; trạng thái phản ánh đúng dữ liệu |
| ST10 | Logout, login Staff B cùng trình duyệt, mở filter/notification/link cũ | Không lộ cache/phiên/thông báo của A; B chỉ thấy dữ liệu hợp lệ |
