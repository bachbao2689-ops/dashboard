# 💎 CYBER-ORGANIC LIQUID GLASS — UX/UI DESIGN SYSTEM & ADAPTATION GUIDELINE
> **Hệ thống thiết kế UX/UI chuẩn hóa từ K COFFEE Dashboard**  
> Bản đặc tả toàn diện về Phong cách, Vibe, Tokens, Cơ chế tương tác và Mã nguồn tái sử dụng cho mọi Website / Web App.

---

## 📑 MỤC LỤC
1. [Triết lý Thiết kế & Vibe Định hình (Design Philosophy & Vibe)](#1-triết-lý-thiết-kế--vibe-định-hình)
2. [Hệ thống Màu sắc & Design Tokens (Color Palette & Tokens)](#2-hệ-thống-màu-sắc--design-tokens)
3. [Quy tắc Vàng về Chế độ Sáng/Tối (Light vs Dark Mode Policies)](#3-quy-tắc-vàng-về-chế-độ-sángtối)
4. [Bố cục & Cơ chế Cuộn Không Viền (Layout & Borderless Scroll)](#4-bố-cục--cơ-chế-cuộn-không-viền)
5. [Kiến trúc Component Trọng tâm (Core Component Anatomy)](#5-kiến-trúc-component-trọng-tâm)
   - [5.1 Card-Hub & Glass Panel Container](#51-card-hub--glass-panel-container)
   - [5.2 Nút Điều hướng Liquid Glass (Liquid Glass Nav Button)](#52-nút-điều-hướng-liquid-glass)
   - [5.3 Thẻ Magnetic & Hiệu ứng Rọi sáng Con trỏ (Cursor Spotlight)](#53-thẻ-magnetic--hiệu-ứng-rọi-sáng-con-trỏ)
   - [5.4 Popup / Tooltip Kính Mờ Cục bộ (Local Frosted Glass Popover)](#54-popup--tooltip-kính-mờ-cục-bộ)
   - [5.5 Lộ trình Giai đoạn Vòng cung (Circular Stage-Gate Stepper)](#55-lộ-trình-giai-đoạn-vòng-cung)
   - [5.6 Huy hiệu Lục giác & Cơ chế 7 Trạng thái Workflow](#56-huy-hiệu-lục-giác--cơ-chế-7-trạng-thái-workflow)
6. [Trực quan hóa Dữ liệu (Cyber Liquid Charts)](#6-trực-quan-hóa-dữ-liệu-cyber-liquid-charts)
7. [Hướng dẫn Áp dụng cho Website Khác (Step-by-step Adaptation Guide)](#7-hướng-dẫn-áp-dụng-cho-website-khác)
8. [Bộ Quy tắc Cấm kỵ (Do's & Don'ts Checklist)](#8-bộ-quy-tắc-cấm-kỵ-dos--donts-checklist)

---

## 1. TRIẾT LÝ THIẾT KẾ & VIBE ĐỊNH HÌNH

Hệ thống thiết kế này được định danh là **"Cyber-Organic Liquid Glass"** (Kính lỏng công nghệ giao thoa tính tự nhiên và thanh lịch doanh nghiệp):

1. **Enterprise Reliability kết hợp Cyber Innovation**:
   - Sử dụng nền tảng xanh dương Navy đặc trưng (`#002e6d`) làm điểm tựa niềm tin doanh nghiệp, kết hợp cùng các vệt sáng vi lượng (micro-lighting), đổ bóng đa tầng (diffused layered shadow), và các lớp kính mờ khúc xạ ánh sáng (refractive frosted glass).
2. **Soft & Technical (Không dùng Stroke gắt)**:
   - Mọi khối hộp đều **nói không với viền cứng đen/xám đậm thô kệch**.
   - Đường viền luôn là **1px bán trong suốt** (`border-white/80`, `border-blue-100`, `dark:border-slate-700/80` hoặc `border-blue-300/40`), tiệp màu với ánh sáng nền tạo cảm giác kính mài mép cao cấp.
3. **Hiệu ứng Kính lỏng (Liquid Glassmorphism)**:
   - Không chỉ là `backdrop-filter: blur()`, hiệu ứng lỏng ở đây được kết hợp từ **gradient góc chéo 135 độ**, **độ bão hòa màu cao (`saturate(170% - 190%)`)**, **bóng đổ chiều sâu bên trong (`inset 0 1px 0 rgba(255,255,255,0.9)`)** và **bóng phân tán mềm bên ngoài**.
4. **Vật lý Tương tác (Magnetic Physics & Micro-interactions)**:
   - Các card và nút bấm có độ đàn hồi (`spring curve: cubic-bezier(0.22, 1, 0.36, 1)`), phản hồi di chuột mượt mà, rọi quầng sáng đa sắc theo tọa độ chuột mà không làm giật khung hình.

---

## 2. HỆ THỐNG MÀU SẮC & DESIGN TOKENS

### 2.1 Màu Chủ đạo & Hệ màu Thương hiệu (Brand Colors)
| Token | Mã HEX / RGBA | Vai trò & Ứng dụng |
| :--- | :--- | :--- |
| `--brand-primary` | `#002e6d` | Màu nhận diện chính: Nút CTA cấp 1, text nhấn mạnh, logo |
| `--brand-primary-hover`| `#001f4d` | Trạng thái hover của nút Primary |
| `--brand-light-bg` | `#f0f6ff` / `rgba(240,246,255,0.7)` | Gradient ánh sáng lỏng nền Light mode |
| `--brand-cyan-glow` | `#38bdf8` / `rgba(56,189,248,0.5)`| Quầng sáng công nghệ Cyber glow (Magnetic blue) |

### 2.2 Hệ màu Trạng thái Quy trình (7 Workflow Statuses)
| Trạng thái (Key) | Tiêu đề Marketing | Màu HEX | Lớp nền & Viền (Light/Dark) |
| :--- | :--- | :--- | :--- |
| `backlog` | Ý tưởng & Chờ duyệt | `#F59E0B` (Amber) | `bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700` |
| `planned` | Đã lên kế hoạch | `#6B7280` (Slate) | `bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600` |
| `scoping` | Làm rõ Brief & Phạm vi | `#F43F5E` (Rose) | `bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700` |
| `in_progress` | Đang triển khai | `#EAB308` (Yellow) | `bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700` |
| `in_qa` | Rà soát & Duyệt | `#10B981` (Emerald)| `bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700`|
| `completed` | Nghiệm thu & Hoàn tất | `#6366F1` (Indigo) | `bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700` |
| `canceled` | Đã hủy bỏ | `#4B5563` (Neutral) | `bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700` |

### 2.3 Độ cong Viền (Border Radius Tokens)
- **Container / Hub Card**: `rounded-2xl` (`16px`)
- **Action Buttons / Form Inputs**: `rounded-xl` (`12px`)
- **Badges / Floating Bars / Pills**: `rounded-full` (`9999px`)
- **Tooltip / Small Indicators**: `rounded-lg` (`8px`)

---

## 3. QUY TẮC VÀNG VỀ CHẾ ĐỘ SÁNG/TỐI (LIGHT VS DARK MODE)

> [!IMPORTANT]
> **Chính sách can thiệp UI (UI Modification Policy):**
> 1. Khi tinh chỉnh giao diện (CSS, màu sắc, bố cục), **không tự ý thay đổi Dark mode** trừ khi có yêu cầu cụ thể.
> 2. Các style nâng cấp Liquid Glass cho Light mode phải được bao gói trong selector an toàn:
>    ```css
>    html:not(.dark) .selector { ... }
>    ```
>    hoặc khai báo riêng biệt từng tiền tố `dark:` trong Tailwind.

### 3.1 Quy chuẩn Bề mặt (Surfaces)
- **Light Mode**:
  - Nền trang: `#ffffff` hoặc `#f8fafc`.
  - Hub card (`.card-hub`): Nền trắng kết hợp quầng góc chéo xanh dịu `radial-gradient(circle at 100% 100%, #eff6ff 0%, transparent 50%), #ffffff`.
  - Kính nổi: `rgba(255, 255, 255, 0.85)` với viền `rgba(255, 255, 255, 0.88)` và bóng `rgba(18, 48, 94, 0.12)`.
- **Dark Mode**:
  - Nền trang: `#0b1120` (Midnight Obsidian).
  - Hub card (`.card-hub`): `radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.12) 0%, transparent 50%), #0f172a`.
  - Kính nổi: `rgba(15, 23, 42, 0.88)` với viền `rgba(59, 130, 246, 0.20)` và bóng `rgba(0, 0, 0, 0.55)`.

---

## 4. BỐ CỤC & CƠ CHẾ CUỘN KHÔNG VIỀN (LAYOUT & BORDERLESS SCROLL)

### 4.1 Triệt tiêu thanh cuộn thô (Zero-width Invisible Scrollbars)
Một trải nghiệm hiện đại không bao giờ để thanh cuộn dọc/ngang mặc định của trình duyệt làm lệch layout hoặc lộ đường xám thô:
```css
/* Áp dụng toàn cục hoặc trong .dashboard-scroll-surface */
* {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
  scrollbar-gutter: auto !important;
}
*::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
```

### 4.2 Thanh Header kính lỏng Sticky & Depth Mask
Khi người dùng cuộn nội dung xuống dưới, thanh Header trên cùng sẽ hòa quyện kính lỏng và che mờ nội dung đi qua bên dưới một cách tự nhiên nhờ **Depth Mask**:
```css
.liquid-glass-header {
  position: sticky;
  top: 12px;
  z-index: 50;
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(228, 241, 255, 0.52) 100%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 10px 32px rgba(18, 48, 94, 0.08), 0 1px 2px rgba(18, 48, 94, 0.04);
}
.dark .liquid-glass-header {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(9, 17, 34, 0.55) 100%);
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
}
```

---

## 5. KIẾN TRÚC COMPONENT TRỌNG TÂM

### 5.1 Card-Hub & Glass Panel Container
Một khối tổng hợp (`.card-hub`) gom nhóm toàn bộ các thông tin liên quan, tạo bố cục gãy gọn thay vì chia vụn vặt:
```tsx
<div className="card-hub p-5 rounded-2xl border border-[#e0eaff] dark:border-blue-500/15 bg-white dark:bg-slate-900 shadow-xs relative transition-all">
  {/* Nội dung card */}
</div>
```

---

### 5.2 Nút Điều hướng Liquid Glass (Liquid Glass Nav Button)
Nút được tối ưu hiệu ứng thấu kính ánh sáng khúc xạ theo chuẩn `UI Button.md`:

```css
/* Light Mode Active State */
html:not(.dark) .sidebar-link-active {
  background: linear-gradient(to bottom, rgba(219, 234, 254, 0.95), rgba(191, 219, 254, 0.70)) !important;
  color: #1d4ed8 !important; /* text-blue-700 */
  border: 1px solid rgba(147, 197, 253, 0.80) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 3px 10px rgba(30, 90, 170, 0.18) !important;
  font-weight: 600 !important;
}

/* Chấm đèn neon xanh báo hiệu active */
html:not(.dark) .sidebar-link-active::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background-color: #2563eb;
  box-shadow: 0 0 6px rgba(37, 99, 235, 0.5);
}
```

---

### 5.3 Thẻ Magnetic & Hiệu ứng Rọi sáng Con trỏ (Cursor Spotlight)
Các thẻ KPI hỗ trợ hiệu ứng nam châm từ tính và phản xạ quầng sáng theo vị trí chuột:
```css
.hover-magnetic-card {
  --glow-color: 56, 189, 248; /* Cyan blue mặc định */
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.35s ease;
}
.hover-magnetic-card:hover {
  transform: scale(1.02);
  border-color: rgba(var(--glow-color), 0.75);
  box-shadow: 0 10px 28px -6px rgba(var(--glow-color), 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.05);
}
```

---

### 5.4 Popup / Tooltip Kính Mờ Cục bộ (Local Frosted Glass Popover)

> [!CAUTION]
> **Quy định bất biến về Blur Popup:**
> - **KHÔNG BAO GIỜ** tạo overlay mờ toàn màn hình (`fixed inset-0 backdrop-blur`) khi hover hoặc click xem tooltip/popup thông tin. Việc này làm tối và khó chịu toàn trang.
> - **CHỈ LÀM MỜ CỤC BỘ**: Khung popup tự thân mang hiệu ứng `backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85`. Các phần tử nằm trực tiếp bên dưới khung popup sẽ bị làm mờ nhẹ xuyên thấu, trong khi toàn bộ phần còn lại của website giữ nguyên 100% độ sắc nét.
> - **Định vị thông minh**: Tự động mở lật ngược lên trên (`bottom-[calc(100%+6px)]`) nếu nằm ở nửa dưới màn hình để không bị cắt mép.

```tsx
<div className="absolute z-50 left-0 top-[calc(100%+8px)] w-80 p-4 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
  {/* Nội dung popup */}
</div>
```

---

### 5.5 Lộ trình Giai đoạn Vòng cung (Circular Stage-Gate Stepper)
- **Vòng tròn trung tâm**: Vòng tròn kích thước lớn (đường kính `72px`), viền nét kép tinh tế.
- **Tiến độ SVG tròn**: Hiển thị phần trăm qua vòng cung SVG xoay quanh tâm.
- **Icon hoàn thành**: Nền xanh ngọc `emerald` sáng với dấu check đậm đà khi phase đã done.
- **Nút nối chặng**: Các viên capsule nối giữa các phase có dấu `+` cho phép chèn thêm giai đoạn động.
- **Cơ chế đóng/mở chi tiết (Progressive Disclosure)**: Khi nhấp vào phase, chỉ xem số liệu tổng quan; chỉ khi click nút **"Xem chi tiết"** thì drawer công việc và tiêu chí Gate mới mở ra.

---

### 5.6 Huy hiệu Lục giác & Cơ chế 7 Trạng thái Workflow
Biểu tượng hình lục giác công nghệ (SVG Hexagon) đại diện cho các trạng thái công việc chuẩn hóa:
```tsx
export const WorkflowHexagonIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.5 L20.2 7.2 L20.2 16.8 L12 21.5 L3.8 16.8 L3.8 7.2 Z" opacity="0.2" />
    <path d="M12 2.5 L20.2 7.2 L20.2 16.8 L12 21.5 L3.8 16.8 L3.8 7.2 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
```

---

## 6. TRỰC QUAN HÓA DỮ LIỆU (CYBER LIQUID CHARTS)

Biểu đồ hiệu suất sử dụng thư viện Recharts được tùy biến theo tinh thần Cyber Liquid:
1. **Gradient Diện tích (Area Gradient)**:
   - Màu xanh Cyan / Sapphire nhạt dần về trong suốt (`from: rgba(56, 189, 248, 0.35)` đến `to: rgba(56, 189, 248, 0)`).
2. **Đường Stroke mềm**:
   - `strokeWidth={2.5}` hoặc `3`, cong tự nhiên (`type="monotone"`), có bộ lọc phát sáng nhẹ (`drop-shadow(0 4px 8px rgba(56,189,248,0.4))`).
3. **Tooltip Biểu đồ**:
   - Dùng cùng khuôn mẫu kính mờ `bg-slate-900/90 text-white backdrop-blur-md rounded-xl p-2.5 border border-slate-700/60 shadow-xl`.

---

## 7. HƯỚNG DẪN ÁP DỤNG CHO WEBSITE KHÁC

Để mang toàn bộ phong cách UX/UI này sang một website mới (React / Next.js / Vite / Tailwind), hãy thực hiện 3 bước đơn giản:

### Bước 1: Copy Thư mục Source Code
Copy toàn bộ thư mục `./UX_UI_DESIGN_SYSTEM/source_code/` vào project mới:
```
my-new-app/
├── src/
│   ├── design-system/          <-- Paste source_code vào đây
│   │   ├── tokens/
│   │   ├── styles/
│   │   ├── hooks/
│   │   └── components/
```

### Bước 2: Import CSS & Cấu hình Tailwind
1. Import file `liquid-glass.css` vào file CSS gốc (`src/index.css` hoặc `globals.css`):
   ```css
   @import "./design-system/styles/liquid-glass.css";
   ```
2. Thêm preset vào `tailwind.config.js`:
   ```javascript
   module.exports = {
     presets: [
       require('./src/design-system/styles/tailwind.preset.js')
     ],
     // ...
   }
   ```

### Bước 3: Sử dụng các Components đã đóng gói
```tsx
import { CardHub } from '@/design-system/components/CardHub';
import { MagneticCard } from '@/design-system/components/MagneticCard';
import { StatusHexagonBadge } from '@/design-system/components/StatusHexagonBadge';
import { FrostedPopover } from '@/design-system/components/FrostedPopover';

export default function MyDashboard() {
  return (
    <CardHub className="p-6">
      <MagneticCard glowColor="blue">
        <h4>Doanh thu tháng</h4>
        <StatusHexagonBadge status="in_progress" />
      </MagneticCard>
    </CardHub>
  );
}
```

---

## 8. BỘ QUY TẮC CẤM KỴ (DO'S & DON'TS CHECKLIST)

| ĐIỀU NÊN LÀM (DO) ✅ | ĐIỀU CẤM KỴ (DON'T) ❌ |
| :--- | :--- |
| **Dùng viền bán trong suốt 1px** (`border-white/80`, `border-blue-100`, `dark:border-slate-700/80`) tạo vẻ thanh thoát. | **KHÔNG** dùng viền stroke đặc đen, xám đậm hoặc dày cộp 2px thô kệch. |
| **Làm mờ cục bộ** ngay phía dưới khung popup bằng `backdrop-blur-2xl`. | **KHÔNG** làm mờ toàn màn hình / mờ cả trang web khi chỉ hover vào 1 nút info. |
| **Bảo lưu và tách biệt Dark Mode** bằng `html:not(.dark)` hoặc tiền tố `dark:`. | **KHÔNG** sửa đè CSS Light mode làm hư hỏng nền và độ tương phản của Dark mode. |
| **Ẩn thanh cuộn vật lý** (`*::-webkit-scrollbar { display: none }`) nhưng vẫn cuộn mượt 100%. | **KHÔNG** để thanh cuộn Windows/Mac chiếm chỗ gây giật khung hình và cắt cụt nội dung. |
| **Nút đang chọn có chấm neon** và gradient ánh sáng dịu. | **KHÔNG** bôi nền màu neon chói mắt hoặc làm phẳng lì không chiều sâu. |
| **Chỉ mở chi tiết khi người dùng chủ động click** "Xem chi tiết". | **KHÔNG** tự động bung chi tiết làm tràn ngập thông tin gây rối mắt người dùng. |

---
*Tài liệu và bộ mã nguồn được trích xuất và chuẩn hóa từ hệ thống K COFFEE Dashboard (Bản quyền BART / DeepMind AI Pair).*
