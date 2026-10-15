# Mobile Push & tải dữ liệu — 15/10/2026

## Source được hợp nhất

- Giữ icon bình luận, chấm chưa đọc, số đơn và UI Header/Sidebar/MobileNav của commit `cae2dcc`.
- Hợp nhất `bbf9a62` và `deed77d`: nguồn task/subtask chung, lưu Report nguyên tử, performance theo timestamp thực và sửa Campaign trong Profile.
- Giữ DateFilterDropdown mới của biểu đồ phân bổ khi tách component.

## Trải nghiệm đã chốt

Desktop Mac/Windows là nơi làm việc chính. Mobile ưu tiên nhận thông báo và xem tiến độ. Sự kiện được gửi từ server; không cần máy tính mở Dashboard.
Task/subtask detail trên Mobile hiển thị nội dung và lịch sử bình luận, ẩn composer/Sửa/Complete; All Tasks không hiện tạo mới/chọn hàng loạt trên màn hình nhỏ. Đây là cách trình bày theo thiết bị, không thay thế phân quyền server.

iPhone: mở link Official bằng Safari → Chia sẻ → Thêm vào Màn hình chính → mở icon → đăng nhập → chuông thông báo → Bật thông báo → Cho phép. Có nút Gửi thử và Tắt trên thiết bị này. Develop vẫn có thể đăng ký riêng để test.

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

## Bảo trì

Migration: `Dev/supabase/migrations/20261015090000_mobile_push.sql`.

Edge source: `Dev/supabase/functions/dashboard-push/index.ts`, deploy `dashboard-push` với `verify_jwt=false` vì code tự xác thực JWT người dùng và webhook secret. Không bỏ các kiểm tra này.

Theo dõi trạng thái `push_deliveries` và lỗi Edge; không log endpoint, khóa hay nội dung nhạy cảm. Khóa VAPID ổn định: thay khóa sẽ cần đăng ký lại thiết bị.
