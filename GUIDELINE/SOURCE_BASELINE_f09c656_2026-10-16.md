# Baseline f09c656 — 16/10/2026

- User yêu cầu cập nhật baseline và gửi link kiểm tra trước khi develop tiếp.
- Local `develop` và remote `origin/develop`, `origin/codex/develop-dashboard` cùng commit `f09c6562622d1f730e6628e952dc119232d35fc5` khi kiểm tra; working tree sạch trước ghi chú này. Không cần pull/merge thêm.
- Bản này nối tiếp `8af7795`: sidebar drill-down nhiều cấp, TopCollapsedNavbar, thống nhất nút ghim Task/Project/Campaign, store ghim và shared tracking hook, chỉnh popover/notification và detail panels. Có thêm hai brief DOCX về drill-down và top navbar.
- Vercel Preview success, tạo 2026-10-16T06:12:07Z. Deployment: https://dashboard-c9pv8rawy-bart-c8ff.vercel.app/
- Develop: https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/ — HTTP 200, bundle index-CIPz4Mhn.js.
- Official vẫn bundle index-DlARq_zA.js. Lượt này không push/promote Official hay thay đổi Supabase.
- Đây là kiểm tra đồng bộ source và deployment, chưa nghiệm thu UI đăng nhập hoặc chạy lại toàn bộ tests. Trước sửa tiếp, kiểm tra source mới nhất và dùng nhánh chuẩn codex/develop-dashboard theo DEPLOYMENT_RULES.md.
