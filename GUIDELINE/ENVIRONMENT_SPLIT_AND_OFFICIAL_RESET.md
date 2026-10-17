# Tách dữ liệu Develop và dọn dữ liệu công việc Official

Trạng thái: **đã hoàn tất tách môi trường Develop và dọn dữ liệu công việc Official** · 17/10/2026

Tài liệu này bổ sung `UX_UI_DESIGN_SYSTEM/GUIDELINE/DEPLOYMENT_RULES.md`. Quy tắc triển khai vẫn giữ nguyên: code và thử nghiệm trên `codex/develop-dashboard`; `main` chỉ cập nhật khi có lệnh phát hành riêng.

## Ranh giới môi trường

| Môi trường | URL | Nhánh | Supabase hiện tại | Trạng thái |
| --- | --- | --- | --- | --- |
| Official | `https://dashboard-nu-tan-30.vercel.app/` | `main` | `jxrwphjriuqbpdpwpqcn` | Đã dọn toàn bộ dữ liệu công việc test (Project/Campaign/Task/Workflow); giữ nguyên Auth, nhân sự, phòng ban, tài sản/mượn trả |
| Develop | `https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/` | `codex/develop-dashboard` | `samuuyxxtocqmtujnnhe` | Bundle Preview đã trỏ sang Supabase Dev riêng, bảo toàn đầy đủ dữ liệu test hiện có |

Hai bundle Vercel đã tách hoàn toàn ranh giới dữ liệu: Official (`main`) trỏ vào `jxrwphjriuqbpdpwpqcn.supabase.co`, còn Develop (`codex/develop-dashboard`) trỏ vào `samuuyxxtocqmtujnnhe.supabase.co`.

Vercel project ID: `prj_ZzwTKDS2fFmU8JOmtkSftNvHia6B`. Hai biến `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` gốc vẫn áp dụng cho Production và Preview chung; hai override mới đã được đặt **chỉ cho Preview của nhánh `codex/develop-dashboard`**. Kết nối Vercel đọc được project qua ID không kèm team slug; thao tác có team slug `bart-c8ff` trả 403. Không sửa giá trị Production.

## Phạm vi dữ liệu

Snapshot chỉ để ước lượng trước khi thao tác (17/10/2026; số thực tế có thể đổi): 65 `projects`, 11 `campaigns`, 171 `tasks`, 15 `project_subtasks`, 11 `campaign_subtasks`, 76 `workflow_tracks`, 18 `workflow_phases`, 10 `comments`, 27 `project_comments`, 145 `activity_log`, 395 `notifications`. Có 7 `auth.users`, 13 `public.users`, 23 tệp Storage và 12 đăng ký push trên project hiện tại.

Trong 395 notification có 392 bản ghi thuộc `project`, `campaign`, `task` hoặc subtask; 3 bản ghi còn lại thuộc `department`/`profile`. Storage gồm 11 tệp `attachments/weekly-reports` và 12 tệp `avatars`. Các số này phải được đọc lại sát thời điểm dọn.

- **Develop:** giữ đủ Project/Campaign/Task, phase, bình luận và dữ liệu số liệu test theo ID gốc; giữ các tài khoản, quyền, workspace và cấu hình cần cho chức năng. Clone tệp đính kèm nếu muốn link hiện có vẫn mở được. Không kích hoạt lại `push_subscriptions`/`push_deliveries` cũ ở Dev: endpoint trỏ đến thiết bị thật và có thể gửi thông báo test cho staff.
- **Official:** chỉ dọn dữ liệu công việc thuộc Project/Campaign/Task cùng các bản ghi phụ thuộc, phase/track, comment, log và notification có entity ID tương ứng. Giữ `auth.users`, `public.users`, `departments`, `workspaces`, `workspace_members`, `columns`, `user_preferences`, bảng thiết bị/mượn trả và thông báo của luồng thiết bị/hệ thống. Rà soát `ui_state` ghim trước khi dọn tham chiếu đã mất.
- Tệp `attachments/weekly-reports` thuộc luồng công việc cần được đối chiếu với Report rồi dọn qua Storage API sau khi dữ liệu Dev được bảo toàn; giữ nguyên bucket `avatars` và ảnh đại diện. `push_deliveries` trỏ tới `notifications` bằng FK cascade, nên chỉ delivery của notification công việc bị dọn theo.
- Không xóa cả bảng `activity_log` hoặc `notifications`: chúng dùng chung nhiều nghiệp vụ. Không chỉ xóa parent rồi dựa vào cascade: `tasks.project_id` và `tasks.campaign_id` dùng `ON DELETE SET NULL`; task sẽ còn lại nếu bỏ qua bước xóa task.

## Thứ tự thực hiện

1. Chốt organization để tạo Supabase Dev riêng trong cùng region `ap-northeast-2`; xác nhận chi phí nếu Supabase báo phí. Free plan không có Branching, nên dùng project riêng.
2. Sao lưu project hiện tại. Chuyển schema, RLS, function, Auth identities, dữ liệu cần test và Storage sang Dev; giữ UUID/bigint và sequence để link, phân quyền và tracking không đổi. Kiểm tra migration nào thực sự đã áp dụng, không giả định mọi file trong repo đều đã chạy.
3. Cấu hình **Preview của nhánh Develop** với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` của Dev. Xác nhận URL bundle Preview chứa Dev project ID, Official vẫn chứa project ID cũ; kiểm tra đăng nhập, số bản ghi, quyền và liên kết Project → Workflow → Task bằng truy vấn chỉ đọc. Dev có thể yêu cầu đăng nhập lại do JWT secret mới.
4. Sau khi Dev hoạt động trên DB riêng, chụp lại snapshot và chuẩn bị transaction dọn Official: lưu tập ID mục tiêu, xóa notification/log theo loại và ID, comment, task/subtask, workflow track/phase theo thứ tự FK, rồi Project/Campaign. Phạm vi phải bao gồm cả bản ghi đã ẩn/xóa mềm. Kiểm tra zero orphan và giữ nguyên số lượng Auth, users, assets, borrow requests, preferences.
5. Chỉ commit các thay đổi source/tài liệu lên `codex/develop-dashboard`. Không merge/push `main` trong đợt dọn dữ liệu này.

## Tiến độ thực tế 17/10/2026

- Đã tạo Supabase Dev `samuuyxxtocqmtujnnhe` ở `ap-northeast-2`.
- Đã chuyển schema `public`, 7 `auth.users`/identities, 31 bảng `public` cùng các bản ghi hiện có. Số hàng các bảng nghiệp vụ đối chiếu khớp snapshot nguồn (65 `projects`, 11 `campaigns`, 171 `tasks`, 15 `project_subtasks`, 11 `campaign_subtasks`, 76 `workflow_tracks`, 18 `workflow_phases`, 32 `workflow_phase_members`, 10 `comments`, 27 `project_comments`); ACL của bảng/function/sequence có cùng 1.155 quyền và cùng fingerprint sau khi chuẩn hóa tên role. Đã chuyển lịch sử 9 migration nguồn.
- Đã tạo hai bucket (`attachments`, `avatars`) và policy Storage tương ứng trên Dev; không chuyển 12 `push_subscriptions` / 112 `push_deliveries` và không bật lại worker push trên Dev.
- Đã cấu hình override Vercel Preview theo nhánh `codex/develop-dashboard` và xác nhận bundle live:
  - **Develop** (`index-xm68DcIh.js`) chứa `https://samuuyxxtocqmtujnnhe.supabase.co` và `sb_publishable_xxF0owFyQwHAfgVWKH2Sgg_IRqSKLIh`.
  - **Official** (`index-BTMyboCH.js`) giữ nguyên `https://jxrwphjriuqbpdpwpqcn.supabase.co` và `sb_publishable_azJfzhk-nzUYGWb23zAFiQ_KKRrYLMM`.
- Đã thực thi transaction dọn dữ liệu công việc trên **Official** (`jxrwphjriuqbpdpwpqcn`):
  - Xóa về `0` toàn bộ `projects` (65), `campaigns` (11), `tasks` (171), `project_subtasks` (15), `campaign_subtasks` (11), `workflow_tracks` (76), `workflow_phases` (18), `workflow_phase_members` (32), `project_members` (23), `campaign_members` (4), `comments` (10), `project_comments` (27), `activity_log` công việc (145), `notifications` công việc (392), `push_deliveries` công việc (112) và 11 tệp `attachments/weekly-reports`.
  - Bảo toàn nguyên vẹn trên Official: `auth.users` (7), `public.users` (13), `departments` (9), `workspaces` (1), `columns` (4), `asset_categories` (5), `assets` (42), `borrow_requests` (3), `user_preferences` (3), `push_subscriptions` (12), `notifications` hệ thống/phòng ban (3) và 12 tệp bucket `avatars`.

## Điều kiện chặn

- Chưa có Supabase Dev và chưa chuyển Preview sang project đó: **không dọn Official**.
- Nếu Vercel từ chối biến môi trường Preview theo project ID: không đổi build/runtime bằng mẹo hardcode URL; cần người sở hữu team cấu hình hai biến Preview cho đúng nhánh.
- Chưa sao chép Auth/Storage hoặc chưa xác minh dữ liệu test: không coi Develop đã được bảo toàn.
- Không đưa service-role key, mật khẩu database, dump dữ liệu hoặc token vào Git.
