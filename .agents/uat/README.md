# Team nghiệm thu vận hành Dashboard K COFFEE

Mục tiêu: đánh giá hệ thống như khi bàn giao cho nhân viên làm việc thật (UAT). Phạm vi gồm tính đúng đắn, khả năng hoàn thành công việc, phân quyền, tính nhất quán dữ liệu và khả năng phục hồi khi thao tác thất bại.

## Đội hình tinh gọn (4 Agent cốt lõi)

Hệ thống UAT được tích hợp trọn vẹn vào đội hình 4 Agent chính thức của Dashboard K COFFEE, tuyệt đối không tạo thêm subagent rời rạc gây phân mảnh chat:

| Agent | Trách nhiệm trong UAT |
| --- | --- |
| **Hiệp (`hiep`)** — Lead / PM | Điều phối toàn bộ luồng trong một cuộc hội thoại, xác nhận môi trường/SHA, phân bổ fixture và nhận báo cáo |
| **Tùng (`tung`)** — Coder | Khắc phục các lỗi phát hiện trong đợt UAT trên nhánh `develop`, tối ưu UI/UX theo phản hồi |
| **Nhi (`nhi`)** — QA & UAT Lead | Trực tiếp đảm nhiệm toàn bộ việc lập kế hoạch, kiểm thử độc lập cho cả 4 persona (Admin & Manager, Leader, Staff) và kịch bản liên vai Journeys; tổng hợp `SUMMARY.md` |
| **Khoa (`khoa`)** — Independent Reviewer | Thẩm định độc lập bằng chứng, đối chiếu độ bao phủ ca kiểm thử, kiểm tra ranh giới bảo mật/OCC/zero-flexbox và đưa ra kết luận nghiệm thu |

Nhi và Khoa tạo báo cáo Markdown trong `.agents/uat/runs/<run-id>/`, không sửa mã ứng dụng. Hiệp giao lỗi đã tái hiện cho Tùng ở lượt sửa riêng.

## Chuẩn bị một đợt chạy

1. Đọc `AGENTS.md`, `GUIDELINE/rules.md`, `GUIDELINE/style.md`, `Dev/src/lib/roleScope.ts`, source liên quan và quy định UAT này. Khi source và đặc tả khác nhau, ghi rõ sai khác; không tự lấy hành vi đang lỗi làm đáp án.
2. Ghi URL thực tế, môi trường, nhánh/SHA source và SHA deployment đã xác minh. Không suy URL localhost nghĩa là database Dev; xác nhận backend đích qua cấu hình đã che thông tin bí mật. Không dựa vào URL/nhánh lịch sử trong tài liệu.
3. Chỉ chạy thao tác ghi trên môi trường Dev/test đã xác nhận và dữ liệu giả. Nếu chỉ có Production, chỉ kiểm tra đọc được phép và đánh dấu ca ghi BLOCKED. Không dùng service-role/admin bypass để đại diện một người dùng thường.
4. Cần phiên đăng nhập test riêng: Admin, Manager toàn hệ thống, Leader A/B, Staff A/B và Staff chưa có phòng ban. Bao gồm Leader có `role=manager, employment_level=Leader`. Ghi alias cùng role/cấp bậc/phòng ban thực tế, không ghi mật khẩu/token/cookie. Nếu chưa có tài khoản hoặc fixture, Hiệp báo chính xác phần còn thiếu; không xin mật khẩu qua chat.
5. Fixture: hai phòng ban A/B; hai parent Project/Campaign, phase, task và subtask; creator/PIC/assignee/mention-only khác nhau; dữ liệu Done, quá hạn, không deadline, rỗng. Dùng tiền tố `UAT-<run-id>-<role>`; lưu danh sách ID đã tạo để dọn đúng phạm vi. Không tạo tài khoản, đổi role hoặc seed database dùng chung nếu chưa được phép.
6. Kiểm tra công cụ thực tế. Có browser/session hoặc browser automation mới chạy UI; nếu thiếu, báo BLOCKED cho ca UI. Đọc source chỉ được ghi STATIC REVIEW, không ghi UI PASS. Khả năng `run_command` không tự chứng minh có browser hoặc tài khoản.
7. Chạy từng vai song song trên fixture và browser profile riêng. Kịch bản liên vai chạy tuần tự, bàn giao đúng ID. Không để agent dùng chung cookie/profile hoặc cùng sửa một bản ghi ngoài ca concurrency có chủ đích.

## Cách gọi trong chat Hiệp

> Hiệp, chạy team UAT theo `.agents/uat/README.md` trên môi trường Develop đã xác minh. Giao Nhi kiểm thử toàn bộ các persona và chạy JOURNEYS.md, Khoa phản biện kết quả. Dùng tài khoản test và fixture riêng; ghi bằng chứng thật, báo BLOCKED khi thiếu điều kiện. Trả báo cáo Markdown và kết luận sẵn sàng/chưa sẵn sàng bàn giao cho nhân viên.

Hiệp giao việc cho Nhi và Khoa bằng `send_message` trong cùng một phiên subagent; tuyệt đối không gọi `invoke_subagent` tạo thêm subagent persona mới làm rối chat.

## Kết quả và quyết định

- Mỗi ca: NOT RUN, PASS, FAIL, BLOCKED hoặc N/A (có lý do). Không coi BLOCKED/N/A là PASS. Mặc định tất cả case trong bộ này là NOT RUN.
- Báo cáo tại `.agents/uat/runs/<run-id>/<agent>.md`, Nhi tổng hợp `SUMMARY.md` theo `REPORT-TEMPLATE.md`. Không đưa dữ liệu nhân sự thật, token, URL chứa bí mật hoặc ảnh không che thông tin vào repo.
- Tách kết quả UI, kiểm tra quyền qua request dưới session test thật, và static review. Không thấy nút hoặc response 200 không chứng minh phân quyền; cần đối chiếu nội dung trả về và xác nhận thao tác bị từ chối không thay dữ liệu.
- P0: lộ dữ liệu rộng, ghi/xóa trái quyền hoặc hỏng dữ liệu nghiêm trọng. P1: chặn luồng công việc chính hoặc sai quyền/số liệu quan trọng. P2: lỗi chức năng có workaround. P3: lỗi trình bày nhẹ.
- Chỉ đề xuất sẵn sàng bàn giao khi tất cả luồng chính đã chạy ở từng vai, không còn P0/P1, ca quyền quan trọng không BLOCKED/NOT RUN, và Khoa có phản hồi thật. P2/P3 phải được liệt kê cùng workaround và người quyết định chấp nhận. Không tuyên bố hệ thống hoàn toàn không có lỗi.
- Retest trên đúng SHA sửa: xác nhận lỗi cũ hết và chạy luồng liên quan; giữ kết quả cũ để truy vết. Dọn chỉ fixture của run sau khi giữ bằng chứng và xác nhận quyền dọn; báo fixture chưa dọn.
