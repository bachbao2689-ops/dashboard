# Team nghiệm thu vận hành Dashboard K COFFEE

Mục tiêu: đánh giá hệ thống như khi bàn giao cho nhân viên làm việc thật (UAT). Phạm vi gồm tính đúng đắn, khả năng hoàn thành công việc, phân quyền, tính nhất quán dữ liệu và khả năng phục hồi khi thao tác thất bại.

## Đội hình

| Agent | Trách nhiệm |
| --- | --- |
| Hiệp (`hiep`) | Điều phối trong chat hiện tại, xác nhận môi trường/SHA, chia fixture và gọi các agent UAT |
| Nhi (`nhi`) | Phụ trách kế hoạch kiểm thử, tổng hợp bằng chứng và chạy kịch bản liên vai |
| `uat-admin-manager` | Đóng vai Admin và Manager, chạy hai phiên độc lập; không dùng kết quả Admin thay Manager |
| `uat-leader` | Đóng vai Leader, soát phạm vi phòng ban và quyền creator/PIC |
| `uat-staff` | Đóng vai nhân viên có phòng ban và chưa có phòng ban, kiểm tra công việc hằng ngày |
| Khoa (`khoa`) | Phản biện bằng chứng, kiểm tra độ bao phủ và kết luận nghiệm thu |

Các agent UAT tạo báo cáo Markdown, không sửa mã ứng dụng. Hiệp giao lỗi đã tái hiện cho vai phù hợp ở lượt sửa riêng. Đây là cấu hình team, không phải bằng chứng các agent đã chạy.

## Chuẩn bị một đợt chạy

1. Đọc `AGENTS.md`, `GUIDELINE/rules.md`, `GUIDELINE/style.md`, `Dev/src/lib/roleScope.ts`, source liên quan và quy định UAT này. Khi source và đặc tả khác nhau, ghi rõ sai khác; không tự lấy hành vi đang lỗi làm đáp án.
2. Ghi URL thực tế, môi trường, nhánh/SHA source và SHA deployment đã xác minh. Không suy URL localhost nghĩa là database Dev; xác nhận backend đích qua cấu hình đã che thông tin bí mật. Không dựa vào URL/nhánh lịch sử trong tài liệu.
3. Chỉ chạy thao tác ghi trên môi trường Dev/test đã xác nhận và dữ liệu giả. Nếu chỉ có Production, chỉ kiểm tra đọc được phép và đánh dấu ca ghi BLOCKED. Không dùng service-role/admin bypass để đại diện một người dùng thường.
4. Cần phiên đăng nhập test riêng: Admin, Manager toàn hệ thống, Leader A/B, Staff A/B và Staff chưa có phòng ban. Bao gồm Leader có `role=manager, employment_level=Leader`. Ghi alias cùng role/cấp bậc/phòng ban thực tế, không ghi mật khẩu/token/cookie. Nếu chưa có tài khoản hoặc fixture, Hiệp báo chính xác phần còn thiếu; không xin mật khẩu qua chat.
5. Fixture: hai phòng ban A/B; hai parent Project/Campaign, phase, task và subtask; creator/PIC/assignee/mention-only khác nhau; dữ liệu Done, quá hạn, không deadline, rỗng. Dùng tiền tố `UAT-<run-id>-<role>`; lưu danh sách ID đã tạo để dọn đúng phạm vi. Không tạo tài khoản, đổi role hoặc seed database dùng chung nếu chưa được phép.
6. Kiểm tra công cụ thực tế. Có browser/session hoặc browser automation mới chạy UI; nếu thiếu, báo BLOCKED cho ca UI. Đọc source chỉ được ghi STATIC REVIEW, không ghi UI PASS. Khả năng `run_command` không tự chứng minh có browser hoặc tài khoản.
7. Chạy từng vai song song trên fixture và browser profile riêng. Kịch bản liên vai chạy tuần tự, bàn giao đúng ID. Không để agent dùng chung cookie/profile hoặc cùng sửa một bản ghi ngoài ca concurrency có chủ đích.

## Cách gọi trong chat Hiệp

> Hiệp, chạy team UAT theo `.agents/uat/README.md` trên môi trường Develop đã xác minh. Gọi `uat-admin-manager`, `uat-leader`, `uat-staff` bằng ID; giao Nhi tổng hợp và chạy JOURNEYS.md, Khoa phản biện kết quả. Dùng tài khoản test và fixture riêng; ghi bằng chứng thật, báo BLOCKED khi thiếu điều kiện. Trả báo cáo Markdown và kết luận sẵn sàng/chưa sẵn sàng bàn giao cho nhân viên.

Hiệp gửi mỗi agent: run-id, URL/SHA, alias tài khoản/fixture hợp lệ, case ID được giao, đường dẫn báo cáo và tiêu chí. Không chuyển bí mật trong prompt. Nếu runtime không gọi được subagent, ghi rõ thực hiện tuần tự, không giả danh phản hồi độc lập.

## Kết quả và quyết định

- Mỗi ca: NOT RUN, PASS, FAIL, BLOCKED hoặc N/A (có lý do). Không coi BLOCKED/N/A là PASS. Mặc định tất cả case trong bộ này là NOT RUN.
- Báo cáo tại `.agents/uat/runs/<run-id>/<agent>.md`, Nhi tổng hợp `SUMMARY.md` theo `REPORT-TEMPLATE.md`. Không đưa dữ liệu nhân sự thật, token, URL chứa bí mật hoặc ảnh không che thông tin vào repo.
- Tách kết quả UI, kiểm tra quyền qua request dưới session test thật, và static review. Không thấy nút hoặc response 200 không chứng minh phân quyền; cần đối chiếu nội dung trả về và xác nhận thao tác bị từ chối không thay dữ liệu.
- P0: lộ dữ liệu rộng, ghi/xóa trái quyền hoặc hỏng dữ liệu nghiêm trọng. P1: chặn luồng công việc chính hoặc sai quyền/số liệu quan trọng. P2: lỗi chức năng có workaround. P3: lỗi trình bày nhẹ.
- Chỉ đề xuất sẵn sàng bàn giao khi tất cả luồng chính đã chạy ở từng vai, không còn P0/P1, ca quyền quan trọng không BLOCKED/NOT RUN, và Khoa có phản hồi thật. P2/P3 phải được liệt kê cùng workaround và người quyết định chấp nhận. Không tuyên bố hệ thống hoàn toàn không có lỗi.
- Retest trên đúng SHA sửa: xác nhận lỗi cũ hết và chạy luồng liên quan; giữ kết quả cũ để truy vết. Dọn chỉ fixture của run sau khi giữ bằng chứng và xác nhận quyền dọn; báo fixture chưa dọn.
