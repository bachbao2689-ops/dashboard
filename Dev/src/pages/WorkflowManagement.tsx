import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderKanban, ArrowRight,  ShieldCheck,
  Sparkles, Plus, BarChart2, Activity,
  ChevronDown, ChevronUp, X, Globe, Code2, Info, Search,
  Calendar, User, Edit3, Trash2, Eye, Check, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkflowHub } from '../hooks/useWorkflowHub';
import type { Task } from '../hooks/useTasks';
import { gateScore, taskProgress, workflowMetrics, displayDate, inputDate, localDay, type HubPhase, type GateCriterion } from '../lib/workflowHub';
import { WorkflowStatusPicker, canonicalWorkflowStatus, workflowStage, WORKFLOW_STATUS_CONFIG, MARKETING_STATUS_GUIDES, WorkflowHexagonIcon, type WorkflowTaskStatus } from '../components/features/tasks/WorkflowStatusPicker';
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
  const [activePhaseId, setActivePhaseId] = useState('');
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
  const allTasks = useMemo(() => hub.tasks.filter(t => currentEntity && (currentEntity.type === 'project' ? t.project_id === currentEntity.entity_id : t.campaign_id === currentEntity.entity_id)), [hub.tasks, currentEntity?.entity_id, currentEntity?.type]);
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
  const metrics = workflowMetrics(allTasks);
  const overallProjectProgressPct = metrics.progress;
  const daysRemaining = currentEntity?.due_date ? Math.round((Date.parse(currentEntity.due_date.slice(0,10)) - Date.parse(localDay(new Date()))) / 86400000) : null;
  const entityTimeline = displayDate(currentEntity?.start_date) + ' – ' + displayDate(currentEntity?.due_date);
  const subTeamMembers = currentEntity?.sub_pics || [];
  const leadInfo = { name: (currentEntity?.pics || []).map(p => p.name).join(', ') || 'Chưa giao PIC', avatar: currentEntity?.pics[0]?.avatar_url, role: 'PIC' };
  const taskCountsByStatus = Object.fromEntries(Object.keys(WORKFLOW_STATUS_CONFIG).map(s => [s, allTasks.filter(t => toWorkflowStage(t) === s).length])) as Record<WorkflowTaskStatus,number>;
  const currentMonthTaskStats = ['Hoàn thành (Done)', 'Đang thực hiện (In Progress)', 'Đang xem xét (Review)', 'Quá hạn (Overdue)', 'Chưa làm (Todo)'].map((name, i) => ({name, value: metrics.buckets[i], color: ['#10b981','#3b82f6','#8b5cf6','#ef4444','#64748b'][i]}));
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
  useEffect(() => { setIsDetailOpen(false); setActivePhaseId(''); setShowAddTask(false); setEditingTaskId(null); setShowAddPhaseModal(false); setSelectedTask(null); }, [currentEntity?.id, hub.profile?.id]);
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
  const handleDeletePhase = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); const phase = phases[index];
    if (currentEntity?.root && window.confirm('Xóa phase trống "' + phase.title + '"? Phase có task sẽ được giữ lại.')) void attempt(() => hub.mutate(() => supabase.rpc('workflow_remove_phase',{p_phase:phase.id,p_expected:phase.version})), 'Đã xóa phase trống');
  };
  const handleAdvancePhase = async () => {
    if (!activePhase) return;
    await attempt(async () => { const id = await hub.mutate(() => supabase.rpc('workflow_advance_phase',{p_phase:activePhase.id,p_expected:activePhase.version})); if (id) setActivePhaseId(id); }, 'Đã duyệt Gate và cập nhật phase');
  };
  const handlePhaseClick = (index: number) => { setActivePhaseId(phases[index]?.id || ''); setEditingTaskId(null); setShowAddTask(false); };
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
              • {currentEntity.root ? 'PIC toàn bộ (Full Scope)' : 'Phạm vi được giao (Assigned Scope)'}
            </span>
          </div>

          {/* Main Title as Filter Dropdown */}
          <div className="relative inline-block my-0.5">
            <button
              type="button"
              onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
              className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer"
              title="Bấm để chọn và lọc Project / Campaign"
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
          </div>

          {/* Time row: Timeline + Workload còn mấy ngày (Requirement 2) */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span>{entityTimeline}</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Clock size={10} />
              <span>{daysRemaining == null ? 'Chưa có hạn (No deadline)' : daysRemaining < 0 ? 'Trễ ' + Math.abs(daysRemaining) + ' ngày (' + Math.abs(daysRemaining) + 'd overdue)' : 'Còn ' + daysRemaining + ' ngày (' + daysRemaining + 'd left)'}</span>
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
                  title={`${sub.name} (Thành viên tham gia)`}
                  className={`w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-extrabold text-white shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer`}
                >
                  <Avatar name={sub.name} src={sub.avatar_url} className="w-full h-full text-[8px]" />
                </div>
              ))}
            </div>

            <StatusBadge status={currentEntity.status} bilingual />
            <button onClick={()=>navigate('/projects')} className="text-[10px] font-semibold underline">Projects/Campaigns →</button>
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
                {currentEntity.root ? 'Tiến độ tổng thể (Overall Progress)' : 'Tiến độ được giao (Assigned Progress)'}
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
                aria-label="Thông tin chỉ số Tiến độ tổng thể"
                title="Xem cơ chế & cách tính Tiến độ tổng thể"
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
              {activePhase ? 'Đang xem (Viewing): ' + activePhase.name : 'PIC chưa tạo lộ trình (No phase roadmap)'}
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
                    Tiến độ tổng thể (Overall Progress)
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                    <span>Tỷ lệ task hoàn thành trên các task còn hoạt động của Project/Campaign trong phạm vi được xem.</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                    <code className="text-primary dark:text-blue-400 font-mono text-[10px] break-words font-semibold">
                      (Số subtasks đã xong / Tổng số subtasks toàn dự án) × 100%
                    </code>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                    Task đã hủy không nằm trong mẫu số. Không có task thì hiển thị —.
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate" title="Sức khỏe & Cơ hội qua Phase (Stage-Gate Health)">
                Sức khỏe & Cơ hội qua Phase (Stage-Gate Health)
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
                aria-label="Thông tin chỉ số Sức khỏe & Cơ hội qua Phase"
                title="Xem cơ chế & cách tính Sức khỏe & Cơ hội qua Phase"
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className={`text-xl sm:text-2xl font-extrabold ${(gatePassChancePct ?? -1) >= 80 ? 'text-emerald-500' : (gatePassChancePct ?? -1) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {pct(gatePassChancePct)}
              </b>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                (gatePassChancePct ?? -1) >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {gatePassChancePct == null ? 'Chưa đánh giá (Not evaluated)' : (gatePassChancePct ?? -1) >= 80 ? '🟢 Đủ điều kiện (Eligible)' : '🟡 Cần rà soát (Review needed)'}
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              {activePhase?.opportunity != null ? 'PIC đánh giá (PIC eval) · ' + (activePhase.opportunity_note || '') : 'Gate Checklist: ' + (criteriaScore == null ? 'Chưa có tiêu chí (No criteria)' : criteriaScore + '/100')}
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
                    Điểm Gate là chỉ báo theo checklist và tiến độ thật; không phải xác suất thống kê. PIC có thể ghi đánh giá riêng kèm cơ sở. Duyệt Gate cần task xong và checklist ≥80%.
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
                Vận tốc (Velocity)
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
                aria-label="Thông tin chỉ số Vận tốc"
                title="Xem cơ chế & cách tính Vận tốc"
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {metrics.velocity == null ? '—' : metrics.velocity} <span className="text-xs font-normal text-gray-500">ngày/task (days/task)</span>
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                {allTasks.filter(t=>t.completed_at).length} task có thời gian (dated tasks)
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Tốc độ giải quyết task kỹ thuật (Avg completion time)
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
                    Chỉ tính task có thời gian bắt đầu/tạo và completed_at thực tế.
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
                Đúng cam kết hạn (On-Time Rate)
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
                aria-label="Thông tin chỉ số Đúng cam kết hạn"
                title="Xem cơ chế & cách tính Đúng cam kết hạn"
              >
                <Info size={11} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-baseline justify-between my-0.5">
              <b className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {pct(metrics.onTime)}
              </b>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                Dữ liệu thật (Real data)
              </span>
            </div>

            <span className="text-[9px] text-gray-400 block truncate mt-0.5">
              Mốc deadline 23:59:59 (Standard 23:59:59 cutoff)
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
              Lộ trình giai đoạn (Stage-Gate Stepper Timeline)
            </h3>

            {/* Thanh Task biểu hiện những Task trong đó (Requirement 3: move xuống bảng Lộ trình giai đoạn) */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5">
                Task trong phạm vi (Tasks in scope):
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
                  aria-label="Cơ chế & quy chuẩn 7 trạng thái Task"
                  title="Xem cơ chế & quy chuẩn 7 trạng thái Task (Marketing)"
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
                            Cơ chế & Quy chuẩn 7 Trạng thái Task
                          </h4>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
                            Chuẩn hóa theo quy trình Marketing & Vận hành chiến dịch
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50">
                        Marketing Ops
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar text-[11px]">
                      {MARKETING_STATUS_GUIDES.map((item) => {
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
                              <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
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
                      <span>💡 <b>Quy ước:</b> Nộp draft ấn phẩm chuyển <b>In QA</b> để Leader duyệt trước khi sang <b>Completed</b>.</span>
                    </div>
                  </div>
                )}
              </div>

              {(['backlog', 'planned', 'scoping', 'in_progress', 'in_qa', 'completed', 'canceled'] as WorkflowTaskStatus[]).map(st => {
                const count = taskCountsByStatus[st] || 0;
                const cfg = WORKFLOW_STATUS_CONFIG[st];
                return (
                  <div
                    key={st}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] ${cfg.bgLight} ${cfg.bgDark} ${cfg.borderClass}`}
                    title={`${cfg.label}: ${count} tasks`}
                  >
                    <WorkflowHexagonIcon status={st} size={13} />
                    <span className={`font-bold ${cfg.textColor}`}>
                      {count}
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap min-w-0 items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Chặng đang chọn (Selected phase):</span>
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
              title={isDetailOpen ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
            >
              {isDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {!phases.length && <div className="py-8 text-center text-sm text-gray-500">{currentEntity.root ? 'Chưa có phase. Thêm chặng để giao PIC và sub-PIC (No phases yet. Add a phase to assign PIC & sub-PIC).' : 'Chưa được giao phase. Liên hệ PIC để tham gia đúng giai đoạn (Not assigned to any phase. Contact PIC to join).'}</div>}
        {/* Timeline Connected Stepper Nodes (Circular Gauge & Connecting Shape Links) */}
        <div className="relative pt-2 pb-2 overflow-x-auto custom-scrollbar">
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
                        Chặng {p.position}{currentEntity.root ? '/' + phases.length : ' · được giao'}
                      </span>

                      {currentEntity.root && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePhase(idx, e)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-auto"
                          title={`Xóa giai đoạn: ${p.name}`}
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
                              Đang chạy
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
                      {isCompleted ? '✓ Hoàn thành' : p.status === 'cancelled' ? 'Đã hủy' : p.status === 'on_hold' ? 'Tạm dừng' : p.status === 'in_review' ? 'Đang nghiệm thu' : isActive ? '● Đang triển khai' : '○ Chờ bắt đầu'}
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

                    <div className="w-full mt-1 space-y-1"><p className="text-[9px] text-gray-400">{displayDate(p.start_date)} – {displayDate(p.due_date)}</p><div className="flex flex-wrap justify-center gap-1">{p.members.map(m=><span key={m.id} title={m.name + ' · ' + (m.role || 'PIC')} className="inline-flex items-center gap-1 text-[9px]"><Avatar name={m.name} src={m.avatar_url} className="w-4 h-4 text-[8px]"/>{m.name}{m.role==='sub_pic'?' · SUB':''}</span>)}</div>{currentEntity.root && <button onClick={e=>handleOpenAddPhaseModal(idx,e,p)} className="text-[10px] text-primary underline">Chỉnh sửa phase</button>}</div>
                    {/* Gate chance info */}
                    <div className="w-full mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">Cơ hội Gate:</span>
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
                          <span>Thu gọn</span>
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          <span>Xem chi tiết</span>
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
                        title={`Chèn thêm giai đoạn mới sau chặng ${idx + 1}`}
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
                title="Thêm giai đoạn mới vào cuối lộ trình"
              >
                <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-[8px] font-bold mt-0.5">Thêm chặng (Add)</span>
              </button>
              <span className="text-[9px] text-gray-400 mt-1 text-center">Tùy biến lộ trình (Custom)</span>
            </div>}
          </div>
        </div>

        {currentEntity.root && unplanned.length>0 && <section className="border-t border-gray-100 dark:border-slate-700 pt-3"><details><summary className="text-xs font-semibold cursor-pointer">Task chưa gắn phase ({unplanned.length})</summary><div className="space-y-2 mt-3">{unplanned.map(t=><div key={t.id} className="flex flex-wrap items-center gap-2 text-xs"><button onClick={()=>setSelectedTask(t)} className="flex-1 min-w-0 text-left truncate">{t.title}</button><select aria-label={'Gắn phase cho '+t.title} className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-full" disabled={hub.busy} value="" onChange={e=>linkTask(t,e.target.value)}><option value="">Chọn phase...</option>{phases.filter(p=>!['completed','cancelled'].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}</div></details></section>}
        {/* EXPANDED DETAILS SECTION: KHI BẤM VÀO LỘ TRÌNH THÌ MỚI HIỆN RA DETAILS TASK & GATE */}
        {isDetailOpen && activePhase && (
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
                      <span className="font-bold text-primary">{pct(phaseProgressPct)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${phaseProgressPct ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {doneSubtasksCount}/{totalSubtasksCount} task hoàn thành
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Cơ hội qua Phase</span>
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
                      (gatePassChancePct ?? -1) >= 80 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {(gatePassChancePct ?? -1) >= 80 ? '🟢 Đủ điều kiện (>80%)' : '🟡 Cần bổ sung tiêu chí'}
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
                      disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
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
                          disabled={!activePhase.can_edit_tasks || hub.busy || ['completed','cancelled'].includes(activePhase.status)}
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
                    {doneSubtasksCount === totalSubtasksCount && totalSubtasksCount > 0 && (criteriaScore || 0) >= 80 ? '✓ Task đã xong và checklist đạt ≥80%. PIC có thể duyệt Gate.' : 'Hoàn thành task và checklist ≥80% trước khi PIC duyệt Gate.'}
                  </p>

                  {currentEntity.root && !['completed','cancelled'].includes(activePhase.status) && (
                    <button
                      type="button"
                      disabled={hub.busy || criteriaScore == null || criteriaScore < 80 || !totalSubtasksCount || doneSubtasksCount !== totalSubtasksCount}
                      onClick={handleAdvancePhase}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        (gatePassChancePct ?? -1) >= 80
                          ? 'bg-[#002e6d] hover:bg-[#001f4d] text-white cursor-pointer hover:shadow-md'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <span>{phases[activePhaseIndex + 1] ? 'Phê duyệt qua ' + phases[activePhaseIndex + 1].name : 'Hoàn thành phase'}</span>
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
                        Đầu việc ({doneSubtasksCount}/{totalSubtasksCount})
                      </h4>
                      <span className="text-[10px] text-gray-400">Thêm, sửa, xóa và chuyển đổi trạng thái task</span>
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
                        title="Thêm đầu việc mới vào chặng này"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Thêm task</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Task Form */}
                  {showAddTask && (
                    <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-slate-800/90 mb-3 space-y-2.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Plus size={12} strokeWidth={2.5} /> Thêm đầu việc mới
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
                        placeholder="Nhập tên đầu việc..."
                        autoFocus
                        className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <MultiSelect options={taskOptions} value={newTaskAssignee ? [newTaskAssignee] : []} maxSelected={1} onChange={(ids:string[])=>setNewTaskAssignee(ids[0] || '')} placeholder="Chọn PIC task..." />
                        <WorkflowDateField id="workflow-task-due" value={newTaskDue} onChange={setNewTaskDue}/>

                        <select
                          value={newTaskStatus}
                          onChange={e => setNewTaskStatus(e.target.value as WorkflowTaskStatus)}
                          className="text-xs p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                        >
                          {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                            <option key={st} value={st}>
                              {WORKFLOW_STATUS_CONFIG[st].label}
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
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                        >
                          Lưu đầu việc
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Subtasks List */}
                  <div className="space-y-2">
                    {currentPhaseSubtasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">
                        Chưa có đầu việc nào trong giai đoạn này. Bấm &quot;Thêm task&quot; để tạo đầu việc đầu tiên.
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
                                <span className="text-[10px] font-bold text-blue-600 uppercase">Đang chỉnh sửa đầu việc</span>
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
                                {currentEntity.root ? <MultiSelect options={taskOptions} value={editTaskAssignee ? [editTaskAssignee] : []} maxSelected={1} onChange={(ids:string[])=>setEditTaskAssignee(ids[0] || '')} placeholder="Chọn PIC task..." /> : <span className="text-xs">{s.assignee}</span>}
                                <WorkflowDateField id="workflow-edit-task-due" value={editTaskDue} onChange={setEditTaskDue}/>
                                <select
                                  value={editTaskStatus}
                                  onChange={e => setEditTaskStatus(e.target.value as WorkflowTaskStatus)}
                                  className="text-[11px] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                  {(Object.keys(WORKFLOW_STATUS_CONFIG) as WorkflowTaskStatus[]).map(st => (
                                    <option key={st} value={st}>
                                      {WORKFLOW_STATUS_CONFIG[st].label}
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
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveEditTask(s.id, e)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                                >
                                  <Check size={12} strokeWidth={2.5} /> Lưu thay đổi
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
                                title="Đánh dấu hoàn thành"
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
                                title="Chỉnh sửa đầu việc"
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                disabled={!s.canEdit || hub.busy}
                                onClick={(e) => handleDeleteTask(s.id, e)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:hidden"
                                title="Xóa đầu việc"
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
                  Trạng thái Task Tháng Này (Task Status This Month)
                </h3>
                <span className="text-[11px] text-gray-400">{new Date().toLocaleDateString('vi-VN',{month:'long',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})} · Tổng {totalMonthTasks} tasks (Total: {totalMonthTasks})</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                Current Month
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
                  <span className="text-[10px] font-medium text-gray-400 dark:text-slate-400">Hoàn thành (Done)</span>
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
                  Hiệu Suất Thực Thi & Vận Tốc (Burndown & Velocity)
                </h3>
                <span className="text-[11px] text-gray-400">
                  Tiến độ bàn giao so với kế hoạch mục tiêu (Delivery progress vs. Plan target)
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Thực tế (Actual)
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-0.5 bg-gray-400" /> Mục tiêu (Plan)
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
                    name="Thực tế (Actual tasks)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="plan"
                    name="Kế hoạch (Plan target)"
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
            <span>Đánh giá nhịp độ (Pace assessment - {activePhase?.name || 'Chưa có phase / No phase'}):</span>
            <span className="font-semibold text-emerald-500">
              Tiến độ (Progress) {pct(activePhase?.progress)} — Chỉ báo Gate (Gate indicator) {pct(gatePassChancePct)}
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
                    {editingPhaseId ? 'Chỉnh sửa phase' : 'Thêm giai đoạn mới'}
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    {editingPhaseId ? 'PIC và sub-PIC chỉ có quyền trên phase được giao' : 'Chèn vào vị trí chặng số ' + (insertPhaseIndex + 1)}
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
                  Tên giai đoạn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={e => setNewPhaseName(e.target.value)}
                  placeholder="Nhập tên giai đoạn..."
                  autoFocus
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Mô tả mục tiêu giai đoạn
                </label>
                <textarea
                  rows={2}
                  value={newPhaseDesc}
                  onChange={e => setNewPhaseDesc(e.target.value)}
                  placeholder="Mục tiêu và kết quả cần bàn giao..."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Ngày bắt đầu<WorkflowDateField id="workflow-phase-start" value={phaseStart} onChange={setPhaseStart}/></label><label className="text-xs font-semibold">Ngày kết thúc<WorkflowDateField id="workflow-phase-due" value={phaseDue} onChange={setPhaseDue}/></label></div>
              <label className="block text-xs font-semibold">PIC phase *<MultiSelect options={personOptions} value={phasePicIds} onChange={setPhasePicIds} placeholder="Chọn PIC phase..."/></label>
              <label className="block text-xs font-semibold">Sub-PIC phase<MultiSelect options={personOptions.filter(p=>!phasePicIds.includes(p.value))} value={phaseSubIds} onChange={setPhaseSubIds} placeholder="Chọn sub-PIC phase..."/></label>
              <label className="block text-xs font-semibold">Trạng thái<select className={field} value={phaseStatus} onChange={e=>setPhaseStatus(e.target.value)}>{[['todo','Chưa bắt đầu'],['in_progress','Đang triển khai'],['in_review','Đang nghiệm thu'],['on_hold','Tạm dừng'],['completed','Hoàn thành'],['cancelled','Đã hủy']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <div className="space-y-2"><label className="block text-xs font-semibold">Cơ hội qua phase · PIC đánh giá (tùy chọn)<input type="number" min="0" max="100" className={field} value={phaseOpportunity} onChange={e=>setPhaseOpportunity(e.target.value)} placeholder="Chưa đánh giá"/></label><textarea className={field} value={phaseReason} onChange={e=>setPhaseReason(e.target.value)} placeholder="Cơ sở đánh giá · bắt buộc khi nhập %"/></div>
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
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
                  <span>{hub.busy ? 'Đang lưu...' : editingPhaseId ? 'Lưu phase' : 'Tạo giai đoạn'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
