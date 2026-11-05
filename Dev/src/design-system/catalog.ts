export const sections = [
  ['overview','Tổng quan','01'],['foundations','Nền tảng','02'],['components','Components','03'],['patterns','Mẫu màn hình','04'],['navigation','Điều hướng & Mobile','05'],['feedback','Trạng thái & Motion','06'],['features','Bản đồ chức năng','07'],['handoff','Quy tắc & Handoff','08'],
];
export const tokens = [
  {name:'Primary / Brand Blue',token:'--color-primary',light:'#002e6d',dark:'#185ba5',usage:'Hành động chính, liên kết và focus điều hướng. Dark primary là override trong theme.css.'},
  {name:'Brand Green',token:'--brand-green',light:'#4eb648',dark:'#4eb648',usage:'Nhận diện, focus-visible và điểm nhấn.'},
  {name:'Success',token:'--status-success',light:'#257534',dark:'#90e38a',usage:'Hoàn thành, đã duyệt. Có label và chấm tròn đi kèm.'},
  {name:'In progress',token:'--status-info',light:'#0369a1',dark:'#7dd3fc',usage:'Đang thực hiện, thông tin tiến độ.'},
  {name:'Waiting',token:'--status-warning',light:'#92400e',dark:'#fcd67a',usage:'Chờ duyệt, lên kế hoạch và pending.'},
  {name:'Danger',token:'--status-danger',light:'#be123c',dark:'#fda4af',usage:'Quá hạn, bị từ chối và hành động cần chú ý.'},
  {name:'Neutral',token:'--status-neutral',light:'#526079',dark:'#bdcbe0',usage:'Chưa bắt đầu, tạm dừng, hủy.'},
  {name:'Chart success',token:'--chart-success',light:'#27823c',dark:'#75d96e',usage:'Series hoàn thành trong biểu đồ.'},
  {name:'Chart axis',token:'--chart-axis',light:'#526986',dark:'#a9bdd3',usage:'Nhãn và trục biểu đồ.'},
  {name:'Chart border',token:'--chart-border',light:'#dce8fa',dark:'#3b516b',usage:'Đường chia và đường viền biểu đồ.'},
];
export const modules = [
  {title:'Tổng quan quản trị',route:'/overview',source:'pages/Overview.tsx',tag:'Admin',features:['KPI tổng quan','Phân bố trạng thái','Xu hướng hoàn thành','Công việc cần chú ý']},
  {title:'Dashboard / Overall Performance',route:'/ui-dashboard',source:'pages/Dashboard.tsx',tag:'Quản lý team',features:['Performance theo nhân sự','Tiến độ & khối lượng','Task còn 3 ngày','Lịch sử hoạt động','Phân tích Project / Campaign']},
  {title:'Tất cả công việc',route:'/tasks',source:'pages/TaskList.tsx',tag:'Theo phạm vi quyền',features:['Task, Subtask và đầu việc tổng hợp','Kanban / danh sách / lịch','Lọc trạng thái, PIC, phòng ban, ngày, ưu tiên','Nhóm công việc','Chọn nhiều & thao tác hàng loạt','Tạo / xem / sửa task','Bình luận & checklist']},
  {title:'Dự án / Chiến dịch',route:'/projects',source:'pages/Projects.tsx',tag:'Theo phạm vi quyền',features:['Tạo & chỉnh sửa Project / Campaign','PIC chính & thành viên','Phòng ban, timeline, ngân sách','Subtask & đầu việc','Số lượng hình/file','Priority Low / Medium / High / Urgent','Thay đổi trạng thái & ghim','Workflow liên kết & thảo luận']},
  {title:'Workflow Management',route:'/workflow',source:'components/features/workflow/WorkflowHubView.tsx',tag:'Theo phạm vi quyền',features:['Hub tổng hợp & KPI','Lộ trình theo phase','Timeline & bộ lọc thời gian','Thành viên phase','Liên kết task/subtask vào phase','Task chưa phân bổ','Badge phase & điều hướng đến phase','Chi tiết task và trao đổi']},
  {title:'Profile / Công việc của tôi',route:'/my-tasks',source:'pages/MyTasks.tsx',tag:'Cá nhân',features:['Task cá nhân & lịch làm việc','Công việc hoàn tất / đang mở','Báo cáo tồn đọng','Chỉnh sửa hồ sơ & crop avatar','Đổi mật khẩu','Đăng xuất']},
  {title:'Team Workload',route:'/team',source:'pages/TeamWorkload.tsx',tag:'Theo phạm vi quyền',features:['Member Workload (% capacity)','Khối lượng theo thành viên','Lọc team / thời gian','Chi tiết công việc nhân sự','Phân bố trạng thái']},
  {title:'Báo cáo',route:'/reports',source:'components/features/reports/ReportAnalytics.tsx',tag:'Theo phạm vi quyền',features:['Tổng hoàn thành / tất cả công việc','Task tồn đọng từ Profile','Project & Campaign','Tiếp tục đang làm','Hình/file đã xong / tổng','Biểu đồ & thẻ nhân sự','Burndown & mức tải công việc','Xuất / xem báo cáo']},
  {title:'Thành viên',route:'/members',source:'pages/MemberManagement.tsx',tag:'Theo phạm vi quyền',features:['Danh sách nhân sự','Tìm kiếm & lọc phòng ban','Hồ sơ nhân sự','Vai trò & cấp bậc','Thông tin tài khoản theo quyền']},
  {title:'Kho thiết bị',route:'/assets',source:'pages/AssetInventory.tsx',tag:'Tài sản',features:['Danh sách & chi tiết thiết bị','Trạng thái, vị trí, người giữ','QR & liên kết thiết bị','Yêu cầu mượn / trả','Theo dõi tài sản']},
  {title:'Duyệt mượn / trả',route:'/borrow-requests',source:'pages/BorrowRequests.tsx',tag:'Theo quyền tài sản',features:['Danh sách yêu cầu','Chi tiết yêu cầu','Duyệt / từ chối','Mượn & trả thiết bị','Trạng thái xử lý']},
  {title:'Mobile Home',route:'/mobile-home',source:'components/mobile/MobileHomeHub.tsx',tag:'Mobile',features:['Điểm vào nhanh theo vai trò','Task & tiến độ cá nhân','Điều hướng gọn','Action icon có nhãn hỗ trợ']},
  {title:'Đăng nhập / Đăng ký',route:'/login',source:'pages/auth/Login.tsx',tag:'Tài khoản',features:['Email & mật khẩu','Ghi nhớ phiên','Background / tagline / logo','Điều hướng theo vai trò','Giao diện mobile']},
  {title:'Điều hướng & tính năng chung',route:'Toàn hệ thống',source:'components/layouts/Sidebar.tsx',tag:'Shared',features:['Sidebar drill-down','Ghim Project / Campaign / Task','Tìm kiếm nhanh','Thông báo & đánh dấu đã đọc','Push notification theo thiết bị','Light / Dark','Tiếng Việt / English','Đồng bộ & cache dữ liệu','Realtime cập nhật workspace']},
  {title:'Main View / Báo cáo độc lập',route:'/main-view · /reports/visualize',source:'pages/MainReadOnly.tsx · pages/Reports.tsx',tag:'Bổ sung',features:['Màn hình Main View','Báo cáo standalone','Bảo vệ dữ liệu theo cơ chế từng màn hình']},
];
export const sourceFiles = ['src/index.css','src/styles/theme.css','tailwind.config.js','src/components/common/StatusBadge.tsx','src/components/common/StatusBadgeView.tsx','src/components/common/Modal.tsx','src/components/common/ActionButton.tsx','src/components/common/filters/DateFilterDropdown.tsx','src/components/common/filters/DateFilterDropdownView.tsx','src/utils/statusTheme.ts','src/lib/taskTracking.ts','src/lib/roleScope.ts'];
