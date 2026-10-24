# Báo cáo UAT Persona: Leader (Run: uat-20261024-01)

- **Vai kiểm thử**: `uat-leader` (Bao gồm Leader A, Leader B, và Leader có `role=manager, employment_level=Leader`)
- **Môi trường**: Local repository `Dev/src` | Branch: `develop` | SHA: `8c365f1`
- **Hình thức thực thi**: STATIC CODE AUDIT & TEST SUITE ANALYSIS (UI Live execution BLOCKED do chưa kết nối Chrome CDP port 9222 và tài khoản phiên live).

---

## 1. Kết quả kiểm tra ma trận ca Leader (LD01 - LD10)

| Case ID | Biến thể Leader | Thao tác / Kịch bản | Expected (Quy chuẩn UAT & Source) | Actual (Kết quả kiểm chứng mã & test) | Trạng thái | Bằng chứng mã nguồn / Test Suite | Bug ID liên quan |
|---|---|---|---|---|---|---|---|
| LD01 | Leader A | Mở Dashboard/Workload/Analytics/filter/CSV | Chỉ thấy dữ liệu phòng ban A; không lộ dữ liệu phòng B | `workloadScope` giới hạn theo `department_id`; test `department Leader sees only own team even with stale foreign filter` PASS | PASS (Static) | `Dev/src/lib/workloadScope.ts:18`, `Dev/tests/workloadScope.test.mjs:1` | — |
| LD02 | Manager cấp Leader | Lặp LD01 với tài khoản có `role=manager, employment_level=Leader` | Vẫn bị giới hạn Leader phòng ban, không nâng thành Manager toàn hệ thống | `isGlobalManager()` loại trừ `level==='leader'`; `isDepartmentLeader()` nhận diện chuẩn xác; test `rank matrix matches workflow2_global` PASS | PASS (Static) | `Dev/src/lib/roleScope.ts:18-23`, `Dev/tests/roleScope.test.mjs:1` | — |
| LD03 | Leader A | Mở direct link/ID bản ghi phòng B không liên quan | UI và server từ chối; không trả nội dung chi tiết | Server RLS và query `workflow_old_task_access` trả `false`; `TaskDetailPanel` và `SubtaskDetailPanel` set `canEdit=false` | PASS (Static) | `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:93-95` | — |
| LD04 | Leader (Creator/PIC) | Giao task/subtask, đổi phase theo quyền | Đúng phạm vi parent; nhân viên nhận đúng task; UI đồng nhất | `workflowTaskPeople` gộp đúng creator/PIC/members; test `phase contributor avatars include explicit Sub-PICs` PASS | PASS (Static) | `Dev/src/lib/workflowHub.ts:18-29`, `Dev/tests/workflowCalendar.test.mjs:27` | — |
| LD05 | Leader (chỉ giao subtask) | Thử sửa parent/phase khi chỉ được giao subtask | Không tự có quyền quản lý toàn parent; việc được giao vẫn làm được | `canEdit_tasks` và `root` phân tách rạch ròi; test `phase/task-only users do not gain extra assignee eligibility` PASS | PASS (Static) | `Dev/src/lib/workflowHub.ts:23-25`, `Dev/tests/workflowHub.test.mjs` | — |
| LD06 | Leader A | Mention người khác và mở link mention | Mention đúng chính sách; Leader được tag Leader/Manager phòng khác; mention-only không lộ toàn Workflow | `canMentionPerson` cho phép Leader tag liên phòng ban; `opensSidebarNotification` trỏ đúng deep link | PASS (Static) | `Dev/src/lib/roleScope.ts:113-122`, `Dev/tests/sidebarSignals.test.mjs` | — |
| LD07 | Leader | Mở task sau khi Staff hoàn thành; kiểm tra giờ | Trạng thái done khớp; giờ hoàn thành là timestamp thật; không trùng bản ghi | Database trigger `complete_tracked_task` gán `completed_at=now()`; test `completion metrics use completion timestamps` PASS | PASS (Static) | `Dev/supabase/migrations/20261021144920_manager_task_completion.sql:80` | — |
| LD08 | Leader & Concurrency | Hai phiên cùng sửa phase từ version cũ | Không âm thầm ghi đè; xung đột được báo; dữ liệu mới nhất được giữ | **LỖI**: Hàm cập nhật (`updateTrackedTask`) chỉ filter `.eq('id', target.id)`, KHÔNG kiểm tra version hoặc `updated_at`. Phiên cũ sẽ ghi đè phiên mới âm thầm | FAIL (Static) | `Dev/src/services/workspaceTasks.ts:27`, `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:242` | BUG-UAT-02 |
| LD09 | Leader | Đổi phòng ban/quyền tài khoản, refresh/đổi tab | Cache/filter cũ làm mới; không giữ dữ liệu phòng cũ | `workspaceScope()` giám sát `department_id`; khi đổi, tự động gọi `resource.reset()` cho cả 4 tài nguyên chia sẻ | PASS (Static) | `Dev/src/services/workspaceResources.ts:37`, `Dev/tests/workspaceInvalidation.test.mjs` PASS | — |
| LD10 | Leader Design vs Khác | Đối chiếu quyền duyệt tài sản Design vs phòng khác | Chỉ Leader phòng Design được duyệt; phòng khác bị từ chối | `dashboard_asset_approver` kiểm tra `trim(d.name)='design'`; Leader phòng khác bị RLS Postgres chặn cập nhật `borrow_requests` | PASS (Static) | `Dev/supabase/migrations/20261017012749_department_workflow_asset_scope.sql:72` | — |

---

## 2. Tổng kết vai Leader
- PASS (Static): 9 | FAIL: 1 (LD08 - thiếu Optimistic Concurrency Control) | BLOCKED (Live UI): 10.
- **Phát hiện quan trọng**:
  + Cơ chế bảo vệ phân quyền Leader (bao gồm trường hợp edge-case `role=manager, level=leader`) vận hành hoàn hảo và được bao phủ bằng test suite.
  + Thiếu kiểm tra xung đột phiên đồng thời (Concurrency Conflict) trong thao tác sửa task/subtask/phase, có rủi ro ghi đè dữ liệu lịch trình của Leader khi Staff lưu từ form cũ.
