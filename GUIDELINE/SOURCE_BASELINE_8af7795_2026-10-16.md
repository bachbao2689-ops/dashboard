# Mốc source 8af7795 — rà soát ngày 16/10/2026 (Asia/Ho_Chi_Minh)

Chủ dự án yêu cầu kiểm tra source/Vercel/Supabase mới nhất, lưu thông tin thay đổi và chuẩn bị develop tiếp. Đây là ghi nhận thực tế của lượt kiểm tra, không phải yêu cầu phát hành thêm hoặc tự sửa DB.

## 1. Mốc phát triển và môi trường

**Baseline để develop tiếp: `8af7795f61d29a24450c1d7fde4d59e33d189ce3`, nhánh `origin/codex/develop-dashboard`.**

| Vị trí | Mốc xác nhận |
| --- | --- |
| Remote Develop chuẩn `origin/codex/develop-dashboard` | `8af7795` |
| Remote `origin/develop` và `origin/codex-develop` | `e586dce`, cũ hơn baseline 3 commit |
| Local đang checkout `develop` lúc rà soát | `e586dce`, sạch trước khi thêm ghi chú này |
| Local `codex/develop-dashboard` | `02f9bea`, chưa fast-forward; không dùng làm source mới nhất khi chưa đồng bộ |
| Remote `origin/main` / Official | `02f9bea`; không có `8af7795` trên main tại thời điểm kiểm tra |

- Develop: https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/
- Deployment cố định của `8af7795`: https://dashboard-l4ddk47ss-bart-c8ff.vercel.app/
- Vercel báo Preview **success**; deployment tạo ngày 15/10/2026 lúc 22:25:03 giờ Việt Nam.
- Develop alias và deployment cố định cùng phục vụ `/assets/index-B6-i7i5E.js`; trang và bundle HTTP 200, có mã popup thông báo và mobile action hint.
- Official: https://dashboard-nu-tan-30.vercel.app/ vẫn phục vụ `/assets/index-DlARq_zA.js` của bản trước, HTTP 200.
- Supabase project dùng chung: `jxrwphjriuqbpdpwpqcn`. Frontend Official cũ vẫn chịu ảnh hưởng của các thay đổi DB đã áp dụng.

Lượt rà soát dùng snapshot tạm đúng commit để đọc/build/test, không checkout đè source hiện tại, không push hay promote Official. Trước lần sửa code tiếp theo phải đồng bộ nhánh Develop chuẩn với `8af7795` hoặc hậu duệ mới hơn sau khi kiểm tra các thay đổi local; không phát triển tiếp từ `e586dce` rồi vô tình bỏ mất ba commit mới.

## 2. Các commit mới so với mốc 02f9bea đã rà soát trước đó

1. `2bc391b` — Ẩn cảnh báo Push trên origin chưa cấu hình; bổ sung migration mở rộng allowed origins.
2. `088193b` — Dùng optional chaining an toàn cho `session?.user?.id`, tránh crash màn trắng khi session thiếu user.
3. `282adc7` — Thêm migration/schema đổi 9 FK tham chiếu users sang `ON DELETE SET NULL`. **Source có thay đổi này nhưng DB live chưa khớp — xem mục 5.**
4. `e586dce` — Popup notification xếp lớp, frosted glass, màu theo loại task/project/campaign, nhận diện avatar PIC.
5. `ca71530` — Thống nhất nguồn thông báo từ server, cache/request và Realtime dùng chung, tối ưu Workflow RPC và tách Projects controller/components.
6. `2e09450` — Popup không tự hết hạn sau vài giây; giữ đến khi mở/đóng/bỏ qua/đọc ở nơi khác.
7. `8af7795` — Nút và bộ lọc mobile gọn bằng icon, popover tránh bị cắt, đồng bộ ẩn/hiện navigation trong cả hai theme.

Tổng thay đổi tích luỹ so với `02f9bea`: 74 file, 2.757 dòng thêm, 1.363 dòng bỏ theo `git diff --stat`.

## 3. Cơ chế UI cần giữ khi develop tiếp

- `ActionButton`: desktop giữ nhãn; mobile dùng icon với `aria-label`, `data-mobile-label` và badge. Tái sử dụng component, tránh viết riêng mỗi toolbar.
- `MobileActionHint`: chạm nút mobile hiện nhãn ngắn 1,8 giây; cuộn/resize thì gỡ. Đây là hint cho thao tác, không phải thời hạn popup thông báo.
- `FilterPopover`: portal ra `document.body`, tự canh viewport, chọn mở lên/xuống, giới hạn chiều cao, Escape đóng và trả focus. Search mobile có panel riêng; các bộ lọc dùng component chung.
- `useMobileChrome`: chỉ theo cuộn `main-scroll-container` ở breakpoint dưới 768px; có ngưỡng đổi hướng để tránh nhấp nháy. Header và bottom nav dùng cùng trạng thái; cuộn menu/drawer không điều khiển chrome.
- `overlayStore` + `useTaskDetailVisibility`: đếm detail đang mở, gồm nested/embedded/URL entry; bottom nav ẩn khi mở task detail để không che footer.
- `mobile-actions.css` có xử lý Light/Dark đã được chủ dự án develop trong commit này. Giữ baseline đó; các yêu cầu UI sau vẫn tuân thủ `.agents/rules/ui-modifications.md`, không tự đổi palette Dark.
- `NotificationPopupStack`: tối đa 4 thẻ xếp lớp, danh sách popup tối đa 12. Chỉ popup thông báo chưa đọc mới đến trong khoảng 30 giây, không phát lại toàn bộ history khi mount.
- Popup không có timer tự đóng theo thời gian; timer animation thẻ vượt giới hạn vẫn tồn tại. Đóng/xoá popup chỉ bỏ khỏi stack, không xoá lịch sử chuông và không tự đánh dấu đã đọc.
- Màu track: Task xanh dương, Project tím, Campaign hổ phách; subtask theo loại parent. Avatar ưu tiên actor ID/name/avatar trong metadata server; thông báo cũ mới dùng directory làm dự phòng, không suy đoán người nếu tên trùng.
- Chuông và Profile dùng chung snapshot; đọc tất cả vẫn giữ history. RPC trả `items` 12 gần nhất và `history` 50 gần nhất; badge chỉ đếm chưa đọc.

## 4. Tracking, thông báo và hiệu năng

- Canonical writer v2: thay đổi nguồn nghiệp vụ → trigger trong transaction → `dashboard_emit_activity` → `notifications` → Realtime/chuông/Profile/popup → `push_deliveries` → Edge Push.
- Metadata có `origin=dashboard:v2`, `event_key`, actor, parent và phase; unique index theo event/recipient chống tạo trùng. Actor không tự nhận lại sự kiện của mình; recipient cần active và có quyền xem đích.
- `writerVersion:2` từ summary giúp client mới bỏ producer cũ. DB có legacy guard để client Official cũ không tạo bản sao sự kiện đã có server writer.
- `notificationLink.ts` trong `supabase/functions/_shared` là nguồn link chung cho frontend và Edge. Giữ phân biệt canonical task, `ps-` và `cs-`; thông báo chặng có parent + phase để mở đúng Workflow.
- Chặng dùng deferred trigger đọc trạng thái cuối transaction: lưu PIC không đổi/tick Gate đơn thuần không phát assignment/update trùng.
- `sharedResource`, `workspaceResources`, `useSharedResource`: gộp request/snapshot task, directory, Workflow và assets khi cần. Scope gồm Auth user, staff ID, role, cấp bậc và phòng ban; đổi scope reset dữ liệu cũ. Lỗi tải giữ dữ liệu đã có và báo lỗi, không bịa rows.
- Task/Workflow TTL 15 giây, directory 60 giây, asset summary 30 giây; invalidation/Realtime vẫn cập nhật. Không diễn giải TTL thành cam kết độ trễ cố định.
- `workspaceRealtime`: chia sẻ listeners, debounce 300ms, focus/online/visibility và poll nền 60 giây; không refetch tab ẩn.
- `devicePushStore`: state/config/sync dùng chung; chống response của tài khoản cũ ghi đè tài khoản mới, không đăng ký lại mỗi lần mở chuông; không xin quyền tự động.
- Projects đã tách sang `useProjectsController`, `CampaignDetailDrawer`, `projectPresentation`; không gộp trở lại page cũ hàng trăm dòng.
- Workflow RPC preaggregate PIC/Sub-PIC/chặng và materialize actor. Khi đổi luật quyền phải đối chiếu cả public wrapper và private helper `_for` cùng test ma trận quyền.

## 5. Đối chiếu Supabase live bằng transaction chỉ đọc

Đã so sánh nội dung **21 hàm** trong migration `20261015144216_notification_tracking_performance.sql` với `pg_proc.prosrc`: tất cả tồn tại và khớp source. Bao gồm permission helpers/wrappers, event writer, trigger functions, summary, wake Push và `workflow_hub_index`.

- Registry ghi nhận `20261015144216_notification_tracking_performance` và `20261015144514_consolidate_project_comment_policies`.
- `notifications` và `project_comments` bật RLS; project_comments có đúng một policy cho mỗi SELECT/INSERT/UPDATE/DELETE, không còn nhóm policy `workflow_*` trùng.
- Trigger nghiệp vụ/chặng đang enabled; notifications và project_comments có trong publication Realtime. Index event/recipient, history và unread đang có.
- Summary vẫn security invoker; helpers/writer riêng giữ mô hình security definer như source. Lượt này kiểm tra cấu hình và source hàm, chưa chạy lại đầy đủ ma trận hành vi trên staff thật.
- Allowed origins thực tế gồm Official, domain `dashboard-bart-c8ff`, hai Develop aliases và `localhost:5173`, `localhost:3000`. Migration mở rộng origin không có trong registry nhưng cấu hình live đã có; không kết luận thiếu áp dụng chỉ từ registry.
- Push enabled; cron `dashboard-push-retry` active mỗi phút. Snapshot khi kiểm tra: 63 delivery `sent`, không có trạng thái pending/failed trong kết quả tổng hợp. `sent` là trạng thái xử lý/provider, không chứng minh từng thiết bị đã hiện banner.
- Edge endpoint cho Develop và Official: preflight 204 đúng Origin; POST test không có session trả 401, không gửi thông báo thử tới staff. Không xác nhận lại source deploy Edge bằng việc đọc mã trên server trong lượt này.

### Điểm chưa đồng bộ: migration xoá users

`20261015160000_fix_users_foreign_keys_on_delete.sql` **chưa phản ánh trên 9 constraint mục tiêu của DB live**: tất cả vẫn `NO ACTION` (`confdeltype=a`), trong khi source mong muốn `SET NULL` (`n`):

- `workspaces.owner_id`
- `departments.head_id`
- `projects.created_by`
- `tasks.assignee_id`, `tasks.created_by`
- `assets.added_by`
- `borrow_requests.requester_id`, `approved_by`, `return_confirmed_by`

Migration này không có trong registry khi kiểm tra. Các FK khác như `comments.author_id`, `activity_log.user_id`, Workflow membership/creator cũng vẫn có `NO ACTION`; vì vậy không được coi migration 9 FK là đã giải quyết toàn bộ trường hợp xoá staff. Không thử xoá hay di chuyển dữ liệu trong lượt review này.

`users` vẫn RLS off, đúng tình trạng cũ đã ghi nhận trong tài liệu Push/performance. Cần một lượt rà soát riêng trước khi đổi cơ chế quản trị tài khoản/quyền; không tự bật/tắt trong lúc sửa UI.

## 6. Kiểm tra thực hiện và bước tiếp theo

- Build production **đúng source `8af7795`** thành công trong snapshot tạm; 51 pure tests qua, gồm shared resource, đổi account/quyền, Push store, deep links, Service Worker, calendar và metrics.
- Vercel status success + Develop alias khớp deployment cố định; HTTP trang/bundle 200.
- Supabase chỉ đọc metadata/cấu hình, không apply migration, không đổi dữ liệu staff, không gửi Push thật.
- Chưa kiểm thử end-to-end UI bằng phiên staff trên thiết bị thật trong lượt này; không coi build/test/API check là nghiệm thu mọi kích thước màn hình.
- Không push ghi chú hoặc source lên main/Develop trong lượt review này. Official promotion cần yêu cầu phát hành tiếp theo; baseline mới hiện là Develop.

Khi có brief mới: kiểm tra working tree và remote mới nhất → dùng nhánh `codex/develop-dashboard` có chứa baseline này → đọc rules liên quan → sửa phạm vi được yêu cầu → test → chỉ phát hành theo yêu cầu của chủ dự án. Nếu xử lý xoá staff, rà toàn bộ FK và nullable columns trước khi áp dụng migration, không xoá dây chuyền task/lịch sử.
