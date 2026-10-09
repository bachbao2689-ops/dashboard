# 🎨 QUY CHUẨN UX/UI - DASHBOARD V1

Tài liệu này quy định các tiêu chuẩn thiết kế (UX/UI) bắt buộc phải tuân thủ khi phát triển, thêm mới tính năng, tab, hoặc các component (nút bấm, form...) trên toàn bộ hệ thống Dashboard.
Mục tiêu: Đảm bảo tính nhất quán 100%, đồng bộ trải nghiệm người dùng và giúp việc bảo trì, code mới không bị "lệch tông" phải sửa lắt nhắt.

---

## 1. NGUYÊN TẮC CHUNG (GENERAL PRINCIPLES)
- **Đồng bộ**: Sử dụng lại các component dùng chung (Shared Components) thay vì tự code lại HTML tĩnh (ví dụ: dùng `Avatar`, `MultiSelect`, `tw-calendar-picker`).
- **Responsive**: Mọi giao diện mới phải được kiểm tra trên các màn hình Full HD, 2K, tỉ lệ 16:10, 4:3 và đặc biệt là Mobile.
- **Tương tác mượt mà**: Các hành động hover, focus phải có `transition-all` hoặc `transition-colors`.

---

## 2. QUY CHUẨN MÀU SẮC & DARK/LIGHT MODE
Tất cả các phần tử UI **bắt buộc** phải hỗ trợ cả Light Mode (mặc định) và Dark Mode (tiền tố `dark:` của Tailwind).

* **Nền tổng thể (Background):**
  - Light: `bg-slate-50` hoặc `bg-gray-50`
  - Dark: `dark:bg-slate-900` hoặc `dark:bg-[#0b1120]`
* **Nền khối / Card / Panel:**
  - Light: `bg-white`
  - Dark: `dark:bg-slate-800`
* **Viền (Border):**
  - Light: `border border-gray-200` hoặc `border-blue-100`
  - Dark: `dark:border-slate-700`
* **Màu chữ (Typography):**
  - Tiêu đề / Text chính: `text-gray-900 dark:text-white`
  - Text phụ / Ghi chú: `text-gray-500 dark:text-gray-400`
  - Text nhấn mạnh (Primary): `text-primary` (Blue)

---

## 3. QUY CHUẨN NÚT BẤM (BUTTONS)
Nút bấm sử dụng form bo góc lớn (`rounded-xl`) và chữ kích thước nhỏ gọn (`text-sm font-semibold`).

* **Primary Button (Nút hành động chính - Lưu, Tạo mới):**
  - Class: `bg-[#002e6d] text-white hover:bg-[#001f4d] rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors`
* **Secondary Button (Nút phụ - Hủy, Đóng):**
  - Class: `bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors`
* **Danger Button (Xóa, Hủy bỏ nguy hiểm):**
  - Class: `bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors`
* **Icon Action (Sửa, Xóa trong danh sách / Comment):**
  - Ẩn mặc định, hiện khi hover vào dòng cha: `opacity-0 group-hover:opacity-100`
  - Sửa / Reply: `text-gray-400 hover:text-primary p-1.5 rounded-lg`
  - Xóa: `text-gray-400 hover:text-red-500 p-1.5 rounded-lg`

---

## 4. QUY CHUẨN FORM & INPUTS
- **Kích thước & Hình dáng:** Mọi thẻ `<input>`, `<textarea>`, `<select>` đều dùng bo góc `rounded-xl` và padding `p-2.5` hoặc `p-3`.
- **Class chuẩn:** `w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary`
- **Dropdown chọn nhiều người / tags:** Không dùng thẻ select native, bắt buộc sử dụng component `<MultiSelect />` để có giao diện tìm kiếm và tick chọn đẹp mắt.
- **Ngày tháng (Date Picker):** 
  - 🚫 **KHÔNG** dùng thẻ `<input type="date">` mặc định của HTML vì UI trên mỗi trình duyệt/OS (Win/Mac) sẽ khác nhau và trông rất lệch tông.
  - ✅ **BẮT BUỘC** dùng class wrapper `tw-calendar-picker` kết hợp gọi hàm `window.openCalendar()` để render ra lịch Pop-up đồng nhất toàn hệ thống.

---

## 5. BỐ CỤC PANELS & MODAL (CHI TIẾT)
Khi làm một giao diện Panel trượt từ ngoài vào (như Task Detail, Project Detail), phải chia cấu trúc làm 3 phần rõ rệt:

1. **Header:** Chứa tiêu đề, tag trạng thái và nút Close (X) góc phải. Padding: `p-4` hoặc `p-5`, viền dưới `border-b border-gray-100 dark:border-slate-700`.
2. **Body (Nội dung cuộn):**
   - Class: `flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5`
   - Nội dung chia thành các `section`, tiêu đề section in đậm (`font-bold text-sm mb-3`).
3. **Footer (Sticky Action):**
   - Phải bám dính ở dưới cùng, không bị trôi đi khi cuộn nội dung. Điều này cực kỳ quan trọng đối với Mobile.
   - Class chuẩn: `p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-3 shrink-0`

---

## 6. QUY ĐỊNH TRẠNG THÁI HIỂN THỊ (UI STATES)
- **Trạng thái Hoàn thành (Completed/Done):**
  - Chữ bị gạch ngang và mờ đi: `line-through text-gray-400 dark:text-gray-500`
  - Đóng khung thành nền xanh mint: `bg-emerald-50 border-emerald-500 text-emerald-700`.
- **Skeleton / Loading:** Luôn hiển thị UI khung xám nhấp nháy (`animate-pulse`) khi đang load data thay vì để trang trắng bóc.
- **Dữ liệu trống (Empty State):** Khi mảng rỗng (0 task, 0 comment), phải có dòng text ghi chú căn giữa: "Chưa có dữ liệu" màu `text-gray-400 text-xs italic`.

---
*Tài liệu này là chuẩn mực cho Dashboard V1. Bất kỳ kỹ sư hay AI nào làm việc trên source code đều phải tham chiếu file này trước khi tạo Component mới.*
