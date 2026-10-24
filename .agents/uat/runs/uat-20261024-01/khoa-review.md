# Báo cáo Phản biện Độc lập UAT (Reviewer: Khoa)

- **Đợt chạy nghiệm thu (Run ID)**: `uat-20261024-01`
- **Thời gian đánh giá**: 2026-10-24T14:26:00+07:00
- **Người phản biện**: Khoa (`khoa` — Reviewer độc lập)
- **Nhánh & Commit SHA thẩm định**: `develop` | HEAD SHA: `8c365f1`
- **Hồ sơ tài liệu đối chiếu**:
  + `.agents/uat/runs/uat-20261024-01/SUMMARY.md` (Báo cáo tổng hợp của QA Lead Nhi)
  + `.agents/uat/runs/uat-20261024-01/uat-admin-manager.md` (Báo cáo Persona Admin & Manager)
  + `.agents/uat/runs/uat-20261024-01/uat-leader.md` (Báo cáo Persona Leader)
  + `.agents/uat/runs/uat-20261024-01/uat-staff.md` (Báo cáo Persona Staff)
- **Mã nguồn và môi trường đối chứng trực tiếp**: `Dev/src`, `Dev/tests`, `Dev/supabase/migrations`.

---

## 1. Kết luận Phản biện Độc lập

> [!CAUTION]
> **KẾT LUẬN: CHƯA ĐỦ ĐIỀU KIỆN NGHIỆM THU ĐỂ BÀN GIAO CHO NHÂN VIÊN (NOT READY FOR HANDOVER).**
> 
> Khoa đồng thuận với kết luận của QA Lead (Nhi). Hệ thống tại commit `8c365f1` tồn tại **3 lỗi nghiêm trọng mức P1** (trong đó có lỗi hồi quy test suite và lỗi mất an toàn dữ liệu khi thao tác đồng thời), cùng **3 lỗi mức P2** ảnh hưởng trực tiếp đến trải nghiệm di động và độ tin cậy giao diện. Ngoài ra, việc toàn bộ 46 ca kiểm thử giao diện thực tế (Live UI) đang ở trạng thái **BLOCKED** khiến việc bàn giao vận hành cho nhân viên làm việc thật lúc này tiềm ẩn rủi ro rất cao.

---

## 2. Thẩm định độc lập các lỗi P1 / P2 từ bằng chứng mã nguồn

Khoa đã trực tiếp chạy test suite, build, lint và đọc mã nguồn chi tiết để xác minh từng phát hiện lỗi của team UAT:

### 2.1. Thẩm định các lỗi P1 (High / Blocker)

#### BUG-UAT-01 (P1 — Test Suite Regression trong `commentEditing.test.mjs`)
- **Tình trạng thẩm định**: **XÁC NHẬN CHÍNH XÁC (CONFIRMED P1)**.
- **Bằng chứng thực thi**:
  Khoa đã trực tiếp chạy lệnh: `node --test Dev/tests/commentEditing.test.mjs`.
  Kết quả trả về mã lỗi 1 (`fail 1, pass 3`):
  ```text
  ✖ editing all comment kinds scopes the author and exact parent (61.29ms)
    AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    + actual - expected
      {
        body: 'updated text',
    +   is_edited: true,
    +   updated_at: '2026-10-24T07:25:38.012Z'
      }
    vs expected: { body: 'updated text' }
  ```
- **Phân tích kỹ thuật chuyên sâu**:
  Tại file migration `Dev/supabase/migrations/20261021214500_task_comment_edit_timestamps.sql`, trigger cơ sở dữ liệu `dashboard_mark_task_comment_edited` đã được cấu hình để tự động gán `is_edited = true` và `updated_at = transaction_timestamp()` mỗi khi cột `body` thay đổi. Tuy nhiên, trong mã nguồn `Dev/src/lib/commentEditing.ts` dòng 18, client lại tự ý chèn thêm `{ body: text, is_edited: true, updated_at: new Date().toISOString() }`. Điều này phá vỡ hợp đồng dữ liệu giữa client và test mock, đồng thời tiềm ẩn nguy cơ bị chặn bởi quyền phân cột RLS (`grant update(body)`).
- **Yêu cầu khắc phục**: Đồng bộ hóa hợp đồng cập nhật bình luận; client chỉ gửi duy nhất payload `{ body: text }` và để database trigger quản lý các cột mốc thời gian/trạng thái chỉnh sửa.

---

#### BUG-UAT-02 (P1 — Data Integrity / Concurrency Conflict / Lost Update Anomaly)
- **Tình trạng thẩm định**: **XÁC NHẬN CHÍNH XÁC (CONFIRMED P1 — RỦI RO NGHIÊM TRỌNG NHẤT)**.
- **Đối chiếu mã nguồn**:
  + Tại `Dev/src/components/features/projects/SubtaskDetailPanel.tsx` dòng 232–242:
    Hàm `saveTaskFields` tập hợp toàn bộ `values` từ state nội bộ (`title`, `assignee_id`, `start_date`, `due_date`, `workflow_status`, `updated_at: new Date().toISOString()`).
  + Tại `Dev/src/services/workspaceTasks.ts` dòng 27:
    ```typescript
    const { data, error } = await supabase.from(target.table).update(values).eq('id', target.id).select('id').maybeSingle();
    ```
  + Tại `Dev/src/components/features/tasks/TaskDetailPanel.tsx` dòng 150:
    ```typescript
    const { data, error } = await supabase.from('tasks').update(values).eq('id', task.id).select('id').maybeSingle();
    ```
- **Hệ quả thực tế**:
  Hoàn toàn không có cơ chế **Optimistic Concurrency Control (OCC)**. Khi Leader cập nhật hạn chót hoặc đổi người phụ trách, nếu một Staff đang mở sẵn panel subtask đó từ phiên trước và bấm lưu tiêu đề, toàn bộ thông tin cũ trên máy Staff (bao gồm hạn chót cũ và người nhận việc cũ) sẽ **âm thầm ghi đè và xóa sổ các thiết lập mới của Leader**. Đây là lỗi toàn vẹn dữ liệu điển hình (Lost Update Anomaly), vi phạm trực tiếp kịch bản liên vai **J03** và ca kiểm thử **LD08**.
- **Yêu cầu khắc phục**:
  Thêm điều kiện `eq('updated_at', currentLoadedUpdatedAt)` vào truy vấn cập nhật. Khi phát hiện số hàng cập nhật trả về là 0, hệ thống phải ngăn chặn việc ghi đè và thông báo rõ ràng: *"Công việc này đã được cập nhật bởi một người khác. Vui lòng tải lại trang để lấy dữ liệu mới nhất."*

---

#### BUG-UAT-03 (P1 — Validation / Boundary Bypass: Subtask vượt ngoài lịch Project/Campaign)
- **Tình trạng thẩm định**: **XÁC NHẬN CHÍNH XÁC (CONFIRMED P1)**.
- **Đối chiếu mã nguồn**:
  + Tại `Dev/src/components/features/projects/SubtaskDetailPanel.tsx` dòng 227–230:
    ```typescript
    if (editStartDate && editDueDate && editStartDate > editDueDate) {
      toast.error(lang === 'en' ? 'Start date must be before the due date.' : 'Ngày bắt đầu phải trước hạn chót.');
      return;
    }
    ```
    Hệ thống chỉ kiểm tra `startDate > dueDate`, hoàn toàn bỏ qua việc đối chiếu với mốc thời gian của Project/Campaign cha.
  + Kiểm tra mã nguồn tiện ích `Dev/src/lib/workflowCalendar.ts`: Đã có sẵn hàm `workflowDateError(start, due, bounds)` nhưng không được tái sử dụng trong `SubtaskDetailPanel.tsx`.
  + Kiểm tra các tệp migration: Bảng `project_subtasks` và `campaign_subtasks` thiếu hoàn toàn check constraint hoặc trigger kiểm tra khoảng ngày so với bảng cha.
- **Hệ quả thực tế**:
  Người dùng có thể gán ngày subtask nằm ngoài lịch trình của dự án (ví dụ Project tháng 11 nhưng subtask bắt đầu từ tháng 10 hoặc kéo sang tháng 12). Lỗi này làm gãy biểu đồ Timeline, sai lệch tỷ lệ phân bổ tiến độ theo sprint/tháng và vi phạm kịch bản **J01** và ca **AM04**.
- **Yêu cầu khắc phục**:
  Tích hợp hàm `workflowDateError` vào `saveTaskFields` ở client và bổ sung database trigger kiểm tra ràng buộc thời gian ở tầng cơ sở dữ liệu.

---

### 2.2. Thẩm định các lỗi P2 (Medium / UX & Accessibility)

#### BUG-UAT-04 (P2 — Mất bình luận nháp khi reload / đóng drawer)
- **Tình trạng thẩm định**: **XÁC NHẬN (CONFIRMED P2)**.
- **Đối chiếu mã nguồn**:
  Tại `Dev/src/components/features/comments/TaskComments.tsx` dòng 31: `const [text, setText] = useState('');`.
  Nội dung nháp chỉ lưu trong bộ nhớ tạm của React Component. Khi người dùng reload trang (F5) hoặc vô tình đóng drawer (component bị unmount), toàn bộ nội dung nháp bị hủy, không có cơ chế backup qua `localStorage` hay `sessionStorage`.

#### BUG-UAT-05 (P2 — Touch Target < 44px và nút ẩn sau hover chuột trên Mobile)
- **Tình trạng thẩm định**: **XÁC NHẬN (CONFIRMED P2)**.
- **Đối chiếu mã nguồn**:
  + Nút Đóng (X) tại `SubtaskDetailPanel.tsx:297` có class `p-2` với icon 20px -> kích thước tính toán chỉ đạt `36x36px`.
  + Nút Chỉnh sửa tại `SubtaskDetailPanel.tsx:300` có class `px-2.5 py-1.5` -> chiều cao chỉ khoảng `30px`.
  + Cụm nút thao tác bình luận (Reply, Edit, Delete) tại `CommentMessage.tsx:94`:
    `className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pb-2"`
    Trên màn hình cảm ứng di động không hỗ trợ sự kiện hover chuột, cụm nút này bị ẩn hoàn toàn, khiến nhân viên dùng điện thoại không thể thao tác phản hồi hay chỉnh sửa bình luận.

#### BUG-UAT-06 (P2 — Stale Form State trong `TaskDetailPanel.tsx`)
- **Tình trạng thẩm định**: **XÁC NHẬN (CONFIRMED P2)**.
- **Đối chiếu mã nguồn**:
  Tại `TaskDetailPanel.tsx` dòng 64, `useEffect` khởi tạo state form có mảng dependencies `[task?.id, task?.description, isOpen, profileId]`, bỏ sót các thuộc tính `task?.title`, `task?.priority`, `task?.start_date`, `task?.due_date`, `task?.assignee_id`. Khi dữ liệu task được cập nhật từ kênh Realtime bên ngoài trong lúc panel đang mở, form edit không được cập nhật lại theo dữ liệu mới nhất.

---

## 3. Kiểm tra độ trung thực và tính chặt chẽ của các tuyên bố kiểm thử (Audit against Rubber-stamping)

Khoa đã tiến hành rà soát phương pháp đánh giá của team UAT và xác nhận các điểm sau:

1. **Tuyệt đối trung thực, không có hiện tượng Rubber-stamp**:
   - QA Lead (Nhi) và các persona (`uat-admin-manager`, `uat-leader`, `uat-staff`) đã **tự giác và trung thực đánh dấu toàn bộ 46 ca kiểm thử Live UI là BLOCKED** do chưa có kết nối Chrome DevTools Protocol và phiên người dùng live.
   - Không có bất kỳ sự đánh tráo khái niệm nào giữa kết quả đọc mã nguồn ("Static Review") với kết quả giao diện người dùng ("UI PASS"). Mọi kết quả đạt đều được dán nhãn rõ ràng là `PASS (Static)`.
   - Các ca kiểm thử thất bại (AM04, LD08, ST05, ST08, J01, J02, J03, J06) đều được ghi nhận trung thực thành phiếu lỗi chi tiết kèm mã nguồn đối chứng.

2. **Chất lượng các ca PASS (Static)**:
   - Các kết luận đạt về phân quyền dữ liệu (Data Isolation) đã được đối chiếu chéo với test suite:
     + `workloadScope.test.mjs` (bảo vệ phạm vi xem dữ liệu phòng ban của Leader và nhân viên unassigned).
     + `workspaceInvalidation.test.mjs` (cơ chế dọn cache `workspaceScope().reset()` khi chuyển đổi phiên).
     + `roleScope.test.mjs` (phân định chính xác giữa Global Manager và Department Leader có role=manager).
     + `officialReadOnly.ts` (cô lập an toàn tuyệt đối các thao tác ghi trên trang Main-view).
   - Tuy nhiên, Khoa nhấn mạnh rằng: **Static Code Audit chỉ xác nhận được tính đúng đắn ở tầng thuật toán và dữ liệu biên, không thể thay thế cho việc chạy thử nghiệm thực tế trên trình duyệt** (độ trễ render, bố cục layout responsive khi bàn phím ảo bật lên, xung đột z-index của modal/drawer, v.v.).

---

## 4. Đánh giá Phạm vi Rủi ro đối với Người dùng Cuối (End-User Risk Assessment)

| Đối tượng người dùng | Kịch bản thao tác rủi ro | Mức độ tác động thực tế | Hậu quả vận hành |
|---|---|---|---|
| **Ban Giám đốc & Manager** | Theo dõi tiến độ dự án, duyệt Gate và xem báo cáo tổng hợp | **Trung bình - Cao** | Lịch subtask vượt ngoài dự án (BUG-UAT-03) làm sai lệch báo cáo KPI và biểu đồ tiến độ. |
| **Trưởng phòng (Leader)** | Giao việc, điều chỉnh deadline và phân công nhân sự trên cùng subtask với nhân viên | **Cực kỳ nghiêm trọng (P1)** | Bị mất dữ liệu điều phối (BUG-UAT-02): Các cập nhật hạn chót hoặc đổi người giao việc của Leader bị nhân viên vô tình ghi đè mất mà không hề hay biết. |
| **Nhân viên (Staff)** | Làm việc hằng ngày, cập nhật tiến độ, thảo luận công việc trên điện thoại di động | **Cao (P2)** | Gây ức chế trong thao tác: Nút đóng/sửa quá nhỏ (BUG-UAT-05); không thể tìm thấy nút sửa/xóa bình luận trên điện thoại cảm ứng; mất toàn bộ nội dung bình luận khi đóng nhầm drawer (BUG-UAT-04). |
| **Quy trình Release & CI/CD** | Thực hiện build, test và đẩy mã nguồn lên nhánh chính | **Nghiêm trọng (P1)** | Test suite tự động bị gãy (BUG-UAT-01) khiến pipeline kiểm thử báo lỗi, chặn việc release mã nguồn sạch. |

---

## 5. Tiêu chuẩn và Điều kiện Bàn giao (Handover Gate Criteria)

Để có thể bàn giao hệ thống Dashboard K COFFEE cho nhân viên vận hành chính thức, Hiệp (PM) cần chỉ đạo thực hiện đầy đủ các điều kiện tiên quyết sau:

1. **Khắc phục triệt để 3 lỗi mức P1**:
   - [ ] **Khắc phục BUG-UAT-01**: Chuẩn hóa client `commentEditing.ts` khớp với database trigger và contract kiểm thử, đảm bảo `npm test` chạy 91/91 tests **PASS 100%**.
   - [ ] **Khắc phục BUG-UAT-02**: Bổ sung cơ chế Optimistic Concurrency Control (OCC) trong `SubtaskDetailPanel.tsx`, `TaskDetailPanel.tsx` và `workspaceTasks.ts` (kiểm tra `updated_at`, từ chối ghi đè khi phát hiện xung đột phiên).
   - [ ] **Khắc phục BUG-UAT-03**: Thêm validation chặn ngày subtask vượt ra ngoài lịch cha Project/Campaign tại `SubtaskDetailPanel.tsx` và bổ sung trigger kiểm tra trên CSDL.

2. **Khắc phục các lỗi trải nghiệm Mobile P2**:
   - [ ] **Khắc phục BUG-UAT-05**: Đảm bảo tất cả touch target (nút Đóng, nút Sửa) đạt tối thiểu **44x44px**; hiển thị nút thao tác bình luận trên mobile mà không lệ thuộc vào `group-hover`.

3. **Tổ chức Re-test Nghiệm thu UI Thực tế (Run 02)**:
   - [ ] Kết nối trình duyệt tự động hoặc phiên browser live để gỡ bỏ trạng thái **BLOCKED** của các ca Live UI.
   - [ ] Xác nhận toàn bộ 6 hành trình liên vai (J01 — J06) đạt trạng thái **PASS trên giao diện thực tế**.
