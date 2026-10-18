# Phạm vi hiển thị Team Workload

Áp dụng cùng một nguồn `Dev/src/lib/workloadScope.ts` cho `/team`, các biểu đồ Team Workload nhúng trong `/reports`, số liệu Analytics và file CSV xuất từ Reports.

| Người xem | Thành viên và phòng ban được hiển thị | UI lọc phòng ban |
| --- | --- | --- |
| Admin / Manager toàn hệ thống | Tất cả team; có thể chọn từng phòng ban | Overview và các phòng ban |
| Leader / Staff đã có phòng ban | Chỉ thành viên và performance của phòng ban mình | Tên team cố định, không có lựa chọn team khác |
| Staff chưa có phòng ban | Chỉ performance cá nhân | Không có lựa chọn phòng ban |

Task có PIC được tính cho team của PIC, kể cả khi Project/Campaign thuộc phòng ban khác. Task chưa có PIC được tính cho phòng ban sở hữu Project/Campaign hoặc task. Task của PIC ngoài team không đi vào KPI, biểu đồ, danh sách drilldown hoặc CSV của team đang xem. Bộ lọc cũ lưu trên trình duyệt bị ép về phạm vi được phép khi vai trò hoặc phòng ban thay đổi.

## Kiểm tra trước khi phát hành

1. Chạy `npm run build` trong `Dev` và `node --experimental-strip-types --test tests/*.test.mjs`.
2. Đối chiếu tài khoản Leader/Staff của hai phòng ban: mỗi người chỉ thấy team mình; Admin/Manager xem được tất cả và lọc từng team.
3. Xác nhận `/team`, `/reports` và CSV có cùng phạm vi; kiểm tra bộ lọc cũ trỏ sang team khác.
4. Push `codex/develop-dashboard` và kiểm tra preview. Khi phát hành, fast-forward `main` từ Develop rồi xác nhận hai nhánh có cùng commit và Vercel phục vụ đúng bundle.

Phạm vi này áp dụng cho màn hình performance. Quyền xem task cộng tác và RLS hiện có của các bảng task không bị thay đổi bởi tính năng này.
