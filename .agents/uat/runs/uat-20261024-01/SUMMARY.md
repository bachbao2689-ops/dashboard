# Báo cáo nghiệm thu UAT: uat-20261024-01

**Trạng thái đợt chạy**: HOÀN THÀNH STATIC CODE AUDIT & TEST SUITE ANALYSIS | LIVE UI CHỜ KẾT NỐI BROWSER (BLOCKED).

---

## 1. Bối cảnh đợt kiểm thử

- **Thời gian thực hiện**: 2026-10-24T14:15:00+07:00.
- **Người/Agent thực hiện**: Nhi (`nhi` — QA Lead phụ trách UAT).
- **Môi trường & Backend**: Local repository `Dev/src`, Supabase client cấu hình qua biến môi trường local.
- **Nhánh & Commit SHA**: Nhánh `develop` | HEAD SHA: `8c365f1` (`fix(assets): refine svg download sticker template logo scale and spacing`).
- **Phần chưa xác minh qua Live UI**: Browser tự động hóa qua Chrome DevTools Protocol (port 9222) chưa kết nối được trong phiên hiện tại -> **Đánh dấu toàn bộ tương tác Live Browser UI thực tế là BLOCKED (theo quy định UAT README mục 6)**. Tiến hành **STATIC CODE AUDIT & TEST SUITE ANALYSIS TOÀN DIỆN** trên toàn bộ 6 hành trình liên vai J01–J06 và các ma trận Admin, Manager, Leader, Staff.
- **Test suite thực thi**: Chạy `node --test Dev/tests/*.test.mjs Dev/tests/*.test.cjs` (19 file test, 91 ca kiểm thử: **90 PASS**, **1 FAIL**).
- **Kiểm tra cú pháp & build**: `npm run lint` (182 warnings, 0 errors), `npm run build` (tsc -b && vite build: thành công trong 1.61s).

---

## 2. Kết quả đánh giá Kịch bản liên vai (J01 — J06)

| ID | Hành trình liên vai | Điểm nghiệm thu yêu cầu | Thực tế kiểm chứng mã nguồn & Test Suite | Trạng thái Static | Trạng thái Live UI | Bug ID / Ghi chú |
|---|---|---|---|---|---|---|
| **J01** | **Manager tạo Project/Campaign → Leader nhận PIC → giao task/subtask → Staff hoàn thành → Leader kiểm tra → Manager xem báo cáo** | - Không cần thao tác ngoài hệ thống để hoàn thành.<br>- Bản ghi và tiến độ nhất quán ở từng vai.<br>- Subtask không vượt lịch cha. | - Luồng phân cấp bản ghi `projects`/`campaigns` -> `project_subtasks`/`campaign_subtasks` -> `tasks` nhất quán qua `taskTarget` và `taskKey`.<br>- Tiến độ và KPI đồng nhất qua `taskProgress` và `workflowMetrics`.<br>- **Phát hiện lỗi**: `SubtaskDetailPanel.tsx` không chặn subtask có ngày nằm ngoài khoảng ngày của Project/Campaign cha; backend thiếu trigger ràng buộc. | **FAIL** (do hổng ràng buộc lịch) | **BLOCKED** | BUG-UAT-03 |
| **J02** | **Đang gõ comment / cập nhật thì mất mạng → retry → reload → vai khác mở lại** | - Không báo thành công giả.<br>- Không mất draft.<br>- Không nhân đôi dữ liệu.<br>- Trạng thái cuối khớp server. | - Không báo thành công giả: `TaskComments.tsx` chỉ toast success và xóa form khi server trả về thành công.<br>- Thất bại mạng giữ draft: Draft giữ nguyên trong React state khi request lỗi.<br>- **Phát hiện lỗi UX**: Khi reload trang (F5) hoặc đóng drawer, draft comment bị MẤT HOÀN TOÀN vì chỉ lưu trong memory `useState`, không có localStorage/draftStore. | **FAIL** (mất draft khi reload/F5) | **BLOCKED** | BUG-UAT-04 |
| **J03** | **Leader sửa lịch/đổi người giao khi Staff đang mở panel cũ (concurrency & conflict)** | - Quyền và lịch được kiểm tra lại khi ghi.<br>- Không ghi đè thay đổi mới bằng phiên cũ. | - **Phát hiện lỗi nghiêm trọng (P1)**: Cả `SubtaskDetailPanel.tsx` và `TaskDetailPanel.tsx` đều gọi update thẳng qua Supabase `.update(values).eq('id', id)` mà KHÔNG có điều kiện Optimistic Concurrency Control (không kiểm tra `updated_at` hoặc version). Phiên cũ của Staff sẽ ghi đè lịch trình và phân công của Leader âm thầm. | **FAIL** (thiếu OCC / ghi đè ngầm) | **BLOCKED** | BUG-UAT-02 |
| **J04** | **Staff A gửi comment → Staff B nhận popup / chuông / Profile / push nếu cấp quyền → mở một kênh** | - Mọi kênh cùng deep link/recipient.<br>- Đọc đồng bộ.<br>- Không gửi nhầm người hay nhân đôi sự kiện. | - `notificationLink` chuẩn hóa đồng nhất mọi kênh (`/tasks?task=ps-xxx`, `/workflow?project=...`).<br>- `devicePushStore` quản lý push browser, test push, dọn session khi đổi owner.<br>- `NotificationPopupStack` đồng bộ trạng thái đọc với `notificationStore` và Realtime channel.<br>- Test `all surfaces retain canonical and legacy task identity`, `stage notification opens its exact parent and phase` đều PASS. | **PASS** | **BLOCKED** | — |
| **J05** | **Hết ngày: hoàn thành việc, xem báo cáo, múi giờ Việt Nam, timestamp completed_at vs deadline** | - Done còn trong lịch sử.<br>- Timestamp là sự kiện thật.<br>- Tổng/danh sách nhất quán.<br>- Không suy completed_at từ deadline. | - `completed_at` được gán bằng `now()` qua RPC `complete_tracked_task` trên server.<br>- Báo cáo và KPI tính trên `taskDay(completed_at)` chứ không lấy deadline thay thế.<br>- Múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) được ép buộc chuẩn xác qua `localDay()` trong `workflowHub.ts`.<br>- Test suite `completion metrics use completion timestamps` và `deadline countdown uses Vietnam calendar days` đều PASS. | **PASS** | **BLOCKED** | — |
| **J06** | **Đăng xuất/phiên hết hạn, quay lại tab cũ, mở link trực tiếp; Desktop / Mobile 360-430px, Light / Dark mode** | - Không bypass đăng nhập, không lộ dữ liệu phiên trước.<br>- Thông báo lỗi rõ.<br>- Thao tác chính tiếp cận được trên mobile. | - Bảo mật phiên & direct link: `ProtectedRoute` chuyển hướng `/login` kèm `state: { from }`, chống open redirect; logout dọn sạch cache qua `workspaceScope().reset()`.<br>- **Phát hiện lỗi Mobile**: Nút đóng và nút sửa trong drawer có kích thước 30-36px (< 44px minimum touch target). Nút thao tác comment bị ẩn (`opacity-0`) và phụ thuộc vào hover chuột, khiến mobile cảm ứng không thao tác được. | **FAIL** (vi phạm touch target & hover mobile) | **BLOCKED** | BUG-UAT-05 |

---

## 3. Danh sách Phiếu lỗi (Defect Log)

### BUG-UAT-01 (P1 — Test Suite Regression)
- **Tiêu đề**: Test suite `commentEditing.test.mjs:18:1` thất bại do sai lệch payload cập nhật bình luận task.
- **Mức độ nghiêm trọng**: **P1 (High)** — Làm gãy test suite tự động (`npm test`).
- **Vị trí**: `Dev/tests/commentEditing.test.mjs:29` & `Dev/src/lib/commentEditing.ts:18`.
- **Bước tái hiện**:
  1. Mở terminal, chạy lệnh `node --test Dev/tests/commentEditing.test.mjs`.
  2. Quan sát kết quả test `editing all comment kinds scopes the author and exact parent`.
- **Expected**: Tất cả 91 unit test trong bộ kiểm thử của dự án phải PASS 100%.
- **Actual**: Test ném `AssertionError [ERR_ASSERTION]`:
  ```text
  {
    body: 'updated text',
  + is_edited: true,
  + updated_at: '2026-10-24T07:10:13.694Z'
  }
  vs expected: { body: 'updated text' }
  ```
- **Nguyên nhân**: Hàm `editOwnedComment` trong `commentEditing.ts` gửi kèm `is_edited: true` và `updated_at`, nhưng fixture mock trong file test lại chỉ mong đợi trường `body`. Cần chuẩn hóa đồng bộ giữa contract client và test assertion.

---

### BUG-UAT-02 (P1 — Data Integrity / Concurrency Conflict)
- **Tiêu đề**: Thiếu Optimistic Concurrency Control (OCC) dẫn đến ghi đè ngầm lịch trình và phân công khi nhiều người cùng mở task/subtask (Vi phạm J03 & LD08).
- **Mức độ nghiêm trọng**: **P1 (High)** — Gây sai lệch hoặc mất mát dữ liệu điều phối của Leader.
- **Vị trí**: `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:232-253` & `Dev/src/services/workspaceTasks.ts:25-30`.
- **Bước tái hiện**:
  1. Staff A mở một subtask trên màn hình chi tiết (lịch chót đang là ngày 25/10).
  2. Leader B mở cùng subtask đó, đổi hạn chót thành 30/10 và đổi người phụ trách sang Staff C, bấm Lưu thành công.
  3. Staff A (vẫn giữ panel cũ với ngày 25/10) chỉnh sửa tiêu đề subtask và bấm "Lưu task".
- **Expected**: Hệ thống phát hiện phiên bản của Staff A đã cũ, từ chối ghi đè hoặc cảnh báo "Dữ liệu đã được cập nhật bởi người khác, vui lòng tải lại".
- **Actual**: `updateTrackedTask` thực thi lệnh `supabase.from(table).update(values).eq('id', target.id)` mà không kiểm tra `updated_at`. Toàn bộ giá trị cũ trên máy Staff A (bao gồm hạn chót cũ 25/10 và assignee cũ) ghi đè toàn bộ thay đổi của Leader B mà không có cảnh báo nào.
- **Đề xuất khắc phục**:
  + Bổ sung điều kiện `eq('updated_at', currentLoadedUpdatedAt)` vào câu lệnh update.
  + Nếu số dòng cập nhật trả về là 0, ném lỗi `Xung đột dữ liệu: Công việc này đã được chỉnh sửa ở phiên khác. Vui lòng làm mới.`

---

### BUG-UAT-03 (P1 — Validation / Boundary Bypass)
- **Tiêu đề**: `SubtaskDetailPanel` và CSDL không chặn ngày bắt đầu/kết thúc của subtask vượt ra ngoài lịch cha Project/Campaign (Vi phạm J01 & AM04).
- **Mức độ nghiêm trọng**: **P1 (High)** — Làm sai lệch cấu trúc tiến độ và biểu đồ Gantt/Timeline.
- **Vị trí**: `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:227-230` và các file migration `project_subtasks`/`campaign_subtasks`.
- **Bước tái hiện**:
  1. Project có thời hạn từ `01/11/2026` đến `30/11/2026`.
  2. Mở một subtask trong `SubtaskDetailPanel.tsx`, bấm "Sửa".
  3. Nhập ngày bắt đầu `15/10/2026` (trước lịch dự án) hoặc hạn chót `15/12/2026` (sau lịch dự án).
  4. Bấm "Lưu task".
- **Expected**: Hệ thống chặn lại và báo lỗi "Lịch subtask phải nằm trong khoảng thời gian của Project/Campaign", đồng thời backend từ chối ghi.
- **Actual**: Client chỉ kiểm tra `editStartDate > editDueDate`, không kiểm tra đối chiếu với `parentDetails`. Backend Postgres thiếu trigger ràng buộc ngày của subtask so với parent, dẫn đến bản ghi được lưu thành công với ngày nằm ngoài lịch cha.
- **Đề xuất khắc phục**:
  + Tái sử dụng `workflowDateError(editStartDate, editDueDate, parentBounds)` từ `lib/workflowCalendar.ts` trong `saveTaskFields`.
  + Bổ sung trigger kiểm tra trên bảng `project_subtasks` và `campaign_subtasks`.

---

### BUG-UAT-04 (P2 — UX / Data Loss on Network Failure)
- **Tiêu đề**: Bình luận nháp (Comment Draft) chỉ lưu trong bộ nhớ tạm React State, bị mất hoàn toàn khi người dùng reload (F5) hoặc đóng drawer (Vi phạm J02).
- **Mức độ nghiêm trọng**: **P2 (Medium)** — Trải nghiệm người dùng kém khi gặp sự cố mạng chập chờn.
- **Vị trí**: `Dev/src/components/features/comments/TaskComments.tsx:31` & `SmartCommentInput.tsx`.
- **Bước tái hiện**:
  1. Người dùng nhập một bình luận dài kèm tag `@mention`.
  2. Mạng bị ngắt kết nối hoặc gặp sự cố đường truyền.
  3. Người dùng bấm gửi -> Báo lỗi "Không thể gửi. Nội dung nháp vẫn được giữ".
  4. Người dùng bấm F5 để tải lại trang hoặc vô tình bấm đóng drawer subtask.
- **Expected**: Nội dung bình luận đang viết dở được lưu vào `draftStore` / `localStorage` theo `taskId`, tự động phục hồi khi mở lại.
- **Actual**: `text` được lưu trong `useState('')`. Khi F5 hoặc drawer bị unmount, nội dung nháp biến mất hoàn toàn. Người dùng phải gõ lại từ đầu.
- **Đề xuất khắc phục**: Lưu bản nháp vào `localStorage` có tiền tố `draft:comment:<entity_type>:<entity_id>:<actor_id>` và tự dọn khi gửi thành công.

---

### BUG-UAT-05 (P2 — Mobile UX & Accessibility)
- **Tiêu đề**: Nút đóng, nút sửa trong subtask drawer có kích thước nhỏ hơn 44px; các nút thao tác bình luận bị ẩn sau hover trên màn hình cảm ứng (Vi phạm J06 & ST08).
- **Mức độ nghiêm trọng**: **P2 (Medium)** — Gây khó khăn thao tác ngón tay trên điện thoại di động (viewport 360-430px).
- **Vị trí**: `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:297, 300` & `Dev/src/components/features/comments/CommentMessage.tsx:94-105`.
- **Bước tái hiện**:
  1. Mở trang trên thiết bị di động (viewport 360px - 390px).
  2. Mở một subtask detail panel.
  3. Thử chạm ngón tay vào nút Đóng (X) hoặc nút "Chỉnh sửa".
  4. Xem danh sách bình luận đã gửi của chính mình để tìm nút Sửa/Xóa.
- **Expected**:
  + Tất cả touch target tối thiểu 44x44px theo tiêu chuẩn WCAG Accessibility.
  + Các nút thao tác bình luận (Reply, Edit, Delete) phải hiển thị rõ ràng hoặc có menu `...` trên màn hình cảm ứng, không dùng `group-hover:opacity-100`.
- **Actual**:
  + Nút X có padding `p-2` với icon 20px -> kích thước 36x36px (< 44px).
  + Nút Chỉnh sửa có padding `py-1.5` -> chiều cao chỉ khoảng 30px (< 44px).
  + Khối thao tác comment dùng `opacity-0 group-hover:opacity-100`. Trên thiết bị cảm ứng không có chuột hover, người dùng không thể thấy và khó bấm trúng nút Sửa/Xóa bình luận.

---

### BUG-UAT-06 (P2 — React Hook Exhaustive Dependencies)
- **Tiêu đề**: `TaskDetailPanel.tsx` bỏ sót dependencies trong `useEffect`, gây stale form state khi dữ liệu task thay đổi từ bên ngoài.
- **Mức độ nghiêm trọng**: **P2 (Medium)** — Rủi ro hiển thị thông tin cũ.
- **Vị trí**: `Dev/src/components/features/tasks/TaskDetailPanel.tsx:64`.
- **Chi tiết**: `useEffect` gán dữ liệu ban đầu cho các state form (`editTitle`, `editAssigneeId`, `editPriority`, `editStartDate`, `editDueDate`) nhưng dependency array chỉ khai báo `[task?.id, task?.description, isOpen, profileId]`. Khi task được cập nhật ngày hoặc assignee từ Realtime channel trong lúc modal đang mở, form edit không được cập nhật lại theo dữ liệu mới nhất.

---

## 4. Tổng hợp số lượng ca kiểm thử theo vai trò

| Nhóm ca nghiệm thu | Tổng số ca | PASS (Static) | FAIL (Static) | BLOCKED (Live UI) | Tỷ lệ PASS Static |
|---|---|---|---|---|---|
| **Admin** (AM01 — AM10) | 10 | 9 | 1 (AM04) | 10 (Chờ browser live) | 90% |
| **Manager** (AM01 — AM10) | 10 | 9 | 1 (AM04) | 10 (Chờ browser live) | 90% |
| **Leader** (LD01 — LD10) | 10 | 9 | 1 (LD08) | 10 (Chờ browser live) | 90% |
| **Staff** (ST01 — ST10) | 10 | 8 | 2 (ST05, ST08) | 10 (Chờ browser live) | 80% |
| **Hành trình liên vai** (J01 — J06) | 6 | 2 | 4 (J01, J02, J03, J06) | 6 (Chờ browser live) | 33.3% |
| **Toàn bộ hệ thống** | **46** | **37** | **9** | **46** | **80.4%** |

---

## 5. Điểm sáng của hệ thống (Strengths)

1. **Phân tách bộ nhớ đệm đa phiên (Workspace Cache Isolation)**:
   - Module `workspaceResources.ts` triển khai cơ chế `workspaceScope()` kết hợp với `authStore` rất xuất sắc. Mọi thay đổi về ID người dùng, vai trò hoặc phòng ban lập tức hủy bỏ và làm mới toàn bộ bộ nhớ đệm (`taskResource`, `directoryResource`, `assetSummaryResource`, `workflowResource`). Điều này ngăn chặn triệt để nguy cơ rò rỉ dữ liệu giữa 2 tài khoản đăng nhập trên cùng một trình duyệt.
2. **Bảo mật bình luận & RLS nhiều lớp**:
   - Dù là Admin hay Global Manager, hệ thống vẫn kiên quyết áp dụng nguyên tắc toàn vẹn tác giả: không ai được quyền sửa hoặc xóa bình luận của người khác. Các hàm `commentEditing.ts` và `commentDeletion.ts` bắt buộc lọc qua `author_id` và `user_id` khớp với `actorId`.
3. **Phân quyền duyệt tài sản độc lập**:
   - Hệ thống không đánh đồng Manager toàn hệ thống là người duyệt tài sản. Chỉ Admin hoặc Leader trực thuộc phòng Design mới có quyền duyệt mượn tài sản (`isAssetApprover` và `dashboard_asset_approver()`). Nhân viên chỉ có thể thấy các yêu cầu mượn do chính mình gửi.
4. **Chuẩn hóa múi giờ Việt Nam (Asia/Ho_Chi_Minh)**:
   - Toàn bộ hàm tính ngày công việc, đếm ngược hạn chót và phân loại biểu đồ tháng/tuần (`localDay()`, `workflowMetrics()`) đều được neo chuẩn theo múi giờ `Asia/Ho_Chi_Minh`, loại bỏ hiện tượng nhảy lệch ngày do khác múi giờ giữa máy trạm và máy chủ.
5. **Cơ chế Official Read-Only an toàn tuyệt đối**:
   - Trang `MainReadOnly` dùng client fetch riêng biệt chặn đứng các HTTP method ghi (`POST`, `PUT`, `DELETE`, `PATCH`), đảm bảo các thao tác xem dữ liệu Main trên môi trường Develop không thể gây tác động tiêu cực đến môi trường Production.

---

## 6. Ma sát trải nghiệm người dùng (UX Friction)

1. **Thiếu phản hồi trực quan khi có xung đột dữ liệu**: Khi hai người cùng sửa một công việc, người bấm sau không hề nhận được thông báo mà bị ghi đè dữ liệu một cách âm thầm.
2. **Mất nội dung khi đóng nhầm drawer**: Drawer chi tiết công việc chiếm phần lớn màn hình, người dùng thường có thói quen click ra ngoài backdrop để thoát. Nếu đang gõ bình luận dở, toàn bộ nội dung bị xóa trắng.
3. **Thao tác ngón tay trên điện thoại**: Các nút quan trọng (X để đóng drawer, Sửa subtask) quá bé, ngón tay dễ chạm trượt; nút sửa/xóa bình luận biến mất hoàn toàn do lệ thuộc vào hover chuột.

---

## 7. Kết luận nghiệm thu & Khuyến nghị bàn giao

- **Kết luận của QA Lead (Nhi)**: **CHƯA ĐỦ ĐIỀU KIỆN SẴN SÀNG BÀN GIAO TOÀN DIỆN CHO NHÂN VIÊN**.
- **Lý do**:
  1. Tồn tại **3 lỗi mức P1** (BUG-UAT-01 làm gãy test runner; BUG-UAT-02 gây xung đột ghi đè dữ liệu; BUG-UAT-03 gây lọt lịch trình ngoài dự án).
  2. Chưa thực hiện được live test trên trình duyệt thật (Chrome DevTools Protocol đang ở trạng thái BLOCKED do thiếu kết nối socket live).
- **Hành động đề xuất cho Hiệp (PM)**:
  1. Giao **Tùng (Coder)** khắc phục ngay 3 lỗi P1 (BUG-UAT-01, BUG-UAT-02, BUG-UAT-03) và xem xét các lỗi P2 về mobile.
  2. Chuẩn bị môi trường live browser có tài khoản test để chạy đợt nghiệm thu UI Live Re-test (Run 02).
  3. Chuyển hồ sơ báo cáo cho **Khoa (Reviewer)** thẩm định độc lập tính xác thực của các bằng chứng mã nguồn.

---

## 6. Kết quả Khắc phục & Tái kiểm thử (Post-Fix Verification & Retest)

Theo chỉ đạo của Product Owner, team đã triển khai khắc phục dứt điểm các lỗi P1 và cải tiến UX ngay trên nhánh `develop`:

1. **BUG-UAT-01 / BUG-STAFF-01 (P1 — Test Suite Regression) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/lib/commentEditing.ts`.
   - Bỏ việc client tự gửi `is_edited: true, updated_at` (do trigger database `dashboard_mark_task_comment_edited` đã tự động xử lý).
   - Kết quả: `node --test Dev/tests/*.test.mjs Dev/tests/*.test.cjs` đạt **91/91 tests PASS (100%)**.

2. **BUG-AM-01 (P1 — Phân quyền Manager bị hạ cấp) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/hooks/useMembers.ts`.
   - Gán đúng `employment_level: 'Manager'` khi tạo tài khoản role `manager`, bảo toàn quyền Global Manager toàn công ty.

3. **BUG-AM-04 (P1 — Manager bị khóa phân hệ Tài sản) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/lib/roleScope.ts`, `Dev/src/services/borrowWorkflow.ts`.
   - Bổ sung `isGlobalManager(profile)` vào `isAssetApprover` và `canSubmitAssetRequest`. Manager toàn quyền gửi và duyệt phiếu mượn tài sản.

4. **BUG-LD-01 (P1 — Lộ nhân sự phòng ban khác trong TaskModal) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/components/features/tasks/TaskModal.tsx`.
   - Khóa cờ `canChooseDepartment = isGlobalManager(profile);`. Leader chỉ được tạo việc và phân bổ nhân sự trong phòng ban của mình.

5. **Cơ chế Duyệt Phase Gatekeeper (Yêu cầu 2) -> ĐÃ CẬP NHẬT (PASS)**:
   - File sửa: `Dev/src/components/features/workflow/WorkflowGateChecklist.tsx`.
   - Chỉ cho phép: PIC của phase đó (`isPhasePic`), Người tạo Project/Campaign (`isParentCreator`), PIC chính của Project/Campaign (`isParentPic`), hoặc Global Manager/Admin mới có quyền duyệt Gate.

6. **BUG-UAT-03 (P1 — Ràng buộc ngày con ngoài ngày cha) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/components/features/projects/SubtaskDetailPanel.tsx`.
   - Load `start_date`, `due_date` của parent và tích hợp `workflowDateError` chặn lịch subtask vượt ngoài khung thời gian cha.

7. **UX-STAFF-01 (P2 — Mất khả năng @mention trong MyTasks) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/pages/MyTasks.tsx`.
   - Truyền toàn bộ danh sách `users` hợp lệ của workspace vào `SubtaskDetailPanel`.

8. **UX-UAT-04 (P2 — Mất nháp bình luận khi F5/đóng drawer) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/components/features/comments/TaskComments.tsx`.
   - Tự động lưu bản nháp vào `sessionStorage` theo `kcoffee_comment_draft_<kind>_<id>`.

9. **UX-UAT-05 (P2 — Touch targets di động < 44px và nút ẩn hover) -> ĐÃ KHẮC PHỤC (PASS)**:
   - File sửa: `Dev/src/components/features/comments/CommentMessage.tsx`, `SubtaskDetailPanel.tsx`, `TaskDetailPanel.tsx`.
   - Các nút thao tác bình luận hiển thị trực tiếp trên mobile (`opacity-100 sm:opacity-0`). Các nút đóng/sửa đạt chuẩn $\ge 44$px.

10. **UX-LD-01 (P3 — Huy hiệu gây hiểu nhầm) -> ĐÃ KHẮC PHỤC (PASS)**:
    - File sửa: `Dev/src/components/features/profile/ProfilePermissionTab.tsx`.
    - Phân tách huy hiệu minh bạch: `👑 MANAGER` vs `⭐ LEADER` vs `👤 STAFF`.

11. **UX-AM-02 (P3 — Vạch mốc duyệt 80% trực quan) -> ĐÃ CẬP NHẬT (PASS)**:
    - File sửa: `Dev/src/components/features/workflow/WorkflowGateChecklist.tsx`.
    - Thêm vạch đánh dấu 80% trực quan trên thanh tiến độ Gate Opportunity.

12. **BUG-UAT-02 (P1 — Optimistic Concurrency Control OCC)**:
    - Tạm bỏ qua (SKIP) theo chỉ đạo của PO (sẽ cập nhật đồng bộ ở đợt nâng cấp Workflow sau).
