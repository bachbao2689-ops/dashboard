import type React from 'react';
import {useState,useEffect,useMemo,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useWorkflowHub} from './useWorkflowHub';
import {useTranslation} from '../i18n/translations';
import {useRememberedState} from './useRememberedState';
import type {Task} from './useTasks';
import {gateScore,gateReady,taskProgress,workflowMetrics,displayDate,inputDate,parentTasks,daysUntil,workflowTaskPeople,type HubPhase,type GateCriterion} from '../lib/workflowHub';
import {workflowCalendarWindow,workflowDateError,taskContributors} from '../lib/workflowCalendar';
import {canonicalWorkflowStatus,workflowStage,WORKFLOW_STATUS_CONFIG,type WorkflowTaskStatus} from '../components/features/tasks/WorkflowStatusPicker';
import {supabase} from '../services/supabase';
import toast from 'react-hot-toast';
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

export function useWorkflowManagement() {

  const hub = useWorkflowHub();
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const [params, setParams] = useSearchParams();
  const [entityFilter, setEntityFilter] = useRememberedState<'project' | 'campaign'>('workflow.entityFilter', params.has('campaign') ? 'campaign' : 'project');
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
  const [searchEntityQuery, setSearchEntityQuery] = useState('');
  const entities = useMemo(() => hub.tracks.map(track => ({ ...track, type: track.entity_type })), [hub.tracks]);
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
  const [commentsFocusToken,setCommentsFocusToken] = useState(0);
  const openTaskComments = (task: Task) => { setSelectedTask(task); setCommentsFocusToken(value=>value+1); };
  const openTaskDetails = (task: Task) => { setCommentsFocusToken(0); setSelectedTask(task); };
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
    canEdit: Boolean(phases.find(p => p.id === t.workflow_phase_id)?.can_edit_tasks
      || (hub.profile?.id != null && (String(t.assignee_id) === String(hub.profile.id)
        || (t.created_by != null && String(t.created_by) === String(hub.profile.id))))),
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
  const subTeamMembers = useMemo(() => {
    const fromTasks = taskContributors(allTasks);
    if (fromTasks.length > 0) return fromTasks;
    const existing = [
      ...(currentEntity?.pics?.slice(1) || []),
      ...(currentEntity?.sub_pics || [])
    ];
    if (existing.length > 0) {
      return existing.map(p => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }));
    }
    return [];
  }, [allTasks, currentEntity]);
  const parentCalendar = workflowCalendarWindow(currentEntity);
  const taskCalendar = workflowCalendarWindow(currentEntity, activePhase);
  const leadInfo = useMemo(() => {
    const lead = (currentEntity as any)?.lead || currentEntity?.pics?.[0];
    const name = lead?.name || (isEn ? 'Unassigned PIC' : 'Chưa giao PIC');
    const role = isCampaign ? (isEn ? 'Campaign Lead' : 'Lead Chiến dịch') : (isEn ? 'Project Lead' : 'Lead Dự án');
    const avatar = lead?.avatar_url;
    return { name, role, avatar };
  }, [currentEntity, isCampaign, isEn]);
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
    const actual = p.progress;
    const plan = p.displayStatus === 'completed' ? 100 : (!startStr || !dueStr ? null : Math.max(0, Math.min(100, Math.round((Date.now() - Date.parse(startStr + 'T00:00:00+07:00')) / Math.max(86400000, Date.parse(dueStr + 'T23:59:59+07:00') - Date.parse(startStr + 'T00:00:00+07:00')) * 100))));
    return { period: p.name, actual, plan };
  });
  const unplanned = allTasks.filter(t => !t.workflow_phase_id);
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newCriteriaLabel, setNewCriteriaLabel] = useState('');
  const [newCriteriaWeight, setNewCriteriaWeight] = useState('20');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<WorkflowTaskStatus>('planned');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
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
  const taskPeople = workflowTaskPeople(currentEntity, activePhase, hub.profile);
  const personOptions = hub.people.map(p => ({value:String(p.id),label:p.name}));
  const taskOptions = taskPeople.map(p => ({value:String(p.id),label:p.name}));
  useEffect(() => { setIsDetailOpen(false); setActivePhaseId(params.get('phase') || ''); setShowAddTask(false); setShowAddPhaseModal(false); setSelectedTask(null); }, [currentEntity?.id, hub.profile?.id]);
  useEffect(() => { setActivePhaseId(params.get('phase') || ''); }, [params.get('phase')]);
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
  const toggleCriterion = (id: string) => { if (activePhase?.can_edit_tasks && !hub.busy && !['completed','cancelled'].includes(activePhase.status)) void attempt(() => saveGate(criteria.map(c => c.id === id ? {...c, checked: !c.checked} : c)), 'Đã lưu tiêu chí'); };
  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newCriteriaLabel.trim()) return;
    const weight = Number(newCriteriaWeight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return toast.error(isEn ? 'Weight must be between 0 and 100%.' : 'Trọng số phải lớn hơn 0 và không quá 100%.');
    if (await attempt(() => saveGate([...criteria, {id:crypto.randomUUID(),label:newCriteriaLabel.trim(),weight,checked:false}]), 'Đã lưu tiêu chí')) { setNewCriteriaLabel(''); setNewCriteriaWeight('20'); setShowAddCriteria(false); }
  };
  const stageValues = (stage: WorkflowTaskStatus) => ({status:canonicalWorkflowStatus[stage],workflow_status:stage});
  const toggleSubtask = (id: string) => { const row = subtasks.find(t => t.id === id); if (row?.canEdit) void attempt(() => hub.updateTask(row.record, stageValues(row.status === 'completed' ? 'in_progress' : 'completed')), 'Đã cập nhật All Tasks'); };
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee || !activePhase) return toast.error('Nhập tên và chọn PIC');
    if (workflowDateError(newTaskStart,newTaskDue,taskCalendar)) return toast.error(isEn ? 'Task dates must fit the phase calendar.' : 'Lịch task phải nằm trong lịch của chặng.');
    if (await attempt(() => hub.mutate(() => supabase.rpc('workflow_create_task', {p_phase:activePhase.id,p_data:{title:newTaskTitle.trim(),assignee_id:Number(newTaskAssignee),start_date:inputDate(newTaskStart),due_date:inputDate(newTaskDue),workflow_status:newTaskStatus,priority:'medium'}})), 'Đã tạo task và đồng bộ All Tasks')) {
      setNewTaskTitle(''); setNewTaskAssignee(''); setNewTaskStart(''); setNewTaskDue(''); setNewTaskStatus('planned'); setShowAddTask(false);
    }
  };
  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); const row = subtasks.find(t => t.id === id);
    if (row?.canEdit && window.confirm('Ẩn task "' + row.title + '" khỏi danh sách? Dữ liệu vẫn được giữ.')) void attempt(() => hub.updateTask(row.record,{status:'deleted'}), 'Đã ẩn task');
  };
  const handleQuickChangeStatus = (id: string, status: WorkflowTaskStatus) => {
    const row = subtasks.find(t => t.id === id);
    return row?.canEdit ? hub.updateTask(row.record, stageValues(status)).catch(e => {toast.error(e.message); throw e;}) : Promise.reject(new Error('Task không còn trong phạm vi chỉnh sửa'));
  };
  const handleOpenAddPhaseModal = (index: number, e?: React.MouseEvent, phase?: Phase) => {
    e?.stopPropagation(); if (!currentEntity?.root) return;
    setEditingPhaseId(phase?.id || null); setInsertPhaseIndex(index);
    setNewPhaseName(phase?.title || ''); setNewPhaseDesc(phase?.description || '');
    setPhasePicIds(phase?.members.filter(p => p.role === 'pic').map(p => String(p.id)) || [String(hub.profile?.id)]);
    setPhaseSubIds(phase?.members.filter(p => p.role === 'sub_pic').map(p => String(p.id)) || []);
    setPhaseStart(phase?.start_date || parentCalendar.start); setPhaseDue(phase?.due_date || parentCalendar.due); setPhaseStatus(phase?.status || 'todo');
    setPhaseOpportunity(phase?.opportunity == null ? '' : String(phase.opportunity)); setPhaseReason(phase?.opportunity_note || '');
    setShowAddPhaseModal(true);
  };
  const handleCreatePhase = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentEntity || !newPhaseName.trim() || !phasePicIds.length) return toast.error('Nhập tên và chọn PIC phase');
    if (workflowDateError(phaseStart,phaseDue,parentCalendar)) return toast.error(isEn ? 'Phase dates must fit the Project/Campaign calendar.' : 'Lịch chặng phải nằm trong lịch Project/Campaign.');
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
  const handlePhaseClick = (index: number) => { setSelectedTask(null); setIsDetailOpen(false); const id = phases[index]?.id; if (id && currentEntity) { setActivePhaseId(id); setParams({ [currentEntity.type]: currentEntity.entity_id, phase: id }, { replace: true }); } setShowAddTask(false); };
  const linkTask = (task: Task, phaseId: string) => void attempt(() => hub.mutate(() => supabase.rpc('workflow_link_task',{p_phase:phaseId,p_task:task.id.startsWith('ps-')||task.id.startsWith('cs-') ? task.id.slice(3) : task.id,p_kind:task.id.startsWith('ps-')?'project_subtask':task.id.startsWith('cs-')?'campaign_subtask':'task'})), 'Đã gắn task vào phase, giữ nguyên comments');

  return { hub, lang, isEn, params, setParams, entityFilter, setEntityFilter, isTitleDropdownOpen, setIsTitleDropdownOpen, searchEntityQuery, setSearchEntityQuery, entities, selectedKey, currentEntity, selectedEntityId, isCampaign, filteredEntities, handleFilterChange, handleSelectEntity, activePhaseId, setActivePhaseId, isDetailOpen, setIsDetailOpen, selectedTask, setSelectedTask, commentsFocusToken, openTaskComments, openTaskDetails, activeTooltip, setActiveTooltip, pinnedTooltip, setPinnedTooltip, tooltipTimeoutRef, cancelCloseTooltip, openTooltip, scheduleCloseTooltip, togglePinTooltip, closeAllTooltips, allTasks, phases, requestedPhaseIndex, activePhaseIndex, activePhase, criteria, subtasks, currentPhaseSubtasks, doneSubtasksCount, totalSubtasksCount, phaseProgressPct, gatePassChancePct, criteriaScore, readyToApprove, readinessLabel, metrics, overallProjectProgressPct, daysRemaining, entityTimeline, subTeamMembers, parentCalendar, taskCalendar, leadInfo, taskCountsByStatus, currentMonthTaskStats, totalMonthTasks, performanceTrendData, unplanned, showAddCriteria, setShowAddCriteria, newCriteriaLabel, setNewCriteriaLabel, newCriteriaWeight, setNewCriteriaWeight, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, newTaskAssignee, setNewTaskAssignee, newTaskStatus, setNewTaskStatus, newTaskDue, setNewTaskDue, newTaskStart, setNewTaskStart, showAddPhaseModal, setShowAddPhaseModal, editingPhaseId, setEditingPhaseId, insertPhaseIndex, setInsertPhaseIndex, newPhaseName, setNewPhaseName, newPhaseDesc, setNewPhaseDesc, phasePicIds, setPhasePicIds, phaseSubIds, setPhaseSubIds, phaseStart, setPhaseStart, phaseDue, setPhaseDue, phaseStatus, setPhaseStatus, phaseOpportunity, setPhaseOpportunity, phaseReason, setPhaseReason, editingPhase, taskPeople, personOptions, taskOptions, attempt, saveGate, toggleCriterion, handleAddCriteria, stageValues, toggleSubtask, handleAddTask, handleDeleteTask, handleQuickChangeStatus, handleOpenAddPhaseModal, handleCreatePhase, phaseToDelete, setPhaseToDelete, timelineScrollRef, canScrollLeft, setCanScrollLeft, canScrollRight, setCanScrollRight, checkScrollBounds, scrollTimeline, handleDeletePhase, confirmDeletePhase, handleAdvancePhase, handlePhaseClick, linkTask, pct, field, toWorkflowStage };
}
export type WorkflowModel = ReturnType<typeof useWorkflowManagement>;
