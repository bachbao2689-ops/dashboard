# Đồng bộ chỉnh sửa và xóa bình luận giữa các môi trường

Quy chuẩn này áp dụng cho toàn bộ bình luận Dashboard. Lấy UX local làm mẫu: hover hoặc focus vào comment của mình sẽ có cả nút Chỉnh sửa và Xóa. Mọi bản Local, Develop và Main của cùng đợt phát hành phải dùng chung source và đủ các thao tác dưới đây.

## Một component cho tất cả màn

Component chuẩn: `Dev/src/components/features/comments/CommentMessage.tsx`. Không viết lại riêng phần bubble, nút sửa/xóa hoặc form chỉnh sửa trong từng panel.

| Điểm hiển thị | Component chứa | Chỉnh sửa | Xóa |
| --- | --- | --- | --- |
| Task | TaskComments qua TaskDetailPanel | Tác giả | Tác giả |
| Subtask Project | TaskComments qua SubtaskDetailPanel | Tác giả | Tác giả |
| Subtask Campaign | TaskComments qua SubtaskDetailPanel | Tác giả | Tác giả |
| Project trong danh sách Projects | Projects | Tác giả | Tác giả |
| Campaign trong danh sách Projects | CampaignDetailDrawer | Tác giả | Tác giả |
| Project/Campaign từ Workflow và các panel chi tiết | ProjectCampaignDetailPanel | Tác giả | Tác giả |

Comment của người khác không có hai nút sửa/xóa, kể cả khi người xem là Admin/Manager. Các màn chỉ đọc không có thao tác ghi.

## Hành vi thống nhất

- Chỉnh sửa mở form ngay tại bubble, có Lưu và Hủy; Escape để hủy. Hủy không ghi database.
- Không cho lưu nội dung rỗng, không gửi lặp khi đang lưu. Nếu lưu lỗi phải giữ nội dung đang sửa.
- Xóa luôn có xác nhận. Chỉ gỡ comment và báo thành công sau khi database xác nhận đã xóa đúng hàng.
- Bản ghi activity_log giữ nguyên metadata khác khi sửa body, gồm mentions và attachment.
- Giao diện dùng cùng component và bản dịch ở mọi môi trường; dữ liệu hiển thị có thể khác do mỗi môi trường dùng database riêng.

## Source và quyền dữ liệu

- `CommentMessage.tsx`: hiển thị và tương tác chung.
- `commentEditing.ts`: lưu nội dung theo đúng comment, parent/type và tác giả.
- `commentDeletion.ts`: xóa theo đúng comment, parent/type và tác giả; bắt buộc nhận hàng bị xóa.
- `taskComments.ts` và `useTaskComments.ts`: cập nhật thread Task/Subtask.
- `useProjectsController.tsx`: cập nhật Project/Campaign từ danh sách.
- Policy UPDATE/DELETE phải kiểm tra tác giả trên cả Dev và Official. Project root không phải ngoại lệ.
- Migration chỉnh sửa: `Dev/supabase/migrations/20261018124420_comment_edit_author_only.sql`.
- Migration xóa: `Dev/migrations/20261018122702_comment_author_delete.sql`.

## Quy trình phát hành không bỏ sót

1. Làm và kiểm tra source trên `codex/develop-dashboard`; lấy source trong checkout local làm bản cần phát hành.
2. Chạy build, test sửa/xóa và test RLS trong transaction rollback trên Dev. Kiểm tra đủ từng dòng trong bảng trên.
3. Commit chung code, migration, test và quy chuẩn này; push Develop, chờ Vercel READY đúng SHA.
4. Áp dụng cùng migration cần thiết trên Official. Hợp nhất đúng commit đã kiểm tra sang Main và push Main khi người dùng yêu cầu phát hành.
5. Xác nhận SHA của checkout local, `origin/codex/develop-dashboard`, `origin/main` giống nhau; các deployment mới nhất của hai nhánh đều READY đúng SHA và đúng alias.
6. Kiểm tra bundle được phục vụ trên domain Develop và Official có component thao tác sửa/xóa mới. Không kết luận đồng bộ chỉ từ việc push thành công.
7. Trả workspace về Develop để tiếp tục làm việc. Các URL deployment cũ là snapshot bất biến; dùng alias cố định dưới đây.

## Môi trường

| Môi trường | Địa chỉ | Database |
| --- | --- | --- |
| Local | http://127.0.0.1:5173/ | Supabase Dev |
| Develop | https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/ | Supabase Dev |
| Main Official | https://dashboard-nu-tan-30.vercel.app/ | Supabase Official |

Mục tiêu đồng bộ là cùng tính năng và source của đợt phát hành. Không sao chép dữ liệu, tài khoản hoặc biến môi trường giữa Dev và Official. Các nhánh phụ cũ và deployment cũ không được dùng làm nguồn thay thế hai nhánh chuẩn.
