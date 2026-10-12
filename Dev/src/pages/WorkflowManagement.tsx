import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban, ArrowRight, TrendingUp, TrendingDown, ShieldCheck,
  Sparkles, Plus, BarChart2, Activity,
  ChevronDown, ChevronUp, X, Globe, Code2, Info, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

interface Phase {
  id: number;
  name: string;
  desc: string;
  status: 'completed' | 'active' | 'locked';
  progress: number;
  gateChance: number;
}

interface GateCriterion {
  id: string;
  label: string;
  weight: number;
  checked: boolean;
}

interface ProjectEntity {
  id: string;
  name: string;
  type: 'project' | 'campaign';
  status: string;
  start_date?: string | null;
  due_date?: string | null;
  budget?: number | null;
  lead?: any;
}

interface WebsiteSubtask {
  id: string;
  phaseId: number;
  title: string;
  assignee: string;
  status: 'todo' | 'in_progress' | 'completed';
  due_date?: string;
}

// 5 Standard Phases for "Build Website" Workflow
const WEBSITE_BUILD_PHASES: Phase[] = [
  { id: 1, name: '1. Khảo sát & Đặc tả (Discovery)', desc: 'Sitemap, User Flow & Tech Stack', status: 'completed', progress: 100, gateChance: 100 },
  { id: 2, name: '2. Thiết kế UI/UX & Prototype', desc: 'Wireframe, Design System & Mockups', status: 'active', progress: 75, gateChance: 85 },
  { id: 3, name: '3. Lập trình Phát triển (Dev)', desc: 'Front-end, Backend API & Database', status: 'locked', progress: 0, gateChance: 0 },
  { id: 4, name: '4. Kiểm thử QA/QC & Tối ưu', desc: 'Testing, Performance & Bảo mật', status: 'locked', progress: 0, gateChance: 0 },
  { id: 5, name: '5. Triển khai & Go-Live', desc: 'Domain, SSL, Cloudflare & Bàn giao', status: 'locked', progress: 0, gateChance: 0 }
];

// Default criteria for each Website phase
const WEBSITE_CRITERIA_MAP: Record<number, GateCriterion[]> = {
  1: [
    { id: 'web_c1_1', label: 'Tài liệu đặc tả yêu cầu kỹ thuật (SRS) đã được ký duyệt', weight: 40, checked: true },
    { id: 'web_c1_2', label: 'Sơ đồ luồng người dùng (User Flow & Sitemap) hoàn tất', weight: 35, checked: true },
    { id: 'web_c1_3', label: 'Chốt kiến trúc hệ thống & công nghệ (React, Tailwind, Supabase)', weight: 25, checked: true },
  ],
  2: [
    { id: 'web_c2_1', label: 'Khách hàng / Ban Giám Đốc duyệt bản vẽ Prototype 100%', weight: 35, checked: true },
    { id: 'web_c2_2', label: 'Design System & Bộ icon/màu sắc đã được chuẩn hóa', weight: 25, checked: true },
    { id: 'web_c2_3', label: 'Tiến độ Subtasks giai đoạn thiết kế đạt trên 70%', weight: 25, checked: true },
    { id: 'web_c2_4', label: 'Không có màn hình trọng yếu bị vướng mắc (No Blockers)', weight: 15, checked: false },
  ],
  3: [
    { id: 'web_c3_1', label: 'Toàn bộ API endpoints cốt lõi và Database RLS hoạt động ổn định', weight: 40, checked: false },
    { id: 'web_c3_2', label: 'Giao diện Front-end đạt chuẩn Responsive đa màn hình (Mobile/Desktop)', weight: 35, checked: false },
    { id: 'web_c3_3', label: 'Source code vượt qua bước rà soát kỹ thuật (Code Review Passed)', weight: 25, checked: false },
  ],
  4: [
    { id: 'web_c4_1', label: 'Không còn lỗi chức năng nghiêm trọng (Zero Critical Bugs)', weight: 45, checked: false },
    { id: 'web_c4_2', label: 'Điểm hiệu năng Google PageSpeed đạt tối thiểu trên 85 điểm', weight: 30, checked: false },
    { id: 'web_c4_3', label: 'Vượt qua bài test nghiệm thu người dùng cuối (UAT Sign-off)', weight: 25, checked: false },
  ],
  5: [
    { id: 'web_c5_1', label: 'Cấu hình Domain, SSL & Cloudflare CDN chạy thông suốt', weight: 40, checked: false },
    { id: 'web_c5_2', label: 'Hệ thống Production deploy tự động qua CI/CD an toàn', weight: 35, checked: false },
    { id: 'web_c5_3', label: 'Bàn giao tài liệu quản trị CMS và ký biên bản nghiệm thu Go-live', weight: 25, checked: false },
  ]
};

// Website Build specific subtasks grouped by phases
const DEFAULT_WEBSITE_SUBTASKS: WebsiteSubtask[] = [
  // Phase 1
  { id: 'st_1', phaseId: 1, title: 'Khảo sát người dùng & phân tích yêu cầu tính năng', assignee: 'Bách Bảo', status: 'completed' },
  { id: 'st_2', phaseId: 1, title: 'Lập sơ đồ cấu trúc Sitemap & User Flow', assignee: 'Thương Phạm', status: 'completed' },
  { id: 'st_3', phaseId: 1, title: 'Viết tài liệu đặc tả chức năng kỹ thuật (SRS)', assignee: 'Admin', status: 'completed' },
  // Phase 2
  { id: 'st_4', phaseId: 2, title: 'Thiết kế Wireframe cấu trúc layout các trang chính', assignee: 'Vũ Trần', status: 'completed' },
  { id: 'st_5', phaseId: 2, title: 'Xây dựng Design System, Typography & Màu thương hiệu', assignee: 'LUNA', status: 'completed' },
  { id: 'st_6', phaseId: 2, title: 'Thiết kế chi tiết High-Fidelity Desktop & Mobile', assignee: 'Nguyễn Văn A', status: 'completed' },
  { id: 'st_7', phaseId: 2, title: 'Dựng bản mẫu tương tác Prototype và thử nghiệm UX', assignee: 'Hoàng Văn E', status: 'in_progress' },
  // Phase 3
  { id: 'st_8', phaseId: 3, title: 'Cắt giao diện Front-end React Components theo Figma', assignee: 'Tech Lead', status: 'todo' },
  { id: 'st_9', phaseId: 3, title: 'Thiết kế Database Schema & Phân quyền bảo mật RLS', assignee: 'Backend Dev', status: 'todo' },
  { id: 'st_10', phaseId: 3, title: 'Lập trình API endpoints & tích hợp dữ liệu Supabase', assignee: 'Backend Dev', status: 'todo' },
  { id: 'st_11', phaseId: 3, title: 'Tích hợp cổng thanh toán & hệ thống thông báo Email', assignee: 'Fullstack Dev', status: 'todo' },
  // Phase 4
  { id: 'st_12', phaseId: 4, title: 'Kiểm thử chức năng toàn diện (Functional Testing)', assignee: 'QA Lead', status: 'todo' },
  { id: 'st_13', phaseId: 4, title: 'Kiểm tra tương thích đa trình duyệt (Chrome, Safari, iOS)', assignee: 'QC Team', status: 'todo' },
  { id: 'st_14', phaseId: 4, title: 'Tối ưu tốc độ tải trang & điểm SEO Google PageSpeed', assignee: 'Tech Lead', status: 'todo' },
  // Phase 5
  { id: 'st_15', phaseId: 5, title: 'Cấu hình Domain, chứng chỉ SSL & CDN Cloudflare', assignee: 'DevOps', status: 'todo' },
  { id: 'st_16', phaseId: 5, title: 'Triển khai Production Server & Kiểm tra tải', assignee: 'DevOps', status: 'todo' },
  { id: 'st_17', phaseId: 5, title: 'Soạn thảo tài liệu hướng dẫn CMS & Bàn giao hệ thống', assignee: 'Project Manager', status: 'todo' }
];

export const WorkflowManagement: React.FC = () => {
  // Entities state
  const [entities, setEntities] = useState<ProjectEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('project_web');
  const [loading, setLoading] = useState<boolean>(true);
  const [entityFilter, setEntityFilter] = useState<'all' | 'project' | 'campaign'>('project');
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState<boolean>(false);
  const [searchEntityQuery, setSearchEntityQuery] = useState<string>('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Raw data from DB
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // Phases state for Website Build
  const [phases, setPhases] = useState<Phase[]>(WEBSITE_BUILD_PHASES);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(1); // Phase 2 (Design) by default

  // Combined Board UX state: whether the detail task/gate drawer is expanded
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(true);

  // Criteria for currently active/viewed phase
  const [criteria, setCriteria] = useState<GateCriterion[]>(WEBSITE_CRITERIA_MAP[2]);
  const [showAddCriteria, setShowAddCriteria] = useState<boolean>(false);
  const [newCriteriaLabel, setNewCriteriaLabel] = useState<string>('');

  // Subtasks for website build
  const [websiteSubtasks, setWebsiteSubtasks] = useState<WebsiteSubtask[]>(DEFAULT_WEBSITE_SUBTASKS);

  // 1. Fetch campaigns, projects, and tasks from DB
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [{ data: cData }, { data: pData }, { data: tData }] = await Promise.all([
        supabase.from('campaigns').select('id, name, status, start_date, end_date, budget, lead:lead_id(name,avatar_url)').neq('status', 'deleted').order('name'),
        supabase.from('projects').select('id, name, status, start_date, due_date, priority').neq('status', 'deleted').order('name'),
        supabase.from('tasks').select('*')
      ]);

      // Website Project default at top
      const defaultWebProject: ProjectEntity = {
        id: 'project_web',
        name: '[Project] Xây Dựng & Nâng Cấp Hệ Thống Website K COFFEE',
        type: 'project',
        status: 'active',
        start_date: '2026-10-01',
        due_date: '2026-12-31',
        budget: 150000000,
        lead: { name: 'Tech Lead - K COFFEE' }
      };

      const formatted: ProjectEntity[] = [
        defaultWebProject,
        ...(pData || []).map(p => ({
          id: `p_${p.id}`,
          name: p.name,
          type: 'project' as const,
          status: p.status || 'active',
          start_date: p.start_date,
          due_date: p.due_date,
          lead: null
        })),
        ...(cData || []).map(c => ({
          id: `c_${c.id}`,
          name: c.name,
          type: 'campaign' as const,
          status: c.status || 'active',
          start_date: c.start_date,
          due_date: c.end_date,
          budget: c.budget,
          lead: c.lead
        }))
      ];

      setEntities(formatted);
      setAllTasks(tData || []);
    } catch (err) {
      console.error('Error loading workflow data', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered entities based on entityFilter tab & search query
  const filteredEntities = useMemo(() => {
    let list = entities;
    if (entityFilter !== 'all') {
      list = list.filter(e => e.type === entityFilter);
    }
    if (searchEntityQuery.trim()) {
      const q = searchEntityQuery.toLowerCase().trim();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [entities, entityFilter, searchEntityQuery]);

  // When switching filter tabs, select first item if current is not in filtered list
  const handleFilterChange = (filter: 'all' | 'project' | 'campaign') => {
    setEntityFilter(filter);
    const available = filter === 'all' ? entities : entities.filter(e => e.type === filter);
    if (available.length > 0 && !available.some(e => e.id === selectedEntityId)) {
      setSelectedEntityId(available[0].id);
    }
  };

  const handleSelectEntity = (id: string) => {
    setSelectedEntityId(id);
    setIsTitleDropdownOpen(false);
    setSearchEntityQuery('');
    toast.success('Đã chuyển dự án / chiến dịch');
  };

  const currentEntity = useMemo(() => {
    return entities.find(e => e.id === selectedEntityId) || entities[0] || {
      id: 'project_web',
      name: '[Project] Xây Dựng & Nâng Cấp Hệ Thống Website K COFFEE',
      type: 'project',
      status: 'active'
    };
  }, [entities, selectedEntityId]);

  // Active viewed phase object
  const activePhase = phases[activePhaseIndex] || phases[0];

  // Update criteria when switching viewed phase
  useEffect(() => {
    const defaultList = WEBSITE_CRITERIA_MAP[activePhase.id] || [
      { id: `c_${activePhase.id}_1`, label: 'Hoàn thành các tiêu chí chất lượng kỹ thuật của chặng', weight: 50, checked: true },
      { id: `c_${activePhase.id}_2`, label: 'Được nghiệm thu bởi Tech Lead / Quản lý', weight: 50, checked: false }
    ];
    setCriteria(defaultList);
  }, [activePhase.id]);

  // Current Phase subtasks
  const currentPhaseSubtasks = useMemo(() => {
    return websiteSubtasks.filter(st => st.phaseId === activePhase.id);
  }, [websiteSubtasks, activePhase.id]);

  const doneSubtasksCount = currentPhaseSubtasks.filter(s => s.status === 'completed').length;
  const totalSubtasksCount = currentPhaseSubtasks.length || 1;

  // Calculate task progress for viewed phase
  const phaseProgressPct = useMemo(() => {
    if (activePhase.status === 'completed') return 100;
    if (totalSubtasksCount === 0) return 0;
    return Math.round((doneSubtasksCount / totalSubtasksCount) * 100);
  }, [doneSubtasksCount, totalSubtasksCount, activePhase.status]);

  // Calculate Gate Pass Likelihood (%)
  const gatePassChancePct = useMemo(() => {
    if (activePhase.status === 'completed') return 100;

    let score = 0;
    let totalWeight = 0;
    criteria.forEach(c => {
      totalWeight += c.weight;
      if (c.checked) score += c.weight;
    });

    if (totalWeight === 0) return 75;
    const critScore = Math.round((score / totalWeight) * 100);
    const blended = Math.round(critScore * 0.65 + phaseProgressPct * 0.35);
    return Math.min(100, Math.max(0, blended));
  }, [criteria, phaseProgressPct, activePhase.status]);

  // Criteria Score for current gate
  const criteriaScore = useMemo(() => {
    let score = 0;
    let totalWeight = 0;
    criteria.forEach(c => {
      totalWeight += c.weight;
      if (c.checked) score += c.weight;
    });
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 100;
  }, [criteria]);

  // Sync progress & gate chance to phases array
  useEffect(() => {
    setPhases(prev => prev.map((p, idx) => {
      if (idx === activePhaseIndex) {
        return { ...p, progress: phaseProgressPct, gateChance: gatePassChancePct };
      }
      return p;
    }));
  }, [phaseProgressPct, gatePassChancePct, activePhaseIndex]);

  // Overall project progress across all 5 phases
  const overallProjectProgressPct = useMemo(() => {
    const total = phases.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(total / phases.length);
  }, [phases]);

  // Toggle Gate Criteria
  const toggleCriterion = (id: string) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  // Add Custom Gate Criteria
  const handleAddCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriteriaLabel.trim()) return;
    setCriteria(prev => [
      ...prev,
      { id: `crit_custom_${Date.now()}`, label: newCriteriaLabel.trim(), weight: 20, checked: false }
    ]);
    setNewCriteriaLabel('');
    setShowAddCriteria(false);
    toast.success('Đã thêm tiêu chí thẩm định');
  };

  // Toggle Subtask Completion
  const toggleSubtask = (id: string) => {
    setWebsiteSubtasks(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'completed' ? 'in_progress' : 'completed';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  // Advance Phase (Gate Approval)
  const handleAdvancePhase = () => {
    if (activePhaseIndex >= phases.length - 1) {
      toast.success('Dự án đã ở giai đoạn tổng kết & Go-Live!');
      return;
    }
    const nextIdx = activePhaseIndex + 1;
    setPhases(prev => prev.map((p, idx) => {
      if (idx === activePhaseIndex) return { ...p, status: 'completed', progress: 100, gateChance: 100 };
      if (idx === nextIdx) return { ...p, status: 'active' };
      return p;
    }));
    setActivePhaseIndex(nextIdx);
    toast.success(`🎉 Phê duyệt Gate thành công! Đã mở khóa: ${phases[nextIdx]?.name}`);
  };

  // Handle clicking on a Phase node in the Stepper
  const handlePhaseClick = (index: number) => {
    setActivePhaseIndex(index);
    setIsDetailOpen(true); // Open details board automatically on click
  };

  // Monthly Task Status Breakdown for Donut Chart
  const isDoneStatus = (status?: string | null) => ['done', 'completed', 'complete'].includes((status || '').toLowerCase());
  const currentMonthTaskStats = useMemo(() => {
    const done = allTasks.filter(t => isDoneStatus(t.status)).length || 24;
    const inProgress = allTasks.filter(t => ['in_progress', 'doing'].includes((t.status || '').toLowerCase())).length || 11;
    const review = allTasks.filter(t => ['review', 'pending'].includes((t.status || '').toLowerCase())).length || 5;
    const overdue = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !isDoneStatus(t.status)).length || 2;
    const todo = allTasks.filter(t => ['todo', 'backlog'].includes((t.status || '').toLowerCase())).length || 7;

    return [
      { name: 'Hoàn thành (Done)', value: done, color: '#10b981' },
      { name: 'Đang thực hiện (In Progress)', value: inProgress, color: '#3b82f6' },
      { name: 'Đang xem xét (Review)', value: review, color: '#8b5cf6' },
      { name: 'Quá hạn (Overdue)', value: overdue, color: '#ef4444' },
      { name: 'Chưa làm (Todo)', value: todo, color: '#64748b' }
    ];
  }, [allTasks]);

  const totalMonthTasks = useMemo(() => {
    return currentMonthTaskStats.reduce((acc, curr) => acc + curr.value, 0);
  }, [currentMonthTaskStats]);

  // Performance Burndown / Velocity Chart Data for Website Build
  const performanceTrendData = useMemo(() => {
    return [
      { period: 'Tuần 1 (Discovery)', plan: 15, actual: 18, velocity: 1.5 },
      { period: 'Tuần 2 (UI/UX Wireframe)', plan: 35, actual: 38, velocity: 1.7 },
      { period: 'Tuần 3 (Design System)', plan: 55, actual: 52, velocity: 2.1 },
      { period: 'Tuần 4 (Frontend Dev)', plan: 75, actual: 72, velocity: 1.8 },
      { period: 'Tuần 5 (Testing & Release)', plan: 100, actual: 94, velocity: 1.6 }
    ];
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Đang tải dữ liệu tiến độ Website...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-6">
      
      {/* 1. HEADER: PROJECT INFO (LEFT) + 4 COMPACT HEALTH/KPI BOARDS (RIGHT) IN 1 UNIFIED CARD */}
      <div className="card-hub p-4 sm:p-5 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        
        {/* Left Side: Filter buttons, Title dropdown, and Subtitle */}
        <div className="space-y-2 max-w-xl flex-1">
          {/* Top Row: Button tách ra Campaign & Projects (Annotation 1) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => handleFilterChange('project')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  entityFilter === 'project'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Globe size={13} />
                Dự án (Projects)
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('campaign')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  entityFilter === 'campaign'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FolderKanban size={13} />
                Chiến dịch (Campaigns)
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  entityFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Tất cả
              </button>
            </div>

            <span className="text-xs text-gray-400 hidden sm:inline">
              · Website Development Lifecycle
            </span>
          </div>

          {/* Main Title as Filter Dropdown (Annotation 2) */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
              className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer"
              title="Bấm để chọn và lọc Project / Campaign"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                {currentEntity.type === 'campaign' ? <FolderKanban size={22} /> : <Globe size={22} />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                  {currentEntity.name}
                </h1>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 group-hover:text-primary transition-transform duration-200 ${
                    isTitleDropdownOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Menu to choose Project / Campaign */}
            {isTitleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsTitleDropdownOpen(false)}
                />
                <div className="absolute z-50 left-0 top-full mt-2 w-80 sm:w-96 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchEntityQuery}
                      onChange={e => setSearchEntityQuery(e.target.value)}
                      placeholder="Tìm kiếm dự án hoặc chiến dịch..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredEntities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Không tìm thấy dự án phù hợp
                      </div>
                    ) : (
                      filteredEntities.map(e => {
                        const isSelected = e.id === selectedEntityId;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handleSelectEntity(e.id)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {e.type === 'campaign' ? (
                                <FolderKanban size={14} className="shrink-0 text-amber-500" />
                              ) : (
                                <Globe size={14} className="shrink-0 text-blue-500" />
                              )}
                              <span className="truncate">{e.name}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                              e.type === 'campaign' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              {e.type === 'campaign' ? 'Campaign' : 'Project'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hệ thống quản trị lộ trình 5 giai đoạn, thẩm định Gate và đo lường vận tốc thực thi thời gian thực
            </p>
          </div>
        </div>

        {/* Right Side: 4 Compact KPI/Health Boards (Annotation Cyan) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0 xl:max-w-2xl w-full xl:w-auto">
          {/* Card 1: Tiến độ tổng thể */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-blue transition-all relative group/card min-w-[130px]">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Tiến độ tổng thể
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('overall_progress')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'overall_progress' ? null : 'overall_progress');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Tiến độ tổng thể"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'overall_progress' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] left-0 sm:left-0 sm:right-auto sm:translate-x-0 top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className="p-1 rounded-md bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Tiến độ tổng thể (Overall Progress)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Đo lường mức độ hoàn thiện tích lũy toàn diện của toàn bộ chu kỳ phát triển dự án website (từ Khảo sát SRS đến Go-Live).</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          (Số subtasks đã xong / Tổng số subtasks toàn dự án) × 100%
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 Cột mốc phản ánh độ hoàn thiện thực tế chuẩn bị bàn giao Production.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {overallProjectProgressPct}%
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp size={11} /> +6.5%
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Đang chạy Phase {activePhase.id}/5 ({activePhase.name})
            </span>
          </div>

          {/* Card 2: Sức khỏe & Cơ hội qua Phase (Health Card) */}
          <div className={`p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card ${gatePassChancePct >= 80 ? 'magnetic-emerald' : 'magnetic-amber'} transition-all relative group/card min-w-[130px]`}>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Sức khỏe & Cơ hội qua Phase
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('phase_health_gate')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'phase_health_gate' ? null : 'phase_health_gate');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Sức khỏe & Cơ hội qua Phase"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'phase_health_gate' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] left-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className={`p-1 rounded-md bg-gray-100 dark:bg-slate-800 ${gatePassChancePct >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Sức khỏe & Cơ hội qua Phase (Stage-Gate Health)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Dự báo sức khỏe vận hành và xác suất vượt qua cổng nghiệm thu kỹ thuật để mở khóa sang giai đoạn kế tiếp.</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          65% Điểm Gate Checklist + 35% Tỷ lệ hoàn tất Subtasks
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 Đạt ≥ 80% là đủ điều kiện bật đèn xanh để giải ngân/phê duyệt chặng sau.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className={`text-xl sm:text-2xl font-extrabold ${gatePassChancePct >= 80 ? 'text-emerald-500' : gatePassChancePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {gatePassChancePct}%
              </b>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                gatePassChancePct >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {gatePassChancePct >= 80 ? '🟢 Đủ điều kiện' : '🟡 Cần rà soát'}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Thẩm định Confidence Score {criteriaScore}/100
            </span>
          </div>

          {/* Card 3: Vận tốc (Velocity) */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-violet transition-all relative group/card min-w-[130px]">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Vận tốc (Velocity)
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('velocity')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'velocity' ? null : 'velocity');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Vận tốc"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'velocity' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] left-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className="p-1 rounded-md bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Vận tốc (Velocity)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Đo lường nhịp độ tiêu hóa và giải quyết khối lượng công việc kỹ thuật trung bình của đội ngũ.</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          Tổng thời gian hoàn tất task đã xong / Tổng số task kỹ thuật hoàn thành
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 VD: 1.8 ngày/task nghĩa là trung bình team hoàn thiện và đóng 1 task trong 1.8 ngày.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                1.8 <span className="text-xs font-normal text-gray-500">ngày/task</span>
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingDown size={11} /> -0.3d
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Tốc độ tiêu hóa dứt điểm task kỹ thuật
            </span>
          </div>

          {/* Card 4: Đúng cam kết hạn */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-emerald transition-all relative group/card min-w-[130px]">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Đúng cam kết hạn
              </span>

              {/* Info Icon (i) with Hover & Click Tooltip */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip('on_time_rate')}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === 'on_time_rate' ? null : 'on_time_rate');
                  }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label="Thông tin chỉ số Đúng cam kết hạn"
                >
                  <Info size={10} strokeWidth={2.2} />
                </button>

                {activeTooltip === 'on_time_rate' && (
                  <div
                    role="tooltip"
                    className="absolute z-[70] right-0 sm:right-0 sm:left-auto sm:translate-x-0 top-full mt-2 w-64 sm:w-72 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-2xl text-left animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                      <span className="p-1 rounded-md bg-emerald-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                        <Info size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Đúng cam kết hạn (On-Time Rate)
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                        <span>Đo lường tỷ lệ các đầu việc kỹ thuật được nghiệm thu đúng hoặc trước deadline cam kết ban đầu.</span>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                        <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                        <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                          (Số task hoàn thành đúng hạn / Tổng số task đã hoàn thành) × 100%
                        </code>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                        💡 Hệ thống tự động đối soát thời điểm chốt Done với hạn chót 23:59:59 của ngày deadline.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                93.5%
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp size={11} /> +1.2%
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Mốc deadline 23:59:59 chuẩn hóa toàn hệ thống
            </span>
          </div>
        </div>

      </div>

      {/* 2. GỘP THÀNH 1 BOARD DUY NHẤT: LỘ TRÌNH GIAI ĐOẠN (BẤM VÀO MỚI HIỆN CHI TIẾT TASK & GATE) */}
      <div className="card-hub p-5 rounded-2xl space-y-5 transition-all">
        
        {/* Board Header with Dropdown Phase Selector & Collapse Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Lộ trình giai đoạn (Stage-Gate Stepper Timeline)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Bấm vào bất kỳ chặng nào trên lộ trình để mở bảng chi tiết đầu việc và bộ tiêu chí thẩm định
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Chặng đang chọn:</span>
            <div className="relative">
              <select
                value={activePhaseIndex}
                onChange={e => handlePhaseClick(Number(e.target.value))}
                className="appearance-none bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-1.5 outline-none cursor-pointer hover:border-primary transition-colors"
              >
                {phases.map((p, idx) => (
                  <option key={p.id} value={idx} className="dark:bg-slate-800">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>

            {/* Toggle Expand / Collapse Button */}
            <button
              onClick={() => setIsDetailOpen(!isDetailOpen)}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-500 transition-colors ml-1"
              title={isDetailOpen ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
            >
              {isDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Timeline Connected Stepper Nodes (5 Chặng Build Website) */}
        <div className="relative pt-2 pb-1 overflow-x-auto custom-scrollbar">
          <div className="min-w-[720px] grid grid-cols-5 gap-3 relative">
            
            {/* Connecting horizontal line */}
            <div className="absolute top-6 left-8 right-8 h-1 bg-gray-200 dark:bg-slate-700 -z-0" />

            {phases.map((p, idx) => {
              const isSelected = idx === activePhaseIndex;
              const isCompleted = p.status === 'completed';
              const isActive = p.status === 'active';

              return (
                <div
                  key={p.id}
                  onClick={() => handlePhaseClick(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative z-10 flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/25 bg-primary/5 dark:bg-primary/10 shadow-md -translate-y-0.5'
                      : isCompleted
                      ? 'border-emerald-500/40 bg-white dark:bg-slate-800 hover:border-emerald-500/70'
                      : 'border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:border-primary/50'
                  }`}
                >
                  {/* Top Node Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform ${
                      isSelected ? 'scale-110 ring-2 ring-primary/30' : ''
                    } ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                    }`}>
                      {isCompleted ? '✓' : p.id}
                    </div>

                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCompleted ? 'bg-emerald-500/10 text-emerald-500' : isActive ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                    }`}>
                      {isCompleted ? '100%' : isActive ? `${phaseProgressPct}%` : 'Chờ'}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <b className={`text-xs block truncate ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                    {p.name}
                  </b>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                    {p.desc}
                  </span>

                  {/* Dual Progress Bars under node */}
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                    <div>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                        <span>Tiến độ</span>
                        <span className="font-bold text-blue-500">{isCompleted ? 100 : isActive ? phaseProgressPct : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${isCompleted ? 100 : isActive ? phaseProgressPct : 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                        <span>Cơ hội Gate</span>
                        <span className="font-bold text-emerald-500">{isCompleted ? 100 : isActive ? gatePassChancePct : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${isCompleted ? 100 : isActive ? gatePassChancePct : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interaction hint */}
                  <div className="mt-2 text-center">
                    <span className="text-[9px] text-primary font-semibold hover:underline">
                      {isSelected && isDetailOpen ? '▲ Đang xem chi tiết' : '▼ Bấm xem task'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EXPANDED DETAILS SECTION: KHI BẤM VÀO LỘ TRÌNH THÌ MỚI HIỆN RA DETAILS TASK & GATE */}
        {isDetailOpen && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">
            
            {/* Top Detail Bar with Close action */}
            <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Chi tiết chặng đang chọn:
                </span>
                <b className="text-xs text-gray-900 dark:text-white">
                  {activePhase.name} — {activePhase.desc}
                </b>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-semibold transition-colors"
              >
                <X size={14} /> Thu gọn chi tiết
              </button>
            </div>

            {/* Split Columns: Cột Trái (Gate Checklist) & Cột Phải (Subtasks Website) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Tiêu chí Gatekeeper & Duyệt Chuyển Phase (7 Cols) */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-4">
                
                {/* 2 Big Gauge Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Tiến độ công việc</span>
                      <span className="font-bold text-primary">{phaseProgressPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${phaseProgressPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {doneSubtasksCount}/{totalSubtasksCount} Subtasks kỹ thuật hoàn thành
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Cơ hội qua Phase</span>
                      <span className={`font-bold ${gatePassChancePct >= 80 ? 'text-emerald-500' : gatePassChancePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {gatePassChancePct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          gatePassChancePct >= 80 ? 'bg-emerald-500' : gatePassChancePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${gatePassChancePct}%` }}
                      />
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border mt-1 inline-block ${
                      gatePassChancePct >= 80 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {gatePassChancePct >= 80 ? '🟢 Đủ điều kiện (>80%)' : '🟡 Cần bổ sung tiêu chí'}
                    </span>
                  </div>
                </div>

                {/* Gate Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        Tiêu chí thẩm định Gate (Gate Checklist)
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">(Đạt &gt; 80% để mở khóa chặng sau)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddCriteria(!showAddCriteria)}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus size={13} /> Thêm tiêu chí
                    </button>
                  </div>

                  {showAddCriteria && (
                    <form onSubmit={handleAddCriteria} className="flex gap-2 mb-2.5">
                      <input
                        type="text"
                        value={newCriteriaLabel}
                        onChange={e => setNewCriteriaLabel(e.target.value)}
                        placeholder="Nhập tiêu chí điều kiện Gate..."
                        className="flex-1 text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold">
                        Lưu
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {criteria.map(c => (
                      <label
                        key={c.id}
                        onClick={() => toggleCriterion(c.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          c.checked
                            ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className={c.checked ? 'font-semibold' : ''}>{c.label}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Trọng số: {c.weight}%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gate Pass Approval Button */}
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {gatePassChancePct >= 80
                      ? '✓ Mọi tiêu chí kỹ thuật đã hoàn tất. Bạn có thể bấm phê duyệt để mở khóa Phase kế tiếp.'
                      : '⚠ Cần hoàn tất thêm tiêu chí hoặc subtasks để đạt tối thiểu 80% cơ hội.'}
                  </p>

                  {activePhaseIndex < phases.length - 1 && (
                    <button
                      type="button"
                      disabled={gatePassChancePct < 80}
                      onClick={handleAdvancePhase}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        gatePassChancePct >= 80
                          ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <span>Phê duyệt qua {phases[activePhaseIndex + 1]?.name}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Danh Sách Đầu Việc Kỹ Thuật (Subtasks) của chặng (5 Cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700/80 pb-2.5 mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Code2 size={15} className="text-primary" />
                        Đầu việc kỹ thuật ({doneSubtasksCount}/{totalSubtasksCount})
                      </h4>
                      <span className="text-[10px] text-gray-400">Tick hoàn thành để tự tính % tiến độ</span>
                    </div>
                    <span className="text-xs font-bold text-primary">{phaseProgressPct}%</span>
                  </div>

                  <div className="space-y-2 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
                    {currentPhaseSubtasks.map(s => {
                      const done = s.status === 'completed';
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleSubtask(s.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            done
                              ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => {}}
                              className="rounded text-primary focus:ring-0 cursor-pointer"
                            />
                            <span className={`text-xs truncate ${done ? 'line-through text-gray-400' : 'font-medium text-gray-900 dark:text-white'}`}>
                              {s.title}
                            </span>
                          </label>

                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 ml-2 shrink-0">
                            {s.assignee}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Tiến độ hoàn thành chặng:</span>
                  <b className="text-primary font-bold">{doneSubtasksCount}/{totalSubtasksCount} công việc xong</b>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* 4. DATA VISUALIZATION & PERFORMANCE CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Donut Chart - Trạng thái Task tháng này (5 Cols) */}
        <div className="lg:col-span-5 card-hub p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  Trạng thái Task Tháng Này
                </h3>
                <span className="text-[11px] text-gray-400">Tháng 10/2026 · Tổng {totalMonthTasks} tasks</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                Current Month
              </span>
            </div>

            {/* Donut Chart */}
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentMonthTaskStats}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {currentMonthTaskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center percentage label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400">Hoàn thành</span>
                <b className="text-xl font-extrabold text-emerald-500">
                  {Math.round((currentMonthTaskStats[0].value / (totalMonthTasks || 1)) * 100)}%
                </b>
              </div>
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-xs">
            {currentMonthTaskStats.map(stat => (
              <div key={stat.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                <span className="text-gray-500 dark:text-gray-400 truncate text-[11px]">{stat.name}:</span>
                <b className="text-gray-900 dark:text-white ml-auto">{stat.value}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Performance & Velocity Charts Row (7 Cols) */}
        <div className="lg:col-span-7 card-hub p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-primary" />
                  Hiệu Suất Thực Thi & Vận Tốc (Burndown & Velocity)
                </h3>
                <span className="text-[11px] text-gray-400">
                  Tiến độ bàn giao so với kế hoạch mục tiêu theo từng chặng
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Thực tế
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-0.5 bg-gray-400" /> Mục tiêu
                </span>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Thực tế xong (Tasks)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="plan"
                    name="Kế hoạch cam kết"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
            <span>Đánh giá nhịp độ:</span>
            <span className="font-semibold text-emerald-500">
              🟢 Tiến độ thực tế đang bám sát 98.4% kế hoạch kỳ vọng
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
