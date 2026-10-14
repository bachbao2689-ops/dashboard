// src/types/department.ts

export type DepartmentId = 'marketing' | 'sale' | 'ecommerce' | 'design' | 'accounting' | 'hr';

export type AlertLevel = 'ok' | 'risk' | 'late';

export type PeriodFilter = 'week' | 'month' | 'quarter';

export type TaskStatusFilter = 'all' | 'late' | 'doing' | 'todo';

export type PriorityLevel = 'Cao' | 'TB' | 'Thấp';

export interface DepartmentInfo {
  id: DepartmentId;
  name: string;
  shortName: string;
  manager: string;
  memberCount: number;
}

export interface DepartmentKpis {
  completionRate: number;        // e.g. 62
  completionDelta: string;      // e.g. "▲ 4% so với kỳ trước"
  completionIsPositive?: boolean;
  overdueTasks: number;          // e.g. 21
  overdueDelta: string;         // e.g. "▲ 6 so với kỳ trước"
  inProgressTasks: number;       // e.g. 86
  inProgressSub: string;        // e.g. "trên 391 task"
  onTimeRate: number;           // e.g. 81
  onTimeDelta: string;          // e.g. "▼ 2%"
  projectsAtRiskOrCount: number;// e.g. 3 (risk) or 4 (total)
  projectsSub: string;          // e.g. "trên 8 project" or "1 trễ, 1 rủi ro"
  
  // Mandatory R1 secondary metrics
  budgetActual: number;         // e.g. 84500
  budgetTotal: number;          // e.g. 100000
  avgTaskDuration: number;      // e.g. 3.8 days
  avgTaskDurationTarget: number;// e.g. 4.0 days
  satisfactionScore: number;    // e.g. 4.6 (out of 5.0)
}

export interface DepartmentComparisonItem {
  id: DepartmentId;
  name: string;
  done: number;
  doing: number;
  todo: number;
  late: number;
  total: number;
  completionPct: number;
}

export interface WeeklyTrendItem {
  week: string; // T1..T8
  actual: number;
  target: number;
}

export interface HeatmapRow {
  id: DepartmentId;
  name: string;
  weeks: [number, number, number, number];
}

export interface OverallProjectItem {
  id: string;
  name: string;
  department: string;
  departmentId: DepartmentId;
  progress: number;
  status: AlertLevel;
}

export interface DetailProjectItem {
  id: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
  status: AlertLevel;
  deadline: string;
  manager: string;
  overdueCount: number;
}

export interface DetailTaskItem {
  id: string;
  name: string;
  projectTag: string;
  assignee: string;
  status: 'late' | 'doing' | 'todo';
  dueDate: string;
  priority: PriorityLevel;
}

export interface BurndownItem {
  week: string;
  actual: number;
  planned: number;
}

export interface MemberWorkloadItem {
  id: string;
  name: string;
  initial: string;
  capacityPct: number;
  activeTasks: number;
}

export interface ActivityItem {
  id: string;
  icon: 'check' | 'message' | 'clock' | 'user-plus';
  title: string;
  time: string;
}

export interface DepartmentDetailData {
  id: DepartmentId;
  name: string;
  kpis: DepartmentKpis;
  projects: DetailProjectItem[];
  tasks: DetailTaskItem[];
  burndown: BurndownItem[];
  members: MemberWorkloadItem[];
  activities: ActivityItem[];
}

export interface OverallDashboardData {
  kpis: DepartmentKpis;
  warningBanner: string;
  comparison: DepartmentComparisonItem[];
  weeklyTrends: WeeklyTrendItem[];
  heatmap: HeatmapRow[];
  projects: OverallProjectItem[];
}
