import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown, Clock, Info, Check, Calendar, FileText, BarChart2, ArrowRight, Search
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { useNavigate } from 'react-router-dom';
import { WeeklyReportDrawer } from '../components/features/reports/WeeklyReportDrawer';
import type { ReportReference } from '../components/features/reports/WeeklyReportDrawer';
import { tasksForWeeklyReport } from '../lib/weeklyReport';

/* Design tokens */
const INK = 'text-gray-900 dark:text-white';
const MUTED = 'text-gray-500 dark:text-gray-400';
const LINK = 'text-blue-600 dark:text-blue-400';
const PANEL = 'bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-slate-800 dark:border-slate-700';
const INNER = 'border border-gray-200 dark:border-slate-700';

interface PerfData {
  id: string;
  type: 'staff' | 'department' | 'project';
  initial: string;
  name: string;
  role: string;
  dept: string;
  open: number;
  done: number;
  projects: number;
  projectsLabel: string;
  total: number;
  overdue: number;
  due3: number;
  urgent: number;
  noDeadline: number;
  week: number[];
  month: number[];
}

const DATA: PerfData[] = [
  // STAFF
  {
    id: 's1', type: 'staff', initial: 'L', name: 'LUNA', role: 'Thành viên', dept: 'LUNA · Chưa cập nhật phòng ban',
    open: 16, done: 36, projects: 12, projectsLabel: 'Dự án mở', total: 52, overdue: 2, due3: 0, urgent: 8, noDeadline: 13, week: [0, 0, 2, 0, 0, 0, 0], month: [3, 5, 2, 4]
  },
  {
    id: 's2', type: 'staff', initial: 'VA', name: 'Nguyễn Văn A', role: 'Nhân viên', dept: 'DESIGN',
    open: 9, done: 24, projects: 5, projectsLabel: 'Dự án mở', total: 33, overdue: 1, due3: 2, urgent: 3, noDeadline: 4, week: [1, 0, 1, 3, 0, 0, 0], month: [4, 2, 6, 3]
  },
  {
    id: 's3', type: 'staff', initial: 'VE', name: 'Hoàng Văn E', role: 'Nhân viên', dept: 'DESIGN',
    open: 0, done: 12, projects: 1, projectsLabel: 'Dự án mở', total: 12, overdue: 0, due3: 0, urgent: 0, noDeadline: 0, week: [0, 0, 0, 0, 0, 0, 0], month: [0, 0, 2, 1]
  },
  // DEPARTMENTS
  {
    id: 'd1', type: 'department', initial: 'M', name: 'MARKETING', role: 'Trưởng phòng: Trần B', dept: 'Phòng ban',
    open: 45, done: 120, projects: 8, projectsLabel: 'Nhân sự', total: 165, overdue: 5, due3: 12, urgent: 15, noDeadline: 20, week: [10, 5, 12, 8, 4, 0, 0], month: [40, 35, 50, 40]
  },
  {
    id: 'd2', type: 'department', initial: 'E', name: 'E-COMMERCE', role: 'Trưởng phòng: Lê C', dept: 'Phòng ban',
    open: 30, done: 85, projects: 5, projectsLabel: 'Nhân sự', total: 115, overdue: 2, due3: 8, urgent: 10, noDeadline: 15, week: [5, 8, 4, 6, 2, 0, 0], month: [25, 30, 20, 40]
  },
  {
    id: 'd3', type: 'department', initial: 'D', name: 'DESIGN', role: 'Trưởng phòng: Nguyễn D', dept: 'Phòng ban',
    open: 20, done: 65, projects: 4, projectsLabel: 'Nhân sự', total: 85, overdue: 0, due3: 5, urgent: 4, noDeadline: 5, week: [2, 4, 3, 5, 1, 0, 0], month: [15, 20, 25, 25]
  },
  {
    id: 'd4', type: 'department', initial: 'K', name: 'KẾ TOÁN', role: 'Trưởng phòng: Phạm E', dept: 'Phòng ban',
    open: 12, done: 45, projects: 3, projectsLabel: 'Nhân sự', total: 57, overdue: 0, due3: 2, urgent: 1, noDeadline: 0, week: [1, 2, 1, 2, 0, 0, 0], month: [10, 15, 12, 20]
  },
  {
    id: 'd5', type: 'department', initial: 'H', name: 'HR', role: 'Trưởng phòng: Vũ F', dept: 'Phòng ban',
    open: 8, done: 30, projects: 3, projectsLabel: 'Nhân sự', total: 38, overdue: 0, due3: 1, urgent: 0, noDeadline: 2, week: [0, 1, 1, 0, 0, 0, 0], month: [8, 10, 10, 10]
  },
  // PROJECTS
  {
    id: 'p1', type: 'project', initial: 'C', name: 'Campaign tháng 10', role: 'PM: Nguyễn Văn A', dept: 'Dự án (Medium)',
    open: 24, done: 45, projects: 3, projectsLabel: 'Giai đoạn', total: 69, overdue: 3, due3: 8, urgent: 5, noDeadline: 2, week: [4, 5, 8, 2, 1, 0, 0], month: [15, 20, 10, 24]
  },
  {
    id: 'p2', type: 'project', initial: 'B', name: 'Black Friday 2026', role: 'PM: Trần B', dept: 'Dự án (High)',
    open: 50, done: 10, projects: 5, projectsLabel: 'Giai đoạn', total: 60, overdue: 0, due3: 15, urgent: 20, noDeadline: 5, week: [10, 12, 15, 10, 3, 0, 0], month: [5, 10, 25, 20]
  }
];

const UPCOMING_PROJECTS = [
  { id: 'p1', code: 'TK86', name: 'Campaign tháng 10', dept: 'Marketing', dueStr: '3 ngày', dueType: 'warning', date: '3/10/2026', priority: 'Medium' },
  { id: 'p2', code: 'TK99', name: 'Black Friday 2026', dept: 'E-commerce', dueStr: '5 ngày', dueType: 'warning', date: '5/10/2026', priority: 'High' }
];

const TEAM_MEMBERS = [
  { name: 'DESIGN', id: 'd3', members: [{ i: 'VA', id: 's2', n: 'Nguyễn Văn A', r: 'Nhân viên', open: 9 }, { i: 'VE', id: 's3', n: 'Hoàng Văn E', r: 'Nhân viên', open: 0 }] },
  { name: 'EVENT', id: 'd6', members: [{ i: 'TD', id: 's4', n: 'Phạm Thị D', r: 'Nhân viên', open: 0 }] },
  { name: 'MARKETING', id: 'd1', members: [{ i: 'TB', id: 's5', n: 'Trần Thị B', r: 'Nhân viên', open: 0 }] },
  { name: 'MEDIA', id: 'd7', members: [{ i: 'VC', id: 's6', n: 'Lê Văn C', r: 'Nhân viên', open: 0 }] },
];

// Legacy visual fixtures are retained only as design references. All rendered data below comes from Supabase.
void DATA;
void UPCOMING_PROJECTS;
void TEAM_MEMBERS;

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const toYmd = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
const startOfCurrentWeek = () => { const value = new Date(); const weekday = value.getDay() || 7; value.setDate(value.getDate() - weekday + 1); value.setHours(0, 0, 0, 0); return value; };
const dayKey = (value?: string | null) => value ? toYmd(new Date(value)) : '';
const displayDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
const isDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`block text-xs font-semibold tracking-[1.8px] uppercase ${MUTED} ${className}`}>{children}</span>
);

const TextButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${className}`}>
    {children} <ArrowRight size={12} />
  </button>
);

export const Dashboard: React.FC = () => {
  const isDark = useUiStore(state => state.theme) === 'dark';
  const { tasks, users, loading } = useWorkspaceData();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState('s1');
  const [range, setRange] = useState<'weekly' | 'custom'>('weekly');
  const [customStart, setCustomStart] = useState(() => toYmd(startOfCurrentWeek()));
  const [customEnd, setCustomEnd] = useState(() => { const value = startOfCurrentWeek(); value.setDate(value.getDate() + 6); return toYmd(value); });
    const [performanceOpen, setPerformanceOpen] = useState(false);
  
  const [openDept, setOpenDept] = useState<string | null>('DESIGN');
  
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const liveData = useMemo<PerfData[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plusThree = new Date(today); plusThree.setDate(today.getDate() + 3);
    const stats = (id: string, type: PerfData['type'], name: string, role: string, dept: string, list: any[]): PerfData => {
      const done = list.filter(task => task.status === 'done').length;
      const open = list.length - done;
      const overdue = list.filter(task => task.status !== 'done' && task.due_date && new Date(task.due_date) < today).length;
      const due3 = list.filter(task => task.status !== 'done' && task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) <= plusThree).length;
      const urgent = list.filter(task => task.status !== 'done' && task.priority === 'high').length;
      const noDeadline = list.filter(task => !task.due_date).length;
      const projects = new Set(list.map(task => task.project?.name).filter(Boolean)).size;
      const week = Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(today); date.setDate(today.getDate() + offset);
        return list.filter(task => task.due_date && new Date(task.due_date).toDateString() === date.toDateString()).length;
      });
      const month = Array.from({ length: 4 }, (_, offset) => {
        const date = new Date(today.getFullYear(), today.getMonth() - 3 + offset, 1);
        return list.filter(task => task.due_date && new Date(task.due_date).getFullYear() === date.getFullYear() && new Date(task.due_date).getMonth() === date.getMonth()).length;
      });
      return { id, type, initial: name.slice(0, 2).toUpperCase(), name, role, dept, open, done, projects, projectsLabel: 'Dự án', total: list.length, overdue, due3, urgent, noDeadline, week, month };
    };
    const members = users.map(user => stats(
      `user-${user.id}`,
      'staff',
      user.name,
      user.job_title ? `${user.employment_level || 'Nhân viên'} · ${user.job_title}` : (user.role === 'admin' ? 'Admin' : 'Thành viên'),
      user.department?.name || 'Chưa cập nhật team',
      tasks.filter(task => String(task.assignee_id) === String(user.id))
    ));
    const deptNames = [...new Set(tasks.map(task => task.department?.name || 'Chưa phân phòng'))];
    const depts = deptNames.map(name => stats(`dept-${name}`, 'department', name, 'Phòng ban', 'Phòng ban', tasks.filter(task => (task.department?.name || 'Chưa phân phòng') === name)));
    const projectNames = [...new Set(tasks.map(task => task.project?.name).filter(Boolean))] as string[];
    const projects = projectNames.map(name => stats(`project-${name}`, 'project', name, 'Dự án', 'Dự án', tasks.filter(task => task.project?.name === name)));
    return [...members, ...depts, ...projects];
  }, [tasks, users]);

  const s = liveData.find(d => d.id === activeId) || liveData.find(d => d.type === 'department') || liveData[0];
  const pct = s ? Math.round((s.done / s.total) * 100) || 0 : 0;
  const trackRing = isDark ? '#334155' : '#edf3f8';
  const trackOrbit = isDark ? '#334155' : '#e8eff8';
  const rangeStart = range === 'weekly' ? toYmd(startOfCurrentWeek()) : customStart;
  const rangeEnd = range === 'weekly' ? (() => { const value = startOfCurrentWeek(); value.setDate(value.getDate() + 6); return toYmd(value); })() : customEnd;
  const selectedTasks = useMemo(() => {
    if (!s) return [];
    if (s.type === 'staff') return tasks.filter(task => `user-${task.assignee_id}` === s.id);
    if (s.type === 'department') return tasks.filter(task => (task.department?.name || 'Chưa phân phòng') === s.name);
    return tasks.filter(task => task.project?.name === s.name);
  }, [s, tasks]);
  const periodTasks = useMemo(() => tasksForWeeklyReport(selectedTasks, rangeStart, rangeEnd), [selectedTasks, rangeStart, rangeEnd]);
  const chartData = useMemo(() => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return [];
    const start = new Date(`${rangeStart}T00:00:00`); const end = new Date(`${rangeEnd}T00:00:00`);
    const days: Array<{ key: string; name: string; created: number; doing: number; done: number }> = [];
    for (let cursor = new Date(start); cursor <= end && days.length < 31; cursor.setDate(cursor.getDate() + 1)) {
      const key = toYmd(cursor);
      days.push({ key, name: range === 'weekly' ? WEEK_LABELS[(cursor.getDay() + 6) % 7] : cursor.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), created: selectedTasks.filter(task => dayKey(task.created_at) === key).length, doing: selectedTasks.filter(task => !isDone(task.status) && (task.status || '').toLowerCase() !== 'todo' && dayKey(task.updated_at || task.created_at) === key).length, done: selectedTasks.filter(task => isDone(task.status) && dayKey(task.updated_at || task.created_at) === key).length });
    }
    return days;
  }, [rangeStart, rangeEnd, range, selectedTasks]);
  const selectedReferences = useMemo<ReportReference[]>(() => {
    const refs: Array<[string, ReportReference]> = [
      ...selectedTasks.filter(task => task.project?.id).map(task => [`project-${task.project?.id}`, { id: task.project!.id!, name: task.project!.name || 'Project', kind: 'project' as const }] as [string, ReportReference]),
      ...selectedTasks.filter(task => task.campaign?.id).map(task => [`campaign-${task.campaign?.id}`, { id: task.campaign!.id!, name: task.campaign!.name || 'Campaign', kind: 'campaign' as const }] as [string, ReportReference])
    ];
    return [...new Map<string, ReportReference>(refs).values()];
  }, [selectedTasks]);
  const openFilteredTasks = () => {
    if (!s) return;
    const query = new URLSearchParams({ start: rangeStart, end: rangeEnd });
    if (s.type === 'staff') query.set('assignee', s.id.replace('user-', ''));
    if (s.type === 'department') query.set('department', s.name);
    navigate(`/tasks?${query.toString()}`);
  };

  const filteredDepts = liveData.filter(d => d.type === 'department' && d.name.toLowerCase().includes(search.toLowerCase()));

  const getEyebrow = () => {
    if (s?.type === 'department') return 'DEPARTMENT INSIGHTS';
    if (s?.type === 'project') return 'PROJECT OVERVIEW';
    return 'STAFF SPOTLIGHT';
  };

  const upcomingProjects = tasks
    .filter(task => task.status !== 'done' && task.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 2)
    .map(task => ({
      id: `project-${task.project?.name || task.id}`,
      code: task.task_ref || '—',
      name: task.project?.name || task.title,
      dept: task.department?.name || 'Chưa phân phòng',
      date: new Date(task.due_date!).toLocaleDateString('vi-VN'),
      dueStr: Math.max(0, Math.ceil((new Date(task.due_date!).getTime() - Date.now()) / 86400000)) + ' ngày',
      priority: task.priority === 'high' ? 'High' : 'Medium',
    }));
  const teams = [...new Set(users.map(user => user.department?.name || 'Chưa cập nhật team'))].map(name => ({
    name,
    id: `team-${name}`,
    members: liveData.filter(member => member.type === 'staff' && users.find(user => `user-${user.id}` === member.id)?.department?.name === name).map(member => ({ i: member.initial, id: member.id, n: member.name, r: member.role, open: member.open })),
  }));

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>;
  if (!s) return <div className="p-8 text-center text-gray-500">No task data is available yet.</div>;

  return (
    <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_256px] 2xl:grid-cols-[minmax(0,1fr)_320px] gap-4 w-full xl:items-stretch h-full">
      {/* ============ LEFT: PERFORMANCE PANEL ============ */}
      <section className={`${PANEL} p-4 sm:p-[16px] flex flex-col`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-gray-200 dark:border-slate-700 pb-4">
          <div>
            <Eyebrow className="!text-xs mb-[3px]">PERFORMANCE DASHBOARD</Eyebrow>
            <h2 className={`text-lg sm:text-xl font-bold ${INK}`}>Tổng quan hoạt động</h2>
          </div>
          
          <div className="relative z-[100]" ref={searchRef}>
            <div className="flex items-center bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
              <span className={`text-xs font-semibold px-2 ${MUTED}`}>Department:</span>
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center justify-between min-w-[140px] gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-md shadow-sm text-sm font-semibold border border-gray-200 dark:border-slate-600"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={INK}>{s.type === 'department' ? s.name : 'Chọn phòng ban'}</span>
                </div>
                <ChevronDown size={14} className={MUTED} />
              </button>
              <button onClick={() => setRange('custom')} className={`w-8 h-8 rounded-md grid place-items-center ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:hover:text-white dark:hover:bg-slate-600 transition-colors`} title="Custom date range">
                <Calendar size={15} />
              </button>
            </div>
            
            {showSearch && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                  <div className="relative">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${MUTED}`} />
                    <input 
                      type="text" autoFocus placeholder="Tìm phòng ban..." 
                      className={`w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 ${INK}`} 
                      value={search} onChange={e => setSearch(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-auto p-1">
                  {filteredDepts.length > 0 ? filteredDepts.map(d => (
                    <button 
                      key={d.id} 
                      onClick={() => { setActiveId(d.id); setShowSearch(false); setSearch(''); }} 
                      className={`w-full text-left px-3 py-2 rounded-lg flex flex-col ${d.id === activeId ? 'bg-blue-50 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <span className={`text-sm font-semibold ${INK}`}>{d.name}</span>
                    </button>
                  )) : (
                    <div className={`p-4 text-center text-sm ${MUTED}`}>Không tìm thấy phòng ban</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr] lg:grid-rows-[auto_1fr] gap-3 flex-1">
          {/* Context Spotlight */}
          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 border border-gray-100 dark:border-slate-700 rounded-2xl px-[15px] py-[17px] bg-[radial-gradient(ellipse_at_50%_28%,#f4f9ff,white_66%)] dark:bg-none dark:bg-slate-800 flex flex-col items-center justify-between text-center min-w-0">
            <div className="w-full flex items-center justify-between">
              <Eyebrow className="!text-xs !tracking-[1.6px]">{getEyebrow()}</Eyebrow>
            </div>

            <div className="flex items-center justify-center w-full my-4">
              <div
                className="relative w-[112px] h-[112px] xl:w-[124px] xl:h-[124px] 2xl:w-[160px] 2xl:h-[160px] rounded-full grid place-items-center p-[5px]"
                style={{ background: `conic-gradient(#4099e5 ${pct}%, ${trackOrbit} 0)` }}
              >
                <div className={`w-full h-full rounded-full bg-blue-50 dark:bg-slate-700 border-[6px] border-white dark:border-slate-800 grid place-items-center text-3xl 2xl:text-5xl font-bold ${INK}`}>{s.initial}</div>
                <span className="absolute bottom-0 right-1 w-[22px] h-[22px] 2xl:w-8 2xl:h-8 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-800 grid place-items-center text-white"><Check size={14} strokeWidth={3} /></span>
              </div>
            </div>

            <h3 className={`text-xl 2xl:text-2xl font-bold tracking-tight ${INK}`}>{s.name}</h3>
            <div className={`text-sm font-semibold mt-1 ${LINK}`}>{s.role}</div>
            <div className={`text-xs mt-2 ${MUTED}`}>{s.dept}</div>

            <div className="flex w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[14px] p-2 my-6 border border-white/60 dark:border-slate-700/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative">
              {[[s.open, 'Đang mở', 'open'], [s.done, 'Hoàn tất', 'done'], [s.projects, s.projectsLabel, 'projects']].map(([v, l, type]) => {
                let items: any[] = [];
                if (type === 'open') items = selectedTasks.filter(t => !isDone(t.status));
                else if (type === 'done') items = selectedTasks.filter(t => isDone(t.status));
                else if (type === 'projects') items = [{ title: `Đang có ${s.projects} ${s.projectsLabel.toLowerCase()} liên quan.`, status: 'info' }];
                
                const previewItems = items.slice(0, 5);
                const hasMore = items.length > 5;

                return (
                  <div key={l as string} className="group relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl hover:bg-white/70 dark:hover:bg-slate-800/60 hover:backdrop-blur-lg hover:shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:border hover:border-white/80 dark:hover:border-slate-700/50 border border-transparent transition-all cursor-default">
                    <strong className={`block text-xl 2xl:text-2xl font-bold ${INK}`}>{v}</strong>
                    <span className={`block text-[11px] mt-0.5 font-medium ${MUTED}`}>{l}</span>
                    
                    {/* Hover Bubble / Popover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[260px] bg-white/75 dark:bg-slate-800/75 backdrop-blur-xl saturate-150 border border-white/60 dark:border-slate-600/50 rounded-[14px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] pointer-events-none origin-bottom">
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-r border-white/60 dark:border-slate-600/50 transform rotate-45 rounded-sm"></div>
                      <div className="relative z-10 p-3 flex flex-col max-h-[300px] overflow-hidden">
                        <div className="flex items-center justify-between mb-2.5 px-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>{l}</span>
                          <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
                        </div>
                        {items.length === 0 ? (
                          <p className="text-center text-gray-400 text-xs py-4 font-medium">Không có dữ liệu</p>
                        ) : (
                          <div className="space-y-1.5 flex-1 overflow-hidden">
                            {previewItems.map((item, idx) => (
                              <div key={item.id || idx} className="px-3 py-2 rounded-xl bg-white/40 dark:bg-slate-900/40 text-left border border-white/50 dark:border-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
                                <p className={`text-xs font-semibold truncate ${INK}`}>{item.title || item.name}</p>
                                {item.status !== 'info' && <p className="text-[9px] text-gray-500 mt-0.5 uppercase font-bold tracking-wider">{item.status || 'Active'}</p>}
                              </div>
                            ))}
                            {hasMore && (
                              <p className="text-center text-[10px] text-blue-500 font-semibold pt-1 pb-0.5">
                                + {items.length - 5} mục khác...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full border-t border-gray-200 dark:border-slate-700 pt-[13px]">
              <TextButton onClick={openFilteredTasks} className={INK}>Xem chi tiết {s.total} công việc</TextButton>
            </div>
          </div>

          {/* Progress */}
          <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col`}>
            <div className="flex items-center justify-between">
              <strong className={`text-sm ${INK}`}>Tiến độ hoàn thành</strong>
              <Info size={13} className={MUTED} />
            </div>
            <div
              className="w-[108px] h-[108px] 2xl:w-[150px] 2xl:h-[150px] rounded-full mx-auto mt-[13px] mb-[9px] p-[9px] 2xl:p-[12px]"
              style={{ background: `conic-gradient(#45a894 ${pct}%, ${trackRing} 0)` }}
            >
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center">
                <strong className={`text-2xl 2xl:text-4xl leading-[1.1] tracking-tighter ${INK}`}>{pct}<small className="text-sm 2xl:text-base">%</small></strong>
                <span className="text-xs text-[#92a0b1]">hoàn thành</span>
              </div>
            </div>
            <p className={`text-center text-xs ${MUTED}`}>{s.done} / {s.total} task được giao</p>
            <div className={`flex justify-center gap-3 text-xs mt-2 ${MUTED}`}>
              <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-teal-500" />Done</span>
              <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-slate-600" />Đang mở</span>
            </div>
          </div>

          {/* Focus needed */}
          <div className={`${INNER} rounded-[14px] px-[15px] py-4 min-w-0 flex flex-col bg-[radial-gradient(ellipse_at_100%_110%,#fff1f3_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_100%_110%,rgba(176,54,75,0.18)_0%,transparent_55%)]`}>
            <div className="flex items-center justify-between">
              <strong className={`text-sm ${INK}`}>Đẩy nhanh tiến độ</strong>
              <Clock size={14} className={MUTED} />
            </div>
            <div className="mt-3 text-4xl 2xl:text-6xl leading-none font-bold text-[#b0364b] dark:text-rose-400">{s.overdue}</div>
            <span className="mt-2 self-start text-xs font-semibold text-[#b0364b] bg-red-50 dark:bg-rose-500/15 dark:text-rose-300 rounded-md px-1.5 py-0.5">task quá hạn</span>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className={MUTED}>Deadline trong 3 ngày</span><b className={INK}>{s.due3}</b></div>
              <div className="flex justify-between"><span className={MUTED}>Ưu tiên High / Urgent</span><b className={INK}>{s.urgent}</b></div>
              <div className="h-1 rounded-full bg-gray-100 dark:bg-slate-600 overflow-hidden flex">
                <i className="bg-red-500" style={{ width: `${Math.min(100, s.overdue * 10)}%` }} />
                <i className="bg-blue-500" style={{ width: `${Math.min(100, s.urgent * 5)}%` }} />
              </div>
              <div className="flex justify-between"><span className={MUTED}>Chưa có deadline</span><b className={INK}>{s.noDeadline}</b></div>
            </div>
            
          </div>

          {/* Chart */}
          <div className={`sm:col-span-2 ${INNER} rounded-[13px] px-4 pt-[15px] pb-[9px] flex flex-col min-w-0`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <strong className={`text-sm ${INK}`}>Lịch phân bổ task</strong>
                <p className={`text-xs mt-[3px] ${MUTED}`}>{s.name} · {displayDate(rangeStart)} — {displayDate(rangeEnd)}</p>
              </div>
              <div className="flex bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-0.5">
                {(['weekly', 'custom'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${range === r ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-white' : MUTED}`}
                  >
                    {r === 'weekly' ? 'Weekly' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>
            {range === 'custom' && <div className="mt-3 flex flex-wrap items-center gap-2"><input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" /><span className={`text-xs ${MUTED}`}>đến</span><input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" /></div>}
            <div className="w-full mt-3 flex-1 min-h-[120px] 2xl:min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} onClick={() => setPerformanceOpen(true)} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#38bdf8' : '#093570'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isDark ? '#38bdf8' : '#093570'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#8a9bb0', fontSize: 10 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#8a9bb0', fontSize: 10 }} />
                <Tooltip
                  cursor={{ stroke: isDark ? '#334155' : '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(v, name) => [v + ' tasks', String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                  separator=" "
                  contentStyle={{
                    fontSize: 11, borderRadius: 8,
                    background: isDark ? '#1e293b' : '#fff',
                    color: isDark ? '#e2e8f0' : '#093570',
                    border: `1px solid ${isDark ? '#334155' : '#e0eaf8'}`,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="created" stroke={isDark ? '#38bdf8' : '#093570'} fill="url(#colorCreated)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="doing" stroke="#f59e0b" fill="transparent" strokeDasharray="3 3" strokeWidth={2} />
                <Area type="monotone" dataKey="done" stroke="#45a894" fill="transparent" strokeDasharray="5 5" strokeWidth={2.5} />
              </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className={`text-center text-xs mt-1 ${MUTED}`}>Hover để xem Created, Doing, Done · Click biểu đồ để xem Performance report</p>
          </div>
          
          {/* Insight strip */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex items-center gap-[13px] border border-blue-100 dark:border-slate-700 rounded-[13px] bg-[linear-gradient(115deg,#f6faff,#fff)] dark:bg-none dark:bg-slate-700/40 px-[13px] py-4 mt-1">
            <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 grid place-items-center text-[#3a7bd5] dark:text-sky-400 shrink-0"><BarChart2 size={15} /></span>
            <div className="min-w-0">
              <strong className={`text-sm font-semibold ${INK}`}>{s.name} đang theo dõi {s.open} task chưa hoàn thành</strong>
              <p className="text-xs text-[#7e94b1] dark:text-slate-400 mt-[3px]">{s.noDeadline} task đang mở chưa có deadline. Bổ sung hạn để theo dõi chính xác.</p>
            </div>
            <button className={`ml-auto shrink-0 ${MUTED} hover:text-gray-900 dark:hover:text-white`}><ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      {/* ============ RIGHT STACK (compact) ============ */}
      <div className="flex flex-col gap-4 min-w-0 h-full">

        {/* History */}
        <section className={`${PANEL} px-4 pt-4 pb-[13px] flex flex-col flex-[3]`}>
          <div className="flex items-center justify-between mb-[9px]">
            <div>
              <Eyebrow className="!text-xs mb-[3px]">HISTORY</Eyebrow>
              <h2 className={`text-base font-bold ${INK}`}>Lịch sử hoạt động</h2>
            </div>
            <i className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </div>
          <p className={`text-xs ${MUTED}`}>Chưa có lịch sử Task</p>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <FileText size={22} className="text-[#b9c6d8] dark:text-slate-500 mb-2" />
            <h3 className={`text-sm font-bold ${INK}`}>Chưa có hoạt động</h3>
            <p className={`text-xs mt-1 ${MUTED}`}>Nguồn dữ liệu chưa có nhật ký.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 flex-[5]">
          {/* Upcoming Projects */}
          <section className={`${PANEL} px-[14px] py-[16px] flex flex-col`}>
            <div className="flex items-start justify-between gap-1.5 mb-[11px]">
              <div>
                <h2 className={`text-sm font-bold ${INK}`}>Project tới hạn</h2>
                <p className={`text-xs mt-1 ${MUTED}`}>Sắp tới deadline (5 ngày)</p>
              </div>
              <span className="text-xs font-semibold px-[5px] py-[3px] rounded-md bg-amber-50 text-[#b7791f] border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">🔥 Urgent</span>
            </div>
            <div className="space-y-3">
              {upcomingProjects.length ? upcomingProjects.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => setActiveId(p.id)} 
                  className={`w-full text-left bg-gray-50 hover:bg-blue-50 dark:bg-slate-700/30 dark:hover:bg-slate-700/80 transition-colors border ${activeId === p.id ? 'border-blue-400 dark:border-sky-500 ring-1 ring-blue-400 dark:ring-sky-500' : 'border-gray-200 dark:border-slate-700'} rounded-xl p-3`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <b className={INK}>{p.code}</b>
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold ${p.priority === 'High' ? 'bg-red-50 text-red-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-amber-50 text-[#b7791f] dark:bg-amber-500/15 dark:text-amber-300'}`}>{p.priority}</span>
                  </div>
                  <h4 className={`text-sm font-bold ${INK}`}>{p.name}</h4>
                  <div className={`text-xs mt-1 ${MUTED}`}>{p.dept}</div>
                  <div className={`flex items-center justify-between mt-3`}>
                    <div className={`flex items-center gap-1 text-xs ${MUTED}`}><Calendar size={10} className="text-[#b7791f] dark:text-amber-400" />{p.date}</div>
                    <span className="text-xs font-semibold text-rose-500">Còn {p.dueStr}</span>
                  </div>
                </button>
              )) : <p className={`text-xs ${MUTED}`}>Không có task mở có deadline.</p>}
            </div>
          </section>

          {/* TEAM accordion (OLD UI restored) */}
          <section className={`${PANEL} px-[14px] py-[16px]`}>
            <div className="flex items-center justify-between mb-[6px]">
              <h2 className={`text-sm font-bold ${INK}`}>TEAM</h2>
              <Eyebrow className="!text-xs !tracking-[.5px]">{users.length} PIC</Eyebrow>
            </div>
            <div>
              {teams.map(d => {
                const open = openDept === d.name;
                return (
                  <div key={d.name} className="border-b border-gray-200 dark:border-slate-700 last:border-0">
                    <button onClick={() => setOpenDept(open ? null : d.name)} className="w-full flex items-center justify-between py-2">
                      <span className={`text-xs font-bold ${INK}`}>{d.name} <span className={`font-normal ${MUTED}`}>({d.members.length} PIC)</span></span>
                      <ChevronDown size={13} className={`${MUTED} transition-transform duration-300 ${open ? 'rotate-180' : '-rotate-90'}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        {d.members.map(m => (
                          <button key={m.id} onClick={() => setActiveId(m.id)} className="w-full text-left flex items-center gap-2 pb-2 hover:opacity-70 transition-opacity">
                            <span className="w-[24px] h-[24px] rounded-full bg-blue-50 dark:bg-slate-700 text-[#2a6fc1] dark:text-sky-300 grid place-items-center text-xs font-bold">{m.i}</span>
                            <div className="flex-1 min-w-0">
                              <strong className={`block text-xs truncate ${LINK}`}>{m.n}</strong>
                              <small className={`block text-xs ${MUTED}`}>{m.r}</small>
                            </div>
                            <div className="text-center leading-none">
                              <b className={`block text-sm ${INK}`}>{m.open}</b>
                              <small className={`text-xs ${MUTED}`}>mở</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      <WeeklyReportDrawer isOpen={performanceOpen} onClose={() => setPerformanceOpen(false)} ownerName={s?.name || 'Performance'} userId={s?.type === 'staff' ? Number(s.id.replace('user-', '')) : undefined} weekStart={rangeStart} weekEnd={rangeEnd} tasks={periodTasks} references={selectedReferences} onOpenTask={taskId => { setPerformanceOpen(false); navigate(`/tasks?task=${taskId}`); }} />
    </div>
  );
};
