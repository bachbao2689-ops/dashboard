# Báo cáo UAT Persona: Staff (Run: uat-20261024-01)

- **Vai kiểm thử**: `uat-staff` (Bao gồm Staff có phòng ban, Staff chưa có phòng ban, Assignee, Creator/PIC và Mention-only)
- **Môi trường**: Local repository `Dev/src` | Branch: `develop` | SHA: `8c365f1`
- **Hình thức thực thi**: STATIC CODE AUDIT & TEST SUITE ANALYSIS (UI Live execution BLOCKED do chưa kết nối Chrome CDP port 9222 và tài khoản phiên live).

---

## 1. Kết quả kiểm tra ma trận ca Staff (ST01 - ST10)

| Case ID | Biến thể Staff | Thao tác / Kịch bản | Expected (Quy chuẩn UAT & Source) | Actual (Kết quả kiểm chứng mã & test) | Trạng thái | Bằng chứng mã nguồn / Test Suite | Bug ID liên quan |
|---|---|---|---|---|---|---|---|
| ST01 | Staff có phòng ban | Đăng nhập đầu ngày, mở My Tasks, lọc việc hôm nay / quá hạn | Nhìn rõ việc cần làm; số liệu khớp danh sách cá nhân | `taskOverdue`, `taskDueWithin`, `due-soon shortcuts` hoạt động chính xác; loại bỏ việc completed/cancelled | PASS (Static) | `Dev/src/lib/taskTracking.ts:58-60`, `Dev/tests/taskTracking.test.mjs:10` PASS | — |
| ST02 | Staff chưa có phòng ban | Mở team/filter/CSV/direct link | Staff chưa có phòng ban chỉ thấy cá nhân; server không lộ dữ liệu team khác | `workloadScope`: unassigned staff chỉ xem self; test `staff with a department sees only own team; unassigned staff sees self` PASS | PASS (Static) | `Dev/src/lib/workloadScope.ts:25`, `Dev/tests/workloadScope.test.mjs:2` PASS | — |
| ST03 | Staff Assignee | Nhận task từ notification, mở subtask & parent | Link mở đúng entity và ID; không nhầm UUID; không mở rộng quyền parent | `notificationLink` chuẩn hóa prefix `ps-`, `cs-`; test `kind and UUID stay distinct in notification links and writes` PASS | PASS (Static) | `Dev/supabase/functions/_shared/notificationLink.ts:11`, `Dev/tests/notificationLink.test.mjs` PASS | — |
| ST04 | Staff Assignee | Hoàn thành subtask được giao; xem lịch sử | Lưu bền vững, timestamp thật từ DB, không hoàn thành hộ người khác | `complete_tracked_task` gọi RPC có guard `can_complete_tracked_task`; chặn người ngoài | PASS (Static) | `Dev/supabase/migrations/20261021144920_manager_task_completion.sql:68`, `Dev/tests/entityStatusEditing.test.mjs` PASS | — |
| ST05 | Staff | Comment, sửa comment mình, thử sửa người khác, thử mạng rớt | Chỉ sửa của mình; retry không trùng; không mất draft khi rớt mạng | **LỖI 1**: Unit test `commentEditing.test.mjs:18` FAIL do sai lệch payload `{body, is_edited, updated_at}` vs `{body}`.<br>**LỖI 2**: Draft comment chỉ giữ trong `useState` React, F5/reload hoặc tắt drawer là MẤT HOÀN TOÀN | FAIL (Static) | `Dev/tests/commentEditing.test.mjs:18`, `Dev/src/components/features/comments/TaskComments.tsx:31` | BUG-UAT-01, BUG-UAT-04 |
| ST06 | Staff (Mention-only) | Được mention ở task ngoài team, mở link rồi thử mở parent khác | Chỉ xem nội dung được cấp; không tự có quyền toàn parent hoặc team khác | Test `opening one task cannot read siblings, other legacy kinds or its parent` PASS | PASS (Static) | `Dev/tests/sidebarSignals.test.mjs:32` PASS | — |
| ST07 | Staff | Nhận nhiều thông báo, mở 1 mục rồi reload | Chỉ mục được click đánh dấu đã đọc; badge đếm chính xác; actor không tự nhận thông báo của mình | `NotificationPopupStack` gọi `markNotificationsRead([n.id])`; sync badge từ `notificationStore` | PASS (Static) | `Dev/src/components/features/notifications/NotificationPopupStack.tsx:69` | — |
| ST08 | Staff (Mobile 360-430px) | Mở detail drawer, dropdown, bàn phím, nút bấm trên mobile | CTA không bị che; touch target tối thiểu 44px; không crop | **LỖI**: Nút đóng (X) và nút Chỉnh sửa có kích thước 30-36px (< 44px). Các nút hành động comment (Reply, Edit, Delete) dùng `group-hover:opacity-100` không chạm được trên màn hình cảm ứng | FAIL (Static) | `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:297, 300`, `CommentMessage.tsx:94` | BUG-UAT-05 |
| ST09 | Staff Borrower | Mượn tài sản, xem yêu cầu của mình, thử xem ID người khác | Không lộ lịch sử người khác; không submit trùng; trạng thái đúng | RLS policy `dashboard_borrow_select` giới hạn `requester_id = (select workflow_actor())`; Staff không thể query đơn người khác | PASS (Static) | `Dev/supabase/migrations/20261017012749_department_workflow_asset_scope.sql:94` | — |
| ST10 | Staff A -> Staff B | Logout Staff A, login Staff B trên cùng trình duyệt, mở link cũ | Không lộ cache/thông báo cũ của A; B chỉ thấy dữ liệu hợp lệ | `authStore.signOut()` gọi `disablePush()`, xóa token/session; `workspaceScope` đổi kích hoạt `resource.reset()` toàn bộ cache | PASS (Static) | `Dev/src/store/authStore.ts:224-235`, `Dev/src/services/workspaceResources.ts:37` | — |

---

## 2. Tổng kết vai Staff
- PASS (Static): 8 | FAIL: 2 (ST05 - test fail & mất draft khi reload; ST08 - touch target & hover nút mobile) | BLOCKED (Live UI): 10.
- **Phát hiện quan trọng**:
  + Cơ chế bảo vệ dữ liệu cá nhân của Staff chưa có phòng ban và người được mention-only hoạt động rất chặt chẽ.
  + Trải nghiệm mobile trên màn hình 360-430px còn nhiều bất cập (touch target nhỏ dưới 44px, nút ẩn sau hiệu ứng hover chuột).
  + Thất bại trong test suite regression `commentEditing.test.mjs:18`.
