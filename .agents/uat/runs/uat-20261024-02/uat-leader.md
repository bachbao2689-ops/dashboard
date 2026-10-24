# Báo cáo UAT Persona: Leader (Run: uat-20261024-02)

- **Vai kiểm thử**: `uat-leader` (Bao gồm Leader A, Leader B, và Leader có `role=manager, employment_level=Leader`)
- **Môi trường**: Vercel Develop Preview (`https://dashboard-git-develop-bart-c8ff.vercel.app/`) & Local repository `Dev/src` | Branch: `develop` | SHA: `26686aa442ba9d4bbfcd1e7735d4c505bdf310ec`
- **Hình thức thực thi**: STATIC CODE AUDIT & TEST SUITE ANALYSIS (Tất cả 96 unit tests PASS). Live browser UI automation trên môi trường Preview/Local bị **BLOCKED** do chính sách bảo mật của môi trường IDE từ chối cấp quyền thao tác `execute_url` trên Chrome CDP.

---

## 1. Kết quả kiểm tra ma trận ca Leader (LD01 - LD10)

| Case ID | Biến thể Leader | Thao tác / Kịch bản | Expected (Quy chuẩn UAT & Source) | Actual (Kết quả kiểm chứng mã & test) | Trạng thái Static | Trạng thái Live UI | Bằng chứng mã nguồn / Test Suite | Bug ID liên quan |
|---|---|---|---|---|---|---|---|---|
| **LD01** | Leader A | Mở Dashboard/Workload/Analytics/filter/CSV | Chỉ thấy dữ liệu phòng ban A; không lộ dữ liệu phòng B | `workloadScope` giới hạn theo `department_id`; test `department Leader sees only own team even with stale foreign filter` PASS | **PASS** | **BLOCKED** | `Dev/src/lib/workloadScope.ts:18`, `Dev/tests/workloadScope.test.mjs:1` | — |
| **LD02** | Manager cấp Leader | Lặp LD01 với tài khoản có `role=manager, employment_level=Leader` | Vẫn bị giới hạn Leader phòng ban, không nâng thành Manager toàn hệ thống | `isGlobalManager()` loại trừ `level==='leader'`; `isDepartmentLeader()` nhận diện chuẩn xác; test `rank matrix matches workflow2_global` PASS | **PASS** | **BLOCKED** | `Dev/src/lib/roleScope.ts:18-23`, `Dev/tests/roleScope.test.mjs:1` | — |
| **LD03** | Leader A | Mở direct link/ID bản ghi phòng B không liên quan | UI và server từ chối; không trả nội dung chi tiết | Server RLS và query `workflow_old_task_access` trả `false`; `TaskDetailPanel` và `SubtaskDetailPanel` set `canEdit=false` | **PASS** | **BLOCKED** | `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:93-95` | — |
| **LD04** | Leader (Creator/PIC) | Giao task/subtask, đổi phase theo quyền | Đúng phạm vi parent; nhân viên nhận đúng task; UI đồng nhất | `workflowTaskPeople` gộp đúng creator/PIC/members; test `phase contributor avatars include explicit Sub-PICs` PASS | **PASS** | **BLOCKED** | `Dev/src/lib/workflowHub.ts:18-29`, `Dev/tests/workflowCalendar.test.mjs:27` | — |
| **LD05** | Leader (chỉ giao subtask) | Thử sửa parent/phase khi chỉ được giao subtask | Không tự có quyền quản lý toàn parent; việc được giao vẫn làm được | `canEdit_tasks` và `root` phân tách rạch ròi; test `phase/task-only users do not gain extra assignee eligibility` PASS | **PASS** | **BLOCKED** | `Dev/src/lib/workflowHub.ts:23-25`, `Dev/tests/workflowHub.test.mjs` | — |
| **LD06** | Leader A | Mention người khác và mở link mention | Mention đúng chính sách; Leader được tag Leader/Manager phòng khác; mention-only không lộ toàn Workflow | `canMentionPerson` cho phép Leader tag liên phòng ban; `opensSidebarNotification` trỏ đúng deep link | **PASS** | **BLOCKED** | `Dev/src/lib/roleScope.ts:113-122`, `Dev/tests/sidebarSignals.test.mjs` | — |
| **LD07** | Leader | Mở task sau khi Staff hoàn thành; kiểm tra giờ | Trạng thái done khớp; giờ hoàn thành là timestamp thật; không trùng bản ghi | Database trigger `complete_tracked_task` gán `completed_at=now()`; test `completion metrics use completion timestamps` PASS | **PASS** | **BLOCKED** | `Dev/supabase/migrations/20261021144920_manager_task_completion.sql:80` | — |
| **LD08** | Leader & Concurrency | Hai phiên cùng sửa phase/subtask từ version cũ | Không âm thầm ghi đè; xung đột được báo; dữ liệu mới nhất được giữ | **ĐÃ KHẮC PHỤC**: `updateTrackedTask` thực thi Optimistic Concurrency Control (OCC) qua `expectedUpdatedAt`. Nếu bản ghi bị sửa ở phiên khác, hệ thống chặn lưu và ném thông báo: *"Dữ liệu đã được người khác cập nhật trước đó. Vui lòng làm mới trang để xem phiên bản mới nhất."* Unit test `updateTrackedTask enforces OCC when expectedUpdatedAt is supplied` PASS | **PASS** | **BLOCKED** | `Dev/src/services/workspaceTasks.ts:25-38`, `Dev/tests/subtaskActivityLogAndDeadline.test.mjs:30` | BUG-UAT-02 (Resolved) |
| **LD09** | Leader | Đổi phòng ban/quyền tài khoản, refresh/đổi tab | Cache/filter cũ làm mới; không giữ dữ liệu phòng cũ | `workspaceScope()` giám sát `department_id`; khi đổi, tự động gọi `resource.reset()` cho cả 4 tài nguyên chia sẻ | **PASS** | **BLOCKED** | `Dev/src/services/workspaceResources.ts:37`, `Dev/tests/workspaceInvalidation.test.mjs` PASS | — |
| **LD10** | Leader Design vs Khác | Đối chiếu quyền duyệt tài sản Design vs phòng khác | Leader Design và Manager/Admin có quyền duyệt tài sản; Leader phòng khác bị từ chối | `isAssetApprover` trong `roleScope.ts:27` và `borrowWorkflow.ts:98` phân định quyền chuẩn xác | **PASS** | **BLOCKED** | `Dev/src/lib/roleScope.ts:27`, `Dev/src/services/borrowWorkflow.ts:98` | BUG-UAT-04 (Resolved) |

---

## 2. Tổng kết vai Leader
- **Leader**: PASS (Static): 10/10 (100%) | BLOCKED (Live UI): 10/10.
- **Kết luận**: Rủi ro ghi đè dữ liệu ngầm (BUG-UAT-02) đã được ngăn chặn dứt điểm bằng cơ chế OCC `expectedUpdatedAt`. Phân quyền Leader Design trong duyệt mượn tài sản hoạt động chuẩn xác theo nghiệp vụ.
