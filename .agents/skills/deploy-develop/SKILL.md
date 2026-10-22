---
name: deploy-develop
description: One-request source push to Dashboard K COFFEE develop; verify Vercel Preview when asked to deploy or when app code changes. Never touches main.
---

# Tùng — up source lên develop

Một câu như “Tùng up source lên develop” là đủ quyền để Tùng tự làm trọn lượt bằng công cụ Antigravity. Không hướng dẫn bro bấm Source Control hay gõ Terminal, không hỏi lại quyền commit/push đã được giao. Hiệp chuyển việc cho Tùng và nhận báo cáo cuối. Lệnh do agent chạy bằng `run_command` là hợp lệ. Dùng `/permissioned-github` tại `/Users/admin/.gemini/antigravity/builtin/skills/permissioned-github/SKILL.md` cho thao tác Git; nếu bị chặn quyền, chỉ xin quyền hẹp theo skill đó.

## Luồng mặc định: đưa source lên develop

1. Kiểm tra đang ở đúng repo và nhánh `develop`. Dùng cấu hình Vercel đã xác minh cho dự án; nếu mapping nhánh thay đổi hoặc chưa rõ, kiểm tra trước push. Nếu `develop` trỏ tới Production thì dừng. Không tự chuyển nhánh, merge `main`, force-push hoặc đẩy nhánh phụ.
2. Xem `git status` và diff, chọn đúng file thuộc yêu cầu hiện tại. Không stage tất cả mặc định; bỏ qua thay đổi không liên quan, `.env`, token, secret và file sinh ra. Nếu không có thay đổi, so local HEAD với remote `develop` rồi báo trạng thái; không tạo commit rỗng.
3. Với thay đổi **chỉ ở tài liệu, `.agents/`, rule, skill hoặc cấu hình không ảnh hưởng app**, đi thẳng tới commit và push. Không bắt build, Nhi/Khoa hay chờ Vercel Ready cho loại thay đổi này.
4. Với thay đổi **mã ứng dụng hoặc giao diện**, chạy build từ `Dev/`, gọi Nhi kiểm thử phần bị ảnh hưởng và Khoa review diff/acceptance criteria trước push. Agent tự phối hợp trong cùng yêu cầu; không chuyển các bước này cho bro. Chỉ nói “Nhi/Khoa pass” khi có phản hồi thực. Nếu kiểm tra chặn, sửa trong phạm vi task hoặc báo lỗi cụ thể.
5. Commit đúng các file đã chọn, push `develop` tới `origin/develop`, rồi đối chiếu SHA local với `git ls-remote origin refs/heads/develop`. Không in URL remote vì có thể chứa credential.

Khi SHA khớp, **việc up source đã xong**. Trả lời ngắn: `Đã up develop: <SHA>. Remote khớp.` Nếu Vercel chưa kiểm tra, nói rõ `Preview chưa kiểm tra`; không gọi đó là deploy thành công. Không bắt người dùng quay lại báo đã push.

## Khi yêu cầu deploy hoặc xác nhận Vercel

Nếu bro nói “deploy”, “kiểm tra Vercel”, hoặc lượt này có thay đổi app cần xác nhận Preview, sau khi push hãy kiểm tra deployment của đúng nhánh `develop` và SHA mới. Xác nhận `Ready` và URL thực tế trước khi nói Preview đã sẵn sàng. Nếu Vercel còn build, lỗi, hoặc không có công cụ quan sát, báo trạng thái thật; source vẫn được coi là đã up nếu remote SHA khớp.

## Ranh giới Production

Không đụng `main` hay Production trong skill này. Chỉ dùng `/deploy-main` khi bro đã duyệt rõ SHA và Preview theo quy định dự án.
