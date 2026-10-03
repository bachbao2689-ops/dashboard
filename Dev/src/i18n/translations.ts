import { useUiStore } from '../store/uiStore';

export const dict = {
  en: {
    'nav.main': 'Main',
    'nav.tasksProj': 'Tasks & Projects',
    'nav.assets': 'Assets',
    'nav.teamRep': 'Team & Reports',
    'nav.home': 'Home',
    'nav.tasks': 'All Tasks',
    'nav.projects': 'Kanban Board',
    'nav.myTasks': 'My Tasks',
    'nav.designTeam': 'Departments',
    'nav.inventory': 'Inventory',
    'nav.borrow': 'Borrow Requests',
    'nav.team': 'Team Workload',
    'nav.reports': 'Reports',
    
    'overview.welcome': 'Welcome,',
    'overview.subtitle': "Here's your unified task and asset overview for today.",
    'overview.myTasks': 'My Tasks',
    'overview.dueSoon': 'Due Soon',
    'overview.borrowed': 'Borrowed',
    'overview.overdue': 'Overdue',
    'overview.taskStatus': 'Task Status This Month',
    'overview.assetUtil': 'Asset Utilization',
    'overview.upcoming': 'Upcoming Deadlines (Next 7 Days)',
    'overview.recentBorrow': 'Recent Borrow Requests',
    'overview.thisMonth': 'This Month',
    'overview.aiSummary': 'AI Summary',
    'overview.export': 'Export',
    'overview.actionRequired': 'Action Required',
    'overview.created': 'Created',
    'overview.done': 'Done',
    'overview.approve': 'Approve',
    'overview.reject': 'Reject',
    'overview.approved': 'Approved',
    'overview.wantsToBorrow': 'wants to borrow',
    'overview.due': 'Due',
    
    'header.search': 'Search...',
    'header.dashboards': 'Dashboards',
    
    'btn.filters': 'Filters',
    'btn.addTask': 'New Task',
    'btn.addAsset': 'Add Asset',
    
    'tasks.title': 'All Tasks',
    'assets.title': 'Asset Inventory',
    'borrow.title': 'Borrow Requests',
    
    'design.title': 'DEPARTMENTS HUB',
    'design.subtitle': 'Cross-functional team operations, capacity, and project management',
    'design.newRequest': 'New Request',
    'design.tab.portfolio': 'Portfolio',
    'design.tab.tasks': 'Tasks Board',
    'design.tab.capacity': 'Cross-Team Capacity',
    'design.tab.bottlenecks': 'Bottlenecks',
    'design.tab.assets': 'Asset Library',
  },
  vi: {
    'nav.main': 'Chính',
    'nav.tasksProj': 'Công việc & Dự án',
    'nav.assets': 'Thiết bị',
    'nav.teamRep': 'Đội ngũ & Báo cáo',
    'nav.home': 'Trang chủ',
    'nav.tasks': 'Tất cả Công việc',
    'nav.projects': 'Bảng Kanban',
    'nav.myTasks': 'Việc của tôi',
    'nav.designTeam': 'Phòng Ban',
    'nav.inventory': 'Kho Thiết bị',
    'nav.borrow': 'Duyệt Mượn/Trả',
    'nav.team': 'Năng suất Team',
    'nav.reports': 'Báo cáo',
    
    'overview.welcome': 'Chào,',
    'overview.subtitle': 'Đây là tổng quan công việc và thiết bị của bạn hôm nay.',
    'overview.myTasks': 'Việc của tôi',
    'overview.dueSoon': 'Sắp đến hạn',
    'overview.borrowed': 'Đang mượn',
    'overview.overdue': 'Quá hạn',
    'overview.taskStatus': 'Trạng thái Task tháng này',
    'overview.assetUtil': 'Tình trạng Thiết bị',
    'overview.upcoming': 'Sắp đến hạn (7 ngày tới)',
    'overview.recentBorrow': 'Yêu cầu mượn gần đây',
    'overview.thisMonth': 'Tháng này',
    'overview.aiSummary': 'Tóm tắt AI',
    'overview.export': 'Xuất file',
    'overview.actionRequired': 'Cần xử lý',
    'overview.created': 'Đã tạo',
    'overview.done': 'Hoàn thành',
    'overview.approve': 'Duyệt',
    'overview.reject': 'Từ chối',
    'overview.approved': 'Đã duyệt',
    'overview.wantsToBorrow': 'muốn mượn',
    'overview.due': 'Hạn',
    
    'header.search': 'Tìm kiếm...',
    'header.dashboards': 'Bảng điều khiển',
    
    'btn.filters': 'Bộ lọc',
    'btn.addTask': 'Thêm Task',
    'btn.addAsset': 'Thêm Thiết bị',
    
    'tasks.title': 'Tất cả Công việc',
    'assets.title': 'Kho Thiết bị',
    'borrow.title': 'Yêu cầu Mượn/Trả',
    
    'design.title': 'ĐIỀU PHỐI PHÒNG BAN',
    'design.subtitle': 'Quản lý dự án, năng suất và luồng công việc liên phòng ban',
    'design.newRequest': 'Tạo mới',
    'design.tab.portfolio': 'Tất cả Dự án',
    'design.tab.tasks': 'Bảng Công việc',
    'design.tab.capacity': 'Bản đồ Nhân sự',
    'design.tab.bottlenecks': 'Điểm nghẽn',
    'design.tab.assets': 'Kho Tài nguyên',
  }
};

export const useTranslation = () => {
  const { lang } = useUiStore();
  
  return {
    t: (key: keyof typeof dict.en) => {
      return dict[lang]?.[key] || dict.en[key] || key;
    },
    lang
  };
};
