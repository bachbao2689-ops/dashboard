# Báo cáo UAT Persona: Admin & Manager (Run: uat-20261024-01)

- **Vai kiểm thử**: `uat-admin-manager` (Phân định độc lập Admin và Manager toàn hệ thống)
- **Môi trường**: Local repository `Dev/src` | Branch: `develop` | SHA: `8c365f1`
- **Hình thức thực thi**: STATIC CODE AUDIT & TEST SUITE ANALYSIS (UI Live execution BLOCKED do chưa kết nối Chrome CDP port 9222 và tài khoản phiên live).

---

## 1. Kết quả kiểm tra ma trận ca Admin & Manager (AM01 - AM10)

| Case ID | Vai trò | Bước đối chiếu / Kịch bản | Expected (Quy chuẩn UAT & Source) | Actual (Kết quả kiểm chứng mã & test) | Trạng thái | Bằng chứng mã nguồn / Test Suite | Bug ID liên quan |
|---|---|---|---|---|---|---|---|
| AM01-ADMIN | Admin | Đăng nhập, xem Dashboard, đổi phòng ban, khoảng ngày | Thấy toàn bộ dữ liệu hệ thống; KPI khớp danh sách | Code `isAdmin()` cho phép truy cập mọi scope; lọc phòng ban linh hoạt; test `department Leader sees only own team, global Manager can filter all` PASS | PASS (Static) | `Dev/src/lib/roleScope.ts:11`, `Dev/tests/workloadScope.test.mjs:22` | — |
| AM01-MANAGER | Manager | Đăng nhập, xem Dashboard, đổi phòng ban, khoảng ngày | Thấy dữ liệu toàn hệ thống trừ trường hợp `role=manager, level=leader` | `isGlobalManager()` xác nhận `role==='manager' && level!=='leader'`; truy cập đầy đủ các team | PASS (Static) | `Dev/src/lib/roleScope.ts:15`, `Dev/src/pages/Dashboard.tsx` | — |
| AM02-ADMIN | Admin | Tạo Project/Campaign test, chọn PIC & lịch | Lưu 1 parent duy nhất, PIC/lịch lưu đầy đủ | `useProjectsController` dùng `creationLock.current` chống duplicate submit; transaction lưu `project_members` | PASS (Static) | `Dev/src/hooks/useProjectsController.tsx:511-539` | — |
| AM02-MANAGER | Manager | Tạo Project/Campaign test, chọn PIC & lịch | Lưu 1 parent duy nhất, PIC/lịch lưu đầy đủ | Phân quyền Manager được phép tạo Project; lock chống submit kép hoạt động | PASS (Static) | `Dev/src/hooks/useProjectsController.tsx:511-539` | — |
| AM03-ADMIN | Admin | Tạo phase/task/subtask, giao Leader/Staff | Đồng nhất ID bản ghi, mở từ Workflow và All Tasks | `taskTarget` và `taskKey` chuẩn hóa ID `ps-`, `cs-`; test `same normalized tasks feed Project, All Tasks and Workload` PASS | PASS (Static) | `Dev/src/lib/taskTracking.ts:5-8`, `Dev/tests/taskTracking.test.mjs:5` | — |
| AM03-MANAGER | Manager | Tạo phase/task/subtask, giao Leader/Staff | Đồng nhất ID bản ghi, mở từ Workflow và All Tasks | Đầy đủ quyền giao task/subtask trong phạm vi quản trị | PASS (Static) | `Dev/src/services/workspaceTasks.ts`, `Dev/src/hooks/useWorkflowManagement.ts` | — |
| AM04-ADMIN | Admin | Đặt ngày con ngoài lịch cha / lịch không hợp lệ | Từ chối ở backend; bản ghi cũ không đổi; báo lỗi rõ | **LỖI**: `SubtaskDetailPanel.tsx` chỉ kiểm tra `startDate > dueDate`, KHÔNG kiểm tra bounds cha. Backend Postgres thiếu constraint/trigger chặn ngày con ngoài ngày cha | FAIL (Static) | `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:227-230`, Migrations thiếu CHECK | BUG-UAT-03 |
| AM04-MANAGER | Manager | Đặt ngày con ngoài lịch cha / lịch không hợp lệ | Từ chối ở backend; bản ghi cũ không đổi; báo lỗi rõ | Tương tự Admin: subtask detail cho phép lưu ngày ngoài khoảng của Project/Campaign | FAIL (Static) | `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:227-230` | BUG-UAT-03 |
| AM05-ADMIN | Admin | Duyệt Gate dưới 80%, sau đó đủ tiêu chí | Chặn duyệt khi < 80% hoặc chưa xong task; thiếu mẫu số hiện '—' | `gateReady` yêu cầu `progress.done === progress.total` và `passed / total >= 0.8`. `gateScore` trả `null` -> '—' khi `total === 0` | PASS (Static) | `Dev/src/lib/workflowHub.ts:53-62`, `Dev/tests/workflowHub.test.mjs` PASS | — |
| AM05-MANAGER | Manager | Duyệt Gate dưới 80%, sau đó đủ tiêu chí | Chặn duyệt khi < 80% hoặc chưa xong task; thiếu mẫu số hiện '—' | Logic thống nhất với Admin; test `approval requires all active phase tasks and exact 80 percent threshold` PASS | PASS (Static) | `Dev/src/lib/workflowHub.ts:53-62` | — |
| AM06-ADMIN | Admin | Xem Team Workload, Analytics, xuất CSV, Done | Tổng khớp dữ liệu; Done lưu lịch sử, không mất | `reportAnalytics` dùng `taskDay(completed_at)` giữ Done trong lịch sử. Cancelled task bị loại bỏ đúng chuẩn | PASS (Static) | `Dev/src/lib/taskTracking.ts:20-50`, `Dev/tests/taskTracking.test.mjs:2` | — |
| AM06-MANAGER | Manager | Xem Team Workload, Analytics, xuất CSV, Done | Tổng khớp dữ liệu; Done lưu lịch sử, không mất | Scope dữ liệu Manager khớp toàn bộ task active và completed theo range | PASS (Static) | `Dev/src/pages/Workload.tsx`, `Dev/src/lib/workloadScope.ts` | — |
| AM07-ADMIN | Admin | Quản lý thành viên, đổi role/phòng ban | Admin được cấp quyền quản lý; server chặn nâng quyền trái phép | `AdminRoute` và `roleScope.isAdmin()` bảo vệ route `/overview`. Migration cấp quyền users | PASS (Static) | `Dev/src/components/auth/ProtectedRoute.tsx:32-37`, `Dev/src/pages/MemberManagement.tsx` | — |
| AM07-MANAGER | Manager | Quản lý thành viên, đổi role/phòng ban | Manager không tự có toàn quyền sửa nhân sự/nâng role của Admin | `AdminRoute` chặn Manager truy cập trang quản trị nhân sự Admin (`isAdmin(profile) ? children : Navigate to /my-tasks`) | PASS (Static) | `Dev/src/components/auth/ProtectedRoute.tsx:36` | — |
| AM08-ADMIN | Admin | Thử sửa/xóa comment của Staff | Chỉ tác giả sửa/xóa được; Admin/Manager không sửa/xóa thay | `editOwnedComment` và `deleteOwnedComment` truy vấn kèm `.eq('author_id', actorId)` và `.eq('user_id', actorId)`. Trả về 0 row -> ném lỗi | PASS (Static) | `Dev/src/lib/commentEditing.ts:19,24,33`, `Dev/src/lib/commentDeletion.ts:28,31,35` | — |
| AM08-MANAGER | Manager | Thử sửa/xóa comment của Staff | Chỉ tác giả sửa/xóa được; Manager không sửa/xóa thay | Cùng cơ chế bảo vệ như Admin; server/client đảm bảo tính toàn vẹn tác giả | PASS (Static) | `Dev/src/lib/commentEditing.ts`, `Dev/src/lib/commentDeletion.ts` | — |
| AM09-ADMIN | Admin | Mở quản lý tài sản, duyệt mượn tài sản | Admin là asset approver hợp lệ theo policy backend | `dashboard_asset_approver()` backend và `isAssetApprover()` frontend trả `true` cho role `admin` | PASS (Static) | `Dev/supabase/migrations/20261017012749_department_workflow_asset_scope.sql:71`, `roleScope.ts:27` | — |
| AM09-MANAGER | Manager | Mở quản lý tài sản, duyệt mượn tài sản | Manager KHÔNG tự động là approver nếu không thuộc Design | `dashboard_asset_approver()` backend chặn Manager thường (`not public.workflow2_global and role/level=leader and dept=design`). RLS chặn update | PASS (Static) | `Dev/supabase/migrations/20261017012749_department_workflow_asset_scope.sql:72`, `roleScope.ts:27` | — |
| AM10-ADMIN | Admin | Mở Main-view, thử thao tác ghi | Main-view chỉ đọc; chặn request ghi trực tiếp | Client proxy `officialReadClient` từ chối các HTTP method ngoài `GET`/`HEAD`. Storage key riêng biệt `kcoffee_official_view_session` | PASS (Static) | `Dev/src/services/officialReadOnly.ts:14-26`, `Dev/src/pages/MainReadOnly.tsx` | — |
| AM10-MANAGER | Manager | Mở Main-view, thử thao tác ghi | Main-view chỉ đọc; chặn request ghi trực tiếp | Adapter chặn tương tự Admin; không phát sinh request ghi vào Production | PASS (Static) | `Dev/src/services/officialReadOnly.ts:14-26` | — |

---

## 2. Tổng kết vai Admin & Manager
- **Admin**: PASS (Static): 9 | FAIL: 1 (AM04 - subtask date boundary) | BLOCKED (Live UI): 10.
- **Manager**: PASS (Static): 9 | FAIL: 1 (AM04 - subtask date boundary) | BLOCKED (Live UI): 10.
- **Phát hiện quan trọng**:
  + Cơ chế bảo mật phân quyền, phân tách Admin/Manager và cô lập Main-view rất chặt chẽ.
  + Thiếu sót kiểm tra bounds ngày cấp subtask trong `SubtaskDetailPanel.tsx` dẫn đến vi phạm AM04.
