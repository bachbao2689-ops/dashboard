# Rules Dashboard K COFFEE

Tài liệu duy nhất cho môi trường, quyền, dữ liệu, tracking và phát hành. Style desktop/mobile xem [`style.md`](./style.md). **Source, migration và RLS hiện hành là nguồn thực thi; nếu tài liệu và code khác nhau, kiểm tra trước khi sửa hoặc phát hành.**

## Nhánh, dữ liệu và phát hành

| Môi trường | Nhánh | URL | Supabase |
| --- | --- | --- | --- |
| Local / Develop | `codex/develop-dashboard` | [Develop](https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/) | Dev `samuuyxxtocqmtujnnhe` |
| Official | `main` | [Main](https://dashboard-nu-tan-30.vercel.app/) | Official `jxrwphjriuqbpdpwpqcn` |

- Làm thay đổi mới trên Develop và dữ liệu test trên Supabase Dev. Chỉ cập nhật Main khi người dùng yêu cầu phát hành; yêu cầu rõ cho Main được ưu tiên theo đúng phạm vi đã nêu. Không tự đồng bộ dữ liệu Dev sang Official.
- Local dùng `Dev/.env` riêng với publishable key của Dev. Không đưa service-role key, token, mật khẩu, dump hoặc private VAPID vào Git hay biến `VITE_*`.
- `/main-view` trên Local/Develop chỉ đọc Project/Campaign/Task Official bằng phiên Official riêng và RLS của người xem; không ghi, không sao chép vào Dev, không đọc thông báo Official.
- Trước phát hành: xác nhận nhánh/SHA, thay đổi cần thiết, build và các kiểm tra phù hợp, migration cần thiết trên đúng database, deployment `READY`, alias phục vụ đúng bundle. Không dùng deployment snapshot cũ làm bằng chứng cho alias hiện tại. Sau release, trả checkout về Develop.
- Migration trên database dùng chung hoặc Official phải được duyệt theo phạm vi thay đổi; dùng transaction rollback/fixture khi kiểm tra, không đụng dữ liệu staff thật để test. Lịch sử checkpoint nằm trong Git, không dùng commit cũ làm nguồn quy tắc hiện tại.

## Quyền và phạm vi xem

- Quyền quyết định ở Supabase/RLS/RPC, UI chỉ phản ánh; không suy quyền từ nút đang thấy. Dùng `Dev/src/lib/roleScope.ts` cho cấp bậc. `role=manager` cùng `employment_level=Leader` vẫn là Leader phòng ban, không mặc nhiên là Manager toàn hệ thống.
- Dashboard Leader, lọc task, Team Workload, Analytics và CSV chỉ thấy phòng ban mình. Staff có phòng ban thấy team mình; Staff không có phòng ban chỉ thấy cá nhân. Admin/Manager toàn hệ thống xem và lọc được các phòng ban theo quyền thật. Cache filter cũ phải bị ép lại khi quyền/phòng ban đổi.
- Creator và PIC chính của Project/Campaign quản lý parent và toàn Workflow của parent: phase, task, Gate và xác nhận chuyển chặng theo điều kiện nghiệp vụ. Người được giao task/subtask chỉ có phạm vi công việc được giao; mention chỉ mở đúng nội dung được nhắc, không tự cấp toàn quyền parent.
- Manager/Admin, creator và PIC được sửa/hoàn thành task theo quyền backend. Người được giao subtask có quyền hoàn thành subtask của mình; quyền của creator/PIC/Manager/Admin trên parent và subtask phải đồng nhất giữa UI và backend. Chặng/parent vẫn kiểm tra lịch, version, task hoàn thành và Gate ≥80% trước khi duyệt.
- Chế độ xem Main là chỉ đọc dù tài khoản có quyền sửa ở Official. Trước khi bật thao tác ở panel, đọc lại quyền khi đổi tài khoản, PIC, parent hoặc phase; không dùng quyền cache của phiên trước.
- Lưu ý lịch sử audit: `public.users` từng có RLS tắt và grant rộng. Không xem kiểm tra vai trò ở UI là bảo vệ dữ liệu; mọi thay đổi chính sách bảng này cần rà đủ luồng login, profile và quản lý nhân sự trước khi áp dụng.

## Nguồn dữ liệu và liên kết

- `projects`/`campaigns` là nguồn parent; mỗi parent có một `workflow_tracks` theo `(entity_type,entity_id)`. `workflow_phases` giữ ID ổn định và dùng version để tránh ghi đè. `tasks`, `project_subtasks`, `campaign_subtasks` là bản ghi công việc gốc; liên kết phase bằng `workflow_phase_id`, không sao chép task hay comment.
- Projects/Campaigns → Workflow dùng `/workflow?project=<id>` hoặc `?campaign=<id>`, thêm `phase=<id>` khi cần. Mở parent bằng `/projects?project=<id>` hoặc `?campaign=<id>`. Task detail từ mọi tab phải đọc và ghi cùng bản ghi gốc.
- Lịch từ parent xuống phase rồi task/subtask: ngày mặc định nằm trong khoảng cha; backend cũng chặn ngày ngoài phạm vi. Không tự đổi lịch dữ liệu cũ. Gate là trọng số tiêu chí đã đạt trên tổng trọng số; thiếu dữ liệu thì hiện `—`.
- `Done` vẫn là dữ liệu thật cho tiến độ, performance, report và lịch sử. Danh sách mặc định của Staff có thể lọc việc chưa hoàn thành, nhưng view quản lý/chi tiết vẫn phải cho thấy việc đã xong khi cần đối chiếu.
- Ghi `created_at`, `updated_at`, `completed_at` theo sự kiện thật; không suy ngày hoàn thành từ deadline. Task/subtask detail hiển thị giờ tạo, dấu đã sửa khi có cập nhật; comment đã sửa có thời điểm và icon bút chì.

## Bình luận và thông báo

- Dùng chung `CommentMessage` cho Task, Subtask, Project và Campaign. Chỉ tác giả sửa/xóa comment của mình, kể cả khi người xem là Manager/Admin; xóa có xác nhận, lưu thất bại giữ bản nháp, RLS phải kiểm tra đúng tác giả và loại parent.
- Server phát một sự kiện thông báo cho mỗi recipient (`metadata.event_key`) khi tạo, giao, sửa, hoàn thành hoặc bình luận công việc. Actor không nhận lại sự kiện của mình. Chuông, popup, Profile và push dùng cùng deep link theo loại thật (`task`, `project_subtask`, `campaign_subtask`, parent, phase); không suy từ UUID hoặc lan comment Project xuống mọi task con.
- Chấm chưa đọc tính từ dữ liệu recipient, không chỉ 50 hàng gần nhất; chỉ mở đúng nội dung mới đánh dấu đã đọc. Popup thông báo ở lại đến khi người dùng mở/đóng hoặc trạng thái đọc đổi.
- Realtime theo recipient và entity liên quan; chia sẻ listener/request, debounce invalidation, tạm dừng tải nền khi tab ẩn. Lỗi mạng giữ dữ liệu thật cùng trạng thái lỗi, không thay bằng số hoặc task mẫu.
- Push: `notifications → push_deliveries → dashboard-push → service worker`; xin quyền thiết bị khi người dùng bấm. Subscription gắn đúng tài khoản và origin; logout hủy đăng ký; worker xác thực session/webhook và không log endpoint hoặc khóa. Develop/Official có subscription và thông báo riêng.

## Hiệu năng và ghi nhớ hành vi

- Dùng snapshot/request chia sẻ theo user, role, cấp bậc và phòng ban; đổi phiên/quyền xóa cache cũ. Tải tab theo nhu cầu, không refetch toàn Dashboard khi chỉ thay notification. Không xóa bảng, index, lịch sử hoặc dữ liệu chỉ để giảm tải khi chưa đo và xác định chúng dư thừa.
- Lựa chọn UI lâu dài dùng `useRememberedState` hoặc `userCache`, lưu cục bộ ngay và đồng bộ `public.user_preferences.ui_state` theo tài khoản trên mọi máy. Khóa có namespace, giá trị JSON nhỏ; kiểm tra lại filter theo quyền hiện tại. Không lưu dữ liệu nghiệp vụ, quyền, thông báo đã đọc, session, draft nhạy cảm hoặc push subscription vào cache UI.
- Khi sửa truy vấn/RPC, đo trên dữ liệu gần thực tế, kiểm tra RLS theo vai trò và đối chiếu số liệu qua Dashboard, All Tasks, Projects, Workflow, Profile và Team Workload. Ưu tiên nguồn chung và transaction nhất quán hơn nhiều producer/listener trùng nhau.
