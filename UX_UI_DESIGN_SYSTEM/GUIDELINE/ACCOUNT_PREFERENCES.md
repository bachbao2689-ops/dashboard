# Ghi nhớ giao diện theo tài khoản

Các lựa chọn giao diện có ý nghĩa lâu dài của staff được lưu cục bộ ngay và đồng bộ vào `public.user_preferences.ui_state` trên Supabase. Mỗi khóa có `value` và `updatedAt`; khi mở app hoặc quay lại tab, giá trị mới nhất được khôi phục. Bảng đã có RLS theo tài khoản, còn RPC `dashboard_set_ui_preference` chỉ ghi cho staff đang đăng nhập.

## Cách dùng

- Trong component, dùng `useRememberedState('module.preferenceName', defaultValue)` thay cho `useState` nếu lựa chọn cần được giữ trên mọi máy.
- Trong store hoặc code không dùng React, dùng `userCache.get/set/remove/subscribe` từ `src/lib/userCache.ts` với `profile.id` hiện tại.
- Khóa chỉ gồm chữ thường, số, dấu chấm, gạch dưới, gạch nối hoặc dấu hai chấm; tối đa 80 ký tự. Giá trị phải là JSON nhỏ hơn 16 KB.
- Ưu tiên lưu theme, ngôn ngữ, ghim, kích thước panel, tab, bộ lọc, tìm kiếm và khoảng thời gian đã chọn. Lựa chọn gắn với màn hình phải được kiểm tra lại theo quyền hiện tại khi dùng.
- Không lưu task, project, comment, lịch sử, notification read state, quyền, draft công việc, phiên đăng nhập hoặc push subscription vào cache này. Những dữ liệu đó lấy từ bảng nghiệp vụ tương ứng.
- Không lưu trạng thái popup/hover/đang kéo vì đó là thao tác tức thời, không nên tự mở lại trên máy khác.

Nếu thêm màn hình mới, dùng cùng hook và đặt khóa có tiền tố theo màn hình để các lựa chọn của staff luôn tách biệt theo tài khoản.
