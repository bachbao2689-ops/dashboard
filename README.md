# ☕ K COFFEE MANAGEMENT DASHBOARD

Hệ thống Dashboard Quản lý Tiến độ, Chiến dịch & Dự án theo chuẩn **Cyber-Organic Liquid Glass** và quy trình **Stage-Gate Timeline**.

---

## 🌐 1. Môi trường & Link Triển khai (Deployments)

| Môi trường | Nhánh (Branch) | Đường dẫn truy cập (Vercel) | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Phát triển (Dev / Preview)** | `codex/develop-dashboard` | [dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app](https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app/) | Test tính năng, review UI/UX, kiểm thử |
| **Chính thức (Production / Main)** | `main` | [dashboard-nu-tan-30.vercel.app](https://dashboard-nu-tan-30.vercel.app/) | Nhân viên và quản lý vận hành hàng ngày |

---

## 📁 2. Cấu trúc Dự án (Repository Structure)

Cấu trúc thư mục được tinh gọn và chuẩn hóa 100%:

```text
DASHBOARD/
├── Dev/                     # 🚀 Ứng dụng Dashboard chính (Deploy lên Vercel)
│   ├── src/                 # Mã nguồn React (Components, Pages, Hooks, Store, Styles)
│   ├── public/              # Tài nguyên tĩnh (Fonts, Icons, Calendar plugins)
│   ├── migrations/          # File SQL migration cho Supabase Database
│   ├── scripts/             # Script kiểm thử và thực thi cơ sở dữ liệu
│   ├── tests/               # Bộ test tự động
│   ├── index.html           # File HTML entry point
│   ├── package.json         # Khai báo thư viện & script
│   ├── vite.config.ts       # Cấu hình Vite bundler
│   ├── tailwind.config.js   # Cấu hình Tailwind CSS
│   └── vercel.json          # Cấu hình SPA routing & cache cho Vercel
│
├── UX_UI_DESIGN_SYSTEM/     # 💎 Hệ thống Thiết kế & Source code tái sử dụng
│   ├── GUIDELINE/           # Bộ tài liệu quy chuẩn thiết kế, nút bấm, deployment
│   │   ├── GUIDELINE.md     # Cẩm nang Master UX/UI Cyber-Organic Liquid Glass
│   │   ├── UI Button.md     # Quy chuẩn nút điều hướng Liquid Glass
│   │   ├── UX_UI_GUIDELINES.md # Quy chuẩn chung giao diện Dashboard
│   │   └── DEPLOYMENT_RULES.md # Quy định luồng phát triển và deploy
│   └── source_code/         # Mã nguồn độc lập tái sử dụng cho các Website khác
│       ├── components/      # CardHub, MagneticCard, LiquidButton, Popover, Stepper...
│       ├── hooks/           # useMagneticHover, useClickOutside
│       ├── styles/          # liquid-glass.css, tailwind.preset.js
│       ├── tokens/          # design-tokens.ts (Màu sắc, bo góc, 7 trạng thái)
│       └── index.ts         # Central export barrel
│
├── backend/                 # 🗄️ Cấu hình Database & Schema Supabase
│   ├── db/schema.sql        # Định nghĩa cấu trúc bảng dữ liệu
│   └── .env                 # Biến môi trường kết nối Database
│
├── .agents/                 # 🤖 Quy tắc AI Assistant (.agents/rules/)
├── .gitignore               # Bộ lọc file rác
└── README.md                # Tài liệu tổng quan dự án
```

---

## 🛠️ 3. Khởi chạy Cục bộ (Local Development)

### Cài đặt dependencies:
```bash
cd Dev
npm install
```

### Chạy môi trường Dev:
```bash
npm run dev
```
Truy cập: `http://localhost:5173/`

### Build kiểm thử Production:
```bash
npm run build
```

---

## 🎨 4. Tái sử dụng UX/UI cho Website khác

Để mang giao diện Liquid Glass sang một website hoặc ứng dụng khác, vui lòng đọc tài liệu hướng dẫn chi tiết tại:
👉 [UX_UI_DESIGN_SYSTEM/GUIDELINE/GUIDELINE.md](./UX_UI_DESIGN_SYSTEM/GUIDELINE/GUIDELINE.md)

---
*Bản quyền phát triển: K COFFEE Digital Team & BART.*
## Đồng bộ UX bình luận và phát hành

Áp dụng [quy chuẩn đồng bộ chỉnh sửa và xóa bình luận](GUIDELINE/COMMENT_UI_DEPLOYMENT_CONSISTENCY.md) trên Local, Develop và Main. Mọi panel comment dùng chung component `CommentMessage`; bản phát hành phải xác nhận đủ tính năng và cùng SHA giữa hai nhánh chuẩn.

## Phạm vi Team Workload

Xem [quy tắc hiển thị Team Workload](GUIDELINE/TEAM_WORKLOAD_VISIBILITY.md) để đối chiếu quyền xem theo phòng ban trên Local, Develop và Main.
