# Weekly Report — Leader gửi Manager

Phạm vi: `codex/develop-dashboard`, Supabase Dev `samuuyxxtocqmtujnnhe`. Tham chiếu `UX_UI_DESIGN_SYSTEM/GUIDELINE/UX_UI_GUIDELINES.md`, `GUIDELINE.md`, `UI Button.md` và báo cáo mẫu trong `Brief/`.

## Giao diện và nguồn công việc

- Xóa `ProfileTeamTab.tsx`, hai bảng Team Report Summary / All Team Reports, thanh kéo chia hai bảng và truy vấn đội ngũ riêng của chúng. `LeaderReports` dùng `WeeklyReportWorkspace` mới; Analytics vẫn có tab riêng.
- Tổng quan kỳ báo cáo: công việc trong kỳ, hoàn thành, đang làm, tạm hoãn; tách số công việc đã report khỏi số công việc đã hoàn thành.
- Sử dụng `useWorkspaceData` và `scopeTeamWorkload`, gồm task chính, project subtask và campaign subtask. Leader chỉ xem phòng mình, kể cả khi bộ lọc đã lưu thuộc phòng khác. Manager/Admin chọn tất cả hoặc từng phòng. Tính cả công việc của chính Leader.
- Task hoàn thành chỉ được cộng vào kỳ có `completed_at`; nhận diện cả `workflow_status=completed`. Task hoàn thành sau cuối kỳ vẫn giữ report/đầu ra của kỳ trước và được ghi rõ “Chưa hoàn thành tại cuối kỳ”; không suy đoán stage cũ. Hoàn thành thiếu ngày có cảnh báo riêng. Công việc đang mở được giữ để báo cáo WIP; task hủy/ẩn/xóa không vào tổng hợp.
- Biểu đồ thanh theo kênh/dự án và nhân sự. Kênh chưa khai báo hiển thị “Chưa phân kênh”; không suy đoán kênh từ tên task.
- Gallery gom theo Project/Campaign, giữ liên kết task gốc với ID có tiền tố `ps-`/`cs-`. Bộ lọc tìm kiếm/PIC/minh chứng chỉ ảnh hưởng gallery, không đổi KPI hoặc bản xuất. Chỉ mở chi tiết khi bấm Xem chi tiết.

## Dữ liệu báo cáo

Tái sử dụng `activity_log`. SQL tại `Dev/migrations/weekly-report-management.sql` đã áp dụng **chỉ Supabase Dev**, migration server `20261019093749_weekly_report_management`; không thay schema, trigger hoặc quyền trên Official.

| Action | Entity | Metadata |
| --- | --- | --- |
| `weekly_report` (đã có) | task / project_subtask / campaign_subtask | Nội dung, vướng mắc, bước tiếp theo và ảnh cũ; đọc đúng kỳ, đúng PIC hiện tại |
| `weekly_report_outputs` | task / project_subtask / campaign_subtask | `schema=1`, `week_start`, `week_end`, `channel`, `outputs[]` |
| `team_weekly_report_draft` | user, UUID Auth của người soạn | `schema=1`, kỳ, `department_id`, `notes` |
| `team_weekly_report_published` | user, UUID Auth của người gửi | Như draft và `snapshot` gồm công việc, trạng thái, nội dung, minh chứng tại lúc gửi |

- Mỗi lần lưu thêm bản ghi; bản mới nhất theo `created_at,id` được dùng. Mảng `outputs=[]` xóa khai báo trong kỳ một cách tường minh. Không thay đổi nội dung report do staff gửi.
- Mỗi đầu ra có tên, số lượng nguyên dương, đơn vị (`image`, `file`, `page`, `sku`, `option`), loại minh chứng và URL tùy chọn. Tối đa 50 đầu ra/task/kỳ, tệp tải lên tối đa 20 MB. Không cộng chéo các đơn vị. Ảnh cũ chỉ là minh chứng và có sản lượng 0.
- Không sửa trạng thái task khi cập nhật số lượng hoặc gửi báo cáo tổng hợp. Gửi bản chốt cần chọn một phòng ban và có nội dung tổng kết. Manager xem bản đã gửi qua cùng luồng đọc; đây là lưu báo cáo để xem, không tự tạo thông báo nhắc nhở.
- Bản đã gửi hiển thị snapshot đã lưu; cập nhật task/minh chứng sau đó không làm đổi bản này. Lịch sử cho phép mở lại từng lần gửi. RLS chặn UPDATE/DELETE các action báo cáo mới và chặn chuyển một log cũ thành báo cáo bằng UPDATE. INSERT kiểm tra cấp bậc quản lý, phòng ban, kỳ, notes/snapshot và số lượng; đầu ra còn cần quyền sửa task gốc. Action nghiệp vụ cũ giữ nguyên helper kiểm tra.
- Draft chỉ người soạn xem được trong phạm vi phòng ban được phép. Bản đã gửi đọc theo phòng ban đã lưu, không phụ thuộc tác giả còn active hay đang giữ chức vụ gì. Directory riêng cho báo cáo giữ cả nhân sự ngừng hoạt động; directory giao việc/Workload không thay đổi.
- Export PDF dùng cửa sổ bản in, cùng entries/notes của chế độ đang xem. Nội dung dài được in đầy đủ; văn bản/URL được escape và chỉ chấp nhận URL http/https.

## UX và hiệu năng

- Dùng ActionButton, Avatar, StatusBadge, bộ lọc phòng ban/PIC/lịch có sẵn. Nút mobile giữ icon và nhãn truy cập; bảng và gallery chuyển thành một cột khi cửa sổ nhỏ.
- Tái sử dụng card-hub và token Light/Dark. Ảnh nằm trên nền trung tính, object-contain, tải lazy. Popup chỉ làm mờ cục bộ; drawer có header/body/footer và focus/ESC.
- Bộ lọc theo tài khoản dùng `useRememberedState`. Bản nháp nội dung lưu khi bấm Lưu bản nháp; không giả thông báo đã lưu trước khi request thành công.
- Truy vấn log lọc action/kỳ/ID ở server, phân trang và chia nhóm tối đa 200 ID. Dùng realtime chung; chỉ nạp lại report khi sự kiện liên quan tuần đang xem. Không đăng ký socket riêng cho từng thành viên. Gallery tải thêm theo nhóm 12 thẻ.

## Kiểm tra

Unit tests: kỳ báo cáo, phân quyền phòng, ba loại task trùng UUID, tách đơn vị, minh chứng cũ, ghi đè số lượng trống, URL và an toàn bản in, snapshot không đổi.

Kiểm tra DB trên Dev dùng transaction rollback: Leader lưu/đọc snapshot và đầu ra; staff/Leader phòng khác không tạo/đọc snapshot; Admin đọc được; snapshot không sửa/xóa; lịch sử còn sau khi tác giả nghỉ/chuyển phòng/đổi cấp bậc; không chuyển log cũ qua action mới; số lượng lẻ bị từ chối. Kiểm tra trình duyệt dùng dữ liệu mô phỏng: lưu bản chốt, cập nhật minh chứng, số lượng bản chốt không đổi, bản in, 5 kích thước Light/Dark không tràn ngang.

Security Advisors sau migration không báo lỗi mới cho 3 helper báo cáo (đều SECURITY INVOKER, anon không có quyền execute). Dev có cảnh báo có sẵn: bảng `public.users` đang tắt RLS; đây là vấn đề bảo mật chung của directory/quyền tài khoản cần xử lý riêng trước khi phát hành Production. Không bật RLS bảng users trong bản thay UI này vì sẽ tác động toàn Dashboard.
