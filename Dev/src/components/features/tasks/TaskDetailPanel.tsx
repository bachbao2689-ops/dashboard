import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import {useTaskDetailVisibility} from '../../../hooks/useTaskDetailVisibility';
import React, { useEffect, useState } from 'react';
import { X, Clock, MessageSquare, CheckCircle2, User, Calendar, AlignLeft, Edit3, Save } from 'lucide-react';
import { TaskComments } from '../comments/TaskComments';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { notifyTaskParticipants } from '../../../services/taskNotifications';
import { Avatar } from '../../common/Avatar';
import { useTranslation } from '../../../i18n/translations';
import toast from 'react-hot-toast';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import { TaskPinButton } from './TaskPinButton';
import { TaskActivityLogPopover } from './TaskActivityLogPopover';
import { logTaskActivity } from '../../../services/taskActivityLogger';
import { displayDate, inputDate } from '../../../lib/workflowHub';
import { WorkflowStatusPicker, canonicalWorkflowStatus, type WorkflowTaskStatus } from './WorkflowStatusPicker';
import { TaskDescriptionViewer } from './TaskDescriptionViewer';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { canCompleteTrackedTask, completeTrackedTask } from '../../../services/workspaceTasks';

interface TaskDetailPanelProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (task?: any) => void;
  floating?: boolean;
  embedded?: boolean;
  commentsFocusToken?: number;
  assignablePeople?: { id: number; name: string; avatar_url?: string | null }[];
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose, onTaskUpdated, floating = false, embedded = false, commentsFocusToken = 0, assignablePeople }) => {
  const { t, lang } = useTranslation();
  useTaskDetailVisibility(isOpen);
  useReadEntityNotifications('task',task?.id,isOpen&&Boolean(task));
  const readOnly=useMobileReadOnly(false);
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [commentFocus, setCommentFocus] = useState(0);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [mentionPeople, setMentionPeople] = useState<any[]>([]);
  const [taskCollaborators, setTaskCollaborators] = useState<(string | number)[]>([]);
  const [editingTask, setEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    setDescription(task?.description || '');
    setEditingDescription(false);
    setCommentFocus(0);
    setEditingTask(false);
    setEditTitle(task?.title || '');
    setEditAssigneeId(task?.assignee_id == null ? '' : String(task.assignee_id));
    setEditPriority(task?.priority || 'medium');
    setEditStartDate(task?.start_date?.slice(0, 10) || '');
    setEditDueDate(task?.due_date?.slice(0, 10) || '');
  }, [task?.id, task?.title, task?.assignee_id, task?.priority, task?.start_date, task?.due_date, task?.description, isOpen, profileId]);

  useEffect(() => {
    setCanEdit(false);
    setCanComplete(false);
    let active = true;
    if (isOpen && profileId != null && task?.id && !task.id.startsWith('ps-') && !task.id.startsWith('cs-')) {
      supabase.rpc('workflow_task_access', { tid: task.id, editing: true }).then(({ data }) => {
        if (!active) return;
        setCanEdit(data === true);
        if (data !== true) { setEditingDescription(false); setEditingTask(false); }
      });
      void canCompleteTrackedTask(task.id).then(value => { if (active) setCanComplete(value); }).catch(() => { if (active) setCanComplete(false); });
    }
    return () => { active = false; };
  }, [task?.id, task?.updated_at, task?.assignee_id, task?.project_id, task?.campaign_id, task?.workflow_phase_id, isOpen, profileId, profile?.role, profile?.employment_level]);

  useEffect(() => {
    let active = true;
    setMentionPeople([]);
    if (isOpen) {
      supabase
        .from('users')
        .select('id,name,avatar_url,role,employment_level,job_title,department_id,departments:department_id(id,name)')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => { if (active) setMentionPeople(data || []); });
    }
    return () => { active = false; };
  }, [isOpen, profileId]);

  useEffect(() => {
    let active = true;
    const ids = new Set<string | number>();
    if (task?.assignee_id) ids.add(task.assignee_id);
    if (task?.created_by) ids.add(task.created_by);
    if (task?.creator_id) ids.add(task.creator_id);

    if (task?.workflow_phase_id) {
      supabase.from('workflow_phase_members').select('user_id').eq('phase_id', task.workflow_phase_id).then(({ data }) => {
        if (!active) return;
        (data || []).forEach(m => { if (m.user_id) ids.add(m.user_id); });
        setTaskCollaborators(Array.from(ids));
      });
    } else {
      setTaskCollaborators(Array.from(ids));
    }
    return () => { active = false; };
  }, [task?.id, task?.assignee_id, task?.created_by, task?.creator_id, task?.workflow_phase_id]);


  useEffect(() => {
    if (!resizing) return;
    const move = (event: MouseEvent) => { const next = document.body.clientWidth - event.clientX; if (next >= 360 && next <= 800) setWidth(next); };
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);

  const saveDescription = async (newDesc?: string) => {
    if (readOnly || !canEdit || !task) return;
    const textToSave = typeof newDesc === 'string' ? newDesc : description;
    setSaving(true);
    const { data, error } = await supabase.from('tasks').update({ description: textToSave, updated_at: new Date().toISOString() }).eq('id', task.id).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) return toast.error('Không thể lưu mô tả. Kiểm tra lại quyền task.');
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_updated');
    setDescription(textToSave);
    setEditingDescription(false); onTaskUpdated?.({ description: textToSave }); toast.success('Đã lưu mô tả');
  };

  const saveTaskDetails = async () => {
    if (readOnly || !canEdit || !task || !editTitle.trim()) return;
    if (editStartDate && editDueDate && editStartDate > editDueDate) {
      toast.error(lang === 'en' ? 'Start date must be before the due date.' : 'Ngày bắt đầu phải trước hạn chót.');
      return;
    }
    setSaving(true);
    const values = {
      title: editTitle.trim(),
      assignee_id: editAssigneeId ? Number(editAssigneeId) : null,
      priority: editPriority,
      start_date: editStartDate || null,
      due_date: editDueDate || null,
      updated_at: new Date().toISOString(),
    };
    let query = supabase.from('tasks').update(values).eq('id', task.id);
    if (task.updated_at) {
      query = query.eq('updated_at', task.updated_at);
    }
    const { data, error } = await query.select('id').maybeSingle();
    setSaving(false);
    if (error || !data) {
      if (!data && task.updated_at) {
        return toast.error(lang === 'en' ? 'Task was modified by another user. Please refresh to view the latest version.' : 'Task đã được người khác chỉnh sửa. Vui lòng làm mới trang để xem phiên bản mới nhất.');
      }
      return toast.error(lang === 'en' ? 'Could not save task changes. Check task permissions.' : 'Không thể lưu task. Kiểm tra lại quyền chỉnh sửa.');
    }
    const actorName = profile?.name || 'Thành viên';
    if (editTitle.trim() !== (task.title || '').trim()) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { title: task.title },
        newValue: { title: editTitle.trim() },
        metadata: {
          field: 'title',
          title: `${actorName} đã đổi tiêu đề: "${task.title}" → "${editTitle.trim()}"`,
          actor_name: actorName,
        },
      });
    }
    const oldDue = (task.due_date || '').slice(0, 10);
    const newDue = (editDueDate || '').slice(0, 10);
    if (newDue !== oldDue) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { due_date: task.due_date },
        newValue: { due_date: editDueDate || null },
        metadata: {
          field: 'due_date',
          title: `${actorName} đã đổi hạn chót: ${displayDate(oldDue)} → ${displayDate(newDue)}`,
          actor_name: actorName,
        },
      });
    }
    const oldStart = (task.start_date || '').slice(0, 10);
    const newStart = (editStartDate || '').slice(0, 10);
    if (newStart !== oldStart) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { start_date: task.start_date },
        newValue: { start_date: editStartDate || null },
        metadata: {
          field: 'start_date',
          title: `${actorName} đã đổi ngày bắt đầu: ${displayDate(oldStart)} → ${displayDate(newStart)}`,
          actor_name: actorName,
        },
      });
    }
    const oldAssigneeId = task.assignee_id == null ? '' : String(task.assignee_id);
    if (editAssigneeId !== oldAssigneeId) {
      const oldName = task.assignee?.name || 'Chưa gán';
      const newPerson = (assignablePeople || mentionPeople).find(item => String(item.id) === editAssigneeId);
      const newName = newPerson?.name || (editAssigneeId ? 'Thành viên' : 'Chưa gán');
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { assignee_id: task.assignee_id },
        newValue: { assignee_id: editAssigneeId ? Number(editAssigneeId) : null },
        metadata: {
          field: 'assignee',
          title: `${actorName} đã đổi người thực hiện: ${oldName} → ${newName}`,
          actor_name: actorName,
        },
      });
    }
    if (editPriority !== (task.priority || 'medium')) {
      void logTaskActivity({
        workspaceId: task.workspace_id,
        userId: profileId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
        oldValue: { priority: task.priority },
        newValue: { priority: editPriority },
        metadata: {
          field: 'priority',
          title: `${actorName} đã đổi độ ưu tiên: ${task.priority || 'medium'} → ${editPriority}`,
          actor_name: actorName,
        },
      });
    }
    const person = (assignablePeople || mentionPeople).find(item => String(item.id) === editAssigneeId);
    const updatedTask = { ...values, assignee: person ? { id: person.id, name: person.name, avatar_url: person.avatar_url } : null };
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_updated');
    setEditingTask(false);
    onTaskUpdated?.(updatedTask);
    window.dispatchEvent(new Event('tasks:changed'));
    toast.success(lang === 'en' ? 'Task updated' : 'Đã cập nhật task');
  };

  const completeTask = async () => {
    if (readOnly||!canComplete||!task || ['done', 'completed', 'complete'].includes((task.status || '').toLowerCase())) return;
    setSaving(true);
    try { await completeTrackedTask(task.id); }
    catch (error: any) { setSaving(false); return toast.error(error?.message || 'Không thể hoàn thành task. Kiểm tra lại quyền task.'); }
    setSaving(false);
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_completed');
    onTaskUpdated?.({ status: 'done',workflow_status:'completed' }); window.dispatchEvent(new Event('tasks:changed'));toast.success('Task đã hoàn thành');
  };

  const changePhaseTaskStatus = async (stage: WorkflowTaskStatus): Promise<void> => {
    if (readOnly||!canEdit || !task) return;
    setSaving(true);
    const status = canonicalWorkflowStatus[stage];
    const { data, error } = await supabase.from('tasks').update({ status, workflow_status: stage, updated_at: new Date().toISOString() }).eq('id', task.id).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) { toast.error(error?.message || 'Bạn không còn quyền cập nhật task.'); throw new Error('Task status update denied'); }
    onTaskUpdated?.({ status, workflow_status: stage });
    window.dispatchEvent(new Event('tasks:changed'));
  };

  const isDone = ['done', 'completed', 'complete'].includes((task?.status || '').toLowerCase());
  return (
    <>
      {isOpen && !embedded && (
        <div 
          className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div 
        inert={!isOpen} 
        aria-hidden={!isOpen} 
        style={{ '--task-panel-width': `${width}px` } as React.CSSProperties}
        className={embedded ? 'flex flex-col h-full min-h-0 w-full bg-white dark:bg-slate-800' : `dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 ${isOpen ? 'w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--task-panel-width)] xl:max-w-[min(var(--task-panel-width),50vw)] shadow-drawer-task border border-blue-500/20 opacity-100 pointer-events-auto drawer-slide-in' : 'w-0 min-w-0 shadow-none border-0 opacity-0 pointer-events-none'} ${floating ? 'z-[110]' : 'z-[70]'} ${!resizing ? 'transition-[width,opacity] duration-300 ease-out' : ''}`}
      >
        {isOpen && !embedded && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div><span className="text-xs font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-gray-200 dark:border-slate-700">{task?.task_ref || 'TASK'}</span><span className="ml-2 text-xs capitalize text-gray-500">{task?.priority || 'medium'} {t('common.priority').toLowerCase()}</span></div>
          <div className="flex items-center gap-1"><TaskActivityLogPopover entityType="task" entityId={task?.id} workspaceId={task?.workspace_id} /><TaskPinButton taskId={task?.id} /><button aria-label={t('common.closeTaskDetail')} onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"><X className="w-5 h-5" /></button></div>
        </div>
        {task && <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
          <section><div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{task.title}</h2>{canEdit && !readOnly && <button type="button" onClick={() => setEditingTask(value => !value)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 dark:border-slate-700 min-h-[44px] sm:min-h-0" aria-expanded={editingTask}><Edit3 className="h-3.5 w-3.5" />{editingTask ? (lang === 'en' ? 'Cancel edit' : 'Hủy sửa') : t('common.edit')}</button>}</div><div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />{isDone ? t('common.completed') : task.status || 'To do'}</span><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><Clock className="w-4 h-4 inline mr-1 text-red-500" />{task.priority || 'Medium'}</span></div>{task.workflow_phase_id && <div className="mt-4"><WorkflowStatusPicker status={task.status} stage={task.workflow_status} disabled={!canEdit||readOnly} onChange={changePhaseTaskStatus}/></div>}</section>
          {editingTask ? (
            <section className="space-y-4 rounded-2xl border border-primary/20 bg-gray-50 p-4 dark:bg-slate-800/50">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{lang === 'en' ? 'Task title' : 'Tiêu đề task'}
                <input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.assignee')}
                  <select value={editAssigneeId} onChange={event => setEditAssigneeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="">{t('common.unassigned')}</option>
                    {(assignablePeople || mentionPeople).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    {task.assignee_id != null && task.assignee?.name && !(assignablePeople || mentionPeople).some(person => String(person.id) === String(task.assignee_id)) && <option value={task.assignee_id}>{task.assignee.name}</option>}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{t('common.priority')}
                  <select value={editPriority} onChange={event => setEditPriority(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="low">{t('common.low')}</option><option value="medium">{t('common.medium')}</option><option value="high">{t('common.high')}</option><option value="urgent">{t('common.urgent')}</option>
                  </select>
                </label>
                <div className="tw-calendar-picker relative">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    {lang === 'en' ? 'Start date' : 'Ngày bắt đầu'}
                  </label>
                  <input
                    type="text"
                    id={`task-edit-start-${task.id}`}
                    readOnly
                    onClick={(e) => {
                      if ((window as any).openCalendar) {
                        (window as any).openCalendar({
                          displayId: `task-edit-start-${task.id}`,
                          mode: 'single',
                          maxDate: editDueDate || undefined,
                        }, e);
                      }
                    }}
                    value={editStartDate ? displayDate(editStartDate).replace('—', '') : ''}
                    onChange={(e) => setEditStartDate(inputDate(e.target.value) || '')}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="tw-calendar-picker relative">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    {t('common.dueDate')}
                  </label>
                  <input
                    type="text"
                    id={`task-edit-due-${task.id}`}
                    readOnly
                    onClick={(e) => {
                      if ((window as any).openCalendar) {
                        (window as any).openCalendar({
                          displayId: `task-edit-due-${task.id}`,
                          mode: 'single',
                          minDate: editStartDate || undefined,
                        }, e);
                      }
                    }}
                    value={editDueDate ? displayDate(editDueDate).replace('—', '') : ''}
                    onChange={(e) => setEditDueDate(inputDate(e.target.value) || '')}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex justify-end"><button type="button" disabled={saving || !editTitle.trim()} onClick={() => void saveTaskDetails()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? (lang === 'en' ? 'Saving…' : 'Đang lưu…') : (lang === 'en' ? 'Save task' : 'Lưu task')}</button></div>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700"><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />{t('common.assignee')}</p>{task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee.name} src={task.assignee.avatar_url || undefined} /><b className="text-sm">{task.assignee.name}</b></div> : <span className="text-sm text-gray-500">{t('common.unassigned')}</span>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />{task.start_date ? t('common.timeline') : t('common.dueDate')}</p>{task.start_date ? <div className="text-sm flex items-center gap-1.5 flex-wrap"><span className="font-normal text-gray-700 dark:text-gray-300">{new Date(task.start_date).toLocaleDateString('vi-VN')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : t('common.noDueDate')}</span></div> : <b className="text-sm font-bold text-red-600 dark:text-red-400">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : t('common.noDueDate')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('tasks.col.projectCampaign')}</p>{task.project?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"><span className="truncate">{task.project.name}</span></span> : task.campaign?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"><span className="truncate">{task.campaign.name}</span></span> : <b className="text-sm text-gray-400">{t('common.unlinked')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('common.department')}</p><b className="text-sm">{task.department?.name || 'N/A'}</b></div></section>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{task.created_at ? new Date(task.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
            {task.created_at && task.updated_at && new Date(task.updated_at).getTime() > new Date(task.created_at).getTime() + 1000 && <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>}
          </p>
          <section>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />{t('common.description')}</p>
              {canEdit && !readOnly && !editingDescription && (
                <button onClick={() => setEditingDescription(true)} className="text-xs text-primary font-semibold cursor-pointer hover:underline">
                  <Edit3 className="w-3.5 h-3.5 inline mr-1" />{t('common.edit')}
                </button>
              )}
            </div>
            {editingDescription && !readOnly ? (
              <TaskDescriptionEditor
                value={description}
                onChange={setDescription}
                onSave={saveDescription}
                onCancel={() => {
                  setDescription(task.description || '');
                  setEditingDescription(false);
                }}
                saving={saving}
                placeholder={t('tasks.descPlaceholder')}
                autoFocus
              />
            ) : (
              <TaskDescriptionViewer description={description} />
            )}
          </section>
          <TaskComments key={`${profileId}:task:${task.id}`} target={{kind:'task',id:task.id}} people={mentionPeople} collaboratorIds={taskCollaborators} allowMobileEditing focusRequest={commentsFocusToken || commentFocus ? `${commentsFocusToken}:${commentFocus}` : undefined} onSent={async (_body,mentions) => { onTaskUpdated?.(); await notifyTaskParticipants(task, {id:profileId,name:profile?.name,department_id:profile?.department_id}, 'task_comment',mentions); }} onDeleted={() => { onTaskUpdated?.(); }}/>

        </div>}
        <div className="sticky bottom-0 z-10 flex min-h-[76px] shrink-0 gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}><button onClick={() => setCommentFocus(value => value + 1)} className="min-h-11 min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm font-bold"><MessageSquare className="mr-2 inline h-4 w-4" />{t('common.comment')}</button><button disabled={isDone || saving || !canComplete} onClick={completeTask} className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary hover:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:hover:bg-primary"><CheckCircle2 className="mr-2 inline h-4 w-4" />{isDone ? t('common.completed') : t('common.complete')}</button></div>
      </div>
    </>
  );
};
