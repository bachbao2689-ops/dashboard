# Trạng thái tab Báo cáo tuần

Theo yêu cầu ngày 19/10/2026, màn Báo cáo tuần dành cho quản lý đã được gỡ khỏi source Develop để thiết kế một luồng report khác.

- Route `/reports` hiện mở trực tiếp **Reports & Analytics**; không còn bộ chọn Weekly Report/Analytics hoặc cache `reports.activeTab` trong route.
- Đã xóa toàn bộ UI, hook, model, service, bản in PDF, bản sao ngôn ngữ và test riêng của luồng management Weekly Report vừa xây dựng.
- `ReportAnalytics.tsx`, `useReports`, biểu đồ và dữ liệu Analytics tiếp tục hoạt động theo quyền hiện có.
- `WeeklyReportDrawer`, `WeeklyReportPreview`, `weeklyReports` và tiện ích kỳ báo cáo vẫn được Dashboard/Profile/Workload dùng chung; không thuộc màn Weekly Report vừa gỡ.
- Migration `20261019093749_weekly_report_management` đã áp dụng trên Supabase Dev trước khi gỡ giao diện vẫn nằm trong lịch sử DB. Việc gỡ source không xóa dữ liệu, không rollback RLS và không áp dụng thay đổi lên Official. Source SQL độc lập của flow bị gỡ cùng feature; bản SQL đã áp dụng còn trong lịch sử migration trên Dev.
- Thiết kế report tiếp theo bắt đầu từ yêu cầu mới; không tự khôi phục các bảng/giao diện vừa gỡ. Main chỉ cập nhật khi có lệnh riêng.
