export const MOCK_TASKS = [
  { id: '1', task_ref: 'TK01', title: 'Hoàn thiện giao diện UI/UX', status: 'in_progress', priority: 'high', due_date: '2026-10-05', project: { name: 'K COFFEE Web' }, assignee: { name: 'Bách Bảo', avatar_url: null }, department: { name: 'Design' }, column: { name: 'In Progress' } },
  { id: '2', task_ref: 'TK02', title: 'Tối ưu hoá Database', status: 'todo', priority: 'high', due_date: '2026-10-08', project: { name: 'Backend System' }, assignee: { name: 'Admin', avatar_url: null }, department: { name: 'Engineering' }, column: { name: 'To Do' } },
  { id: '3', task_ref: 'TK03', title: 'Viết tài liệu API', status: 'done', priority: 'medium', due_date: '2026-10-01', project: { name: 'Backend System' }, assignee: { name: 'Test Staff', avatar_url: null }, department: { name: 'Engineering' }, column: { name: 'Done' } },
  { id: '4', task_ref: 'TK04', title: 'Lên plan Marketing Q4', status: 'todo', priority: 'high', due_date: '2026-10-15', project: { name: 'Marketing Q4' }, assignee: { name: 'Bách Bảo', avatar_url: null }, department: { name: 'Marketing' }, column: { name: 'To Do' } },
  { id: '5', task_ref: 'TK05', title: 'Thiết kế banner khuyến mãi', status: 'in_progress', priority: 'medium', due_date: '2026-10-10', project: { name: 'Marketing Q4' }, assignee: { name: 'Test Staff', avatar_url: null }, department: { name: 'Design' }, column: { name: 'In Progress' } },
  { id: '6', task_ref: 'TK06', title: 'Tuyển dụng 2 Dev', status: 'todo', priority: 'low', due_date: '2026-10-30', project: { name: 'HR Expansion' }, assignee: { name: 'Admin', avatar_url: null }, department: { name: 'HR' }, column: { name: 'To Do' } },
  { id: '7', task_ref: 'TK07', title: 'Sửa lỗi màn hình Login', status: 'done', priority: 'high', due_date: '2026-10-02', project: { name: 'K COFFEE Web' }, assignee: { name: 'Bách Bảo', avatar_url: null }, department: { name: 'Engineering' }, column: { name: 'Done' } },
  { id: '8', task_ref: 'TK08', title: 'Cập nhật nội dung Fanpage', status: 'overdue', priority: 'medium', due_date: '2026-09-28', project: { name: 'Social Media' }, assignee: { name: 'Test Staff', avatar_url: null }, department: { name: 'Marketing' }, column: { name: 'In Progress' } },
  { id: '9', task_ref: 'TK09', title: 'Quay video giới thiệu', status: 'overdue', priority: 'high', due_date: '2026-09-30', project: { name: 'Social Media' }, assignee: { name: 'Bách Bảo', avatar_url: null }, department: { name: 'Media' }, column: { name: 'To Do' } },
  { id: '10', task_ref: 'TK10', title: 'Đánh giá KPI nhân viên', status: 'in_progress', priority: 'high', due_date: '2026-10-05', project: { name: 'HR Expansion' }, assignee: { name: 'Admin', avatar_url: null }, department: { name: 'HR' }, column: { name: 'In Progress' } },
];

export const MOCK_ASSETS = [
  { id: '1', asset_code: 'MAC-01', name: 'MacBook Pro M2 16GB', condition: 'good', location: 'Kho Tổng', status: 'available', category: { name: 'Laptop', icon: 'Laptop' } },
  { id: '2', asset_code: 'MAC-02', name: 'MacBook Air M1', condition: 'good', location: 'Kho Tầng 2', status: 'borrowed', category: { name: 'Laptop', icon: 'Laptop' }, current_borrower: { name: 'Bách Bảo', department: { name: 'Design' } } },
  { id: '3', asset_code: 'CAM-01', name: 'Máy ảnh Sony A7IV', condition: 'needs_maintenance', location: 'Kho Media', status: 'maintenance', category: { name: 'Camera', icon: 'Camera' } },
  { id: '4', asset_code: 'LENS-01', name: 'Ống kính Sony 24-70mm', condition: 'good', location: 'Kho Media', status: 'available', category: { name: 'Phụ kiện', icon: 'Box' } },
  { id: '5', asset_code: 'HDD-01', name: 'Ổ cứng SSD 2TB', condition: 'good', location: 'Kho Tầng 2', status: 'borrowed', category: { name: 'Lưu trữ', icon: 'HardDrive' }, current_borrower: { name: 'Test Staff' } },
  { id: '6', asset_code: 'SCR-01', name: 'Màn hình Dell Ultrasharp', condition: 'good', location: 'Kho Tổng', status: 'available', category: { name: 'Màn hình', icon: 'Monitor' } },
];

export const MOCK_BORROW_REQUESTS = [
  { id: 'req-1', asset: { name: 'MacBook Air M1' }, requester: { name: 'Bách Bảo' }, requested_at: '2026-10-01T10:00:00Z', borrow_date: '2026-10-02', due_date: '2026-10-15', purpose: 'Làm dự án Design', approval_status: 'approved' },
  { id: 'req-2', asset: { name: 'Máy ảnh Sony A7IV' }, requester: { name: 'Test Staff' }, requested_at: '2026-10-02T08:30:00Z', borrow_date: '2026-10-03', due_date: '2026-10-05', purpose: 'Quay sự kiện', approval_status: 'pending' },
  { id: 'req-3', asset: { name: 'Ổ cứng SSD 2TB' }, requester: { name: 'Admin' }, requested_at: '2026-09-25T14:00:00Z', borrow_date: '2026-09-26', due_date: '2026-09-30', purpose: 'Lưu file backup', approval_status: 'rejected' },
];

export const MOCK_TEAM_WORKLOAD = [
  { id: '1', name: 'Admin User', avatar_url: null, department: 'Management', role: 'admin', activeTasks: 3, completedTasks: 12, efficiency: 95, workload: 40 },
  { id: '2', name: 'Bách Bảo', avatar_url: null, department: 'Design/Media', role: 'manager', activeTasks: 5, completedTasks: 8, efficiency: 88, workload: 85 },
  { id: '3', name: 'Test Staff', avatar_url: null, department: 'Marketing', role: 'staff', activeTasks: 4, completedTasks: 5, efficiency: 75, workload: 60 },
];
