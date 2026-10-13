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
- Workflow → nguồn: `/projects?project=<uuid>` hoặc `/projects?campaign=<uuid>`, mở lại đúng panel.
- Panel nguồn hiển thị tiến độ chung, PIC/sub-PIC, phase và các Tasks tạo trong Workflow. Subtasks hiện có nằm ở phần Subtasks.
- Công việc chưa gắn giai đoạn vẫn được tính đúng theo parent. PIC mở Workflow và chọn phase để gắn tại chỗ.
- Tạo/sửa phase và phê duyệt Gate dùng các RPC Workflow hiện có. RLS giữ nguyên quyền Admin/PIC/sub-PIC/task assignee; UI chỉ hiển thị dữ liệu được phép đọc.
- Ẩn/xóa parent loại nó khỏi danh sách active của cả hai tab, không tạo parent thay thế.

## Realtime

Migration `Dev/migrations/workflow-project-sync.sql` bổ sung các bảng nguồn vào `supabase_realtime`, chỉ khi đã bật RLS. Không đổi policy/quyền.

`useWorkspaceRealtime` xử lý thay đổi qua Postgres Changes, debounce 180ms khi một transaction đổi nhiều bảng, đọc lại sau reconnect/focus/visibilitychange, và có dự phòng 60 giây khi trình duyệt tạm ngưng. Sự kiện `workspace:changed`/`tasks:changed`/`projects:changed`/`campaigns:changed` làm mới ngay trong phiên đang dùng.

## Kiểm tra

```sh
cd Dev
npm run build
node --test tests/workflowHub.test.mjs tests/workflowMetrics.test.mjs
DATABASE_URL='<connection string>' node scripts/testWorkflowHub.mjs
```

Kiểm tra database nằm trong transaction và luôn rollback: quyền theo scope, mapping UUID, task có sẵn, tạo task, Gate, dữ liệu Project gốc, hide và publication realtime. Không lưu credential vào source.
