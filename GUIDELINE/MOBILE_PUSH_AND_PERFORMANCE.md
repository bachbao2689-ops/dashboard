# Mobile Push & tải dữ liệu — 15/10/2026

## Source được hợp nhất

- Giữ icon bình luận, chấm chưa đọc, số đơn và UI Header/Sidebar/MobileNav của commit `cae2dcc`.
- Hợp nhất `bbf9a62` và `deed77d`: nguồn task/subtask chung, lưu Report nguyên tử, performance theo timestamp thực và sửa Campaign trong Profile.
- Giữ DateFilterDropdown mới của biểu đồ phân bổ khi tách component.

## Trải nghiệm đã chốt

Desktop Mac/Windows là nơi làm việc chính. Mobile ưu tiên nhận thông báo và xem tiến độ. Sự kiện được gửi từ server; không cần máy tính mở Dashboard.
Task/subtask detail trên Mobile hiển thị nội dung và lịch sử bình luận, ẩn composer/Sửa/Complete; All Tasks không hiện tạo mới/chọn hàng loạt trên màn hình nhỏ. Đây là cách trình bày theo thiết bị, không thay thế phân quyền server.

iPhone: mở link Official bằng Safari → Chia sẻ → Thêm vào Màn hình chính → mở icon → đăng nhập → chuông thông báo → Bật thông báo → Cho phép. Develop vẫn có thể đăng ký riêng để test.

Sau khi thiết bị hiện tại đăng ký thành công, ẩn khối “Thông báo trên thiết bị” trong chuông (gồm hướng dẫn, Gửi thử và Tắt). Thiết bị khác chưa bật vẫn thấy hướng dẫn đăng ký; không suy ra trạng thái từ việc cùng tài khoản đã bật trên điện thoại. Trong lúc kiểm tra đăng ký, không nháy lại khối hướng dẫn.

Danh sách chuông giữ 12 thông báo gần nhất của chính người dùng, gồm đã đọc và chưa đọc. “Đã đọc tất cả” chỉ cập nhật trạng thái đọc và badge; nội dung, thứ tự và link đến task/@mention vẫn giữ sau khi tải lại. Badge Header/Sidebar tiếp tục chỉ đếm chưa đọc. Migration `20261015140000_notification_history.sql` tách hai nguồn tổng hợp này, giữ security invoker và quyền hiện có.

Chỉ request quyền từ thao tác bấm của người dùng. Cài web app chưa đồng nghĩa đã cấp quyền push. iOS cần 16.4 trở lên; Focus và cài đặt hệ điều hành có thể tắt âm thanh/ẩn thông báo.

## Nguồn và quyền

`notifications INSERT → push_deliveries → pg_net → dashboard-push → Apple/Google/Mozilla push → service worker → đúng deep link`.

- Dùng nguồn thông báo hiện có cho @mention, comment, Report, phase. Thêm trigger cho giao/reassign task và hai loại subtask ngoài đường tạo task phase đã có thông báo.
- Thiết bị tự đăng ký, gắn user và Auth session. Đăng xuất hủy đăng ký; worker kiểm tra session còn tồn tại, staff active và user khớp trước khi gửi.
- Subscription, khóa VAPID riêng và hàng đợi không được đọc/ghi trực tiếp bởi anon/authenticated. RPC đăng ký suy ra người dùng từ JWT. Public RPC chỉ trả public key và môi trường được bật.
- Edge Function tự xác thực: `Auth.getUser(JWT)` cho Gửi thử; khóa webhook riêng cho drain. Không nhận user_id từ client. Endpoint push chỉ chấp nhận các nhà cung cấp đã whitelist.
- Delivery unique theo notification/device, lease chống worker xử lý trùng đồng thời; lỗi tạm retry tối đa 5 lần, 404/410 gỡ subscription hết hạn. Notification đã đọc/đã cũ hoặc session mất hiệu lực bị bỏ qua. Push delivery có thể lặp sau sự cố giữa send/ack; tag ổn định giúp gộp thông báo trên thiết bị.
- Không cache trang, API hoặc nội dung nhạy cảm trong service worker. Không tự reload nội dung đang nhập.

## Môi trường

Người dùng ban đầu bật Develop; ngày 15/10/2026 đã xác nhận rõ **Bật Web Push trên Official, cho phép gửi thông báo thật tới các thiết bị tự đăng ký.** Cấu hình đã áp dụng cho cả hai môi trường.

- Allowed origins: `https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app` và `https://dashboard-nu-tan-30.vercel.app`.
- Migration `20261015101500_enable_official_push.sql` thêm Official; giữ nguyên khóa VAPID và các thiết bị Develop đã đăng ký, không phát lại thông báo cũ.
- Supabase dùng chung: migration thêm index, hàm tổng hợp thông báo và hạ tầng push đã áp dụng. Không tạo bản sao task hay di chuyển dữ liệu nghiệp vụ.
- Kiểm tra sau deploy phát hiện `complete_tracked_tasks` và `save_task_weekly_reports` chưa có trên DB; đã áp dụng migration `20261014105438_workspace_tracking_reports.sql` đã qua test, để source Develop không còn khóa tính năng dự phòng.
- Khóa riêng chỉ trong bảng server bị khóa quyền; không đưa vào Git hoặc biến VITE.
- Khi bật Official đã có một thiết bị Develop và bốn delivery trạng thái sent. Thiết bị Official cần tự đăng ký riêng vì quyền push gắn với origin; vẫn cần kiểm tra nhận trên điện thoại thật sau bước cấp quyền.

## Tối ưu tải

- Sidebar, Header, MobileNav dùng chung snapshot và một listener thông báo: thay 18 count requests + query Header bằng một RPC tổng hợp.
- Gộp các lượt đọc task đang chạy theo danh tính tài khoản/quyền; không giữ cache dữ liệu task dài hạn.
- Không reload toàn bộ Calendar khi chỉ thay đổi notification. Notification chỉ tải lại danh sách riêng.
- Debounce realtime; tạm dừng reload khi tab ẩn; tránh fetch trùng khi vừa subscribe lần đầu. Tải lại khi quay về/focus và khi reconnect.
- Giảm kiểm tra profile nền từ mỗi phút xuống 5 phút khi trang đang hiện, tránh gọi DB bên trong callback giữ Auth lock; chặn kết quả phiên cũ ghi đè sau logout.
- Lazy-load từng tab. Main JS build từ ~1,742 KB xuống ~396 KB trước gzip; các tab/chart tải theo nhu cầu. Đây là số đo bundle, không phải cam kết tốc độ trên mọi mạng/thiết bị.
- Thêm index recipient/unread/date, comment/task/date và activity/entity/action/date.

## Kiểm tra

- Build production thành công; kiểm tra fixture read-only Desktop và Mobile 430px, không tràn ngang dropdown.
- 39 pure checks: tracking, ngày tháng, calendar, phase, service-worker push/click và ngăn link khác origin.
- 123 DB checks dùng fixture rollback: 13 push, 21 tracking/report, 62 Workflow, 12 Calendar, 15 comments/quyền.
- Online Edge: worker 200 với hàng đợi rỗng; sau khi mở Official, preflight trả 204 đúng origin, Gửi thử thiếu phiên vẫn 401, origin lạ 403. Đăng ký Official bằng authenticated đã qua kiểm tra fixture rollback; cron retry đang active.
- Bản sửa lịch sử thông báo: 15 DB checks rollback cho lịch sử/read-all/badge/quyền, 13 push checks và 3 service-worker tests; build production qua. QA local với dữ liệu giả trên Desktop 1440px và Mobile 430px: đọc tất cả vẫn bấm mở đúng subtask; đã bật thì ẩn khối setup, chưa bật vẫn thấy nút và bật thành công tự ẩn.

## Bảo trì

Migration: `Dev/supabase/migrations/20261015090000_mobile_push.sql`.

Edge source: `Dev/supabase/functions/dashboard-push/index.ts`, deploy `dashboard-push` với `verify_jwt=false` vì code tự xác thực JWT người dùng và webhook secret. Không bỏ các kiểm tra này.

Theo dõi trạng thái `push_deliveries` và lỗi Edge; không log endpoint, khóa hay nội dung nhạy cảm. Khóa VAPID ổn định: thay khóa sẽ cần đăng ký lại thiết bị.


## Rà soát thông báo & tải dữ liệu — 15/10/2026 (bản tiếp theo)

### Luồng thống nhất

`Task/subtask/Project/Campaign/chặng/bình luận → trigger trong transaction nguồn → dashboard_emit_activity → notifications → snapshot chuông/Profile + Realtime theo recipient → push_deliveries → dashboard-push`.

- Server là nơi tạo các thông báo giao việc, thay đổi, hoàn thành, bình luận và Report. Source Develop nhận `writerVersion:2` từ summary để bỏ các query/insert thông báo client; DB chặn bản sao sự kiện từ client Official cũ. Giữ API cũ cho tương thích, không để nhiều producer cùng tạo thông báo.
- Mỗi sự kiện chỉ có một hàng/recipient theo `metadata.event_key`. Recipient phải active và có quyền mở đúng đối tượng; actor không nhận lại sự kiện của mình. Không tự cấp quyền Project từ việc nhắc tên trong bình luận Project.
- Link giữ nguyên phân loại `task`, `project_subtask`, `campaign_subtask`, không suy đoán từ UUID trùng nhau. Chặng có `phase_id` + parent và mở đúng Workflow. Chuông, popup, Profile và Edge push dùng chung `notificationLink.ts`.
- Thông báo chặng kiểm tra trạng thái cuối transaction: lưu lại danh sách PIC không đổi hoặc chỉ tick Gate không phát assignment/update trùng. Giữ lịch sử và trạng thái đọc; không replay các sự kiện cũ.
- `notifications` bật RLS trước khi đưa vào publication; chỉ recipient được cập nhật trạng thái đọc của mình. Quyền xem lịch sử team giữ theo Admin/Manager/Leader hiện có. `project_comments` dùng đúng một policy cho mỗi thao tác và cùng phạm vi parent.

### Giảm tải

- Task, nhân sự, Workflow dùng snapshot/request chung theo Auth user + staff ID + role + cấp bậc + phòng ban. Đổi tài khoản hoặc quyền sẽ bỏ cache cũ; lỗi mạng giữ dữ liệu thật cùng trạng thái lỗi.
- Các consumer chia sẻ request đang chạy, gom invalidation và listener Realtime; poll/focus nền tập trung, không tải lại khi tab ẩn. Assets chỉ tải ở nơi cần. Profile dùng cùng history với chuông, không query lại mỗi lần mở log.
- Khối bật push dùng state/config/sync chung; mở chuông nhiều lần không đăng ký lại liên tục. Quyền thiết bị vẫn chỉ xin sau khi bấm. Có timeout, không báo đã bật khi lưu subscription thất bại.
- Projects tải các truy vấn độc lập song song, tách refresh danh sách/chi tiết khỏi task và phase không liên quan. Bỏ embedding `users.departments` không có FK. Tách page còn 379 dòng; giữ nguyên class giao diện Dark/Light.
- RPC Workflow materialize actor và preaggregate PIC/Sub-PIC/chặng. Hàm quyền công khai giữ signature và luật cũ; helper `_for` private nhận actor đã xác định để tránh tra Auth lặp. Khi sửa phân quyền sau này phải sửa predicate private và chạy test đối chiếu ma trận quyền.
- Không xóa task, dự án, lịch sử, thiết bị hay index chỉ vì thống kê chưa dùng. Chỉ bỏ producer/policy/timestamp trigger đã xác định trùng.

### Đo và kiểm tra

- 51 pure tests qua, gồm cache/request, đổi phiên/quyền, bật push, deep link, service worker, ngày tháng và tracking.
- 52 kiểm tra DB rollback cho notification, scope, identity, no-op, dedup, read-all, RLS và chặng. Dùng staff giả, không gửi push thật.
- Đối chiếu toàn bộ dữ liệu Workflow và quyền đọc/sửa task/subtask/phase/parent cho 7 tài khoản: giống nhau trước/sau.
- Đo median ba lần `EXPLAIN ANALYZE`, JIT vốn đã tắt: thời gian server RPC trước 78–129 ms, sau 6–60 ms. Đây là thời gian RPC trong DB, không phải tốc độ mở toàn trang; số đo gồm mạng dao động nhiều hơn.
- Sau áp dụng: 157 task, 15 Project subtask, 11 Campaign subtask, 75 track, 12 chặng, 7 subscriptions giữ nguyên; 41 delivery sent, không pending/error từ kiểm tra. Không phát test push tới staff.
- Worker v2: preflight 204, test thiếu session 401, drain thiếu secret 401, origin lạ 403. Chưa xác nhận nhận push bằng điện thoại thật trong lượt này.
- Build production qua; lint không có lỗi chặn, còn cảnh báo ở source hiện hữu. Không coi việc kiểm tra API/mock là đã nghiệm thu trên mọi thiết bị.

### Đã áp dụng và giới hạn

- Supabase dùng chung: đã áp dụng sau xác nhận trực tiếp của chủ dự án: `20261015144216_notification_tracking_performance.sql`, `20261015144514_consolidate_project_comment_policies.sql`.
- Edge `dashboard-push` v2 đã deploy, giữ verify_jwt=false và toàn bộ kiểm tra session/webhook/origin; không thay VAPID hay subscriptions.
- Frontend chỉ phát hành nhánh `codex/develop-dashboard`; Official cần quy trình duyệt/merge riêng.
- Advisor vẫn báo cấu hình cũ của `users` (RLS đang tắt), một số bảng/hàm và FK/index ngoài phạm vi sửa lần này. Chưa thay cơ chế quản trị tài khoản hoặc xóa index/bảng tùy tiện vì có thể ảnh hưởng vận hành.
