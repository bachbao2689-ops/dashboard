# Projects/Campaigns ↔ Workflow Management

## Nguồn dữ liệu

- `projects` và `campaigns` giữ tên, mô tả/mục tiêu, trạng thái, ngày, PIC, ngân sách và liên kết Project → Campaign.
- Mỗi bản ghi có đúng một `workflow_tracks` theo `(entity_type, entity_id)`. Không tạo Project/Campaign mẫu trong UI.
- `workflow_phases` giữ ID giai đoạn ổn định, thứ tự, PIC/sub-PIC, lịch và checklist. RPC dùng `version` để từ chối ghi đè dữ liệu vừa được người khác sửa.
- `tasks`, `project_subtasks`, `campaign_subtasks` là ba nguồn công việc hiện có. Liên kết qua `workflow_phase_id` tại bản ghi gốc; không sao chép task hoặc đổi ID bình luận.
- Hai tab dùng `useWorkflowHub`, `parentTasks` và `taskProgress`. Project có `campaign_id` vẫn giữ luồng Project riêng; không tự gộp task Project vào phase Campaign.
- Không có task/deadline/completion timestamp thì chỉ số tương ứng là `—`; không dùng số giả hoặc ngày mặc định.

## Điều hướng và thao tác

- Projects/Campaigns → Workflow: `/workflow?project=<uuid>` hoặc `/workflow?campaign=<uuid>`, có thể thêm `phase=<uuid>`.
- Panel nguồn dùng `/projects?project=<uuid>` hoặc `/projects?campaign=<uuid>` để mở đúng Project/Campaign.
- Header Workflow tập trung tên, lịch, PIC, avatar người phụ trách task và trạng thái; không hiển thị mô tả, ưu tiên hoặc link nguồn/realtime phụ.
- Chọn thẻ chặng hoặc dropdown chỉ đổi chặng đang chọn. Chỉ nút **Xem chi tiết** mở Gate và danh sách task; chọn chặng khác đóng phần chi tiết.
- Thẻ chặng có hai hàng PIC/Subtask chỉ hiển thị avatar; tên nằm trong tooltip. Subtask lấy người phụ trách công việc thực tế, loại trùng theo ID.
- Panel nguồn hiển thị tiến độ chung, PIC/sub-PIC, phase và các Tasks tạo trong Workflow. Subtasks hiện có nằm ở phần Subtasks.
- Công việc chưa gắn giai đoạn vẫn được tính đúng theo parent. PIC mở Workflow và chọn phase để gắn tại chỗ.
- Tạo/sửa phase và phê duyệt Gate dùng các RPC Workflow hiện có. RLS giữ nguyên quyền Admin/PIC/sub-PIC/task assignee; UI chỉ hiển thị dữ liệu được phép đọc.
- Ẩn/xóa parent loại nó khỏi danh sách active của cả hai tab, không tạo parent thay thế.

## Lịch và trọng số Gate

Migration `Dev/supabase/migrations/20261013133134_workflow_calendar_hierarchy.sql` bổ sung `start_date` cho hai bảng Subtasks và trigger kiểm tra lịch tại database.

- Tạo chặng mới: mặc định ngày bắt đầu/kết thúc theo Project/Campaign. Campaign dùng `end_date` làm hạn kết thúc.
- Tạo task mới: mặc định lịch chặng, lấy giao với khoảng ngày của Project/Campaign. Calendar dùng component có sẵn, khóa ngày ngoài khoảng cho phép.
- Backend áp dụng cùng quy tắc cho Tasks và Subtasks, kể cả khi ghi ngoài UI. Task được gắn chặng vẫn giữ ID và comments.
- Không đổi lịch các bản ghi đã có. Các cập nhật trạng thái không sửa ngày vẫn thực hiện bình thường.
- Thêm tiêu chí Gate cho phép nhập trọng số lớn hơn 0 đến 100%, hỗ trợ số thập phân. Điểm Gate = tổng trọng số đã đạt / tổng trọng số các tiêu chí; điều kiện duyệt vẫn là tất cả task hoạt động đã xong và Gate ≥80%.

## Realtime

Migration `Dev/migrations/workflow-project-sync.sql` bổ sung các bảng nguồn vào `supabase_realtime`, chỉ khi đã bật RLS. Không đổi policy/quyền.

`useWorkspaceRealtime` xử lý thay đổi qua Postgres Changes, debounce 180ms khi một transaction đổi nhiều bảng, đọc lại sau reconnect/focus/visibilitychange, và có dự phòng 60 giây khi trình duyệt tạm ngưng. Sự kiện `workspace:changed`/`tasks:changed`/`projects:changed`/`campaigns:changed` làm mới ngay trong phiên đang dùng.

## Kiểm tra

```sh
cd Dev
npm run build
node --test tests/workflowHub.test.mjs tests/workflowMetrics.test.mjs tests/workflowCalendar.test.mjs
DATABASE_URL='<connection string>' node scripts/testWorkflowHub.mjs
DATABASE_URL='<connection string>' node scripts/testWorkflowCalendar.mjs
```

Kiểm tra database nằm trong transaction và luôn rollback: quyền theo scope, mapping UUID, task có sẵn, tạo task, Gate, dữ liệu Project gốc, hide và publication realtime. Không lưu credential vào source.

## Bình luận công việc

- Task dùng `comments`; Project/Campaign Subtask dùng `activity_log` với đúng `entity_type`, UUID gốc và `action = comment`. Không tạo bản sao thread khi gắn chặng.
- `TaskComments` dùng chung giữa Workflow, All Tasks và Projects/Campaigns. Nút comments mở đúng công việc, cuộn và focus ô nhập; hiện người viết, ngày giờ và số bình luận thật.
- RPC `workflow_task_comment_counts` đọc số lượng và thời điểm mới nhất dưới RLS của người đăng nhập (security invoker), không dùng bộ đếm cache có thể cũ khi xóa. Migration: `20261013160019_workflow_comment_tracking.sql`.
- Thread cập nhật qua Realtime, reconnect, focus và dự phòng 30 giây. Đổi task loại phản hồi cũ; refresh nền không làm mất bản nháp. Gửi lỗi giữ nội dung, khóa gửi khi đang xử lý; Enter gửi, Shift+Enter xuống dòng.
- Kiểm tra database: `DATABASE_URL='<connection string>' node scripts/testWorkflowComments.mjs`. Các fixture đều rollback, kiểm tra ba loại task, quyền tác giả/scope, count khi sửa/xóa và giữ thread khi gắn chặng.

## Tracking giữa các tab (14/10/2026)

- `readWorkspaceTasks` phân trang ba nguồn Tasks, Project Subtasks, Campaign Subtasks. All Tasks, Workflow, Dashboard, Analytics, Workload và Team Report dùng cùng ID (`UUID`, `ps-UUID`, `cs-UUID`), timestamp và parent scope. Parent ẩn/xóa được lọc thống nhất.
- KPI loại công việc đã hủy; deadline vẫn đúng hạn trong ngày hết hạn. Chart hoàn thành/cycle time dùng `completed_at`, không lấy thời gian sửa mô tả. Công việc hoàn thành cũ thiếu timestamp không được gán ngày giả.
- Phòng ban dùng danh sách UUID thật và Workflow tracks; chart/khối task link đúng công việc. Các chỉ số chưa có nguồn như chi phí thực tế, đánh giá hài lòng và target hiển thị `—`. Workload là ước tính được ghi rõ: 5 task đang mở/người = 100%.
- Report đọc/lưu cả ba loại công việc trong `activity_log`, tách theo `entity_type` và UUID gốc; không lẫn khi UUID trùng giữa hai bảng. Báo cáo tuần dùng ngày hoàn thành thật, không đổi tuần khi task đã xong được chỉnh sửa.
- Link thông báo dùng `entityLink`, mở đúng task/subtask, Project/Campaign, thiết bị hoặc phiếu mượn. Realtime có refresh khi reconnect/focus và dự phòng cho bảng chưa publish.

### Migration đang chờ áp dụng

**Theo lựa chọn của người dùng: chỉ sửa source; chưa áp dụng migration lên Supabase dùng chung.**

`Dev/supabase/migrations/20261014105438_workspace_tracking_reports.sql` chứa source trigger timestamp đã có, RPC `save_task_weekly_reports` và `complete_tracked_tasks` (security invoker, RLS hiện tại, không backfill dữ liệu). Hai RPC xử lý batch trong một transaction: lỗi một task thì toàn bộ batch rollback. Đã kiểm tra với fixture trong transaction rollback.

Trong khi chưa áp dụng: report thông thường dùng luồng ghi log hiện có với đúng kind/UUID/author/workspace; hoàn thành hàng loạt và hoàn thành từ Report chưa bật. Hoàn thành từng công việc trong panel chi tiết vẫn dùng luồng hiện có. Sau khi migration được phê duyệt và áp dụng, tải lại trang để phát hiện RPC và bật thao tác batch.

Kiểm tra source: `cd Dev && npm run build && node --test tests/taskTracking.test.mjs tests/workflowHub.test.mjs tests/workflowMetrics.test.mjs tests/workflowCalendar.test.mjs`. Kiểm tra migration: `DATABASE_URL='<connection string>' node scripts/testTrackingReports.mjs` (DDL/fixture đều rollback; không áp dụng migration thật).
