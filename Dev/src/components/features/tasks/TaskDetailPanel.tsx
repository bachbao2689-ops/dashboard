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
import { WorkflowStatusPicker, canonicalWorkflowStatus, type WorkflowTaskStatus } from './WorkflowStatusPicker';

interface TaskDetailPanelProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (task?: any) => void;
  floating?: boolean;
  embedded?: boolean;
  commentsFocusToken?: number;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose, onTaskUpdated, floating = false, embedded = false, commentsFocusToken = 0 }) => {
  const { t } = useTranslation();
  useTaskDetailVisibility(isOpen);
  useReadEntityNotifications('task',task?.id,isOpen&&Boolean(task));
  const readOnly=useMobileReadOnly();
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [commentFocus, setCommentFocus] = useState(0);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [mentionPeople, setMentionPeople] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    setDescription(task?.description || '');
    setEditingDescription(false);
    setCommentFocus(0);
    setCanEdit(false);
    let active = true;
    if (task?.id && !task.id.startsWith('ps-') && !task.id.startsWith('cs-')) supabase.rpc('workflow_task_access', { tid: task.id, editing: true }).then(({ data }) => { if (active) setCanEdit(data === true); });
    if (isOpen) supabase.from('users').select('id,name').eq('is_active', true).order('name').then(({ data }) => { if (active) setMentionPeople(data || []); });
    return () => { active = false; };
  }, [task?.id, task?.description, isOpen]);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: MouseEvent) => { const next = document.body.clientWidth - event.clientX; if (next >= 360 && next <= 800) setWidth(next); };
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);

  const saveDescription = async () => {
    if (readOnly||!task) return;
    setSaving(true);
    const { data, error } = await supabase.from('tasks').update({ description, updated_at: new Date().toISOString() }).eq('id', task.id).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) return toast.error('Không thể lưu mô tả. Kiểm tra lại quyền task.');
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_updated');
    setEditingDescription(false); onTaskUpdated?.({ description }); toast.success('Đã lưu mô tả');
  };

  const completeTask = async () => {
    if (readOnly||!task || ['done', 'completed', 'complete'].includes((task.status || '').toLowerCase())) return;
    setSaving(true);
    const { data, error } = await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', task.id).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) return toast.error('Không thể hoàn thành task. Kiểm tra lại quyền task.');
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
          <div className="flex items-center gap-1"><TaskPinButton taskId={task?.id} /><button aria-label={t('common.closeTaskDetail')} onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button></div>
        </div>
        {task && <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
          <section><h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{task.title}</h2><div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />{isDone ? t('common.completed') : task.status || 'To do'}</span><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><Clock className="w-4 h-4 inline mr-1 text-red-500" />{task.priority || 'Medium'}</span></div>{task.workflow_phase_id && <div className="mt-4"><WorkflowStatusPicker status={task.status} stage={task.workflow_status} disabled={!canEdit||readOnly} onChange={changePhaseTaskStatus}/></div>}</section>
          <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700"><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />{t('common.assignee')}</p>{task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee.name} src={task.assignee.avatar_url || undefined} /><b className="text-sm">{task.assignee.name}</b></div> : <span className="text-sm text-gray-500">{t('common.unassigned')}</span>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />{task.start_date ? t('common.timeline') : t('common.dueDate')}</p>{task.start_date ? <div className="text-sm flex items-center gap-1.5 flex-wrap"><span className="font-normal text-gray-700 dark:text-gray-300">{new Date(task.start_date).toLocaleDateString('vi-VN')}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : t('common.noDueDate')}</span></div> : <b className="text-sm font-bold text-red-600 dark:text-red-400">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : t('common.noDueDate')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('tasks.col.projectCampaign')}</p>{task.project?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"><span className="truncate">{task.project.name}</span></span> : task.campaign?.name ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"><span className="truncate">{task.campaign.name}</span></span> : <b className="text-sm text-gray-400">{t('common.unlinked')}</b>}</div><div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">{t('common.department')}</p><b className="text-sm">{task.department?.name || 'N/A'}</b></div></section>
          <section><div className="flex justify-between items-center mb-2"><p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />{t('common.description')}</p>{canEdit && !readOnly && !editingDescription && <button onClick={() => setEditingDescription(true)} className="text-xs text-primary font-semibold"><Edit3 className="w-3.5 h-3.5 inline mr-1" />{t('common.edit')}</button>}</div>{editingDescription && !readOnly ? <><textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} className="w-full p-4 rounded-2xl border border-primary/40 bg-white dark:bg-slate-900 outline-none" placeholder={t('tasks.descPlaceholder')} /><div className="flex gap-2 mt-2 justify-end"><button onClick={() => { setDescription(task.description || ''); setEditingDescription(false); }} className="px-3 py-2 text-sm">{t('common.cancel')}</button><button disabled={saving} onClick={saveDescription} className="px-3 py-2 text-sm bg-primary text-white rounded-lg"><Save className="w-4 h-4 inline mr-1" />{t('common.save')}</button></div></> : <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 whitespace-pre-wrap text-sm min-h-[88px]">{description || t('tasks.noDescription')}</div>}</section>
          <TaskComments key={`${profileId}:task:${task.id}`} target={{kind:'task',id:task.id}} people={mentionPeople} focusRequest={commentsFocusToken || commentFocus ? `${commentsFocusToken}:${commentFocus}` : undefined} onSent={async (_body,mentions) => { onTaskUpdated?.(); await notifyTaskParticipants(task, {id:profileId,name:profile?.name,department_id:profile?.department_id}, 'task_comment',mentions); }} onDeleted={() => { onTaskUpdated?.(); }}/>
        </div>}
        {readOnly?<div className="push-mobile-readonly">Xem tiến độ trên điện thoại · Cập nhật công việc trên máy tính</div>:(<div className="sticky bottom-0 z-10 flex min-h-[76px] shrink-0 gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}><button onClick={() => setCommentFocus(value => value + 1)} className="min-h-11 min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm font-bold"><MessageSquare className="mr-2 inline h-4 w-4" />{t('common.comment')}</button><button disabled={isDone || saving || !canEdit} onClick={completeTask} className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary hover:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:hover:bg-primary"><CheckCircle2 className="mr-2 inline h-4 w-4" />{isDone ? t('common.completed') : t('common.complete')}</button></div>)}
      </div>
    </>
  );
};
