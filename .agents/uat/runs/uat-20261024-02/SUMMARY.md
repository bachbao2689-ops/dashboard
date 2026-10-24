# Báo cáo nghiệm thu UAT: uat-20261024-02

**Trạng thái đợt chạy**: HOÀN THÀNH TOÀN BỘ KIỂM CHỨNG MÃ NGUỒN & TEST SUITE (96/96 PASS) | LIVE BROWSER UI BLOCKED DO CHÍNH SÁCH BẢO MẬT IDE TỪ CHỐI LỆNH `execute_url`.

---

## 1. Bối cảnh đợt kiểm thử

- **Thời gian thực hiện**: 2026-10-24T21:05:00+07:00.
- **Người/Agent thực hiện**: Nhi (`nhi` — QA Lead Tester phụ trách điều phối & tổng hợp UAT).
- **Môi trường & Backend**: 
  - Vercel Develop Preview: `https://dashboard-git-develop-bart-c8ff.vercel.app/`
  - Local repository: branch `develop` | HEAD SHA: `26686aa442ba9d4bbfcd1e7735d4c505bdf310ec` (`fix(ui): unify subtask and checklist item styling, hover actions, and priority tags`).
  - Supabase client kết nối môi trường Develop.
- **Phần chưa xác minh qua Live UI**: 
  - Đã kích hoạt headless Chrome DevTools Protocol (port 9222). Tuy nhiên, lệnh điều hướng tự động `navigate_page` tới Vercel Preview domain và Localhost đều bị môi trường IDE chặn với lỗi bảo mật:
    `permission check failed for execute_url "dashboard-git-develop-bart-c8ff.vercel.app": Permission prompt for action 'execute_url' on target 'dashboard-git-develop-bart-c8ff.vercel.app' was denied.`
  - Căn cứ quy định `.agents/uat/README.md` mục 6: Đánh dấu toàn bộ tương tác Live Browser UI thực tế là **BLOCKED**; không ngụy tạo kết quả Live UI.
  - Tiến hành **STATIC CODE AUDIT & TEST SUITE ANALYSIS TOÀN DIỆN** trên toàn bộ 6 hành trình liên vai J01–J06, 4 ma trận vai trò (Admin, Manager, Leader, Staff) và kiểm chứng 6/6 bug retest từ đợt `uat-20261024-01`.
- **Test suite thực thi**: Chạy `node --test tests/*.test.mjs tests/*.test.cjs` trong thư mục `Dev`:
  - **Kết quả: 96 PASS / 0 FAIL / 0 SKIPPED (thời gian: 474ms)**.
- **Kiểm tra build mã nguồn**: Chạy `npm run build` (`tsc -b && vite build`):
  - **Kết quả: Build thành công hoàn toàn trong 1.52s, không có lỗi TypeScript hay cú pháp**.

---

## 2. Kết quả đánh giá Kịch bản liên vai (J01 — J06)

| ID | Hành trình liên vai | Điểm nghiệm thu yêu cầu | Thực tế kiểm chứng mã nguồn & Test Suite | Trạng thái Static | Trạng thái Live UI | Bug ID / Ghi chú |
|---|---|---|---|---|---|---|
| **J01** | **Manager tạo Project/Campaign → Leader nhận PIC → giao task/subtask → Staff hoàn thành → Leader kiểm tra → Manager xem báo cáo** | - Không cần thao tác ngoài hệ thống để hoàn thành.<br>- Bản ghi và tiến độ nhất quán ở từng vai.<br>- Subtask không vượt lịch cha. | - Phân cấp bản ghi `projects`/`campaigns` -> `project_subtasks`/`campaign_subtasks` -> `tasks` đồng bộ qua `taskTarget` và `taskKey`.<br>- **Ràng buộc lịch cha - con**: `SubtaskDetailPanel.tsx:565-577` dùng `workflowDateError` chặn mọi subtask có ngày ngoài khoảng ngày Project/Campaign cha.<br>- Checklist item cũng áp dụng cùng giới hạn ngày cha.<br>- Quyền hoàn thành kiểm soát nghiêm ngặt qua RPC `complete_tracked_task`. | **PASS** | **BLOCKED** | BUG-UAT-03 (Resolved) |
| **J02** | **Đang gõ comment / cập nhật thì mất mạng → retry → reload → vai khác mở lại** | - Không báo thành công giả.<br>- Không mất draft.<br>- Không nhân đôi dữ liệu.<br>- Trạng thái cuối khớp server. | - Không báo thành công giả: Chỉ toast success và dọn form khi Supabase phản hồi HTTP 200.<br>- Thất bại mạng giữ draft: State nội dung bình luận được giữ nguyên vẹn trong component khi request ném lỗi hoặc timeout.<br>- Không nhân đôi dữ liệu: Payload gửi đi có lock/isSubmitting chống double click. | **PASS** | **BLOCKED** | BUG-UAT-04 (Resolved) |
| **J03** | **Leader sửa lịch/đổi người giao khi Staff đang mở panel cũ (concurrency & conflict)** | - Quyền và lịch được kiểm tra lại khi ghi.<br>- Không ghi đè thay đổi mới bằng phiên cũ. | - **Triển khai OCC (Optimistic Concurrency Control)**: `updateTrackedTask` trong `Dev/src/services/workspaceTasks.ts:25-38` nhận `expectedUpdatedAt`.<br>- Câu lệnh SQL đính kèm `.eq('updated_at', expectedUpdatedAt)`. Nếu dữ liệu đã bị sửa ở phiên khác, hàm ném lỗi rõ ràng: *"Dữ liệu đã được người khác cập nhật trước đó. Vui lòng làm mới trang để xem phiên bản mới nhất."*<br>- Unit test `updateTrackedTask enforces OCC when expectedUpdatedAt is supplied` PASS 100%. | **PASS** | **BLOCKED** | BUG-UAT-02 (Resolved) |
| **J04** | **Staff A gửi comment → Staff B nhận popup / chuông / Profile / push nếu cấp quyền → mở một kênh** | - Mọi kênh cùng deep link/recipient.<br>- Đọc đồng bộ.<br>- Không gửi nhầm người hay nhân đôi sự kiện. | - `notificationLink` chuẩn hóa format đồng nhất `/tasks?task=ps-xxx`, `/workflow?project=...`.<br>- Notification popup đồng bộ với chuông và `notificationStore`.<br>- Unit tests `all surfaces retain canonical and legacy task identity`, `push shows a system notification with same-origin task target and stable dedup tag` đều PASS. | **PASS** | **BLOCKED** | — |
| **J05** | **Hết ngày: hoàn thành việc, xem báo cáo, múi giờ Việt Nam, timestamp completed_at vs deadline** | - Done còn trong lịch sử.<br>- Timestamp là sự kiện thật.<br>- Tổng/danh sách nhất quán.<br>- Không suy completed_at từ deadline. | - `completed_at` được gán bằng `now()` qua RPC `complete_tracked_task` trên server PostgreSQL.<br>- Báo cáo KPI tính dựa trên `taskDay(completed_at)` độc lập với deadline.<br>- Múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) ép chuẩn qua `localDay()`.<br>- Unit tests `completion metrics use completion timestamps` và `deadline countdown uses Vietnam calendar days` đều PASS. | **PASS** | **BLOCKED** | — |
| **J06** | **Đăng xuất/phiên hết hạn, quay lại tab cũ, mở link trực tiếp; Desktop / Mobile 360-430px, Light / Dark mode** | - Không bypass đăng nhập, không lộ dữ liệu phiên trước.<br>- Thông báo lỗi rõ.<br>- Thao tác chính tiếp cận được trên mobile. | - Bảo vệ đăng nhập: `ProtectedRoute` bắt buộc session hợp lệ; dọn sạch toàn bộ workspace cache khi logout qua `workspaceScope().reset()`.<br>- Mobile Touch Target: Nút đóng, nút sửa và nút thao tác comment (`CommentMessage.tsx:94-106`) đạt chuẩn WCAG >= 44x44px.<br>- Nút thao tác trên màn hình cảm ứng hiển thị trực quan (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).<br>- Calendar popover có `max-width: calc(100vw - 24px)` chống tràn viền trên mobile 360px. | **PASS** | **BLOCKED** | BUG-UAT-01 & BUG-UAT-05 (Resolved) |

---

## 3. Báo cáo Retest 6 Lỗi từ đợt chạy trước `uat-20261024-01`

### 1. BUG-UAT-01: Calendar popover overflow clipping trên mobile
- **Mô tả ban đầu**: Popover lịch chọn ngày bị crop / tràn viền ngoài viewport màn hình di động 360-430px.
- **Kết quả kiểm chứng mã nguồn**:
  - `Dev/public/calendar/calendar.css:36-39`: Thiết lập `.cal-dropdown { inset: auto; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); overflow: auto; border-radius: 16px; }` và `.cal-popup { width: 300px; max-width: 100%; box-sizing: border-box; }`.
  - `Dev/public/calendar/calendar.js:65-66`: Định vị thông minh `left: Math.max(12, Math.min(rect.right - 300, window.innerWidth - 312)) + 'px'`. Trên màn hình 360px, popover luôn cách lề tối thiểu 12px, không bị clipping hay vỡ khung nhìn.
- **Kết luận**: **VERIFIED FIXED (PASS)**.

### 2. BUG-UAT-02: Rủi ro ghi đè dữ liệu ngầm (OCC optimistic concurrency control)
- **Mô tả ban đầu**: Khi nhiều người cùng mở task/subtask từ phiên cũ, việc cập nhật ghi đè ngầm dữ liệu của người khác do thiếu kiểm tra `updated_at`.
- **Kết quả kiểm chứng mã nguồn & Test Suite**:
  - `Dev/src/services/workspaceTasks.ts:25-38`: `updateTrackedTask` nhận tham số `expectedUpdatedAt`. Bổ sung điều kiện `.eq('updated_at', expectedUpdatedAt)`. Nếu không có bản ghi nào khớp (do người khác đã sửa trước), ném lỗi: *"Dữ liệu đã được người khác cập nhật trước đó. Vui lòng làm mới trang để xem phiên bản mới nhất."*
  - `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:590`: Truyền `currentUpdatedAt || subtask.updated_at` vào mỗi lần lưu.
  - Test suite `Dev/tests/subtaskActivityLogAndDeadline.test.mjs:30`: `updateTrackedTask enforces OCC when expectedUpdatedAt is supplied` -> **PASS**.
- **Kết luận**: **VERIFIED FIXED (PASS)**.

### 3. BUG-UAT-03: Thiếu kiểm tra giới hạn ngày cha khi sửa lịch subtask
- **Mô tả ban đầu**: `SubtaskDetailPanel` cho phép đặt ngày bắt đầu và kết thúc của subtask vượt ngoài khoảng ngày của Project/Campaign cha.
- **Kết quả kiểm chứng mã nguồn & Test Suite**:
  - `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:565-577`:
    ```typescript
    const bounds = {
      start: parentDetails?.start_date ? parentDetails.start_date.slice(0, 10) : '',
      due: (parentDetails?.due_date || parentDetails?.end_date) ? (parentDetails.due_date || parentDetails.end_date)!.slice(0, 10) : '',
    };
    const dateErr = workflowDateError(editStartDate, editDueDate, bounds);
    if (dateErr) {
      toast.error('Lịch subtask phải nằm trong khoảng thời gian của Project/Campaign cha.');
      return;
    }
    ```
  - Kiểm tra tương tự đối với việc thêm/sửa checklist item (`handleSaveEditChecklistItem` dòng 475: `if (itemDue && parentDue && itemDue > parentDue) { toast.error(...); return; }`).
  - Test suite `Dev/tests/workflowCalendar.test.mjs`: `calendar accepts inclusive boundaries and rejects reversed or out-of-parent dates` -> **PASS**.
- **Kết luận**: **VERIFIED FIXED (PASS)**.

### 4. BUG-UAT-04: Phân quyền duyệt mượn tài sản
- **Mô tả ban đầu**: Phân định quyền duyệt mượn tài sản giữa Admin, Manager, Leader Design và các Leader khác chưa đồng bộ giữa giao diện và logic backend.
- **Kết quả kiểm chứng mã nguồn**:
  - `Dev/src/lib/roleScope.ts:26-28`:
    ```typescript
    export function isAssetApprover(profile: RoleProfile): boolean {
      return isAdmin(profile) || isGlobalManager(profile) || (isDepartmentLeader(profile) && normalized(profile?.department_name) === 'design');
    }
    ```
  - `Dev/src/services/borrowWorkflow.ts:98`: Kiểm tra assert nghiêm ngặt `assert(profile?.id && isAssetApprover(profile), 'Chỉ Manager, Leader Design hoặc Admin được duyệt và xác nhận trả thiết bị.');`.
  - `Dev/src/components/features/profile/ProfilePermissionTab.tsx:15`: Khai báo quyền duyệt mượn tài sản phụ thuộc trực tiếp vào `isAssetApprover(profile)`.
- **Kết luận**: **VERIFIED FIXED (PASS)**.

### 5. BUG-UAT-05: Nút chỉnh sửa inline ngoài thẻ subtask
- **Mô tả ban đầu**: Thiếu thao tác chỉnh sửa trực tiếp nội dung đầu việc (checklist items) bên trong subtask, và các nút thao tác trên mobile bị ẩn sau hover.
- **Kết quả kiểm chứng mã nguồn**:
  - `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:865-972`: Bổ sung nút `Edit3` và `Trash2` trên từng đầu việc; khi bấm, mở form inline cho phép sửa tiêu đề, mô tả/brief, mức độ ưu tiên và hạn chót.
  - `Dev/src/components/features/comments/CommentMessage.tsx:94-106`: Sử dụng lớp Tailwind `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` và `min-h-[44px] min-w-[44px]` đảm bảo người dùng mobile chạm ngón tay dễ dàng.
- **Kết luận**: **VERIFIED FIXED (PASS)**.

### 6. BUG-UAT-06: Nhất quán UI/UX thẻ đầu việc và thẻ subtask (6 điểm user feedback vừa qua)
- **Mô tả ban đầu**: Cần đồng bộ 6 điểm trải nghiệm người dùng đối với thẻ subtask và đầu việc checklist items.
- **Kết quả kiểm chứng mã nguồn & Test Suite**:
  1. *Huy hiệu checklist*: Hiển thị số lượng hoàn thành `done/total` với màu xanh lá khi xong hết (`text-emerald-600 bg-emerald-50`) và màu xanh dương khi đang thực hiện (`text-sky-600 bg-sky-50`) trên cả `Projects.tsx` và `CampaignDetailDrawer.tsx`.
  2. *Tag mức độ ưu tiên*: Thống nhất định dạng chữ thường (lowercase) `low / medium / high / urgent` với màu sắc chuẩn từ `priorityClass`.
  3. *Mô tả / Brief nội dung*: Bổ sung trường textarea cho phép ghi chú brief chi tiết của đầu việc, hiển thị `whitespace-pre-wrap` rõ ràng.
  4. *Tự động gia hạn deadline*: Khi hạn chót đầu việc dài hơn hạn chót subtask, hệ thống hiển thị thông báo cảnh báo ⚡ và tự động cập nhật kéo dài hạn chót của subtask khi bấm lưu.
  5. *Form chỉnh sửa inline*: Cho phép hủy và lưu trực tiếp không cần mở modal phụ.
  6. *Nhật ký hoạt động (Activity Log)*: Mọi thao tác thêm, sửa, xóa, toggle checklist và tự động dời deadline đều được ghi nhận qua `taskActivityLogger` với tên thành viên và timestamp.
  - Test suite `Dev/tests/subtaskActivityLogAndDeadline.test.mjs`:
    - `subtask item with further deadline extends subtask due date` -> **PASS**.
    - `taskActivityLogger formats payload and includes actor name and timestamp` -> **PASS**.
    - `subtask checklist items persist description and priority correctly` -> **PASS**.
    - `computes total and done counts for subtask checklist badge` -> **PASS**.
- **Kết luận**: **VERIFIED FIXED (PASS)**.

---

## 4. Tổng hợp số lượng ca kiểm thử theo vai trò

| Nhóm ca nghiệm thu | Tổng số ca | PASS (Static) | FAIL (Static) | BLOCKED (Live UI) | Tỷ lệ PASS Static | Ghi chú |
|---|---|---|---|---|---|---|
| **Admin** (AM01 — AM10) | 10 | 10 | 0 | 10 | **100%** | AM04 đã khắc phục triệt để. |
| **Manager** (AM01 — AM10) | 10 | 10 | 0 | 10 | **100%** | AM04 & AM09 đã khắc phục triệt để. |
| **Leader** (LD01 — LD10) | 10 | 10 | 0 | 10 | **100%** | LD08 (OCC) đã khắc phục triệt để. |
| **Staff** (ST01 — ST10) | 10 | 10 | 0 | 10 | **100%** | ST05 (Test suite) & ST08 (Mobile UX) đã khắc phục triệt để. |
| **Hành trình liên vai** (J01 — J06) | 6 | 6 | 0 | 6 | **100%** | 6/6 kịch bản đều đạt chuẩn trên tầng mã nguồn và test suite. |
| **Toàn bộ hệ thống** | **46** | **46** | **0** | **46** | **100%** | Không còn bất kỳ ca FAIL nào trên mã nguồn và test suite. |

---

## 5. Bảng tổng kết Defect Log

| Bug ID | Mức độ | Tiêu đề tóm tắt | Trạng thái trong Run 01 | Trạng thái trong Run 02 | Kết luận kiểm chứng |
|---|---|---|---|---|---|
| **BUG-UAT-01** | P1 | Test Suite Regression & Calendar clipping mobile | MỞ (FAIL) | **ĐÃ GIẢI QUYẾT** | Test suite 96/96 PASS; Calendar popup có `max-width: calc(100vw - 24px)`. |
| **BUG-UAT-02** | P1 | Rủi ro ghi đè dữ liệu ngầm (thiếu OCC) | MỞ (FAIL) | **ĐÃ GIẢI QUYẾT** | OCC qua `expectedUpdatedAt` trong `updateTrackedTask` chặn ghi đè ngầm. |
| **BUG-UAT-03** | P1 | Thiếu kiểm tra giới hạn ngày cha của subtask | MỞ (FAIL) | **ĐÃ GIẢI QUYẾT** | `workflowDateError` chặn ngày subtask vượt ngoài ngày cha. |
| **BUG-UAT-04** | P2 | Phân quyền duyệt mượn tài sản | MỞ (FAIL) | **ĐÃ GIẢI QUYẾT** | Đồng bộ hóa `isAssetApprover` giữa UI Profile, service và backend. |
| **BUG-UAT-05** | P2 | Nút chỉnh sửa inline & Touch target mobile | MỞ (FAIL) | **ĐÃ GIẢI QUYẾT** | Inline edit checklist items đầy đủ; Touch target mobile >= 44px. |
| **BUG-UAT-06** | P2 | Nhất quán UI/UX thẻ đầu việc & subtask | MỞ (FAIL) | **ĐÃ GIẢI QUYẾT** | Hoàn tất 6/6 điểm feedback (badge, tag, brief, auto deadline, inline edit, log). |

---

## 6. Tổng hợp của Nhi và thẩm định của Khoa

- **Tổng ca kiểm thử**: 46 ca (10 Admin, 10 Manager, 10 Leader, 10 Staff, 6 Journeys).
  - **Static Code Audit & Test Suite**: **46 PASS / 0 FAIL (Tỷ lệ: 100%)**.
  - **Live Browser UI**: **46 BLOCKED** (Do cơ chế bảo mật của IDE hạn chế gọi `execute_url` qua Chrome DevTools MCP).
- **Lỗi P0 / P1 còn mở**: **0 (Không còn lỗi P0 hoặc P1 nào)**.
- **Toàn vẹn mã nguồn & Build**:
  - `node --test tests/*.test.mjs tests/*.test.cjs`: 96 tests PASS (100%).
  - `npm run build`: Thành công trong 1.52s, 0 lỗi biên dịch.
- **Kết luận của Nhi (QA Lead)**:
  - Về mặt logic nghiệp vụ, tính toàn vẹn dữ liệu, phân quyền nhiều lớp và trải nghiệm người dùng, hệ thống đã được hoàn thiện vượt bậc so với đợt chạy trước.
  - Toàn bộ 6 kịch bản hành trình liên vai và 6 lỗi tồn đọng từ đợt chạy 01 đều đã được sửa chữa và kiểm chứng thành công.
  - **ĐỀ XUẤT SẴN SÀNG BÀN GIAO VẬN HÀNH CHO NHÂN VIÊN**, với lưu ý thực hiện bước smoke test cuối cùng trên trình duyệt của người dùng thực tế trước khi chính thức mở rộng toàn công ty.
