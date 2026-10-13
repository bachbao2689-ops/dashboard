import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderKanban, ArrowRight, ShieldCheck,
  Sparkles, Plus, BarChart2, Activity,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Globe, Code2, Info, Search,
  Calendar, User, Edit3, Trash2, Eye, Check, Clock, AlertTriangle, Users
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkflowHub } from '../hooks/useWorkflowHub';
import { useTranslation } from '../i18n/translations';
import type { Task } from '../hooks/useTasks';
import { gateScore, gateReady, taskProgress, workflowMetrics, displayDate, inputDate, projectsLink, parentTasks, daysUntil, type HubPhase, type GateCriterion } from '../lib/workflowHub';
import { WorkflowStatusPicker, canonicalWorkflowStatus, workflowStage, WORKFLOW_STATUS_CONFIG, WORKFLOW_STATUS_LABELS_VI, WORKFLOW_STATUS_LABELS_EN, MARKETING_STATUS_GUIDES_EN, MARKETING_STATUS_GUIDES_VI, WorkflowHexagonIcon, type WorkflowTaskStatus } from '../components/features/tasks/WorkflowStatusPicker';
import { MultiSelect } from '../components/common/MultiSelect';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkflowDateField } from '../components/features/projects/WorkflowDateField';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { SubtaskDetailPanel } from '../components/features/projects/SubtaskDetailPanel';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export { WORKFLOW_STATUS_CONFIG, MARKETING_STATUS_GUIDES, STATUS_MARKETING_SUBTITLE, WorkflowHexagonIcon } from '../components/features/tasks/WorkflowStatusPicker';
export type { WorkflowTaskStatus } from '../components/features/tasks/WorkflowStatusPicker';

interface Phase extends HubPhase {
  name: string; desc: string; progress: number | null; gateChance: number | null;
  displayStatus: 'completed' | 'active' | 'locked';
}
interface WorkflowSubtask {
  id: string; phaseId?: string; title: string; assignee: string; assignee_id?: string;
  status: WorkflowTaskStatus; due_date?: string; record: Task; canEdit: boolean;
}
const toWorkflowStage = (task: Task) => workflowStage(task.status, task.workflow_status);
const pct = (value: number | null | undefined) => value == null ? '—' : value + '%';
const field = 'w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary';

export const WorkflowManagement: React.FC = () => {
  const hub = useWorkflowHub();
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [entityFilter, setEntityFilter] = useState<'project' | 'campaign'>(params.has('campaign') ? 'campaign' : 'project');
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
  const [searchEntityQuery, setSearchEntityQuery] = useState('');
  const entities = hub.tracks.map(track => ({ ...track, type: track.entity_type }));
  const selectedKey = params.get('campaign') || params.get('project');
  const currentEntity = entities.find(e => e.entity_id === selectedKey && e.type === (params.has('campaign') ? 'campaign' : 'project')) || (!selectedKey ? entities.find(e => e.type === entityFilter) : undefined);
  useEffect(() => { if (currentEntity && !selectedKey) setParams({[currentEntity.type]:currentEntity.entity_id}, {replace:true}); }, [currentEntity?.id, selectedKey]);
  const selectedEntityId = currentEntity?.id;
  const isCampaign = currentEntity?.type === 'campaign';
  const filteredEntities = entities.filter(e => e.type === entityFilter && e.name.toLowerCase().includes(searchEntityQuery.toLowerCase()));
  const handleFilterChange = (kind: 'project' | 'campaign') => {
    setEntityFilter(kind);
    const first = entities.find(e => e.type === kind);
    setParams(first ? { [kind]: first.entity_id } : {});
    setIsTitleDropdownOpen(true);
  };
  const handleSelectEntity = (id: string) => {
    const entity = entities.find(e => e.id === id);
    if (entity) { setParams({ [entity.type]: entity.entity_id }); setEntityFilter(entity.type); }
    setIsTitleDropdownOpen(false); setSearchEntityQuery('');
  };
  useEffect(() => { if (params.has('campaign')) setEntityFilter('campaign'); else if (params.has('project')) setEntityFilter('project'); }, [params.toString()]);
  const [activePhaseId, setActivePhaseId] = useState(params.get('phase') || '');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [pinnedTooltip, setPinnedTooltip] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelCloseTooltip = () => { if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); };
  const openTooltip = (id: string) => { cancelCloseTooltip(); setActiveTooltip(id); };
  const scheduleCloseTooltip = () => { if (!pinnedTooltip) { cancelCloseTooltip(); tooltipTimeoutRef.current = setTimeout(() => setActiveTooltip(null), 200); } };
  const togglePinTooltip = (id: string) => { cancelCloseTooltip(); setPinnedTooltip(pinnedTooltip === id ? null : id); setActiveTooltip(pinnedTooltip === id ? null : id); };
  const closeAllTooltips = () => { cancelCloseTooltip(); setPinnedTooltip(null); setActiveTooltip(null); };
  useEffect(() => {
    const click = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest('[data-tooltip-container]')) closeAllTooltips(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAllTooltips(); };
    document.addEventListener('click', click); window.addEventListener('keydown', key);
    return () => { cancelCloseTooltip(); document.removeEventListener('click', click); window.removeEventListener('keydown', key); };
  }, [pinnedTooltip]);
  const allTasks = useMemo(() => currentEntity ? parentTasks(hub.tasks, currentEntity.type, currentEntity.entity_id) : [], [hub.tasks, currentEntity?.entity_id, currentEntity?.type]);
  const phases: Phase[] = useMemo(() => (currentEntity?.phases || []).map(p => {
    const rows = allTasks.filter(t => t.workflow_phase_id === p.id);
    const progress = p.can_edit_tasks ? taskProgress(rows).percent : null;
    const score = gateScore(p.gate_criteria || []);
    return { ...p, name: p.position + '. ' + p.title, desc: p.description || '', progress,
      gateChance: p.opportunity ?? (score != null && progress != null ? Math.round(score * .65 + progress * .35) : null),
      displayStatus: p.status === 'completed' ? 'completed' : ['in_progress','in_review'].includes(p.status) ? 'active' : 'locked' };
  }), [currentEntity, allTasks]);
  const requestedPhaseIndex = phases.findIndex(p => p.id === activePhaseId);
  const activePhaseIndex = requestedPhaseIndex >= 0 ? requestedPhaseIndex : Math.max(0, phases.findIndex(p => p.status === 'in_progress' || p.status === 'in_review'));
  const activePhase = phases[activePhaseIndex];
  const criteria = activePhase?.gate_criteria || [];
  const subtasks: WorkflowSubtask[] = allTasks.filter(t => t.workflow_phase_id).map(t => ({
    id: t.id, phaseId: t.workflow_phase_id, title: t.title, assignee: t.assignee?.name || 'Chưa giao PIC',
    assignee_id: t.assignee_id, status: toWorkflowStage(t), due_date: t.due_date, record: t,
    canEdit: Boolean(phases.find(p => p.id === t.workflow_phase_id)?.can_edit_tasks || String(t.assignee_id) === String(hub.profile?.id)),
  }));
  const currentPhaseSubtasks = subtasks.filter(t => t.phaseId === activePhase?.id);
  const doneSubtasksCount = currentPhaseSubtasks.filter(t => t.status === 'completed').length;
  const totalSubtasksCount = currentPhaseSubtasks.filter(t => t.status !== 'canceled').length;
  const phaseProgressPct = activePhase?.progress ?? null;
  const gatePassChancePct = activePhase?.gateChance ?? null;
  const criteriaScore = gateScore(criteria);
  const readyToApprove = gateReady(currentPhaseSubtasks.map(task => task.record), criteria);
  const readinessLabel = readyToApprove ? (isEn ? '🟢 Ready for approval' : '🟢 Sẵn sàng duyệt') : doneSubtasksCount !== totalSubtasksCount || !totalSubtasksCount ? (isEn ? '🟡 Complete phase tasks' : '🟡 Cần hoàn thành task') : (isEn ? '🟡 Complete gate checklist' : '🟡 Cần đạt checklist');
  const metrics = workflowMetrics(allTasks);
  const overallProjectProgressPct = metrics.progress;
  const daysRemaining = daysUntil(currentEntity?.due_date);
  const entityTimeline = displayDate(currentEntity?.start_date) + ' – ' + displayDate(currentEntity?.due_date);
  const subTeamMembers = currentEntity?.sub_pics || [];
  const leadInfo = { name: (currentEntity?.pics || []).map(p => p.name).join(', ') || 'Chưa giao PIC', avatar: currentEntity?.pics[0]?.avatar_url, role: 'PIC' };
  const taskCountsByStatus = Object.fromEntries(Object.keys(WORKFLOW_STATUS_CONFIG).map(s => [s, allTasks.filter(t => toWorkflowStage(t) === s).length])) as Record<WorkflowTaskStatus,number>;
  const currentMonthTaskStats = useMemo(() => {
    const labels = isEn
      ? ['Completed', 'In Progress', 'In Review', 'Overdue', 'Todo']
      : ['Hoàn thành', 'Đang thực hiện', 'Đang xem xét', 'Quá hạn', 'Chưa làm'];
    return labels.map((name, i) => ({
      name,
      value: metrics.buckets[i],
      color: ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#64748b'][i]
    }));
  }, [isEn, metrics.buckets]);
  const totalMonthTasks = metrics.buckets.reduce((a,b) => a+b,0);
  const performanceTrendData = phases.map(p => {
    const startStr = p.start_date ? p.start_date.slice(0, 10) : null;
    const dueStr = p.due_date ? p.due_date.slice(0, 10) : null;
    const actual = p.displayStatus === 'completed' ? (p.progress ?? 100) : p.progress;
    const plan = p.displayStatus === 'completed' ? 100 : (!startStr || !dueStr ? null : Math.max(0, Math.min(100, Math.round((Date.now() - Date.parse(startStr + 'T00:00:00+07:00')) / Math.max(86400000, Date.parse(dueStr + 'T23:59:59+07:00') - Date.parse(startStr + 'T00:00:00+07:00')) * 100))));
    return { period: p.name, actual, plan };
  });
  const unplanned = allTasks.filter(t => !t.workflow_phase_id);
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newCriteriaLabel, setNewCriteriaLabel] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<WorkflowTaskStatus>('planned');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<WorkflowTaskStatus>('planned');
  const [editTaskDue, setEditTaskDue] = useState('');
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [insertPhaseIndex, setInsertPhaseIndex] = useState(0);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');
  const [phasePicIds, setPhasePicIds] = useState<string[]>([]);
  const [phaseSubIds, setPhaseSubIds] = useState<string[]>([]);
  const [phaseStart, setPhaseStart] = useState('');
  const [phaseDue, setPhaseDue] = useState('');
  const [phaseStatus, setPhaseStatus] = useState('todo');
  const [phaseOpportunity, setPhaseOpportunity] = useState('');
  const [phaseReason, setPhaseReason] = useState('');
  const editingPhase = phases.find(p => p.id === editingPhaseId);
  const taskPeople = [...(activePhase?.members || []), ...(currentEntity?.pics || [])].filter((p,i,a) => a.findIndex(v => v.id === p.id) === i);
  const personOptions = hub.people.map(p => ({value:String(p.id),label:p.name}));
  const taskOptions = taskPeople.map(p => ({value:String(p.id),label:p.name}));
  useEffect(() => { setIsDetailOpen(Boolean(params.get('phase'))); setActivePhaseId(params.get('phase') || ''); setShowAddTask(false); setEditingTaskId(null); setShowAddPhaseModal(false); setSelectedTask(null); }, [currentEntity?.id, hub.profile?.id, params.get('phase')]);
  useEffect(() => {
    if (activePhaseId && !phases.some(p => p.id === activePhaseId)) { setActivePhaseId(''); setIsDetailOpen(false); }
    if (selectedTask && !hub.tasks.some(t => t.id === selectedTask.id)) setSelectedTask(null);
    if (!currentEntity?.root) setShowAddPhaseModal(false);
    if (!activePhase?.can_edit_tasks) { setShowAddTask(false); setShowAddCriteria(false); }
  }, [hub.tasks, phases, currentEntity?.root]);
  const attempt = async (action: () => Promise<unknown>, success: string) => {
    try { await action(); toast.success(success); return true; }
    catch (e: any) { toast.error(e.message || 'Không thể lưu thay đổi'); return false; }
  };
  const saveGate = (items: GateCriterion[]) => hub.mutate(() => supabase.rpc('workflow_update_gate', {p_phase: activePhase?.id, p_items: items, p_expected: activePhase?.version}));
  const toggleCriterion = (id: string) => { if (activePhase?.can_edit_tasks) void attempt(() => saveGate(criteria.map(c => c.id === id ? {...c, checked: !c.checked} : c)), 'Đã lưu tiêu chí'); };
  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newCriteriaLabel.trim()) return;
    if (await attempt(() => saveGate([...criteria, {id:crypto.randomUUID(),label:newCriteriaLabel.trim(),weight:20,checked:false}]), 'Đã lưu tiêu chí')) { setNewCriteriaLabel(''); setShowAddCriteria(false); }
  };
  const stageValues = (stage: WorkflowTaskStatus) => ({status:canonicalWorkflowStatus[stage],workflow_status:stage});
  const toggleSubtask = (id: string) => { const row = subtasks.find(t => t.id === id); if (row?.canEdit) void attempt(() => hub.updateTask(row.record, stageValues(row.status === 'completed' ? 'in_progress' : 'completed')), 'Đã cập nhật All Tasks'); };
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee || !activePhase) return toast.error('Nhập tên và chọn PIC');
    if (await attempt(() => hub.mutate(() => supabase.rpc('workflow_create_task', {p_phase:activePhase.id,p_data:{title:newTaskTitle.trim(),assignee_id:Number(newTaskAssignee),due_date:inputDate(newTaskDue),workflow_status:newTaskStatus,priority:'medium'}})), 'Đã tạo task và đồng bộ All Tasks')) {
      setNewTaskTitle(''); setNewTaskAssignee(''); setNewTaskDue(''); setNewTaskStatus('planned'); setShowAddTask(false);
    }
  };
  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); const row = subtasks.find(t => t.id === id);
    if (row?.canEdit && window.confirm('Ẩn task "' + row.title + '" khỏi danh sách? Dữ liệu vẫn được giữ.')) void attempt(() => hub.updateTask(row.record,{status:'deleted'}), 'Đã ẩn task');
  };
  const handleStartEditTask = (row: WorkflowSubtask, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingTaskId(row.id); setEditTaskTitle(row.title); setEditTaskAssignee(String(row.assignee_id || '')); setEditTaskStatus(row.status); setEditTaskDue(row.due_date || '');
  };
  const handleSaveEditTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); const row = subtasks.find(t => t.id === id); if (!row || !editTaskTitle.trim()) return;
    const values = {title:editTaskTitle.trim(),due_date:inputDate(editTaskDue),...stageValues(editTaskStatus),...(currentEntity?.root ? {assignee_id:Number(editTaskAssignee)} : {})};
    if (await attempt(() => hub.updateTask(row.record,values), 'Đã lưu task')) setEditingTaskId(null);
  };
  const handleQuickChangeStatus = (id: string, status: WorkflowTaskStatus) => {
    const row = subtasks.find(t => t.id === id);
    return row ? hub.updateTask(row.record, stageValues(status)).catch(e => {toast.error(e.message); throw e;}) : Promise.reject(new Error('Task không còn trong phạm vi'));
  };
  const handleOpenAddPhaseModal = (index: number, e?: React.MouseEvent, phase?: Phase) => {
    e?.stopPropagation(); if (!currentEntity?.root) return;
    setEditingPhaseId(phase?.id || null); setInsertPhaseIndex(index);
    setNewPhaseName(phase?.title || ''); setNewPhaseDesc(phase?.description || '');
    setPhasePicIds(phase?.members.filter(p => p.role === 'pic').map(p => String(p.id)) || [String(hub.profile?.id)]);
    setPhaseSubIds(phase?.members.filter(p => p.role === 'sub_pic').map(p => String(p.id)) || []);
    setPhaseStart(phase?.start_date || ''); setPhaseDue(phase?.due_date || ''); setPhaseStatus(phase?.status || 'todo');
    setPhaseOpportunity(phase?.opportunity == null ? '' : String(phase.opportunity)); setPhaseReason(phase?.opportunity_note || '');
    setShowAddPhaseModal(true);
  };
  const handleCreatePhase = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentEntity || !newPhaseName.trim() || !phasePicIds.length) return toast.error('Nhập tên và chọn PIC phase');
    if (await attempt(() => hub.mutate(() => supabase.rpc('workflow_configure_phase', {p_workflow:currentEntity.id,p_phase:editingPhaseId,p_expected:editingPhase?.version || 0,
      p_data:{title:newPhaseName.trim(),description:newPhaseDesc,position:insertPhaseIndex+1,status:phaseStatus,start_date:phaseStart || null,due_date:phaseDue || null,
        pic_ids:phasePicIds.map(Number),sub_pic_ids:phaseSubIds.filter(id=>!phasePicIds.includes(id)).map(Number),gate_criteria:editingPhase?.gate_criteria || [],
        opportunity:phaseOpportunity === '' ? null : Number(phaseOpportunity),opportunity_note:phaseReason.trim() || null}
    })), 'Đã lưu phase vào lộ trình')) setShowAddPhaseModal(false);
  };
  const [phaseToDelete, setPhaseToDelete] = useState<{ index: number; phase: Phase } | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollBounds = () => {
    const el = timelineScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    checkScrollBounds();
    const el = timelineScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollBounds, { passive: true });
    window.addEventListener('resize', checkScrollBounds);
    const timer = setTimeout(checkScrollBounds, 300);
    return () => {
      el.removeEventListener('scroll', checkScrollBounds);
      window.removeEventListener('resize', checkScrollBounds);
      clearTimeout(timer);
    };
  }, [phases.length, activePhaseId]);

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (!timelineScrollRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    timelineScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleDeletePhase = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const phase = phases[index];
    if (currentEntity?.root && phase) {
      setPhaseToDelete({ index, phase });
    }
  };

  const confirmDeletePhase = async () => {
    if (!phaseToDelete) return;
    const { phase } = phaseToDelete;
    const ok = await attempt(
      () => hub.mutate(() => supabase.rpc('workflow_remove_phase', { p_phase: phase.id, p_expected: phase.version })),
      isEn ? 'Phase deleted successfully' : 'Đã xóa phase khỏi lộ trình'
    );
    if (ok) setPhaseToDelete(null);
  };
  const handleAdvancePhase = async () => {
    if (!activePhase) return;
    await attempt(async () => { const id = await hub.mutate(() => supabase.rpc('workflow_advance_phase',{p_phase:activePhase.id,p_expected:activePhase.version})); if (id) { setActivePhaseId(id); setParams({ [currentEntity!.type]: currentEntity!.entity_id, phase: id }); } }, 'Đã duyệt Gate và cập nhật phase');
  };
  const handlePhaseClick = (index: number) => { const id = phases[index]?.id; if (id && currentEntity) { setActivePhaseId(id); setParams({ [currentEntity.type]: currentEntity.entity_id, phase: id }, { replace: true }); } setEditingTaskId(null); setShowAddTask(false); };
  const linkTask = (task: Task, phaseId: string) => void attempt(() => hub.mutate(() => supabase.rpc('workflow_link_task',{p_phase:phaseId,p_task:task.id.startsWith('ps-')||task.id.startsWith('cs-') ? task.id.slice(3) : task.id,p_kind:task.id.startsWith('ps-')?'project_subtask':task.id.startsWith('cs-')?'campaign_subtask':'task'})), 'Đã gắn task vào phase, giữ nguyên comments');
  if (hub.error) return <div role="alert" className="card-hub p-6 m-4"><p className="text-red-500">{hub.error}</p><button onClick={()=>void hub.refresh()} className="mt-3 underline">Thử lại</button></div>;
  if (hub.loading) return <div className="p-6 space-y-5 animate-pulse"><div className="card-hub h-40"/><div className="card-hub h-64"/></div>;
  if (!currentEntity) return <div className="card-hub m-4 p-6 space-y-4"><h1 className="font-bold">Workflow Management</h1><p className="text-sm text-gray-500">{selectedKey ? 'Project/Campaign không còn trong phạm vi được xem.' : 'Chưa có Project/Campaign trong phạm vi được xem.'}</p><div className="flex gap-3"><button onClick={()=>handleFilterChange(entityFilter === 'project' ? 'campaign':'project')} className="text-sm underline">Xem {entityFilter === 'project' ? 'Campaigns':'Projects'}</button><button onClick={()=>navigate('/projects')} className="text-sm underline">Projects/Campaigns →</button></div></div>;
  return (
    <div className="workflow-management-page w-full flex flex-col p-3 sm:p-6 pb-28 md:pb-32 space-y-6 relative">

      {/* 1. HEADER: PROJECT INFO (LEFT) + 4 COMPACT HEALTH/KPI BOARDS (RIGHT) IN 1 UNIFIED CARD */}
      <div className="card-hub p-4 sm:p-5 rounded-2xl grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-stretch relative z-20">

        {/* Left Side: Filter buttons, Title dropdown, and Subtitle (4 cols) */}
        <div className="xl:col-span-4 2xl:col-span-4 flex flex-col justify-between space-y-2.5">
          {/* Top Row: Button trên title scale nhỏ 20% (Projects / Campaigns) & Description (Requirement 1) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => handleFilterChange('project')}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'project'
                    ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(30,90,170,.18)] ring-1 ring-blue-300/80 dark:from-blue-500/35 dark:to-cyan-500/20 dark:!text-blue-100 dark:ring-blue-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Globe size={11} className={entityFilter === 'project' ? 'text-blue-600 dark:text-blue-300' : ''} />
                <span>Projects</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('campaign')}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'campaign'
                    ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FolderKanban size={11} className={entityFilter === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''} />
                <span>Campaigns</span>
              </button>
            </div>

            <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
              • {currentEntity.root ? (isEn ? 'Full Scope' : 'PIC toàn bộ') : (isEn ? 'Assigned Scope' : 'Phạm vi được giao')}
            </span>
          </div>

          {/* Main Title as Filter Dropdown */}
          <div className="relative inline-block my-0.5">
            <button
              type="button"
              onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
              className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer"
              title={isEn ? "Click to select and filter Project / Campaign" : "Bấm để chọn và lọc Project / Campaign"}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${
                isCampaign
                  ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              }`}>
                {isCampaign ? <FolderKanban size={20} /> : <Globe size={20} />}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                  {currentEntity.name}
                </h1>
                <ChevronDown
                  size={18}
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
                      placeholder={isEn ? "Search project or campaign..." : "Tìm kiếm dự án hoặc chiến dịch..."}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredEntities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        {isEn ? 'No matching projects found' : 'Không tìm thấy dự án phù hợp'}
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
          </div>

          {/* Time row: Timeline + Workload còn mấy ngày (Requirement 2) */}
          {currentEntity.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={currentEntity.description}>{currentEntity.description}</p>}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            {currentEntity.priority && <span>{isEn ? 'Priority' : 'Ưu tiên'}: {currentEntity.priority}</span>}
            {currentEntity.budget != null && <span>{isEn ? 'Budget' : 'Ngân sách'}: {Number(currentEntity.budget).toLocaleString(isEn ? 'en-US' : 'vi-VN')} ₫</span>}
            {!!currentEntity.channels?.length && <span>{currentEntity.channels.join(' · ')}</span>}
            {currentEntity.campaign_id && <button className="underline" onClick={() => navigate(projectsLink('campaign', currentEntity.campaign_id!))}>{isEn ? 'Parent Campaign' : 'Campaign liên kết'} →</button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span>{entityTimeline}</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Clock size={10} />
              <span>
                {daysRemaining == null
                  ? (isEn ? 'No deadline' : 'Chưa có hạn')
                  : daysRemaining < 0
                  ? (isEn ? `${Math.abs(daysRemaining)}d overdue` : `Trễ ${Math.abs(daysRemaining)} ngày`)
                  : (isEn ? `${daysRemaining}d left` : `Còn ${daysRemaining} ngày`)}
              </span>
            </span>
          </div>

          {/* Lead chính ở dưới time, Sub track avatars, and Project/Campaign status (Requirement 2) */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {/* Lead chính badge */}
            <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs ${
                isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
              }`}>
                {leadInfo.avatar ? (
                  <img src={leadInfo.avatar} alt={leadInfo.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={10} />
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                {leadInfo.name}
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md ${
                isCampaign ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              }`}>
                {leadInfo.role}
              </span>
            </div>

            {/* Sub track avatars */}
            <div className="flex items-center -space-x-1.5">
              {subTeamMembers.map(sub => (
                <div
                  key={sub.id}
                  title={`${sub.name} ${isEn ? '(Team member)' : '(Thành viên tham gia)'}`}
                  className={`w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-extrabold text-white shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer`}
                >
                  <Avatar name={sub.name} src={sub.avatar_url} className="w-full h-full text-[8px]" />
                </div>
              ))}
            </div>

            <StatusBadge status={currentEntity.status} />
            <button onClick={()=>navigate(projectsLink(currentEntity.type, currentEntity.entity_id))} className="text-[11px] font-semibold underline">{isEn ? 'Open source Project/Campaign' : 'Mở Project/Campaign gốc'} →</button>
            <span className="text-[10px] text-gray-500" role="status">{hub.connected ? (isEn ? 'Live sync' : 'Đồng bộ realtime') : (isEn ? 'Reconnecting…' : 'Đang kết nối lại…')}</span>
          </div>
        </div>

        {/* Right Side: 4 Compact KPI/Health Boards (Dàn đều 4 cột, khớp hàng) */}
        <div className="xl:col-span-8 2xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          {/* Card 1: Tiến độ tổng thể */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-blue transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'overall_progress'
                ? 'z-30 ring-2 ring-blue-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {currentEntity.root ? (isEn ? 'Overall Progress' : 'Tiến độ tổng thể') : (isEn ? 'Assigned Progress' : 'Tiến độ được giao')}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('overall_progress');
                }}
                onMouseEnter={() => openTooltip('overall_progress')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'overall_progress'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "Overall Progress info" : "Thông tin chỉ số Tiến độ tổng thể"}
                title={isEn ? "View mechanism & formula for Overall Progress" : "Xem cơ chế & cách tính Tiến độ tổng thể"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {pct(overallProjectProgressPct)}
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {allTasks.length} tasks
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {activePhase ? (isEn ? `Viewing: ${activePhase.name}` : `Đang xem: ${activePhase.name}`) : (isEn ? 'No phase roadmap' : 'PIC chưa tạo lộ trình')}
            </span>

            {/* Tooltip Popover positioned neatly below Card 1 */}
            {activeTooltip === 'overall_progress' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 left-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="p-1 rounded-md bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Overall Progress' : 'Tiến độ tổng thể'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Ratio of completed tasks to active tasks for the Project/Campaign within viewable scope.' : 'Tỷ lệ task hoàn thành trên các task còn hoạt động của Project/Campaign trong phạm vi được xem.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? '(Completed subtasks / Total project subtasks) × 100%' : '(Số subtasks đã xong / Tổng số subtasks toàn dự án) × 100%'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? 'Canceled tasks are excluded from denominator. Displays — if no tasks.' : 'Task đã hủy không nằm trong mẫu số. Không có task thì hiển thị —.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Sức khỏe & Cơ hội qua Phase (Health Card) */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card ${(gatePassChancePct ?? -1) >= 80 ? 'magnetic-emerald' : 'magnetic-amber'} transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'phase_health_gate'
                ? 'z-30 ring-2 ring-emerald-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate" title={isEn ? "Stage-Gate Health" : "Sức khỏe & Cơ hội qua Phase"}>
                {isEn ? 'Stage-Gate Health' : 'Sức khỏe & Cơ hội qua Phase'}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('phase_health_gate');
                }}
                onMouseEnter={() => openTooltip('phase_health_gate')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'phase_health_gate'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-2 ring-emerald-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "Stage-Gate Health info" : "Thông tin chỉ số Sức khỏe & Cơ hội qua Phase"}
                title={isEn ? "View mechanism & formula for Stage-Gate Health" : "Xem cơ chế & cách tính Sức khỏe & Cơ hội qua Phase"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className={`text-xl sm:text-2xl font-extrabold ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {pct(gatePassChancePct)}
              </b>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                readyToApprove ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {gatePassChancePct == null
                  ? (isEn ? 'Not evaluated' : 'Chưa đánh giá')
                  : readinessLabel}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {activePhase?.opportunity != null
                ? (isEn ? `PIC eval · ${activePhase.opportunity_note || ''}` : `PIC đánh giá · ${activePhase.opportunity_note || ''}`)
                : (isEn ? `Gate Checklist: ${criteriaScore == null ? 'No criteria' : criteriaScore + '/100'}` : `Gate Checklist: ${criteriaScore == null ? 'Chưa có tiêu chí' : criteriaScore + '/100'}`)}
            </span>

            {/* Tooltip Popover positioned neatly below Card 2 */}
            {activeTooltip === 'phase_health_gate' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 left-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className={`p-1 rounded-md bg-gray-100 dark:bg-slate-800 ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Stage-Gate Health' : 'Sức khỏe & Cơ hội qua Phase'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Operational health forecast and probability of passing the gate review to unlock the next phase.' : 'Dự báo sức khỏe vận hành và xác suất vượt qua cổng nghiệm thu kỹ thuật để mở khóa sang giai đoạn kế tiếp.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? '65% Gate Checklist Score + 35% Subtasks Completion Rate' : '65% Điểm Gate Checklist + 35% Tỷ lệ hoàn tất Subtasks'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? 'Gate score is an indicator based on checklist and real progress. Passing Gate requires finished tasks and checklist ≥80%.' : 'Điểm Gate là chỉ báo theo checklist và tiến độ thật; không phải xác suất thống kê. PIC có thể ghi đánh giá riêng kèm cơ sở. Duyệt Gate cần task xong và checklist ≥80%.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Vận tốc (Velocity) */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-violet transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'velocity'
                ? 'z-30 ring-2 ring-indigo-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {isEn ? 'Velocity' : 'Vận tốc'}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('velocity');
                }}
                onMouseEnter={() => openTooltip('velocity')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'velocity'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-2 ring-indigo-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "Velocity info" : "Thông tin chỉ số Vận tốc"}
                title={isEn ? "View mechanism & formula for Velocity" : "Xem cơ chế & cách tính Vận tốc"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {metrics.velocity == null ? '—' : metrics.velocity} <span className="text-xs font-normal text-gray-500">{isEn ? 'days/task' : 'ngày/task'}</span>
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {isEn ? `${allTasks.filter(t=>t.completed_at).length} dated tasks` : `${allTasks.filter(t=>t.completed_at).length} task có thời gian`}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {isEn ? 'Average technical task completion pace' : 'Tốc độ giải quyết task kỹ thuật'}
            </span>

            {/* Tooltip Popover positioned neatly below Card 3 */}
            {activeTooltip === 'velocity' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 left-0 sm:left-auto sm:right-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="p-1 rounded-md bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Velocity' : 'Vận tốc'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Measures the average digestion pace and completion time of technical workloads by the team.' : 'Đo lường nhịp độ tiêu hóa và giải quyết khối lượng công việc kỹ thuật trung bình của đội ngũ.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? 'Total completion duration of finished tasks / Total finished technical tasks' : 'Tổng thời gian hoàn tất task đã xong / Tổng số task kỹ thuật hoàn thành'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? 'Only counts tasks with start/created time and actual completed_at.' : 'Chỉ tính task có thời gian bắt đầu/tạo và completed_at thực tế.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Đúng cam kết hạn */}
          <div
            data-tooltip-container="true"
            className={`p-3 sm:p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between hover-magnetic-card magnetic-emerald transition-all relative group/card min-w-0 h-full cursor-default ${
              activeTooltip === 'on_time_rate'
                ? 'z-30 ring-2 ring-emerald-500/40 shadow-xl bg-white dark:bg-slate-800'
                : 'z-10'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {isEn ? 'On-Time Rate' : 'Đúng cam kết hạn'}
              </span>

              {/* Info Icon (i) */}
              <button
                type="button"
                data-tooltip-container="true"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTooltip('on_time_rate');
                }}
                onMouseEnter={() => openTooltip('on_time_rate')}
                onMouseLeave={scheduleCloseTooltip}
                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  activeTooltip === 'on_time_rate'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-2 ring-emerald-400/40'
                    : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
                aria-label={isEn ? "On-Time Rate info" : "Thông tin chỉ số Đúng cam kết hạn"}
                title={isEn ? "View mechanism & formula for On-Time Rate" : "Xem cơ chế & cách tính Đúng cam kết hạn"}
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {pct(metrics.onTime)}
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {isEn ? 'Real data' : 'Dữ liệu thật'}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {isEn ? 'Standard 23:59:59 deadline cutoff' : 'Mốc deadline 23:59:59 chuẩn hóa toàn hệ thống'}
            </span>

            {/* Tooltip Popover positioned neatly below Card 4 */}
            {activeTooltip === 'on_time_rate' && (
              <div
                role="tooltip"
                data-tooltip-container="true"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseTooltip}
                onMouseLeave={scheduleCloseTooltip}
                className="absolute z-40 right-0 top-[calc(100%+8px)] w-72 sm:w-80 p-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className="p-1 rounded-md bg-emerald-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                    <Info size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'On-Time Rate' : 'Đúng cam kết hạn'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                    <span>{isEn ? 'Measures the percentage of technical tasks approved on or before the committed deadline.' : 'Đo lường tỷ lệ các đầu việc kỹ thuật được nghiệm thu đúng hoặc trước deadline cam kết ban đầu.'}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">{isEn ? 'Formula:' : 'Cách tính:'}</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      {isEn ? '(On-time completed tasks / Total completed tasks) × 100%' : '(Số task hoàn thành đúng hạn / Tổng số task đã hoàn thành) × 100%'}
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    {isEn ? '💡 System automatically audits completion time against the 23:59:59 deadline cutoff.' : '💡 Hệ thống tự động đối soát thời điểm chốt Done với hạn chót 23:59:59 của ngày deadline.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2. GỘP THÀNH 1 BOARD DUY NHẤT: LỘ TRÌNH GIAI ĐOẠN (BẤM VÀO MỚI HIỆN CHI TIẾT TASK & GATE) */}
      <div className={`card-hub p-5 rounded-2xl space-y-5 transition-all relative ${
        activeTooltip === 'task_statuses' ? 'z-30' : 'z-10'
      }`}>

        {/* Board Header with Task Status Bar, Dropdown Phase Selector & Collapse Toggle (Requirement 3) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {isEn ? 'Stage-Gate Stepper Timeline' : 'Lộ trình giai đoạn'}
            </h3>

            {/* Thanh Task biểu hiện những Task trong đó (Requirement 3: move xuống bảng Lộ trình giai đoạn) */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5">
                {isEn ? 'Tasks in scope:' : 'Task trong phạm vi:'}
              </span>

              {/* Small (i) button for Staff guidance on Task Status mechanisms (Requirement 2) */}
              <div className="relative inline-flex items-center mr-1" data-tooltip-container="true">
                <button
                  type="button"
                  data-tooltip-container="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinTooltip('task_statuses');
                  }}
                  onMouseEnter={() => openTooltip('task_statuses')}
                  onMouseLeave={scheduleCloseTooltip}
                  className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                    activeTooltip === 'task_statuses'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-400/40'
                      : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
                  }`}
                  aria-label={isEn ? "7 Task Status mechanism guide" : "Cơ chế & quy chuẩn 7 trạng thái Task"}
                  title={isEn ? "View mechanism & rules for 7 Task Statuses (Marketing)" : "Xem cơ chế & quy chuẩn 7 trạng thái Task (Marketing)"}
                >
                  <Info size={11} strokeWidth={2.4} />
                </button>

                {/* Popover explaining the 7 statuses */}
                {activeTooltip === 'task_statuses' && (
                  <div
                    role="tooltip"
                    data-tooltip-container="true"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={cancelCloseTooltip}
                    onMouseLeave={scheduleCloseTooltip}
                    className="absolute z-40 left-0 top-[calc(100%+8px)] w-[320px] sm:w-[480px] md:w-[540px] max-w-[92vw] p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left pointer-events-auto before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-[''] transition-all animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                          <Sparkles size={14} strokeWidth={2.4} />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                            {isEn ? 'Mechanism & Standards of 7 Task Statuses' : 'Cơ chế & Quy chuẩn 7 Trạng thái Task'}
                          </h4>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
                            {isEn ? 'Standardized for Marketing & Campaign Operations' : 'Chuẩn hóa theo quy trình Marketing & Vận hành chiến dịch'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50">
                        Marketing Ops
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar text-[11px]">
                      {(isEn ? MARKETING_STATUS_GUIDES_EN : MARKETING_STATUS_GUIDES_VI).map((item) => {
                        const cfg = WORKFLOW_STATUS_CONFIG[item.status];
                        return (
                          <div
                            key={item.status}
                            className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/70 hover:border-gray-200 dark:hover:border-slate-600 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <WorkflowHexagonIcon status={item.status} size={14} />
                              <span className={`text-xs font-bold ${cfg.textColor}`}>
                                {item.marketingTitle}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-gray-600 dark:text-slate-300 leading-relaxed mb-1">
                              <span className="font-semibold text-gray-700 dark:text-slate-200">{isEn ? 'Mechanism: ' : 'Cơ chế: '}</span>
                              {item.shortDesc}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                              👉 {item.usageRule}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                      <span>{isEn ? '💡 Convention: Submit draft deliverables to In QA for Lead review before moving to Completed.' : '💡 Quy ước: Nộp draft ấn phẩm chuyển In QA để Leader duyệt trước khi sang Completed.'}</span>
                    </div>
                  </div>
                )}
              </div>

              {(['backlog', 'planned', 'scoping', 'in_progress', 'in_qa', 'completed', 'canceled'] as WorkflowTaskStatus[]).map(st => {
                const count = taskCountsByStatus[st] || 0;
                const cfg = WORKFLOW_STATUS_CONFIG[st];
                const statusLabel = isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || cfg.label);
                return (
                  <div
                    key={st}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] ${cfg.bgLight} ${cfg.bgDark} ${cfg.borderClass}`}
                    title={`${statusLabel}: ${count} tasks`}
                  >
                    <WorkflowHexagonIcon status={st} size={13} />
                    <span className={`font-bold ${cfg.textColor}`}>
                      {count}
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap min-w-0 items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">{isEn ? 'Selected phase:' : 'Chặng đang chọn:'}</span>
            <div className="relative">
              <select
                value={activePhaseIndex}
                onChange={e => handlePhaseClick(Number(e.target.value))}
                className="max-w-full appearance-none bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-1.5 outline-none cursor-pointer hover:border-primary transition-colors"
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
              disabled={!activePhase}
              onClick={() => setIsDetailOpen(!isDetailOpen)}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-500 transition-colors ml-1"
              title={isDetailOpen ? (isEn ? 'Collapse details' : 'Thu gọn chi tiết') : (isEn ? 'Expand details' : 'Mở rộng chi tiết')}
            >
              {isDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {!phases.length && <div className="py-8 text-center text-sm text-gray-500">{currentEntity.root ? (isEn ? 'No phases yet. Add a phase to assign PIC & sub-PIC.' : 'Chưa có phase. Thêm chặng để giao PIC và sub-PIC.') : (isEn ? 'Not assigned to any phase. Contact PIC to join.' : 'Chưa được giao phase. Liên hệ PIC để tham gia đúng giai đoạn.')}</div>}
        {/* Timeline Connected Stepper Nodes with Slide Navigation Buttons (Requirement 1) */}
        <div className="relative group/timeline pt-2 pb-2">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollTimeline('left')}
              aria-label={isEn ? 'Scroll left' : 'Trượt sang trái'}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-cyan-400 hover:scale-110 active:scale-95 transition-all cursor-pointer -ml-2 sm:-ml-3"
              title={isEn ? 'Scroll left to view previous phases' : 'Trượt sang trái để xem các phase trước'}
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
          )}

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollTimeline('right')}
              aria-label={isEn ? 'Scroll right' : 'Trượt sang phải'}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-cyan-400 hover:scale-110 active:scale-95 transition-all cursor-pointer -mr-2 sm:-mr-3"
              title={isEn ? 'Scroll right to view more phases' : 'Trượt sang phải để xem thêm các phase sau'}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          )}

          <div
            ref={timelineScrollRef}
            className="overflow-x-auto custom-scrollbar scroll-smooth"
          >
            <div className="flex items-center min-w-max pb-2 pt-1 px-1">
            {phases.map((p, idx) => {
              const isSelected = idx === activePhaseIndex;
              const isCompleted = p.displayStatus === 'completed';
              const isActive = p.displayStatus === 'active';

              return (
                <React.Fragment key={p.id}>
                  {/* Circular Phase Node Card */}
                  <div
                    onClick={() => handlePhaseClick(idx)}
                    className={`w-48 sm:w-56 p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center text-center shrink-0 ${
                      isSelected
                        ? isCampaign
                          ? 'border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/10 dark:bg-amber-950/15 shadow-md -translate-y-0.5'
                          : 'border-blue-600 ring-2 ring-blue-600/25 bg-blue-50/10 dark:bg-blue-950/15 shadow-md -translate-y-0.5'
                        : isCompleted
                        ? 'border-emerald-500/40 bg-white dark:bg-slate-800 hover:border-emerald-500/70'
                        : 'border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Header Row: Chặng order & Delete button */}
                    <div className="w-full flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isActive
                          ? isCampaign
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isEn ? `Phase ${p.position}` : `Chặng ${p.position}`}{currentEntity.root ? '/' + phases.length : (isEn ? ' · assigned' : ' · được giao')}
                      </span>

                      {currentEntity.root && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePhase(idx, e)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-auto"
                          title={isEn ? `Delete phase: ${p.name}` : `Xóa giai đoạn: ${p.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Soft Technical Liquid Glass Progress Pod (No harsh strokes) */}
                    <div className="relative w-20 h-20 flex items-center justify-center my-1.5">
                      {isCompleted ? (
                        /* Chặng hoàn thành: Soft Emerald Glass Orb */
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/90 via-emerald-500/90 to-teal-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-[0_4px_16px_rgba(16,185,129,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.75)] transition-transform duration-300 hover:scale-105">
                          <Check size={22} strokeWidth={2.5} />
                        </div>
                      ) : isActive ? (
                        /* Chặng đang chạy: Soft Conic Liquid Glass Dial (No harsh strokes) */
                        <div
                          className="w-16 h-16 rounded-full p-[3.5px] flex items-center justify-center relative transition-transform duration-300 hover:scale-105 shadow-[0_4px_16px_rgba(37,99,235,0.22)]"
                          style={{
                            background: `conic-gradient(from 180deg, ${
                              isCampaign ? '#f59e0b, #fbbf24' : '#2563eb, #38bdf8'
                            } ${(p.progress ?? 0) * 3.6}deg, rgba(148, 163, 184, 0.15) ${(p.progress ?? 0) * 3.6}deg 360deg)`
                          }}
                        >
                          <div className="w-full h-full rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_2px_8px_rgba(0,0,0,0.12)]">
                            <span className={`text-xs font-black tracking-tight ${
                              isCampaign ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-cyan-400'
                            }`}>
                              {pct(p.progress)}
                            </span>
                            <span className="text-[7.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-tight">
                              {isEn ? 'Running' : 'Đang chạy'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Chặng chưa bắt đầu: Soft minimal glass pod */
                        <div className="w-16 h-16 rounded-full p-[2.5px] bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-slate-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                            P{p.position}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isActive
                        ? isCampaign
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                    }`}>
                      {isCompleted ? (isEn ? '✓ Completed' : '✓ Hoàn thành') : p.status === 'cancelled' ? (isEn ? 'Canceled' : 'Đã hủy') : p.status === 'on_hold' ? (isEn ? 'On Hold' : 'Tạm dừng') : p.status === 'in_review' ? (isEn ? 'In Review' : 'Đang nghiệm thu') : isActive ? (isEn ? '● In Progress' : '● Đang triển khai') : (isEn ? '○ Not Started' : '○ Chờ bắt đầu')}
                    </span>

                    {/* Phase Name & Desc */}
                    <b className={`text-xs block line-clamp-1 w-full ${
                      isSelected
                        ? (isCampaign ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400')
                        : 'text-gray-900 dark:text-white'
                    }`} title={p.name}>
                      {p.name}
                    </b>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block line-clamp-1 mt-0.5 w-full" title={p.desc}>
                      {p.desc}
                    </span>

                    {/* Phase PIC & Subtask Members & Tracking (Requirement 3) */}
                    {(() => {
                      const phaseTasks = allTasks.filter(t => t.workflow_phase_id === p.id);
                      const doneTasks = phaseTasks.filter(t => toWorkflowStage(t) === 'completed').length;
                      const totalTasks = phaseTasks.filter(t => toWorkflowStage(t) !== 'canceled').length;

                      // Unique subtask assignees
                      const subtaskAssigneesMap = new Map<string, { id?: string; name: string; avatar_url?: string; count: number }>();
                      phaseTasks.forEach(t => {
                        if (t.assignee?.name) {
                          const key = t.assignee.id || t.assignee.name;
                          const prev = subtaskAssigneesMap.get(key);
                          if (prev) {
                            prev.count += 1;
                          } else {
                            subtaskAssigneesMap.set(key, { id: t.assignee.id, name: t.assignee.name, avatar_url: t.assignee.avatar_url, count: 1 });
                          }
                        }
                      });
                      const subtaskAssignees = Array.from(subtaskAssigneesMap.values());

                      return (
                        <div className="w-full mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-700/60 flex flex-col items-center gap-1 text-[9.5px]">
                          {/* Date */}
                          <p className="text-[9px] text-gray-400">
                            {displayDate(p.start_date)} – {displayDate(p.due_date)}
                          </p>

                          {/* Phase PIC Row */}
                          <div className="flex items-center justify-center flex-wrap gap-1">
                            <span className="text-[8.5px] font-bold text-gray-400 uppercase tracking-tight">PIC:</span>
                            {p.members.length > 0 ? (
                              p.members.map(m => (
                                <span key={m.id} title={`${m.name} · ${m.role === 'sub_pic' ? 'Sub-PIC' : 'PIC'}`} className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                                  <Avatar name={m.name} src={m.avatar_url} className="w-4 h-4 text-[8px]" />
                                  <span className="truncate max-w-[65px]">{m.name}</span>
                                  {m.role === 'sub_pic' && <span className="text-[7.5px] text-amber-500 font-bold px-1 py-0.2 bg-amber-500/10 rounded">SUB</span>}
                                </span>
                              ))
                            ) : (
                              <span className="text-[8.5px] text-gray-400 italic">{isEn ? 'None' : 'Chưa giao'}</span>
                            )}
                          </div>

                          {/* Subtask Members & Tracking Row (Requirement 3) */}
                          <div className="flex items-center justify-between w-full mt-0.5 py-1 px-1.5 rounded-lg bg-gray-50/80 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-1 min-w-0" title={isEn ? `${subtaskAssignees.length} subtask members` : `${subtaskAssignees.length} thành viên thực hiện subtask`}>
                              <Users size={11} className="text-gray-400 shrink-0" />
                              {subtaskAssignees.length > 0 ? (
                                <div className="flex -space-x-1.5 items-center overflow-hidden">
                                  {subtaskAssignees.slice(0, 3).map(m => (
                                    <div key={m.name} title={`${m.name} (${m.count} ${isEn ? 'tasks' : 'việc'})`} className="ring-1 ring-white dark:ring-slate-800 rounded-full shrink-0">
                                      <Avatar name={m.name} src={m.avatar_url} className="w-3.5 h-3.5 text-[7px]" />
                                    </div>
                                  ))}
                                  {subtaskAssignees.length > 3 && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[7px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center ring-1 ring-white dark:ring-slate-800 shrink-0">
                                      +{subtaskAssignees.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[8px] text-gray-400 truncate">
                                  {phaseTasks.length === 0 ? (isEn ? 'No tasks' : 'Chưa có task') : (isEn ? 'Unassigned' : 'Chưa giao')}
                                </span>
                              )}
                            </div>

                            {/* Task Tracking Badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight shrink-0 ${
                                totalTasks === 0
                                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                                  : doneTasks === totalTasks
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25'
                              }`}
                              title={isEn ? `Tracking: ${doneTasks}/${totalTasks} tasks completed` : `Theo dõi: ${doneTasks}/${totalTasks} việc xong`}
                            >
                              {doneTasks}/{totalTasks} {isEn ? 'done' : 'xong'}
                            </span>
                          </div>

                          {/* Edit Phase Link */}
                          {currentEntity.root && (
                            <button
                              type="button"
                              onClick={e => handleOpenAddPhaseModal(idx, e, p)}
                              className="text-[9.5px] text-primary hover:underline transition-colors mt-0.5 cursor-pointer"
                            >
                              {isEn ? 'Edit phase' : 'Chỉnh sửa phase'}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Gate chance info */}
                    <div className="w-full mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">{isEn ? 'Gate chance:' : 'Cơ hội Gate:'}</span>
                      <span className={`font-bold ${
                        isCompleted ? 'text-emerald-500' : (p.gateChance ?? -1) >= 80 ? 'text-emerald-500' : (p.gateChance ?? -1) >= 50 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {pct(p.gateChance)}
                      </span>
                    </div>

                    {/* Action button: Xem chi tiết */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setIsDetailOpen(!isDetailOpen);
                        } else {
                          handlePhaseClick(idx);
                          setIsDetailOpen(true);
                        }
                      }}
                      className={`w-full mt-2 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                        isSelected && isDetailOpen
                          ? isCampaign
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && isDetailOpen ? (
                        <>
                          <ChevronUp size={13} />
                          <span>{isEn ? 'Collapse' : 'Thu gọn'}</span>
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          <span>{isEn ? 'View details' : 'Xem chi tiết'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Connecting Shape Link with (+) Center Bead between adjacent phases */}
                  {idx < phases.length - 1 && (
                    <div className="flex items-center justify-center self-center px-1 sm:px-2 shrink-0 relative group/connector">
                      {/* Connecting capsule shape */}
                      <div className={`h-2 w-8 sm:w-12 rounded-full transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-xs'
                          : isActive
                          ? (isCampaign ? 'bg-gradient-to-r from-amber-400 to-amber-200 dark:to-slate-700' : 'bg-gradient-to-r from-blue-500 to-blue-200 dark:to-slate-700')
                          : 'bg-gray-200 dark:bg-slate-700'
                      }`} />

                      {/* Center round shape (+) button */}
                      <button
                        type="button"
                        disabled={!currentEntity.root}
                        onClick={(e) => handleOpenAddPhaseModal(p.position, e)}
                        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 flex items-center justify-center transition-all shadow-sm hover:scale-110 z-20 cursor-pointer"
                        title={isEn ? `Insert new phase after phase ${idx + 1}` : `Chèn thêm giai đoạn mới sau chặng ${idx + 1}`}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add Phase End Card */}
            {currentEntity.root && <div className="flex flex-col items-center justify-center shrink-0 self-center p-3 ml-2 min-w-[120px]">
              <button
                type="button"
                onClick={() => handleOpenAddPhaseModal(phases.length)}
                className={`w-14 h-14 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm group cursor-pointer ${
                  isCampaign
                    ? 'border-amber-400/70 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                    : 'border-blue-400/70 hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                }`}
                title={isEn ? "Add new phase to end of roadmap" : "Thêm giai đoạn mới vào cuối lộ trình"}
              >
                <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-[8px] font-bold mt-0.5">{isEn ? 'Add Phase' : 'Thêm chặng'}</span>
              </button>
              <span className="text-[9px] text-gray-400 mt-1 text-center">{isEn ? 'Custom roadmap' : 'Tùy biến lộ trình'}</span>
            </div>}
            </div>
          </div>
        </div>

        {currentEntity.root && unplanned.length>0 && <section className="border-t border-gray-100 dark:border-slate-700 pt-3"><details><summary className="text-xs font-semibold cursor-pointer">{isEn ? `Unplanned tasks (${unplanned.length})` : `Task chưa gắn phase (${unplanned.length})`}</summary><div className="space-y-2 mt-3">{unplanned.map(t=><div key={t.id} className="flex flex-wrap items-center gap-2 text-xs"><button onClick={()=>setSelectedTask(t)} className="flex-1 min-w-0 text-left truncate">{t.title}</button><select aria-label={isEn ? 'Assign phase for '+t.title : 'Gắn phase cho '+t.title} className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-full" disabled={hub.busy} value="" onChange={e=>linkTask(t,e.target.value)}><option value="">{isEn ? 'Select phase...' : 'Chọn phase...'}</option>{phases.filter(p=>!['completed','cancelled'].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}</div></details></section>}
        {/* EXPANDED DETAILS SECTION: KHI BẤM VÀO LỘ TRÌNH THÌ MỚI HIỆN RA DETAILS TASK & GATE */}
        {isDetailOpen && activePhase && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">

            {/* Top Detail Bar with Close action */}
            <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  {isEn ? 'Selected Phase Details:' : 'Chi tiết chặng đang chọn:'}
                </span>
                <b className="text-xs text-gray-900 dark:text-white">
                  {activePhase.name} — {activePhase.desc}
                </b>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-semibold transition-colors"
              >
                <X size={14} /> {isEn ? 'Collapse details' : 'Thu gọn chi tiết'}
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
                      <span>{isEn ? 'Task progress' : 'Tiến độ công việc'}</span>
                      <span className="font-bold text-primary">{pct(phaseProgressPct)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${phaseProgressPct ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {doneSubtasksCount}/{totalSubtasksCount} {isEn ? 'tasks completed' : 'task hoàn thành'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{isEn ? 'Gate Opportunity' : 'Cơ hội qua Phase'}</span>
                      <span className={`font-bold ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {pct(gatePassChancePct)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (gatePassChancePct ?? -1) >= 80 ? 'bg-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${gatePassChancePct ?? 0}%` }}
                      />
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border mt-1 inline-block ${
                      readyToApprove ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {readinessLabel}
                    </span>
                  </div>
                </div>

                {/* Gate Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        {isEn ? 'Gate Checklist' : 'Tiêu chí thẩm định Gate'}
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">{isEn ? '(Score ≥ 80% to unlock next phase)' : '(Đạt ≥ 80% để mở khóa chặng sau)'}</span>
                    </div>

                    <button
                      type="button"
                      disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                      onClick={() => setShowAddCriteria(!showAddCriteria)}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus size={13} /> {isEn ? 'Add criterion' : 'Thêm tiêu chí'}
                    </button>
                  </div>

                  {showAddCriteria && (
                    <form onSubmit={handleAddCriteria} className="flex gap-2 mb-2.5">
                      <input
                        type="text"
                        value={newCriteriaLabel}
                        onChange={e => setNewCriteriaLabel(e.target.value)}
                        placeholder={isEn ? "Enter gate criterion..." : "Nhập tiêu chí điều kiện Gate..."}
                        className="flex-1 text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-primary"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold">
                        {isEn ? 'Save' : 'Lưu'}
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
                          disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                          checked={c.checked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className={c.checked ? 'font-semibold' : ''}>{c.label}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{isEn ? `Weight: ${c.weight}%` : `Trọng số: ${c.weight}%`}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gate Pass Approval Button */}
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {readyToApprove ? (isEn ? '✓ Tasks completed and checklist ≥80%. Ready to approve Gate.' : '✓ Task đã xong và checklist đạt ≥80%. PIC có thể duyệt Gate.') : (isEn ? 'Complete tasks and achieve checklist ≥80% before Gate approval.' : 'Hoàn thành task và checklist ≥80% trước khi PIC duyệt Gate.')}
                  </p>

                  {currentEntity.root && !['completed','cancelled'].includes(activePhase.status) && (
                    <button
                      type="button"
                      disabled={hub.busy || !readyToApprove}
                      onClick={handleAdvancePhase}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        (gatePassChancePct ?? -1) >= 80
                          ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <span>{phases[activePhaseIndex + 1] ? (isEn ? `Approve to ${phases[activePhaseIndex + 1].name}` : 'Phê duyệt qua ' + phases[activePhaseIndex + 1].name) : (isEn ? 'Complete phase' : 'Hoàn thành phase')}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Quản Lý Đầu Việc Kỹ Thuật (Subtasks) của chặng (5 Cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700/80 pb-2.5 mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Code2 size={15} className={isCampaign ? 'text-amber-500' : 'text-blue-600'} />
                        {isEn ? 'Tasks' : 'Đầu việc'} ({doneSubtasksCount}/{totalSubtasksCount})
                      </h4>
                      <span className="text-[10px] text-gray-400">{isEn ? 'Add, edit, delete, and switch task status' : 'Thêm, sửa, xóa và chuyển đổi trạng thái task'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{pct(phaseProgressPct)}</span>
                      <button
                        type="button"
                        disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
                        onClick={() => setShowAddTask(!showAddTask)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                          isCampaign
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title={isEn ? 'Add new task to this phase' : 'Thêm đầu việc mới vào chặng này'}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>{isEn ? 'Add task' : 'Thêm task'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Task Form */}
                  {showAddTask && (
                    <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-slate-800/90 mb-3 space-y-2.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Plus size={12} strokeWidth={2.5} /> {isEn ? 'Add new task' : 'Thêm đầu việc mới'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        placeholder={isEn ? 'Enter task title...' : 'Nhập tên đầu việc...'}
                        autoFocus
                        className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <MultiSelect options={taskOptions} value={newTaskAssignee ? [newTaskAssignee] : []} maxSelected={1} onChange={(ids:string[])=>setNewTaskAssignee(ids[0] || '')} placeholder={isEn ? 'Select task PIC...' : 'Chọn PIC task...'} />
                        <WorkflowDateField id="workflow-task-due" value={newTaskDue} onChange={setNewTaskDue}/>

                        <select
                          value={newTaskStatus}
                          onChange={e => setNewTaskStatus(e.target.value as WorkflowTaskStatus)}
                          className="text-xs p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                        >
                          {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                            <option key={st} value={st}>
                              {isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || WORKFLOW_STATUS_CONFIG[st].label)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {isEn ? 'Cancel' : 'Hủy'}
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                        >
                          {isEn ? 'Save task' : 'Lưu đầu việc'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Subtasks List */}
                  <div className="space-y-2">
                    {currentPhaseSubtasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">
                        {isEn ? 'No tasks in this phase yet. Click "Add task" to create the first one.' : 'Chưa có đầu việc nào trong giai đoạn này. Bấm "Thêm task" để tạo đầu việc đầu tiên.'}
                      </div>
                    ) : (
                      currentPhaseSubtasks.map((s) => {
                        const done = s.status === 'completed';
                        const isEditing = editingTaskId === s.id;

                        if (isEditing) {
                          return (
                            <div
                              key={s.id}
                              className="p-3 rounded-xl border border-blue-400 bg-white dark:bg-slate-900 shadow-sm space-y-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-blue-600 uppercase">{isEn ? 'Editing task' : 'Đang chỉnh sửa đầu việc'}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={editTaskTitle}
                                onChange={e => setEditTaskTitle(e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                              />

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                {currentEntity.root ? <MultiSelect options={taskOptions} value={editTaskAssignee ? [editTaskAssignee] : []} maxSelected={1} onChange={(ids:string[])=>setEditTaskAssignee(ids[0] || '')} placeholder={isEn ? 'Select task PIC...' : 'Chọn PIC task...'} /> : <span className="text-xs">{s.assignee}</span>}
                                <WorkflowDateField id="workflow-edit-task-due" value={editTaskDue} onChange={setEditTaskDue}/>
                                <select
                                  value={editTaskStatus}
                                  onChange={e => setEditTaskStatus(e.target.value as WorkflowTaskStatus)}
                                  className="text-[11px] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                  {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                                    <option key={st} value={st}>
                                      {isEn ? WORKFLOW_STATUS_LABELS_EN[st] : (WORKFLOW_STATUS_LABELS_VI[st] || WORKFLOW_STATUS_CONFIG[st].label)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  {isEn ? 'Cancel' : 'Hủy'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveEditTask(s.id, e)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                                >
                                  <Check size={12} strokeWidth={2.5} /> {isEn ? 'Save changes' : 'Lưu thay đổi'}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={s.id}
                            className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group/task relative ${
                              'z-10'
                            } ${
                              done
                                ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/60'
                            }`}
                          >
                            {/* Left: Checkbox + Status Hexagon + Title */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                disabled={!s.canEdit || hub.busy}
                                checked={done}
                                onChange={() => toggleSubtask(s.id)}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                                title={isEn ? 'Mark completed' : 'Đánh dấu hoàn thành'}
                              />

                              <WorkflowStatusPicker status={s.record.status} stage={s.status} disabled={!s.canEdit || hub.busy} onChange={async stage=>{await handleQuickChangeStatus(s.id,stage);}} />

                              {/* Task Title */}
                              <button type="button" onClick={()=>setSelectedTask(s.record)}
                                className={`text-left text-xs truncate flex-1 min-w-0 ${
                                  done ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-white'
                                }`}
                                title={s.title}
                              >
                                {s.title}
                              </button>
                            </div>

                            {/* Right: Assignee, Due date & Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto ml-6 sm:ml-0">
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                <User size={10} className="text-gray-400" />
                                <span className="truncate max-w-[80px]">{s.assignee}</span>
                              </span>

                              {s.due_date && (
                                <span className="hidden sm:flex items-center gap-0.5 text-[9px] text-gray-400">
                                  <Calendar size={10} />
                                  <span>{displayDate(s.due_date)}</span>
                                </span>
                              )}

                              {/* Edit Action */}
                              <button
                                type="button"
                                disabled={!s.canEdit || hub.busy}
                                onClick={(e) => handleStartEditTask(s, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer disabled:hidden"
                                title={isEn ? 'Edit task' : 'Chỉnh sửa đầu việc'}
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                disabled={!s.canEdit || hub.busy}
                                onClick={(e) => handleDeleteTask(s.id, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:hidden"
                                title={isEn ? 'Delete task' : 'Xóa đầu việc'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>{isEn ? 'Phase completion:' : 'Tiến độ hoàn thành chặng:'}</span>
                  <b className="text-primary font-bold">{doneSubtasksCount}/{totalSubtasksCount} {isEn ? 'tasks completed' : 'công việc xong'}</b>
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
                  {isEn ? 'Task Status This Month' : 'Trạng thái Task Tháng Này'}
                </h3>
                <span className="text-[11px] text-gray-400">{new Date().toLocaleDateString(isEn ? 'en-US' : 'vi-VN',{month:'long',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})} · {isEn ? `Total: ${totalMonthTasks} tasks` : `Tổng: ${totalMonthTasks} tasks`}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                {isEn ? 'Current Month' : 'Tháng hiện tại'}
              </span>
            </div>

            {/* Donut Chart with Gentle Glass Center Hub - Soft & Technical (No Stroke) */}
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentMonthTaskStats}
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    cornerRadius={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {currentMonthTaskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center gentle glass hub - Soft & Technical (No border stroke) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-22 h-22 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_6px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-slate-400">{isEn ? 'Completed' : 'Hoàn thành'}</span>
                  <b className="text-xl font-extrabold text-emerald-500 dark:text-emerald-400">
                    {totalMonthTasks ? Math.round(currentMonthTaskStats[0].value * 100 / totalMonthTasks) + '%' : '—'}
                  </b>
                </div>
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
                  {isEn ? 'Execution Performance & Velocity' : 'Hiệu Suất Thực Thi & Vận Tốc'}
                </h3>
                <span className="text-[11px] text-gray-400">
                  {isEn ? 'Delivery progress vs. plan target' : 'Tiến độ bàn giao so với kế hoạch mục tiêu'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {isEn ? 'Actual' : 'Thực tế'}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-0.5 bg-gray-400" /> {isEn ? 'Plan' : 'Kế hoạch'}
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
                    name={isEn ? 'Actual' : 'Thực tế'}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="plan"
                    name={isEn ? 'Plan' : 'Kế hoạch'}
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
            <span>{isEn ? `Pace assessment (${activePhase?.name || 'No phase'}):` : `Đánh giá nhịp độ (${activePhase?.name || 'Chưa có phase'}):`}</span>
            <span className="font-semibold text-emerald-500">
              {isEn ? `Progress ${pct(activePhase?.progress)} — Gate indicator ${pct(gatePassChancePct)}` : `Tiến độ ${pct(activePhase?.progress)} — Chỉ báo Gate ${pct(gatePassChancePct)}`}
            </span>
          </div>
        </div>

      </div>

      {selectedTask && (selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-') ? <SubtaskDetailPanel subtask={{...selectedTask,id:selectedTask.id.slice(3),assignee_id:Number(selectedTask.assignee_id)}} profile={hub.profile} people={hub.people} parentName={currentEntity.name} entityType={selectedTask.id.startsWith('ps-')?'project_subtask':'campaign_subtask'} onClose={()=>setSelectedTask(null)} onUpdated={()=>{void hub.refresh();}}/> : <TaskDetailPanel task={hub.tasks.find(t=>t.id===selectedTask.id) || selectedTask} isOpen onClose={()=>setSelectedTask(null)} onTaskUpdated={()=>{void hub.refresh();}}/>)}
      {/* 5. ADD PHASE MODAL (Requirement 5) */}
      {showAddPhaseModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddPhaseModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isCampaign ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}>
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {editingPhaseId ? (isEn ? 'Edit phase' : 'Chỉnh sửa phase') : (isEn ? 'Add new phase' : 'Thêm giai đoạn mới')}
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    {editingPhaseId ? (isEn ? 'PIC and sub-PIC only have permissions on assigned phases' : 'PIC và sub-PIC chỉ có quyền trên phase được giao') : (isEn ? `Insert into phase #${insertPhaseIndex + 1}` : `Chèn vào vị trí chặng số ${insertPhaseIndex + 1}`)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhaseModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePhase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isEn ? 'Phase name' : 'Tên giai đoạn'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={e => setNewPhaseName(e.target.value)}
                  placeholder={isEn ? 'Enter phase name...' : 'Nhập tên giai đoạn...'}
                  autoFocus
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isEn ? 'Phase objective description' : 'Mô tả mục tiêu giai đoạn'}
                </label>
                <textarea
                  rows={2}
                  value={newPhaseDesc}
                  onChange={e => setNewPhaseDesc(e.target.value)}
                  placeholder={isEn ? 'Objective and expected deliverables...' : 'Mục tiêu và kết quả cần bàn giao...'}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">{isEn ? 'Start date' : 'Ngày bắt đầu'}<WorkflowDateField id="workflow-phase-start" value={phaseStart} onChange={setPhaseStart}/></label><label className="text-xs font-semibold">{isEn ? 'Due date' : 'Ngày kết thúc'}<WorkflowDateField id="workflow-phase-due" value={phaseDue} onChange={setPhaseDue}/></label></div>
              <label className="block text-xs font-semibold">{isEn ? 'Phase PIC *' : 'PIC phase *'}<MultiSelect options={personOptions} value={phasePicIds} onChange={setPhasePicIds} placeholder={isEn ? 'Select phase PIC...' : 'Chọn PIC phase...'}/></label>
              <label className="block text-xs font-semibold">{isEn ? 'Phase Sub-PIC' : 'Sub-PIC phase'}<MultiSelect options={personOptions.filter(p=>!phasePicIds.includes(p.value))} value={phaseSubIds} onChange={setPhaseSubIds} placeholder={isEn ? 'Select phase Sub-PIC...' : 'Chọn sub-PIC phase...'}/></label>
              <label className="block text-xs font-semibold">{isEn ? 'Status' : 'Trạng thái'}<select className={field} value={phaseStatus} onChange={e=>setPhaseStatus(e.target.value)}>{[['todo', isEn ? 'Todo' : 'Chưa bắt đầu'],['in_progress', isEn ? 'In progress' : 'Đang triển khai'],['in_review', isEn ? 'In review' : 'Đang nghiệm thu'],['on_hold', isEn ? 'On hold' : 'Tạm dừng'],['completed', isEn ? 'Completed' : 'Hoàn thành'],['cancelled', isEn ? 'Canceled' : 'Đã hủy']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <div className="space-y-2"><label className="block text-xs font-semibold">{isEn ? 'Gate opportunity · PIC evaluation (optional)' : 'Cơ hội qua phase · PIC đánh giá (tùy chọn)'}<input type="number" min="0" max="100" className={field} value={phaseOpportunity} onChange={e=>setPhaseOpportunity(e.target.value)} placeholder={isEn ? 'Not evaluated' : 'Chưa đánh giá'}/></label><textarea className={field} value={phaseReason} onChange={e=>setPhaseReason(e.target.value)} placeholder={isEn ? 'Evaluation basis · required when entering %' : 'Cơ sở đánh giá · bắt buộc khi nhập %'}/></div>
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy bỏ'}
                </button>
                <button
                  type="submit" disabled={hub.busy}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCampaign
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{hub.busy ? (isEn ? 'Saving...' : 'Đang lưu...') : editingPhaseId ? (isEn ? 'Save phase' : 'Lưu phase') : (isEn ? 'Create phase' : 'Tạo giai đoạn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PHASE CONFIRMATION MODAL (Requirement 2) */}
      {phaseToDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !hub.busy && setPhaseToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-phase-modal-title"
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 size={20} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="delete-phase-modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                  {isEn ? 'Delete Phase Confirmation' : 'Xác nhận xóa giai đoạn'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isEn ? 'Review the phase details before removing from roadmap.' : 'Kiểm tra kỹ thông tin giai đoạn trước khi gỡ khỏi lộ trình.'}
                </p>
              </div>
              <button
                type="button"
                disabled={hub.busy}
                onClick={() => setPhaseToDelete(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Phase Target Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {isEn ? `Phase ${phaseToDelete.phase.position}` : `Chặng ${phaseToDelete.phase.position}`}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {allTasks.filter(t => t.workflow_phase_id === phaseToDelete.phase.id).length} {isEn ? 'linked tasks' : 'task trong phase'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {phaseToDelete.phase.title}
              </h4>
              {phaseToDelete.phase.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {phaseToDelete.phase.description}
                </p>
              )}
            </div>

            {/* Warning Message based on linked tasks */}
            {(() => {
              const linkedCount = allTasks.filter(t => t.workflow_phase_id === phaseToDelete.phase.id).length;
              if (linkedCount > 0) {
                return (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <span className="font-bold">{isEn ? 'Preservation Notice: ' : 'Lưu ý bảo toàn dữ liệu: '}</span>
                      {isEn
                        ? `This phase currently has ${linkedCount} tasks. These tasks will NOT be deleted; they will be safely kept and moved to "Unplanned tasks".`
                        : `Phase này đang có ${linkedCount} task. Các task sẽ KHÔNG bị mất đi mà được giữ nguyên an toàn và chuyển về mục "Task chưa gắn phase".`}
                    </div>
                  </div>
                );
              }
              return (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEn
                    ? 'This phase is empty and will be completely removed from the project roadmap.'
                    : 'Giai đoạn này đang trống và sẽ được gỡ bỏ hoàn toàn khỏi lộ trình dự án.'}
                </p>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                disabled={hub.busy}
                onClick={() => setPhaseToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                disabled={hub.busy}
                onClick={confirmDeletePhase}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>{hub.busy ? (isEn ? 'Deleting...' : 'Đang xóa...') : (isEn ? 'Confirm Delete' : 'Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
