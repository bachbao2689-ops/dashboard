import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, ChevronDown, Calendar, ListTodo, Clock3, CheckCircle2, Check, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useTranslation } from '../../../i18n/translations';
import { parentTasks, taskProgress, workflowLink, displayDate } from '../../../lib/workflowHub';
import type { useWorkflowHub } from '../../../hooks/useWorkflowHub';
import type { Task } from '../../../hooks/useTasks';
import { Avatar } from '../../common/Avatar';
import { taskTarget, isTaskDone, taskDone } from '../../../lib/taskTracking';
import { priorityClass } from './projectPresentation';
import { CommentPreviewPopover } from '../../common/CommentPreviewPopover';
import { useTaskCommentCounts } from '../../../hooks/useTaskCommentCounts';
import { isGlobalManager } from '../../../lib/roleScope';
import { completeTrackedTask, updateTrackedTask } from '../../../services/workspaceTasks';
import { TaskPinButton } from '../tasks/TaskPinButton';
import { QuickStatusDropdown } from '../../common/QuickStatusDropdown';

export function WorkflowTrackingSummary({ kind, id, hub, onOpenTask, defaultExpanded = false, statusFilter = 'open' }: {
  kind: 'project' | 'campaign'; id: string; hub: ReturnType<typeof useWorkflowHub>; onOpenTask: (task: Task) => void; defaultExpanded?: boolean; statusFilter?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [isUnplannedOpen, setIsUnplannedOpen] = useState(false);
  const navigate = useNavigate();
  const { lang, t } = useTranslation();
  const en = lang === 'en';
  const track = hub.tracks.find(t => t.entity_type === kind && t.entity_id === id);
  const allTasks = parentTasks(hub.tasks, kind, id);
  
  // Loại bỏ hoàn toàn checklist items (đầu việc phát sinh là con của subtask) khỏi danh sách task của phase
  const regularTasks = allTasks.filter(t => !t.checklist_item_id && !taskTarget(t.id).checklistItemId && !t.id.includes('-ci-'));
  const taskCommentCounts = useTaskCommentCounts(isExpanded ? regularTasks.map(t => t.id) : [], hub.profile?.id);
  const progress = taskProgress(regularTasks);
  const phaseList = track?.phases || [];

  useEffect(() => {
    if (phaseList.length === 0) {
      setIsUnplannedOpen(true);
    }
  }, [phaseList.length]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const unplannedTasks = regularTasks.filter(t => !t.workflow_phase_id && (statusFilter === 'all' || (statusFilter === 'completed' ? taskDone(t) : !taskDone(t))));

  const getSubtaskChecklistCount = (t: Task) => {
    if (t.checklist_items && t.checklist_items.length > 0) {
      const done = t.checklist_items.filter(ci => ci.completed).length;
      return { done, total: t.checklist_items.length };
    }
    const children = hub.tasks.filter(child => child.parent_task_id === t.id || child.id.startsWith(`${t.id}-ci-`));
    if (children.length > 0) {
      const done = children.filter(child => isTaskDone(child.status)).length;
      return { done, total: children.length };
    }
    return { done: 0, total: 0 };
  };

  const isCampaign = kind === 'campaign';
  const primaryLeads = (track?.pics && track.pics.length > 1)
    ? track.pics.slice(0, 2)
    : (track?.pics?.[0] ? [track.pics[0]] : []);
  const leadName = primaryLeads.length > 0 ? primaryLeads.map(p => p.name).join(' · ') : (en ? 'Unassigned' : 'Chưa giao');
  const leadRole = isCampaign ? (en ? 'Campaign Lead' : 'Lead Chiến dịch') : (en ? 'Project Lead' : 'Lead Dự án');

  const subTeamMembers = (() => {
    const list: Array<{ id: string; name: string; avatar_url?: string }> = [];
    const seen = new Set<string>();
    primaryLeads.forEach(p => {
      if (p?.id != null) seen.add(String(p.id));
    });

    (track?.sub_pics || []).forEach(p => {
      const pid = String(p.id);
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        list.push({ id: pid, name: p.name, avatar_url: p.avatar_url });
      }
    });

    (track?.pics || []).slice(primaryLeads.length).forEach(p => {
      const pid = String(p.id);
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        list.push({ id: pid, name: p.name, avatar_url: p.avatar_url });
      }
    });

    (allTasks || []).forEach(t => {
      const allIds = [t.assignee_id, ...((((t as any)?.custom_fields)?.assignee_ids as any[]) || [])].filter(Boolean);
      allIds.forEach(id => {
        const pid = String(id);
        if (pid && !seen.has(pid)) {
          seen.add(pid);
          const found = (hub.people || []).find((p: any) => String(p.id) === pid) || (t.assignee && String(t.assignee.id) === pid ? t.assignee : null);
          if (found) list.push({ id: pid, name: found.name, avatar_url: found.avatar_url });
        }
      });
    });

    return list;
  })();

  const phaseStatusOptions = [
    { value: 'not_started', label: en ? 'Not Started' : 'Chưa bắt đầu', dotColor: 'bg-gray-400' },
    { value: 'in_progress', label: en ? 'In Progress' : 'Đang thực hiện', dotColor: 'bg-sky-500' },
    { value: 'completed', label: en ? 'Completed' : 'Hoàn thành', dotColor: 'bg-emerald-500' },
    { value: 'blocked', label: en ? 'Blocked' : 'Bị nghẽn', dotColor: 'bg-red-500' },
  ];

  const handleQuickChangePhaseStatus = async (phase: any, nextStatus: string) => {
    if (!track?.id) return;
    const currentPicIds = (phase.pics || []).map((p: any) => p.id);
    const currentSubPicIds = (phase.sub_pics || []).map((p: any) => p.id);
    try {
      await hub.mutate(() => supabase.rpc('workflow_configure_phase', {
        p_workflow: track.id,
        p_phase: phase.id,
        p_expected: phase.version || 0,
        p_data: {
          title: phase.title,
          description: phase.description || '',
          position: phase.position,
          status: nextStatus,
          start_date: phase.start_date || null,
          due_date: phase.due_date || null,
          pic_ids: currentPicIds,
          sub_pic_ids: currentSubPicIds,
          gate_criteria: phase.gate_criteria || [],
          opportunity: phase.opportunity ?? null,
          opportunity_note: phase.opportunity_note || null,
        },
      }));
      toast.success(en ? 'Phase status updated' : 'Đã cập nhật trạng thái giai đoạn');
    } catch (err: any) {
      toast.error(err?.message || (en ? 'Failed to update phase status' : 'Không thể cập nhật trạng thái'));
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const willComplete = !isTaskDone(task.status);
    try {
      if (willComplete) {
        await completeTrackedTask(task.id);
      } else {
        await updateTrackedTask(task.id, { status: 'in_progress', workflow_status: 'in_progress' });
      }
      toast.success(willComplete ? (en ? 'Task completed' : 'Đã hoàn thành công việc') : (en ? 'Task reopened' : 'Đã mở lại công việc'));
      await hub.refresh();
    } catch (err: any) {
      toast.error(err?.message || (en ? 'Failed to update task' : 'Cập nhật thất bại'));
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const confirmMsg = en
      ? `Are you sure you want to delete task "${task.title}"?`
      : `Bạn có chắc chắn muốn xóa công việc "${task.title}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.from('workspace_tasks').delete().eq('id', task.id);
      if (error) throw error;
      toast.success(en ? 'Task deleted' : 'Đã xóa công việc');
      await hub.refresh();
    } catch (err: any) {
      toast.error(err?.message || (en ? 'Failed to delete task' : 'Xóa công việc thất bại'));
    }
  };

  const renderTaskCard = (task: Task) => {
    const assigneeName = task.assignee?.name || (en ? 'Unassigned' : 'Chưa giao PIC');
    const isDoneTask = isTaskDone(task.status);
    const checklistCount = getSubtaskChecklistCount(task);
    const qty = task.quantity ?? task.deliverable_quantity ?? task.base_quantity;
    const canDelete = isGlobalManager(hub.profile) || task.created_by === hub.profile?.id;

    return (
      <div
        key={task.id}
        onClick={() => onOpenTask(task)}
        className={`w-full relative rounded-[8px] border p-3 text-left transition-all cursor-pointer min-w-0 overflow-hidden group/task ${
          isDoneTask
            ? 'border-emerald-400/70 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60'
            : 'border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-gray-100/60 dark:hover:bg-slate-800/70'
        }`}
      >
        {/* Hover Quick Actions */}
        <div
          className="absolute top-2.5 right-2.5 opacity-0 group-hover/task:opacity-100 transition-opacity grid grid-flow-col auto-cols-max items-center gap-1 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => void handleToggleComplete(e, task)}
            title={isDoneTask ? (en ? 'Reopen task' : 'Mở lại công việc') : (en ? 'Complete task' : 'Hoàn thành công việc')}
            className={`p-1 rounded-[6px] transition-colors cursor-pointer border ${
              isDoneTask
                ? 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-500 hover:text-emerald-600 hover:border-emerald-300'
                : 'border-emerald-300/80 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            <Check size={13} />
          </button>
          <TaskPinButton taskId={task.id} size={13} className="!p-1 rounded-[6px] border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:bg-amber-50 dark:hover:bg-amber-950/40" />
          {canDelete && (
            <button
              type="button"
              onClick={(e) => void handleDeleteTask(e, task)}
              title={en ? 'Delete task' : 'Xóa công việc'}
              className="p-1 rounded-[6px] border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className="min-w-0 grid grid-cols-1 gap-1.5 select-none pr-14">
          {/* Dòng 1: Tiêu đề + icon CheckCircle2 nếu hoàn thành */}
          <span className={`text-sm font-semibold inline-block break-words line-clamp-2 ${isDoneTask ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
            {isDoneTask && (
              <CheckCircle2 size={14} className="inline-block ml-1.5 text-emerald-500 dark:text-emerald-400 shrink-0 align-middle" />
            )}
          </span>

          {/* Dòng 2: Hàng badges gồm Priority badge, SL badge, Ngày hạn badge, Checklist count badge */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-semibold lowercase ${priorityClass(task.priority || 'medium')}`}>
              {t(`common.${task.priority || 'medium'}` as any).toLowerCase()}
            </span>
            {Boolean(qty) && (
              <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                SL: {qty}
              </span>
            )}
            {task.due_date && (
              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border border-red-200/80 dark:border-red-800/60 bg-red-50/80 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <Calendar size={11} /> {displayDate(task.due_date)}
              </span>
            )}
            {checklistCount.total > 0 && (() => {
              const isAllDone = checklistCount.done === checklistCount.total;
              return (
                <span
                  title={en ? `Subtask: ${checklistCount.done}/${checklistCount.total} completed` : `Subtask: ${checklistCount.done}/${checklistCount.total} hoàn thành`}
                  className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border ${
                    isAllDone
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60'
                      : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60'
                  }`}
                >
                  <ListTodo size={11} />
                  <span>{checklistCount.done}/{checklistCount.total}</span>
                </span>
              );
            })()}
            {((taskCommentCounts.counts[task.id]?.count ?? 0) > 0) && (
              <CommentPreviewPopover
                entityType={kind === 'campaign' ? 'campaign_subtask' : 'project_subtask'}
                entityId={task.id}
                entityTitle={task.title}
                count={taskCommentCounts.counts[task.id]?.count ?? 0}
                onOpenFull={() => onOpenTask(task)}
              />
            )}
          </div>

          {/* Dòng 3: Avatar PIC + Tên PIC, Thời gian tạo / đã chỉnh sửa */}
          {(task.assignee || task.created_at) && (
            <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto scrollbar-none">
              {task.assignee && (
                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-[6px] text-gray-700 dark:text-gray-300 text-[11px] font-medium">
                  <Avatar name={assigneeName} src={task.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
                  <span className="line-clamp-1">{assigneeName}</span>
                </span>
              )}
              {task.created_at && (
                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-normal text-gray-400 dark:text-gray-500">
                  <Clock3 size={11} />
                  <span>{displayDate(task.created_at)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-[8px] border border-gray-200/90 dark:border-slate-800 p-4 transition-all bg-white/50 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full grid grid-cols-[1fr_auto] items-center gap-2 text-left cursor-pointer select-none group/wf"
        aria-expanded={isExpanded}
      >
        <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
          <Activity size={16} className="text-primary shrink-0" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {en ? 'Phases' : 'Giai đoạn'}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border border-violet-200/80 dark:border-violet-800/60 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 shrink-0">
            {phaseList.length} {en ? (phaseList.length > 1 ? 'Phases' : 'Phase') : 'Giai đoạn'}
          </span>
          {progress.percent != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] border border-primary/20 bg-primary/10 text-primary shrink-0">
              {progress.done}/{progress.total} · {progress.percent}%
            </span>
          )}
        </div>

        <div className="grid place-content-center shrink-0">
          <div className={`p-1 rounded-lg text-gray-400 group-hover/wf:text-gray-600 dark:group-hover/wf:text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="grid gap-3 pt-3.5 mt-3 border-t border-gray-100 dark:border-slate-700/80 animate-in fade-in duration-200">
          {hub.error ? (
            <div role="alert" className="text-xs text-red-500">
              {hub.error}
              <button onClick={() => void hub.refresh()} className="ml-2 underline">{en ? 'Retry' : 'Thử lại'}</button>
            </div>
          ) : hub.loading ? (
            <p className="text-xs text-gray-500">{en ? 'Loading workflow…' : 'Đang tải luồng…'}</p>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                {track?.root ? (en ? 'All tasks in this Project/Campaign' : 'Toàn bộ công việc của Project/Campaign này') : (en ? 'Tasks within your assigned scope' : 'Công việc trong phạm vi được giao')}
              </p>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <b>{progress.done}/{progress.total} {en ? 'completed' : 'hoàn thành'}</b>
                <b className="text-primary">{progress.percent == null ? '—' : progress.percent + '%'}</b>
              </div>
              {progress.percent != null && (
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress.percent}%` }} />
                </div>
              )}
              {/* Lead chính và Sub-team avatars */}
              <div className="grid grid-flow-col auto-cols-max items-center gap-2 pt-0.5 overflow-x-auto scrollbar-none">
                {/* Lead chính badge (1 hoặc 2 người) */}
                <div className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-2 py-0.5 rounded-[6px] border shadow-2xs ${
                  isCampaign
                    ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60'
                    : 'bg-violet-50/90 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/60'
                }`}>
                  {primaryLeads.length > 1 ? (
                    <div className="grid grid-flow-col auto-cols-max items-center -space-x-1.5">
                      {primaryLeads.map(lead => (
                        <div key={lead.id} className="w-4 h-4 rounded-full border border-white dark:border-slate-900 overflow-hidden shadow-2xs">
                          {lead.avatar_url ? (
                            <img src={lead.avatar_url} alt={lead.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full grid place-items-center text-[8px] font-bold text-white ${
                              isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-violet-600 to-purple-600'
                            }`}>
                              <User size={8} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold text-white shadow-xs ${
                      isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-violet-600 to-purple-600'
                    }`}>
                      {primaryLeads[0]?.avatar_url ? (
                        <img src={primaryLeads[0].avatar_url} alt={leadName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User size={10} />
                      )}
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px] sm:max-w-[180px]">
                    {leadName}
                  </span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-[6px] ${
                    isCampaign ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300'
                  }`}>
                    {leadRole}
                  </span>
                </div>

                {/* Sub-team members dạng avatar tròn xếp chồng */}
                {subTeamMembers.length > 0 && (
                  <div className="grid grid-flow-col auto-cols-max items-center -space-x-1.5">
                    {subTeamMembers.slice(0, 4).map(sub => (
                      <div
                        key={sub.id}
                        title={`${sub.name} ${en ? '(Team member)' : '(Thành viên tham gia)'}`}
                        className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 border-2 border-white dark:border-slate-900 grid place-items-center text-[8px] font-extrabold text-white shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                      >
                        <Avatar name={sub.name} src={sub.avatar_url} className="w-full h-full text-[8px]" />
                      </div>
                    ))}
                    {subTeamMembers.length > 4 && (
                      <div
                        className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 grid place-items-center text-[8px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs z-10"
                        title={`${subTeamMembers.length - 4} ${en ? 'more members' : 'thành viên khác'}`}
                      >
                        +{subTeamMembers.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* UI Accordion Cha - Con cho từng phase */}
              {phaseList.length > 0 ? (
                <div className="grid gap-2">
                  {phaseList.map(phase => {
                    const phaseTasks = regularTasks.filter(t => t.workflow_phase_id === phase.id && (statusFilter === 'all' || (statusFilter === 'completed' ? taskDone(t) : !taskDone(t))));
                    const totalPhaseTasks = regularTasks.filter(t => t.workflow_phase_id === phase.id);
                    const summary = taskProgress(totalPhaseTasks);
                    const isPhaseOpen = Boolean(expandedPhases[phase.id]);

                    return (
                      <div key={phase.id} className="rounded-[8px] border border-gray-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                        {/* Phase Header */}
                        <div
                          onClick={() => togglePhase(phase.id)}
                          className="w-full p-2.5 text-left grid grid-cols-[1fr_auto_auto] items-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer select-none"
                        >
                          <div className="min-w-0">
                            <b className="block truncate text-xs text-gray-900 dark:text-white">
                              {phase.position}. {phase.title}
                            </b>
                            <span className="text-[11px] text-gray-500">
                              {displayDate(phase.start_date)} – {displayDate(phase.due_date)} · {summary.done}/{summary.total}
                            </span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <QuickStatusDropdown
                              currentStatus={phase.status}
                              options={phaseStatusOptions}
                              onSelect={(nextStatus) => handleQuickChangePhaseStatus(phase, nextStatus)}
                            />
                          </div>
                          <div className={`p-1 text-gray-400 transition-transform duration-200 ${isPhaseOpen ? 'rotate-180 text-primary' : ''}`}>
                            <ChevronDown size={14} />
                          </div>
                        </div>

                        {/* Phase Tasks Dropdown */}
                        {isPhaseOpen && (
                          <div className="border-t border-gray-100 dark:border-slate-800 p-2.5 grid gap-2 bg-white/70 dark:bg-slate-900/60">
                            {phaseTasks.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1 italic">
                                {en ? 'No tasks in this phase' : 'Không có công việc nào trong giai đoạn này'}
                              </p>
                            ) : (
                              phaseTasks.map(renderTaskCard)
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(workflowLink(kind, id, phase.id));
                              }}
                              className="text-[11px] text-primary hover:underline text-left pt-1 font-medium grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer"
                            >
                              <span>{en ? 'Open phase on Workflow Hub' : 'Xem chi tiết giai đoạn trên Quản lý tiến độ'}</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (track?.phases?.length || 0) === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-[6px] border border-slate-200/60 dark:border-slate-700/60">
                  💡 {en ? 'Direct task management (no phases).' : 'Dự án này quản lý theo công việc trực tiếp (không sử dụng giai đoạn).'}
                </p>
              ) : (
                <p className="text-xs text-gray-500">{en ? 'No phases in your scope yet.' : 'Chưa có giai đoạn trong phạm vi của bạn.'}</p>
              )}

              {/* Unplanned Tasks Accordion */}
              {unplannedTasks.length > 0 && (
                <div className="rounded-[8px] border border-amber-200/80 dark:border-amber-900/50 overflow-hidden bg-amber-50/30 dark:bg-amber-950/20">
                  <button
                    type="button"
                    onClick={() => setIsUnplannedOpen(prev => !prev)}
                    className="w-full p-2.5 text-left grid grid-cols-[1fr_auto] items-center gap-2 hover:bg-amber-100/30 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {phaseList.length === 0
                        ? (en ? `${unplannedTasks.length} direct project tasks` : `${unplannedTasks.length} công việc trực tiếp của dự án`)
                        : (en ? `${unplannedTasks.length} tasks not assigned to a phase` : `${unplannedTasks.length} công việc chưa gắn giai đoạn`)}
                    </span>
                    <div className={`p-1 text-amber-500 transition-transform duration-200 ${isUnplannedOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                  </button>
                  {isUnplannedOpen && (
                    <div className="border-t border-amber-200/60 dark:border-amber-900/40 p-2.5 grid gap-2 bg-white/70 dark:bg-slate-900/60">
                      {unplannedTasks.map(renderTaskCard)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => navigate(workflowLink(kind, id))}
            className="grid grid-flow-col auto-cols-max justify-center items-center gap-2 w-full rounded-[8px] border border-primary/20 bg-primary/10 hover:bg-primary/15 transition-colors px-3 py-2.5 text-sm font-semibold text-primary cursor-pointer"
          >
            <span>{en ? 'Open Workflow Management' : 'Mở Quản lý tiến độ'}</span>
            <ArrowRight size={16}/>
          </button>
        </div>
      )}
    </section>
  );
}
