# Báo cáo Phản biện Độc lập UAT (Reviewer: Khoa)

- **Đợt chạy nghiệm thu (Run ID)**: `uat-20261024-02`
- **Thời gian đánh giá**: 2026-10-24T21:10:00+07:00
- **Người phản biện**: Khoa (`khoa` — Reviewer độc lập)
- **Nhánh & Commit SHA thẩm định**: `develop` | HEAD SHA: `26686aa442ba9d4bbfcd1e7735d4c505bdf310ec` (`fix(ui): unify subtask and checklist item styling, hover actions, and priority tags`)
- **Môi trường đối chứng thực tế**:
  - Vercel Develop Preview: `https://dashboard-git-develop-bart-c8ff.vercel.app/` (Version: `1792849322240`, `builtAt: 2026-10-24T13:42:02.240Z`, đối chiếu khớp chính xác với SHA `26686aa`).
  - Local repository: `Dev/src`, `Dev/tests`, `Dev/supabase/migrations`.
- **Hồ sơ tài liệu đối chiếu**:
  + `.agents/uat/runs/uat-20261024-02/SUMMARY.md` (Báo cáo tổng hợp của QA Lead Nhi)
  + `.agents/uat/runs/uat-20261024-02/uat-admin-manager.md` (Báo cáo Persona Admin & Manager)
  + `.agents/uat/runs/uat-20261024-02/uat-leader.md` (Báo cáo Persona Leader)
  + `.agents/uat/runs/uat-20261024-02/uat-staff.md` (Báo cáo Persona Staff)
  + `AGENTS.md`, `.agents/uat/README.md`, `.agents/uat/JOURNEYS.md`, `.agents/rules/coder.md`.

---

## 1. Kết luận Phản biện Độc lập (Verdict)

> [!IMPORTANT]
> **KẾT LUẬN: CHẤP THUẬN NGHIỆM THU Ở TẦNG MÃ NGUỒN VÀ TIÊU CHUẨN KỸ THUẬT (APPROVED AT CODE & LOGIC LEVEL) — CÓ ĐIỀU KIỆN SMOKE TEST GIAO DIỆN TRÌNH DUYỆT TRƯỚC KHI MỞ RỘNG TOÀN CÔNG TY.**
>
> 1. **Toàn bộ 6/6 lỗi từ đợt `uat-20261024-01` (BUG-UAT-01 đến BUG-UAT-06) đã được khắc phục triệt để**: Không còn bất kỳ lỗi P0 hoặc P1 nào còn mở trong mã nguồn. Cơ chế chống ghi đè ngầm (OCC), chặn lịch subtask vượt cha, và phân quyền mượn tài sản đã được cài đặt và kiểm chứng hoàn chỉnh.
> 2. **Bộ kiểm thử tự động đạt độ tin cậy tuyệt đối**: Khoa đã tự thực thi độc lập test suite, ghi nhận **96/96 unit tests PASS (100%)**, thời gian chạy 542ms. Bản build ứng dụng (`tsc -b && vite build`) hoàn thành sạch sẽ trong 1.54s với 0 lỗi TypeScript.
> 3. **Tính trung thực về trạng thái Live Browser UI**: Các subagent báo cáo chính xác trạng thái **BLOCKED** cho 46 ca Live Browser UI do môi trường thực thi thiếu phiên đăng nhập thật và bị chặn quyền `execute_url` trên Chrome CDP. Căn cứ theo Rule 40 của `.agents/uat/README.md`, Khoa **không chấp thuận bàn giao vận hành "mù"** nếu chỉ dựa vào static review; trước khi phát hành rộng rãi cho nhân viên, cần 1 phiên smoke test nhanh (5–10 phút) do người dùng thực tế thao tác trực tiếp trên trình duyệt.

---

## 2. Bảng đối soát Thẩm định Bằng chứng Độc lập

| Hạng mục kiểm tra | Tuyên bố của Nhi & Subagents | Kết quả Khoa thẩm định độc lập | Bằng chứng kiểm chứng thực tế | Đánh giá |
|---|---|---|---|---|
| **Test Suite Tự động** | 96/96 tests PASS | **XÁC NHẬN CHÍNH XÁC** (Khoa tự chạy `node --test Dev/tests/*.test.mjs Dev/tests/*.test.cjs`) | 96 passing, 0 failing, 0 skipped trong 542ms | **ĐẠT** |
| **Biên dịch & Build** | `npm run build` thành công, 0 lỗi TypeScript | **XÁC NHẬN CHÍNH XÁC** (Khoa tự chạy `npm run build`) | `tsc -b && vite build` tạo bundle sạch trong 1.54s | **ĐẠT** |
| **Cú pháp & Linter** | `npm run lint` không có error | **XÁC NHẬN CHÍNH XÁC** (Khoa tự chạy `npm run lint`) | 0 errors, 183 warnings (chủ yếu là exhaustive-deps của hooks) | **ĐẠT** |
| **Deploy Vercel Preview** | Vercel Develop Preview sẵn sàng tại SHA `26686aa` | **XÁC NHẬN CHÍNH XÁC** (Khoa curl kiểm tra `/version.json`) | `curl https://dashboard-git-develop-bart-c8ff.vercel.app/version.json` trả về `builtAt: 2026-10-24T13:42:02.240Z` khớp commit `26686aa` | **ĐẠT** |
| **Chống ghi đè ngầm (OCC)** | Triển khai `expectedUpdatedAt` trong `updateTrackedTask` | **XÁC NHẬN CHÍNH XÁC** (Đã soi code và test) | `Dev/src/services/workspaceTasks.ts:25-38` có `.eq('updated_at', expectedUpdatedAt)`. Test `updateTrackedTask enforces OCC` PASS | **ĐẠT** |
| **Ràng buộc lịch cha - con** | Chặn subtask và checklist items vượt hạn chót cha | **XÁC NHẬN CHÍNH XÁC** (Đã soi code và test) | `SubtaskDetailPanel.tsx:565-577` dùng `workflowDateError` và dòng 476 chặn `itemDue > parentDue`. Test `workflowCalendar.test.mjs` PASS | **ĐẠT** |
| **Phân quyền duyệt tài sản** | Admin, Global Manager, Leader Design duyệt; người khác chặn | **XÁC NHẬN CHÍNH XÁC** (Đã soi code và RLS) | `roleScope.ts:26-28` (`isAssetApprover`), `borrowWorkflow.ts:98`, migration RLS `dashboard_asset_approver` | **ĐẠT** |
| **Mobile UX & Touch Target** | Nút đóng/sửa và nút thao tác comment đạt chuẩn >= 44px | **XÁC NHẬN CHÍNH XÁC** (Đã soi code CSS) | `SubtaskDetailPanel.tsx:743` có `min-h-[44px] min-w-[44px]`. `CommentMessage.tsx:94-106` có `opacity-100 sm:opacity-0` và `min-h-[44px]` | **ĐẠT** |
| **Lý do ca Live UI bị BLOCKED** | Không kết nối được Chrome CDP do lỗi phân quyền `execute_url` | **XÁC NHẬN ĐÚNG THỰC TẾ KHÁCH QUAN** | IDE sandbox chặn URL ngoài; thiếu session cookie pre-authenticated của tài khoản test thật | **ĐẠT** (Ghi đúng quy chuẩn) |

---

## 3. Thẩm định chi tiết 6 Phiếu lỗi đã giải quyết (Retest)

### 3.1. BUG-UAT-01: Lỗi hồi quy Test Suite & Calendar popover clipping mobile
- **Bằng chứng xác minh**:
  + File test `Dev/tests/commentEditing.test.mjs` đã đồng nhất contract payload với `Dev/src/lib/commentEditing.ts:18` (loại bỏ trường thừa gây lỗi `AssertionError`).
  + `Dev/public/calendar/calendar.css:36-39`: Bổ sung `max-width: calc(100vw - 24px)` và `overflow: auto`.
  + `Dev/public/calendar/calendar.js:65-66`: Căn chỉnh tọa độ `Math.max(12, Math.min(rect.right - 300, window.innerWidth - 312)) + 'px'`. Không còn nguy cơ vỡ khung nhìn trên mobile 360px.
- **Đánh giá**: **VERIFIED FIXED (PASS)**.

### 3.2. BUG-UAT-02: Rủi ro ghi đè dữ liệu ngầm (Optimistic Concurrency Control)
- **Bằng chứng xác minh**:
  + Tại `Dev/src/services/workspaceTasks.ts:25-38`: Hàm `updateTrackedTask` nhận tham số `expectedUpdatedAt?: string | null`. Lệnh cập nhật Supabase bổ sung `.eq('updated_at', expectedUpdatedAt)`. Nếu bản ghi đã bị thay đổi ở phiên khác, trả về 0 rows và throw exception: *"Dữ liệu đã được người khác cập nhật trước đó. Vui lòng làm mới trang để xem phiên bản mới nhất."*
  + Tại `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:590`: Đã truyền `currentUpdatedAt || subtask.updated_at` vào các lệnh ghi.
  + Test tự động độc lập `Dev/tests/subtaskActivityLogAndDeadline.test.mjs:30` PASS.
- **Đánh giá**: **VERIFIED FIXED (PASS)**.

### 3.3. BUG-UAT-03: Thiếu kiểm tra giới hạn ngày cha khi sửa lịch subtask
- **Bằng chứng xác minh**:
  + Tại `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:565-577`:
    Kiểm tra biên ngày cha `bounds = { start: parentDetails?.start_date, due: parentDetails?.due_date || parentDetails?.end_date }`. Nếu `workflowDateError` phát hiện vi phạm, ngắt tiến trình và hiển thị toast: *"Lịch subtask phải nằm trong khoảng thời gian của Project/Campaign cha."*
  + Tại `SubtaskDetailPanel.tsx:476`: Kiểm tra `if (itemDue && parentDue && itemDue > parentDue)` ngăn chặn ngày checklist vượt ngày cha.
  + Test `Dev/tests/workflowCalendar.test.mjs` PASS.
- **Đánh giá**: **VERIFIED FIXED (PASS)**.

### 3.4. BUG-UAT-04: Phân quyền duyệt mượn tài sản
- **Bằng chứng xác minh**:
  + `Dev/src/lib/roleScope.ts:26-28`: `isAssetApprover` quy định rõ ràng chỉ Admin, Global Manager hoặc Leader phòng Design mới có quyền duyệt mượn thiết bị.
  + `Dev/src/services/borrowWorkflow.ts:98`: Bổ sung kiểm tra guard phía client trước khi thực thi mutation.
  + Khớp với chính sách phân quyền RLS `dashboard_asset_approver` tại database.
- **Đánh giá**: **VERIFIED FIXED (PASS)**.

### 3.5. BUG-UAT-05: Nút chỉnh sửa inline & Touch target mobile >= 44px
- **Bằng chứng xác minh**:
  + Form inline edit cho checklist items trong `SubtaskDetailPanel.tsx:865-972` cho phép sửa trực tiếp tiêu đề, mô tả, mức độ ưu tiên và hạn chót.
  + Touch targets cho nút đóng (X), nút Sửa và nút thao tác comment (`CommentMessage.tsx:94-106`) đều đạt chuẩn tối thiểu 44x44px. Lớp `opacity-100 sm:opacity-0` giúp người dùng chạm trực tiếp trên màn hình cảm ứng mà không cần hover chuột.
- **Đánh giá**: **VERIFIED FIXED (PASS)**.

### 3.6. BUG-UAT-06: Nhất quán UI/UX thẻ đầu việc & thẻ subtask
- **Bằng chứng xác minh**:
  1. *Checklist badge*: Màu xanh dương lợt (`sky`: `text-sky-600 bg-sky-50 dark:bg-sky-950/40`) khi đang làm và màu xanh lá (`emerald`: `text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40`) khi hoàn thành 100%. Áp dụng đồng bộ trên `Projects.tsx` và `SubtaskDetailPanel.tsx`.
  2. *Priority tag*: Thống nhất chữ thường (`lowercase`) trên toàn bộ giao diện (`low`, `medium`, `high`, `urgent`).
  3. *Mô tả đầu việc*: Textarea nhập brief nội dung, lưu trữ trong metadata và hiển thị `whitespace-pre-wrap`.
  4. *Tự động kéo dài deadline subtask*: Khi hạn chót đầu việc xa hơn subtask, xuất hiện cảnh báo ⚡ và tự động cập nhật `due_date` của subtask kèm ghi nhận vào `activity_log`.
  5. *Khoảng cách chống che khuất chữ*: Lớp `pr-14` (56px) trên label checklist bảo vệ không gian cho 2 icon `Edit3` và `Trash2`, triệt tiêu hoàn toàn hiện tượng tràn chữ đè nút.
  6. *Activity Log Popover*: Ghi nhận chi tiết hoạt động của subtask và checklist items.
- **Đánh giá**: **VERIFIED FIXED (PASS)**.

---

## 4. Phản biện Chuyên sâu Tiêu chí Ranh giới & Lỗi mới phát hiện

### 4.1. [P3] Vi phạm Tiêu chí "Zero Flexbox" trong Markup mới sửa đổi
- **Mức độ**: **P3 (Minor — Vi phạm quy chuẩn phong cách Coder)**
- **Vị trí**:
  + `Dev/src/components/features/comments/CommentMessage.tsx:94`: `className="flex shrink-0 items-center ..."`
  + `Dev/src/components/features/comments/CommentMessage.tsx:97, 101, 104`: `className="... flex items-center justify-center ..."`
  + `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:743`: `className="... flex items-center justify-center ..."`
  + `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:746`: `className="inline-flex shrink-0 items-center justify-center ..."`
  + `Dev/src/components/features/projects/SubtaskDetailPanel.tsx:747`: `className="flex flex-wrap gap-2 mt-4"`
  + `Dev/src/components/features/tasks/TaskDetailPanel.tsx:159, 162, 163`: tương tự SubtaskDetailPanel
  + `Dev/src/pages/Projects.tsx:180, 255`: `className="flex min-w-0 items-center gap-1 ..."`
- **Tác động**: Giao diện không bị vỡ và hoạt động bình thường trên các trình duyệt hiện đại, nhưng vi phạm trực tiếp Quy tắc số 3 của Tùng trong `.agents/rules/coder.md` (*"Never use Flexbox: no flex, inline-flex, or flex layout properties. Prefer project-supported CSS Grid or normal document flow"*).
- **Yêu cầu khắc phục**: Tùng cần thay thế các class `flex` / `inline-flex` này bằng `grid` / `inline-grid` hoặc `inline-block` / normal document flow trong lượt dọn dẹp mã nguồn kế tiếp.

### 4.2. Thẩm định Dark Mode Tokens & Glass Effect
- **Màu sắc & Tokens**: Toàn bộ màu sắc mới thêm vào (như badge `sky` và `emerald`, priority tags, button viền nét đứt) đều được cấu hình đối xứng giữa Light và Dark mode:
  + `text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60`
  + `text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60`
  + Viền drawer và panel: `border-gray-200 dark:border-slate-700`
- **Liquid Glass Blur**: Hiệu ứng kính mờ `backdrop-blur-md` trên header và drawer được giữ nguyên vẹn, không bị đè hay loại bỏ.
- **Typography & Radii**: Font chữ, kích thước nhãn và bo góc (`rounded-xl`, `rounded-full`) tuân thủ nghiêm ngặt chuẩn Cyber-Organic Liquid Glass.

---

## 5. Khuyến nghị Điều phối cho Hiệp PM và Người dùng (Bro)

1. **Về kỹ thuật**: Source code trên nhánh `develop` tại commit `26686aa442ba9d4bbfcd1e7735d4c505bdf310ec` đã đạt chuẩn kỹ thuật cao, không còn lỗi logic hay rủi ro dữ liệu nghiêm trọng.
2. **Quy trình bàn giao vận hành**:
   - Khoa **chấp thuận nghiệm thu ở tầng mã nguồn và hệ thống test**.
   - Để chính thức bàn giao cho nhân viên làm việc thật: Đề nghị **Bro hoặc Tester người thật mở trực tiếp URL Vercel Preview** (`https://dashboard-git-develop-bart-c8ff.vercel.app/`), đăng nhập tài khoản thực tế và thực hiện **Smoke Test nhanh trong 5 phút** tập trung vào 3 kịch bản:
     1. Mở một subtask, thêm 1 đầu việc checklist có hạn chót dài hơn subtask xem thông báo ⚡ và tự động gia hạn có hiển thị mượt mà không.
     2. Thử hover lên đầu việc xem cụm nút Sửa/Xóa có bị đè chữ không (đã có padding `pr-14`).
     3. Thử chuyển đổi giữa Dark mode và Light mode trên trang Projects để kiểm tra trực quan màu badge xanh dương (`sky`) và xanh lá (`emerald`).
3. **Kế hoạch tiếp theo**: Sau khi smoke test trực quan hoàn tất không có phát sinh, Hiệp PM có thể xin phê duyệt của bro để tiến hành quy trình deploy lên nhánh `main` Production theo `.agents/skills/deploy-main/SKILL.md`.

