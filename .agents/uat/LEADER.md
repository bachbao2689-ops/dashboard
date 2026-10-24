# Ca nghiệm thu Leader

Owner: Nhi (Persona: Leader). Có Leader A, Leader B và trường hợp `role=manager` nhưng cấp bậc Leader. Mặc định NOT RUN. Creator/PIC và liên kết được cấp quyền có thể mở phạm vi cụ thể; phân biệt với rò rỉ dữ liệu phòng ban không liên quan.

| ID | Thao tác | Kết quả cần đối chiếu |
| --- | --- | --- |
| LD01 | Leader A mở Dashboard/Workload/Analytics/filter/CSV | Dữ liệu phòng A; không lộ bản ghi phòng B không liên quan |
| LD02 | Lặp LD01 với manager có employment_level=Leader | Vẫn là Leader phòng ban, không thành Manager toàn hệ thống |
| LD03 | Dùng direct link/ID bản ghi phòng B không liên quan trong session A | UI và server từ chối; response không lộ nội dung riêng |
| LD04 | Với vai creator/PIC, giao task/subtask, đổi phase đúng quyền | Quyền đúng phạm vi parent; nhân viên nhận đúng việc; backend đồng nhất UI |
| LD05 | Với vai chỉ được giao subtask, thử sửa parent/phase | Không tự có quyền quản lý toàn parent; phần việc được giao vẫn làm được |
| LD06 | Mention người khác và mở link được mention | Quyền mention đúng chính sách; mention-only không mở toàn Workflow |
| LD07 | Staff hoàn thành việc; Leader mở task, Profile và Workload | Cập nhật cùng trạng thái/giờ hoàn thành thật; không tạo bản ghi trùng |
| LD08 | Hai phiên sửa cùng phase từ version cũ | Không âm thầm ghi đè; xung đột được báo và dữ liệu mới được giữ |
| LD09 | Đổi phòng ban/quyền của tài khoản fixture qua luồng được phép, refresh/đổi tab | Cache/filter/quyền cũ được làm mới; không giữ dữ liệu phòng trước |
| LD10 | Đối chiếu Leader Design và Leader phòng khác trong tài sản | Duyệt tài sản đúng quyền hiện hành; không áp quyền Design cho mọi Leader |
