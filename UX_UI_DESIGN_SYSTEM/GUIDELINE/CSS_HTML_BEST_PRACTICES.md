# Tiêu chuẩn Tổ chức CSS & HTML (React Components)

Để đảm bảo source code dễ đọc, dễ bảo trì, dễ mở rộng tính năng mới và giảm thiểu rủi ro khi làm việc với Tailwind CSS, tất cả quá trình development phải tuân thủ các quy tắc sau:

## 1. Tối ưu cấu trúc CSS (CSS Extraction)
Tuyệt đối KHÔNG nhồi nhét quá nhiều Tailwind utility classes (hơn 7-10 classes) trực tiếp vào thẻ HTML/JSX, đặc biệt là với các thành phần được tái sử dụng nhiều lần (như Button, Card, Header).

**Sai (Rối mắt, khó maintain):**
```tsx
<button className="flex items-center justify-center rounded-b-xl border border-blue-100 bg-white text-primary shadow-md transition-all duration-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
  Click me
</button>
```

**Đúng (HTML sạch sẽ, logic CSS tách biệt):**
```tsx
<button className="btn-header-toggle">
  Click me
</button>
```
Định nghĩa trong file CSS (ví dụ `index.css` hoặc `theme.css`) bằng `@apply`:
```css
.btn-header-toggle {
  @apply flex items-center justify-center rounded-b-xl border border-blue-100 bg-white text-primary shadow-md transition-all duration-300;
}
.btn-header-toggle:hover {
  @apply bg-blue-50;
}
html.dark .btn-header-toggle {
  @apply border-slate-700 bg-slate-800 text-blue-300 hover:bg-slate-700;
}
```

## 2. Chia nhỏ Component (Componentization)
Các file màn hình (Pages) không được dài quá 300-400 dòng code. Nếu phát hiện file phình to (ví dụ `Projects.tsx` dài 800 dòng), bắt buộc phải tách các khối giao diện độc lập thành các Component con (Ví dụ: `ProjectList.tsx`, `CampaignTable.tsx`, `SubtaskDetail.tsx`).

**Lợi ích:**
- Tách biệt logic và giao diện.
- Giảm thiểu conflict khi nhiều người cùng code.
- Dễ dàng định vị và sửa lỗi khi có bug hiển thị.

## 3. Tránh can thiệp Inline Style
Tuyệt đối không sử dụng `style={{ ... }}` trong JSX trừ khi đó là các giá trị bắt buộc phải tính toán động bằng JavaScript (ví dụ: tính toán tọa độ `top`, `left`, ảnh nền lấy từ API). Mọi style tĩnh phải được đưa vào file CSS.
