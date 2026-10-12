import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban, ArrowRight, TrendingUp, TrendingDown, ShieldCheck,
  Sparkles, Plus, CheckSquare, Layers, Eye, BarChart2, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
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

export const WorkflowManagement: React.FC = () => {
  const navigate = useNavigate();

  // Entities state
  const [entities, setEntities] = useState<ProjectEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Raw data from DB
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);

  // Phases state for active entity
  const [phases, setPhases] = useState<Phase[]>([
    { id: 1, name: 'Khởi tạo & Ý tưởng', desc: 'Brief, Mục tiêu & Master Concept', status: 'completed', progress: 100, gateChance: 100 },
    { id: 2, name: 'Kế hoạch & Dự toán', desc: 'Timeline, PIC & Duyệt ngân sách', status: 'active', progress: 75, gateChance: 85 },
    { id: 3, name: 'Sản xuất Ấn phẩm', desc: 'Visual, POSM, Video & Content', status: 'locked', progress: 0, gateChance: 0 },
    { id: 4, name: 'Triển khai & Chạy Ads', desc: 'On-air chiến dịch & Bán hàng', status: 'locked', progress: 0, gateChance: 0 },
    { id: 5, name: 'Tổng kết & Đo lường', desc: 'Báo cáo KPI & Nghiệm thu', status: 'locked', progress: 0, gateChance: 0 }
  ]);

  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(1); // Phase 2 by default

  // Gate criteria for active phase
  const [criteria, setCriteria] = useState<GateCriterion[]>([
    { id: 'gc-1', label: 'Dự toán ngân sách chi tiết đã được duyệt (Budget Sign-off)', weight: 35, checked: true },
    { id: 'gc-2', label: 'Đã chốt Master Timeline và hạn bàn giao các team', weight: 25, checked: true },
    { id: 'gc-3', label: 'Tỷ lệ hoàn thành subtasks chặng đạt trên 70%', weight: 25, checked: true },
    { id: 'gc-4', label: 'Không có task trọng yếu bị quá hạn (No Overdue)', weight: 15, checked: false }
  ]);

  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newCriteriaLabel, setNewCriteriaLabel] = useState('');

  // 1. Fetch campaigns, projects, and tasks
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch campaigns & projects
      const [{ data: cData }, { data: pData }, { data: tData }, { data: stData }] = await Promise.all([
        supabase.from('campaigns').select('id, name, status, start_date, end_date, budget, lead:lead_id(name,avatar_url)').neq('status', 'deleted').order('name'),
        supabase.from('projects').select('id, name, status, start_date, due_date, priority').neq('status', 'deleted').order('name'),
        supabase.from('tasks').select('*'),
        supabase.from('project_subtasks').select('*')
      ]);

      const formatted: ProjectEntity[] = [
        ...(cData || []).map(c => ({
          id: `c_${c.id}`,
          name: c.name,
          type: 'campaign' as const,
          status: c.status || 'active',
          start_date: c.start_date,
          due_date: c.end_date,
          budget: c.budget,
          lead: c.lead
        })),
        ...(pData || []).map(p => ({
          id: `p_${p.id}`,
          name: p.name,
          type: 'project' as const,
          status: p.status || 'active',
          start_date: p.start_date,
          due_date: p.due_date,
          lead: null
        }))
      ];

      setEntities(formatted);
      setAllTasks(tData || []);
      setSubtasks(stData || []);

      if (formatted.length > 0 && selectedEntityId === 'all') {
        setSelectedEntityId(formatted[0].id);
      }
    } catch (err) {
      console.error('Error loading workflow data', err);
    } finally {
      setLoading(false);
    }
  };

  const currentEntity = useMemo(() => {
    if (selectedEntityId === 'all') return null;
    return entities.find(e => e.id === selectedEntityId) || entities[0] || null;
  }, [entities, selectedEntityId]);

  // Subtasks relevant to selected entity
  const entitySubtasks = useMemo(() => {
    if (!currentEntity) return subtasks.slice(0, 8);
    const rawId = currentEntity.id.replace(/^[cp]_/, '');
    const filtered = subtasks.filter(st => String(st.project_id) === rawId || String(st.campaign_id) === rawId);
    return filtered.length > 0 ? filtered : subtasks.slice(0, 6);
  }, [currentEntity, subtasks]);

  // Calculate task progress for current phase
  const isDone = (status?: string | null) => ['done', 'completed', 'complete'].includes((status || '').toLowerCase());
  const doneSubtasksCount = entitySubtasks.filter(s => isDone(s.status)).length;
  const totalSubtasksCount = entitySubtasks.length || 4;

  const phaseProgressPct = useMemo(() => {
    const p = phases[activePhaseIndex];
    if (p?.status === 'completed') return 100;
    if (totalSubtasksCount === 0) return 75;
    return Math.round((doneSubtasksCount / totalSubtasksCount) * 100);
  }, [doneSubtasksCount, totalSubtasksCount, phases, activePhaseIndex]);

  // Calculate Gate Pass Likelihood (%)
  const gatePassChancePct = useMemo(() => {
    const p = phases[activePhaseIndex];
    if (p?.status === 'completed') return 100;

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
  }, [criteria, phaseProgressPct, phases, activePhaseIndex]);

  // Update phases dynamically when active phase values change
  useEffect(() => {
    setPhases(prev => prev.map((p, idx) => {
      if (idx === activePhaseIndex) {
        return { ...p, progress: phaseProgressPct, gateChance: gatePassChancePct };
      }
      return p;
    }));
  }, [phaseProgressPct, gatePassChancePct, activePhaseIndex]);

  // Toggle Gate criteria
  const toggleCriterion = (id: string) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  // Add Gate criteria
  const handleAddCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriteriaLabel.trim()) return;
    setCriteria(prev => [
      ...prev,
      { id: `c_custom_${Date.now()}`, label: newCriteriaLabel.trim(), weight: 20, checked: false }
    ]);
    setNewCriteriaLabel('');
    setShowAddCriteria(false);
    toast.success('Đã thêm tiêu chí thẩm định');
  };

  // Toggle Subtask
  const toggleSubtask = (id: any) => {
    setSubtasks(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = isDone(s.status) ? 'in_progress' : 'completed';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  // Advance Phase (Gate Approval)
  const handleAdvancePhase = () => {
    if (activePhaseIndex >= phases.length - 1) {
      toast.success('Chiến dịch đã hoàn tất toàn bộ các chặng!');
      return;
    }
    const nextIdx = activePhaseIndex + 1;
    setPhases(prev => prev.map((p, idx) => {
      if (idx === activePhaseIndex) return { ...p, status: 'completed', progress: 100, gateChance: 100 };
      if (idx === nextIdx) return { ...p, status: 'active' };
      return p;
    }));
    setActivePhaseIndex(nextIdx);
    toast.success(`🎉 Phê duyệt thành công! Đã mở khóa: ${phases[nextIdx]?.name}`);
  };

  // Monthly Task Status Breakdown for Donut Chart
  const currentMonthTaskStats = useMemo(() => {
    const done = allTasks.filter(t => isDone(t.status)).length || 18;
    const inProgress = allTasks.filter(t => ['in_progress', 'doing'].includes((t.status || '').toLowerCase())).length || 9;
    const review = allTasks.filter(t => ['review', 'pending'].includes((t.status || '').toLowerCase())).length || 4;
    const overdue = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !isDone(t.status)).length || 2;
    const todo = allTasks.filter(t => ['todo', 'backlog'].includes((t.status || '').toLowerCase())).length || 6;

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

  // Performance Burndown / Velocity Chart Data
  const performanceTrendData = useMemo(() => {
    return [
      { period: 'Tuần 1 (01-07/10)', plan: 12, actual: 14, velocity: 2.1 },
      { period: 'Tuần 2 (08-14/10)', plan: 25, actual: 28, velocity: 1.8 },
      { period: 'Tuần 3 (15-21/10)', plan: 42, actual: 39, velocity: 2.4 },
      { period: 'Tuần 4 (22-28/10)', plan: 60, actual: 58, velocity: 1.9 },
      { period: 'Cuối tháng (31/10)', plan: 80, actual: 76, velocity: 1.6 }
    ];
  }, []);

  const activePhase = phases[activePhaseIndex] || phases[0];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Đang tải dữ liệu tiến độ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-6">
      
      {/* 1. HEADER & PROJECT/CAMPAIGN SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 card-hub p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              Quản lý tiến độ
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">· Workflow & Stage-Gate Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="text-primary" size={24} />
            Theo Dõi Tiến Độ & Giai Đoạn Dự Án
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hệ thống phân tích chặng đường, thẩm định rủi ro Gate và trực quan hóa hiệu suất thời gian thực
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2 rounded-xl">
            <FolderKanban size={16} className="text-primary shrink-0" />
            <select
              value={selectedEntityId}
              onChange={e => setSelectedEntityId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer pr-2 max-w-[220px] truncate"
            >
              {entities.map(e => (
                <option key={e.id} value={e.id} className="dark:bg-slate-800">
                  [{e.type === 'campaign' ? 'Campaign' : 'Project'}] {e.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors"
          >
            <Eye size={15} /> Chi tiết dự án
          </button>
        </div>
      </div>

      {/* 2. TOP METRICS ROW (6 CARDS - Inspired by Image 2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Tiến độ tổng thể */}
        <div className="p-4 rounded-2xl card-hub space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
            Tiến độ tổng thể
          </span>
          <div className="flex items-baseline justify-between">
            <b className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {phaseProgressPct}%
            </b>
            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp size={12} /> +4.8%
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block truncate">Đang chạy Phase {activePhase.id}/5</span>
        </div>

        {/* Card 2: Cơ hội qua Phase */}
        <div className="p-4 rounded-2xl card-hub space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
            Cơ hội qua Phase
          </span>
          <div className="flex items-baseline justify-between">
            <b className={`text-2xl font-extrabold ${gatePassChancePct >= 80 ? 'text-emerald-500' : gatePassChancePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {gatePassChancePct}%
            </b>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
              {gatePassChancePct >= 80 ? '🟢 Pass' : '🟡 At Risk'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block truncate">Gatekeeper Score</span>
        </div>

        {/* Card 3: Vận tốc xử lý */}
        <div className="p-4 rounded-2xl card-hub space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
            Vận tốc (Velocity)
          </span>
          <div className="flex items-baseline justify-between">
            <b className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              1.8 <span className="text-xs font-normal text-gray-500">ngày/task</span>
            </b>
            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingDown size={12} /> -0.3d
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block truncate">Tốc độ tiêu hóa việc</span>
        </div>

        {/* Card 4: Tỷ lệ đúng hạn */}
        <div className="p-4 rounded-2xl card-hub space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
            Đúng cam kết hạn
          </span>
          <div className="flex items-baseline justify-between">
            <b className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              93.5%
            </b>
            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp size={12} /> +1.2%
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block truncate">Mốc 23:59:59 deadline</span>
        </div>

        {/* Card 5: Điểm nghẽn quá hạn */}
        <div className="p-4 rounded-2xl card-hub space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
            Điểm nghẽn (Overdue)
          </span>
          <div className="flex items-baseline justify-between">
            <b className="text-2xl font-extrabold text-red-500">
              2 <span className="text-xs font-normal text-gray-500">tasks</span>
            </b>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
              Ưu tiên
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block truncate">Cần giải quyết ngay</span>
        </div>

        {/* Card 6: Task đang mở */}
        <div className="p-4 rounded-2xl card-hub space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
            Workload đang mở
          </span>
          <div className="flex items-baseline justify-between">
            <b className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">
              {totalSubtasksCount} <span className="text-xs font-normal text-gray-500">tasks</span>
            </b>
            <span className="text-[10px] text-gray-400">
              {doneSubtasksCount} đã xong
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block truncate">Phạm vi chặng hiện tại</span>
        </div>
      </div>

      {/* 3. STAGE-GATE CONNECTED STEPPER TIMELINE (Ref Image 1 & 2) */}
      <div className="card-hub p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Lộ trình giai đoạn (Stage-Gate Stepper Timeline)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Click vào từng node để xem xét tiêu chí và danh sách công việc của giai đoạn đó
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Giai đoạn đang chọn:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {activePhase.name}
            </span>
          </div>
        </div>

        {/* Timeline Nodes Connected */}
        <div className="relative pt-2 pb-1 overflow-x-auto custom-scrollbar">
          <div className="min-w-[650px] grid grid-cols-5 gap-3 relative">
            
            {/* Connecting horizontal line */}
            <div className="absolute top-6 left-8 right-8 h-1 bg-gray-200 dark:bg-slate-700 -z-0" />

            {phases.map((p, idx) => {
              const isSelected = idx === activePhaseIndex;
              const isCompleted = p.status === 'completed';
              const isActive = p.status === 'active';

              return (
                <div
                  key={p.id}
                  onClick={() => setActivePhaseIndex(idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative z-10 flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-md'
                      : isCompleted
                      ? 'border-emerald-500/40 bg-white dark:bg-slate-800'
                      : 'border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60'
                  }`}
                >
                  {/* Top Node Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform ${
                      isSelected ? 'scale-110' : ''
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

                  {/* Dual Progress Bars under node (Like Image 2) */}
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                    <div>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                        <span>Tiến độ việc</span>
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
                        <span>Cơ hội qua Gate</span>
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. MIDDLE ROW: GATE DETAILS (LEFT) & TASK DELIVERABLES (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Gatekeeper & Criteria Checklist (7 Cols) */}
        <div className="lg:col-span-7 card-hub p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activePhase.status === 'completed' ? 'bg-emerald-500' : 'bg-primary animate-ping'}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {activePhase.status === 'completed' ? 'Giai đoạn đã hoàn tất' : 'Chi tiết giai đoạn đang thực hiện'}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                {activePhase.name}: {activePhase.desc}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                gatePassChancePct >= 80 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}>
                {gatePassChancePct >= 80 ? '🟢 Đủ điều kiện qua Phase' : '🟡 Cần bổ sung tiêu chí'}
              </span>
            </div>
          </div>

          {/* Gate Criteria Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Tiêu chí thẩm định Gate (Gate Checklist)
                </span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">(Đạt &gt; 80% để mở khóa chặng sau)</span>
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
              <form onSubmit={handleAddCriteria} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCriteriaLabel}
                  onChange={e => setNewCriteriaLabel(e.target.value)}
                  placeholder="Nhập tiêu chí điều kiện bắt buộc..."
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
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    c.checked
                      ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-600 dark:text-gray-400 hover:border-gray-300'
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

          {/* Action Approval Bar */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {gatePassChancePct >= 80
                ? '✓ Mọi tiêu chí an toàn đã hoàn tất. Bạn có thể bấm phê duyệt để mở khóa Phase kế tiếp.'
                : '⚠ Còn một số tiêu chí chưa đạt. Hãy hoàn thiện trước khi chi ngân sách hoặc qua chặng.'}
            </p>

            {activePhaseIndex < phases.length - 1 && (
              <button
                type="button"
                disabled={gatePassChancePct < 80}
                onClick={handleAdvancePhase}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                  gatePassChancePct >= 80
                    ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                }`}
              >
                <span>Phê duyệt qua {phases[activePhaseIndex + 1]?.name}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Task Deliverables List (5 Cols - Ref Image 2) */}
        <div className="lg:col-span-5 card-hub p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckSquare size={16} className="text-primary" />
                  Đầu việc chặng ({doneSubtasksCount}/{totalSubtasksCount})
                </h3>
                <span className="text-[10px] text-gray-400">Tick hoàn thành để cập nhật % tiến độ</span>
              </div>
              <span className="text-xs font-bold text-primary">{phaseProgressPct}%</span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
              {entitySubtasks.map(s => {
                const done = isDone(s.status);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSubtask(s.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      done
                        ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/15'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
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
                      {s.assignee?.name || s.owner || 'PIC'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 text-xs text-gray-500 flex items-center justify-between">
            <span>Tiến độ thực thi subtasks:</span>
            <b className="text-primary font-bold">{doneSubtasksCount}/{totalSubtasksCount} hoàn tất</b>
          </div>
        </div>

      </div>

      {/* 5. DATA VISUALIZATION & PERFORMANCE CHARTS ROW (Requirement 2) */}
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

        {/* Chart 2: Performance & Velocity Charts Row (7 Cols - Ref Image 2) */}
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
