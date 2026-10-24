# Ca nghiệm thu Admin và Manager

Owner: `uat-admin-manager`. Chạy riêng từng case với Admin và Manager; dùng hậu tố `-ADMIN`/`-MANAGER` cho kết quả. Mọi case mặc định NOT RUN. Quyền quản trị nhân sự và duyệt tài sản phải đối chiếu source/backend, không mặc định Manager có mọi quyền Admin.

| ID | Thao tác như người dùng | Kết quả cần đối chiếu |
| --- | --- | --- |
| AM01 | Đăng nhập, xem Dashboard, đổi phòng ban và khoảng ngày | Chỉ có dữ liệu được quyền; KPI khớp danh sách cùng bộ lọc và fixture |
| AM02 | Tạo Project và Campaign test, chọn PIC và lịch; reload và mở từ danh sách | Lưu đúng một parent mỗi lần; PIC/lịch giữ đúng; không mất dữ liệu sau reload |
| AM03 | Tạo phase/task/subtask, giao Leader và Staff; mở từ Workflow và All Tasks | Cùng ID bản ghi, assignee/lịch nhất quán; nhận việc đúng người |
| AM04 | Đặt ngày con ngoài lịch cha và lịch không hợp lệ qua UI/request test | Từ chối ở backend; bản ghi cũ không bị đổi; lỗi dễ hiểu |
| AM05 | Thử duyệt Gate dưới 80%, sau đó đủ tiêu chí/lịch/task theo quy định | Chặn hoặc cho phép đúng toàn bộ điều kiện; thiếu mẫu số hiện — |
| AM06 | Xem Team Workload, Analytics, báo cáo/CSV nếu có; đối chiếu số Done | Tổng khớp dữ liệu nguồn và quyền; Done không biến mất khỏi lịch sử |
| AM07 | Mở quản lý thành viên, thử hành động được phép và bị cấm trên fixture | Kiểm tra riêng quyền Admin/Manager; không nâng quyền trái phép; lỗi quyền phải do server chặn |
| AM08 | Thử sửa/xóa comment của Staff rồi comment chính mình | Chỉ tác giả được sửa/xóa; lỗi lưu giữ bản nháp; không mất comment người khác |
| AM09 | Mở quản lý tài sản/yêu cầu mượn với từng tài khoản | Chỉ role được backend cho phép mới duyệt; không suy Manager đương nhiên là asset approver |
| AM10 | Mở Main-view và thử thao tác ghi trên UI; kiểm tra request đã chặn | Main-view chỉ đọc; không phát sinh ghi Official; không chạy request ghi trực tiếp vào Production |
