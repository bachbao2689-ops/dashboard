# Style Dashboard K COFFEE

Tài liệu duy nhất cho giao diện desktop, tablet và mobile. Khi triển khai, lấy component và token đang chạy trong `Dev/src` làm nguồn kỹ thuật; các con số dưới đây là chuẩn thiết kế. Quyền và dữ liệu xem [`rules.md`](./rules.md).

## Nền tảng thị giác

- Phong cách **Cyber-Organic Liquid Glass**: navy `#002e6d`, xanh cyan `#38bdf8`, viền 1px bán trong suốt, gradient chéo 135°, blur kèm saturate, bóng trong sáng và bóng ngoài mềm. Tránh viền đen/xám dày hoặc nhiều lớp kính chồng nhau.
- Light: nền `#fff` hoặc `#f8fafc`; card trắng có ánh xanh nhạt; kính `rgba(255,255,255,.85)`. Dark: nền `#0b1120`; card `#0f172a`; kính `rgba(15,23,42,.88)`. CTA chính `#002e6d`, hover `#001f4d`; chữ và viền phải đủ tương phản ở cả hai mode.
- Bo góc: card `16px`, nút/input `12px`, tooltip `8px`, thanh nổi/badge dạng pill. Hiệu ứng hover/focus ngắn, không làm xê dịch nội dung; tôn trọng `prefers-reduced-motion`.
- Khi yêu cầu sửa UI không nói rõ mode, chỉ chỉnh Light; Dark giữ nguyên. Khi được yêu cầu cả hai mode, chỉnh và soát cả hai.

## Bố cục và khả năng đọc

- Giao diện co theo chiều rộng thực, không phụ thuộc độ phân giải cố định. Card/grid được phép xuống hàng; không cắt CTA, thông tin thiết yếu hoặc footer panel. Chữ dài dùng `min-width:0`, `overflow:hidden`, `text-overflow:ellipsis`; mở detail/tooltip để đọc đủ.
- Desktop có sidebar, top bar và panel chi tiết. Header dùng kính mờ cục bộ; panel gồm header, body cuộn, footer thao tác bám đáy. Khi mở task/subtask detail trên mobile, ẩn bottom nav để không che nội dung.
- Popup/tooltip chỉ blur trong chính khung; không blur toàn màn cho thao tác nhẹ. Lật vị trí khi sát mép viewport; không để popup bị crop. Overlay toàn màn chỉ dành cho dialog thật.
- Trạng thái loading có skeleton, empty có lời giải thích ngắn, lỗi giữ nội dung nhập và cho thử lại. `Done` vẫn hiện trong ngữ cảnh quản lý phù hợp: viền xanh mint, tiêu đề gạch ngang, dữ liệu và bình luận vẫn đọc được.

## Nút, form và tương tác

- Primary: `bg-[#002e6d] text-white rounded-xl px-4 py-2.5 text-sm font-semibold`; secondary nền xám nhẹ, danger đỏ nhạt. Dùng component chung, trạng thái disabled/loading rõ ràng, vùng chạm mobile tối thiểu `44px`.
- Form dùng input/select chung, viền nhẹ, focus rõ, thông báo lỗi sát trường. Bộ chọn nhiều người dùng component đa chọn, không dùng `<select multiple>` native. Ngày dùng calendar chung của app, không dựa vào giao diện date picker mặc định của OS.
- Nút icon giữ `aria-label`, `title`/tooltip, focus visible. Các thao tác sửa/xóa comment của chính tác giả hiện khi hover hoặc focus; comment đã sửa có icon bút chì cạnh giờ.
- Với lựa chọn giao diện lâu dài như theme, tab, filter, ghim, vị trí panel, dùng trạng thái nhớ theo tài khoản; đừng để popup/hover đang mở tự khôi phục.

## Mobile

- Ở chiều rộng hẹp, dùng layout mobile thay vì ép desktop nhỏ lại. Nút thao tác thường hiện icon; chạm/focus hiện tên rồi thực hiện chức năng. Header trên ẩn khi cuộn xuống và hiện lại khi cuộn lên.
- Bottom nav là pill kính, `max-width:440px`, cách mép `12px`, padding `6px`, cách đáy `16px + safe-area-inset-bottom`; mỗi tab cao ít nhất `44px`, icon khoảng `20px`, chỉ tab active có gradient, viền sáng và chấm trạng thái. Dùng `NavLink.isActive` hoặc `aria-selected` thật.
- Light pill: gradient `rgba(255,255,255,.88)` → `rgba(226,239,255,.70)`, viền trắng và blur `22px`/saturate `170%`; active xanh nhạt/blue-700. Dark pill: gradient `rgba(29,49,77,.78)` → `rgba(9,23,47,.70)`, viền xanh mờ; active blue/cyan sáng. Lớp mask blur phía sau thanh tắt cùng lúc khi thanh ẩn.
- Detail task/subtask trên mobile vẫn cho thao tác mà tài khoản có quyền; bố trí nút theo vùng chạm, footer không đè lên bình luận hoặc bàn phím. Workflow stepper thu trạng thái về icon có nhãn truy cập được.
- Ảnh tham chiếu: [nút active dark mode](./assets/ui-button-reference-dark.jpg). Source chuẩn: `Dev/src/components/layouts/MobileNav.tsx`, `Dev/src/index.css`, `Dev/src/styles/theme.css`.

## Các khối đặc thù

- Workflow: 7 trạng thái `backlog` amber, `planned` slate, `scoping` rose, `in_progress` yellow, `in_qa` emerald, `completed` indigo, `canceled` neutral. Icon lục giác và nhãn dùng chung `WorkflowStatusPicker`. Thẻ phase có PIC và Subtask thành hai hàng avatar, ngày/hạn nổi rõ. Chọn phase chỉ đổi lựa chọn; **Xem chi tiết** mới mở Gate và task.
- Biểu đồ dùng số thật, stroke mềm, gradient tan và tooltip kính; thiếu timestamp hoặc mẫu số thì hiển thị `—`, không vẽ số giả.
- Login giữ intro đã chọn và badge “3 KHÔNG”; chữ trong SVG phải có độ rộng ổn định để không chồng lên ba biểu tượng ở các trình duyệt.

## Cách triển khai

- Ưu tiên component chung; tách CSS dùng lại khỏi JSX dài, không lạm dụng inline style tĩnh. Source tham khảo nằm trong `UX_UI_DESIGN_SYSTEM/source_code/`, nhưng component hiện hành trong `Dev/src` quyết định hành vi thực tế.
- Soát 360–430px, tablet, 4:3, 16:9, 16:10, Full HD và 2K; kiểm tra Light/Dark khi phạm vi thay đổi bao gồm cả hai. Không để tràn ngang hoặc mất hành động chính.
