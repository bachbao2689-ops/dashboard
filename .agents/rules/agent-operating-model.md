---
name: agent-operating-model
description: Mô hình vận hành chuẩn cho các Agent, quy tắc quản lý bộ nhớ 3 tầng (Memory) và khung đánh giá chất lượng (Evals & Guardrails).
trigger: always_on
---

# Mô hình vận hành Agent (Agent Operating Model)

Quy định này áp dụng cho toàn bộ hoạt động của các Agent hoạt động trong dự án DASHBOARD.

---

## 1. Cơ chế Quản lý Bộ nhớ 3 tầng (Three-tier Memory Architecture)

Hệ thống Agent vận hành dựa trên 3 tầng bộ nhớ có ranh giới rõ ràng:

1. **Tầng 1 - Prompt hiện tại (In-context Working Memory)**:
   - Chứa ngữ cảnh trực tiếp của phiên làm việc hiện tại, câu lệnh của người dùng và kết quả của các tool call đang diễn ra.
2. **Tầng 2 - Tóm tắt phiên làm việc (Session Summary Memory)**:
   - Bản ghi tóm tắt tiến độ, các quyết định quan trọng đã chốt, và trạng thái hiện tại của công việc khi ngữ cảnh bị nén hoặc chuyển tiếp giữa các phiên.
3. **Tầng 3 - Bộ nhớ dài hạn (Long-term Knowledge / Docs / Database)**:
   - **Chỉ sử dụng khi dự án có hạ tầng thực tế** (như tài liệu hướng dẫn lưu trong repository, schema cơ sở dữ liệu đã kích hoạt, hoặc backend API thực tế).
   - **Tuyệt đối không tự ý dựng hạ tầng giả định**: Không tự ý tạo mock vector database, không cài đặt giả cơ chế semantic search hoặc tạo kết nối database khi chưa có hạ tầng thật sẵn sàng trong project.
4. **Nguyên tắc an toàn bí mật (Zero Secrets in Memory)**:
   - Tuyệt đối không ghi thông tin nhạy cảm (API keys, service tokens, mật khẩu, private credentials) vào bộ nhớ tóm tắt, artifacts hoặc file documentation.

---

## 2. Khung Đánh giá & Giám sát Chất lượng (Evals & Guardrails)

1. **Bộ dữ liệu chuẩn (Golden Dataset)**:
   - Định hướng mở rộng quy mô đến 1.000 test case thực tế theo thời gian.
   - **Chỉ bổ sung các test case đã có đáp án và hành vi được xác minh thực tế (ground truth)**.
   - **Tuyệt đối không tự ý sinh ngẫu nhiên / tạo giả hàng loạt cho đủ 1.000 câu** nếu chưa có cơ sở kiểm chứng chất lượng.
2. **Thẩm định độc lập (LLM-as-a-Judge)**:
   - Đánh giá chất lượng đầu ra một cách độc lập dựa trên Rubric tiêu chuẩn (tính đúng đắn, tính bảo mật, mức độ tuân thủ quy tắc dự án và tính toàn vẹn của mã nguồn).
3. **Hàng rào bảo vệ (Guardrails)**:
   - **Chặn mã độc và hành vi phá hoại**: Ngăn ngừa thực thi các lệnh nguy hiểm, xóa dữ liệu hàng loạt không kiểm soát, hoặc tạo mã nguồn chứa backdoor.
   - **Chống rò rỉ dữ liệu (Data Leak Prevention)**: Chặn việc xuất hiện thông tin bảo mật của hệ thống ra bên ngoài phạm vi cho phép.

## 3. Bằng chứng vận hành và điều phối

- Chat trong sidebar là lịch sử hội thoại, không phải một chức năng riêng. Dùng chat Hiệp làm đầu mối develop; Hiệp gọi các vai cần thiết trong cùng yêu cầu. Không tạo chat mới cho mỗi lần kiểm tra hoặc up source.
- Sau khi đổi model hoặc phiên, kiểm tra tool hiện có và trạng thái file/nhánh trực tiếp. Không lấy kết luận thiếu tool từ chat cũ làm sự thật hiện tại.
- Phân biệt `source đã lên develop` (SHA local/remote khớp) với `Preview đã sẵn sàng` (deployment đúng SHA ở trạng thái Ready). Không suy ra kết quả kiểm thử từ build thành công hoặc URL trả HTTP 200.
- Chỉ ghi Nhi/Khoa đã PASS khi có phản hồi độc lập thật. Nếu một agent tự kiểm tra tuần tự, ghi đúng là self-check và nêu giới hạn.
