# QUY ĐỊNH TRIỂN KHAI & LUỒNG LÀM VIỆC (DEPLOYMENT & WORKFLOW RULES)

Tài liệu này quy định rõ ràng về các môi trường (environments) và luồng làm việc (workflow) khi phát triển, nâng cấp hệ thống Dashboard. Đảm bảo toàn bộ team và AI tuân thủ nghiêm ngặt để không ảnh hưởng đến quá trình làm việc của staff.

## 1. Môi trường Phát triển (Develop Environment)
Đây là môi trường dùng để **nâng cấp hệ thống (upgrade system), sửa lỗi (fix bug) và thử nghiệm tính năng mới**.

* **Nhánh làm việc (Branch):** `codex/develop-dashboard`
* **Link truy cập:** [https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/](https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/)
* **Quy định:**
  - Mọi thay đổi code, nâng cấp mới **BẮT BUỘC** phải thực hiện và push lên nhánh `codex/develop-dashboard`.
  - Nghiệm thu, review UI/UX và test chức năng diễn ra hoàn toàn trên Link Develop này.

## 2. Môi trường Chính thức (Official/Production Environment)
Đây là môi trường **thực tế**, nơi toàn bộ **staff sẽ xài và hoạt động làm việc hàng ngày**.

* **Nhánh làm việc (Branch):** `main`
* **Link truy cập:** [https://dashboard-nu-tan-30.vercel.app/](https://dashboard-nu-tan-30.vercel.app/)
* **Quy định:**
  - Tuyệt đối **KHÔNG** code hay push code trực tiếp (commit) lên nhánh `main`.
  - Bản Official chỉ chứa code đã được kiểm duyệt chạy ổn định.
  - Dữ liệu trên này là dữ liệu thật của user/staff.

## 3. Luồng làm việc chuẩn (Standard Workflow)
Để đưa một tính năng mới hoặc bản sửa lỗi lên cho staff sử dụng, phải đi qua các bước sau:
1. **Code & Push:** Thực hiện sửa đổi và push code lên nhánh `codex/develop-dashboard`.
2. **Kiểm tra (Test):** Truy cập vào **Link Develop** để xác nhận tính năng chạy đúng, UI/UX không bị vỡ.
3. **Phê duyệt & Hợp nhất (Merge):** Sau khi sếp / người quản lý xác nhận "OK", tiến hành merge nhánh `codex/develop-dashboard` vào nhánh `main`.
4. **Phát hành (Release):** Vercel sẽ tự động build nhánh `main` và update lên **Link Official**. Staff load lại trang là có bản mới.

---
*Ghi chú: File này đóng vai trò làm kim chỉ nam cho tất cả các bản nâng cấp hệ thống về sau.*
