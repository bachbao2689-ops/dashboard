import {EntityStatusField} from './EntityStatusField';
import {EntityActionBadges} from './EntityActionBadges';
import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { inputDate } from '../../../lib/workflowHub';
import { taskKey, taskLink, isTaskDone } from '../../../lib/taskTracking';
import { workflowDateError } from '../../../lib/workflowCalendar';
import { useProjectCampaignDetails } from '../../../hooks/useProjectCampaignDetails';
import { useWorkflowHub } from '../../../hooks/useWorkflowHub';
import { WorkflowTrackingSummary } from './WorkflowTrackingSummary';
import { X, Trash2, Plus, Users, Calendar, Clock3, Check, CheckCircle2, ChevronDown, Edit3 } from 'lucide-react';
import { TaskPinButton } from '../tasks/TaskPinButton';
import { priorityClass } from './projectPresentation';
import { Avatar } from '../../common/Avatar';
import { SmartCommentInput } from '../comments/SmartCommentInput';
import { CommentMessage } from '../comments/CommentMessage';
import { deleteOwnedComment } from '../../../lib/commentDeletion';
import { editOwnedComment } from '../../../lib/commentEditing';
import { TaskDescriptionViewer } from '../tasks/TaskDescriptionViewer';
import { supabase } from '../../../services/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import {saveTaskDeliverables} from '../../../lib/taskDeliverables';
import {useTaskDetailVisibility} from '../../../hooks/useTaskDetailVisibility';
import {isAdmin, isGlobalManager, isDepartmentLeader} from '../../../lib/roleScope';
import {workAssignmentPeople} from '../../../lib/workAccessScope';

const dateValue = (d?: string | null) => d ? d.split('-').reverse().join('/') : '---';

const formatCreatedAt = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${time} ${date}`;
};

type PanelProps = {item:any; kind:'project' | 'campaign'; onClose:() => void; onUpdated?:() => void};
export function ProjectCampaignDetailPanel(props:PanelProps) {
  useTaskDetailVisibility(Boolean(props.item));
  const profile = useAuthStore(s => s.profile);
  return <ProjectCampaignDetailContent key={`${profile?.id}:${profile?.role}:${profile?.department_id}:${props.kind}:${props.item.id}`} {...props} />;
}
function ProjectCampaignDetailContent({item,kind,onClose,onUpdated}:PanelProps) {
  const { t, lang } = useTranslation();
  useReadEntityNotifications(kind,item.id);
  const navigate = useNavigate();
  const details = useProjectCampaignDetails(kind, item.id);
  const { profile, subtasks, comments, people, busy } = details;
  const readOnly=useMobileReadOnly();
  const canManage=details.canManage&&!readOnly;
  const data = details.data || item;
  const hub = useWorkflowHub();
  const [commentText, setCommentText] = useState('');
  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);
  const [subtasksCollapsed, setSubtasksCollapsed] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  const handleSaveDesc = async () => {
    if (!item?.id) return;
    setSavingDesc(true);
    try {
      const updateField = kind === 'project' ? { description: descDraft } : { objective: descDraft };
      const { error } = await supabase.from(`${kind}s`).update(updateField).eq('id', item.id);
      if (error) throw error;
      await details.refresh();
      onUpdated?.();
      toast.success(lang === 'en' ? 'Description updated' : 'Đã cập nhật mô tả');
      setIsEditingDesc(false);
    } catch (err: any) {
      toast.error(err?.message || (lang === 'en' ? 'Failed to update description' : 'Lỗi cập nhật mô tả'));
    } finally {
      setSavingDesc(false);
    }
  };

  const itemCollaboratorIds = useMemo(() => {
    const ids = new Set<string | number>();
    if ((data as any)?.created_by) ids.add((data as any).created_by);
    if ((data as any)?.lead_id) ids.add((data as any).lead_id);
    (subtasks || []).forEach(s => { if (s.assignee_id) ids.add(s.assignee_id); });
    (comments || []).forEach(c => { if (c.user_id) ids.add(c.user_id); });
    return Array.from(ids);
  }, [data, subtasks, comments]);

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState('active');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');

  // Subtask form
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskOwner, setNewSubtaskOwner] = useState('');
  const [newSubtaskDue, setNewSubtaskDue] = useState('');
  const [newSubtaskQuantity, setNewSubtaskQuantity] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);

  const saveEdit = async () => {
    if (!title.trim() || !canManage) return;
    const startDate = inputDate(start), dueDate = inputDate(due);
    if (startDate && dueDate && startDate > dueDate) return toast.error('Ngày kết thúc phải từ ngày bắt đầu.');
    const payload = kind === 'project'
      ? { name:title.trim(), description:desc, status:editStatus, start_date:startDate, due_date:dueDate }
      : { name:title.trim(), objective:desc, status:editStatus, start_date:startDate, end_date:dueDate };
    if (await details.mutate(() => supabase.from(`${kind}s`).update(payload).eq('id', item.id).select('id').single(), 'Đã lưu thay đổi')) {
      setEditMode(false); onUpdated?.();
    }
  };

  const addComment = async (overrideBody?: string) => {
    const raw = typeof overrideBody === 'string' ? overrideBody : commentText;
    const body = raw.trim();
    if (readOnly||!body || !profile?.id) return;
    if (await details.mutate(() => kind === 'project'
      ? supabase.from('project_comments').insert({project_id:item.id, author_id:profile.id, body}).select('id').single()
      : supabase.from('activity_log').insert({workspace_id:data.workspace_id, user_id:profile.id, entity_type:'campaign', entity_id:item.id, action:'comment', metadata:{body}}).select('id').single(), 'Đã gửi bình luận')) setCommentText('');
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !canManage) return;
    const startDate = data.start_date || '', dueDate = inputDate(newSubtaskDue) || data.due_date || data.end_date || '';
    const bounds = {start:startDate, due:data.due_date || data.end_date || ''};
    if (workflowDateError(startDate, dueDate, bounds)) return toast.error('Lịch subtask phải nằm trong lịch Project/Campaign.');
    const payload = {title:newSubtaskTitle.trim(), start_date:startDate || null, due_date:dueDate || null, status:'todo',
      priority:newSubtaskPriority || 'medium',
      assignee_id:newSubtaskOwner ? Number(newSubtaskOwner) : null, [`${kind}_id`]:item.id};
    const numQ = Number(newSubtaskQuantity);
    if (await details.mutate(async () => {
      const res = await supabase.from(`${kind}_subtasks`).insert(payload).select('id').single();
      if (res.data?.id && (newSubtaskQuantity || profile?.id)) {
        await saveTaskDeliverables(
          kind === 'project' ? 'project_subtask' : 'campaign_subtask',
          res.data.id,
          { _notification_initial: true, quantity: Number.isFinite(numQ) && numQ > 0 ? numQ : null },
          profile?.id,
          data.workspace_id,
        ).catch((error: any) => {
          toast.error('Đã tạo subtask nhưng chưa lưu được sản lượng: ' + (error?.message || 'Lỗi kết nối'));
        });
      }
      return res;
    }, 'Đã thêm subtask')) {
      setNewSubtaskTitle(''); setNewSubtaskOwner(''); setNewSubtaskDue(''); setNewSubtaskQuantity(''); setNewSubtaskPriority('medium'); setShowSubtaskForm(false); onUpdated?.();
    }
  };

  const [subtaskFilter, setSubtaskFilter] = useState<'open' | 'completed' | 'all'>('all');

  const isManager = isGlobalManager(profile) || isAdmin(profile);
  const isLeader = isDepartmentLeader(profile);
  const myId = profile?.id != null ? Number(profile.id) : null;
  const isItemLeadOrCreator = Boolean(
    myId && (
      (data.lead_id && Number(data.lead_id) === myId) ||
      (data.created_by && Number(data.created_by) === myId)
    )
  );

  const visibleSubtasks = subtasks.filter(sub => {
    if (sub.status === 'deleted' || sub.status === 'archived') return false;
    if (!isManager && !isLeader && !isItemLeadOrCreator) {
      const isAssigned = sub.assignee_id != null && Number(sub.assignee_id) === myId;
      const isCreator = sub.created_by != null && Number(sub.created_by) === myId;
      if (!isAssigned && !isCreator) return false;
    }
    if (subtaskFilter === 'open') return !isTaskDone(sub.status);
    if (subtaskFilter === 'completed') return isTaskDone(sub.status);
    return true;
  });

  const removeSubtask = async (id: string) => {
    if (!canManage) return;
    if (await details.mutate(() => supabase.from(`${kind}_subtasks`).update({status:'deleted'}).eq('id', id).select('id').single(), 'Đã xóa subtask')) onUpdated?.();
  };

  const toggleSubtask = async (sub: any) => {
    const canToggle = canManage || Number(sub.assignee_id) === Number(profile?.id);
    if (!canToggle) return;
    const nextStatus = isTaskDone(sub.status) ? 'in_progress' : 'completed';
    if (await details.mutate(() => supabase.from(`${kind}_subtasks`).update({status: nextStatus}).eq('id', sub.id).select('id').single(), nextStatus === 'completed' ? (lang === 'en' ? 'Subtask completed' : 'Đã hoàn thành subtask') : (lang === 'en' ? 'Subtask reopened' : 'Đã mở lại subtask'))) {
      onUpdated?.();
      window.dispatchEvent(new Event('tasks:changed'));
      window.dispatchEvent(new Event(`${kind}s:changed`));
    }
  };

  const shadowClass = kind === 'project' ? 'shadow-drawer-project border-violet-500/20' : 'shadow-drawer-campaign border-amber-500/20';

  const panelRef = useRef<HTMLElement>(null);

  // Auto-close detail drawer when clicking outside ("staff bấm chỗ khác thì tự crop vào")
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (
        target.closest('.tw-calendar-popover') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="listbox"]') ||
        target.closest('.toast') ||
        target.closest('#headlessui-portal-root')
      ) {
        return;
      }
      onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
    }, 60);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [onClose]);

  if (!data) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside 
        ref={panelRef}
        style={{ '--panel-width': `${width}px` } as React.CSSProperties} 
        className={`dashboard-detail-drawer opacity-100 bg-white dark:bg-[#0a192f] shrink-0 w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] ${shadowClass} ${kind === 'project' ? 'border border-violet-500/20' : 'border border-amber-500/20'} z-[70] drawer-slide-in ${!resizing ? 'transition-[width] duration-300' : ''}`}
      >
      <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{data.name}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${kind==='project' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'} border capitalize`}>{kind === 'project' ? t('projects.projects') : t('projects.campaigns')}</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-[8px] hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      
      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
        {details.error && <p role="alert" className="mb-4 text-sm text-red-500">{details.error}<button onClick={() => void details.refresh()} className="ml-2 underline">Thử lại</button></p>}
        {!details.data ? <p role="status" className="text-sm text-gray-500">{details.loading ? 'Đang tải Project/Campaign…' : ''}</p> : editMode&&!readOnly ? (
          <div className="space-y-5">
            <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] font-bold outline-none mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="text" id="detail-panel-start" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'detail-panel-start', mode: 'single', maxDate: due || undefined }, e)} value={start ? dateValue(start) : ''} onChange={e=>setStart(inputDate(e.target.value) || '')} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] outline-none mt-1 text-sm cursor-pointer"/></div>
              <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="text" id="detail-panel-due" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'detail-panel-due', mode: 'single', minDate: start || undefined }, e)} value={due ? dateValue(due) : ''} onChange={e=>setDue(inputDate(e.target.value) || '')} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] outline-none mt-1 text-sm cursor-pointer"/></div>
            </div>
            <EntityStatusField value={editStatus} onChange={setEditStatus} />
            <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.description')}</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] outline-none min-h-24 mt-1 text-sm" /></div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-[#0a192f] rounded-[8px] text-sm font-semibold">{t('common.cancel')}</button><button disabled={busy} onClick={saveEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-[8px] text-sm font-semibold">{t('projects.saveChanges')}</button></div>
          </div>
        ) : (
          <div className="space-y-7">
            <EntityActionBadges
              priority={data.priority || 'medium'}
              status={data.status || (kind === 'project' ? 'active' : 'planning')}
              onPriorityChange={async (newPriority) => {
                if (!canManage) return;
                if (await details.mutate(() => supabase.from(`${kind}s`).update({ priority: newPriority }).eq('id', item.id).select('id').single(), 'Đã cập nhật mức ưu tiên')) {
                  onUpdated?.();
                }
              }}
              onStatusChange={async (newStatus) => {
                if (!canManage) return;
                if (await details.mutate(() => supabase.from(`${kind}s`).update({ status: newStatus }).eq('id', item.id).select('id').single(), 'Đã cập nhật trạng thái')) {
                  onUpdated?.();
                }
              }}
              onEdit={() => {
                setTitle(data.name);
                setEditStatus(data.status || (kind === 'project' ? 'active' : 'planning'));
                setDesc(data.description || data.objective || '');
                setStart(data.start_date || '');
                setDue(data.due_date || data.end_date || '');
                setEditMode(true);
              }}
              canManage={canManage && !readOnly}
              entityType={kind}
              entityId={item.id}
              entityName={data.name}
            >
              {Boolean((data as any).department_name || (data as any).department?.name) && (
                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-semibold border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs">
                  {lang === 'en' ? 'Department' : 'Phòng ban'}: {(data as any).department_name || (data as any).department?.name}
                </span>
              )}
            </EntityActionBadges>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-[8px] bg-slate-50 dark:bg-[#071325]/50 border border-blue-100 dark:border-slate-700 text-sm">
              <div><p className="text-[10px] uppercase text-gray-400">{t('common.owner')}</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={data.lead?.name || data.creator?.name || '---'} src={data.lead?.avatar_url || data.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{data.lead?.name || data.creator?.name || '---'}</span></div></div>
              <div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(data.start_date)}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(data.end_date || data.due_date)}</span></div></div>
              <div><p className="text-[10px] uppercase text-gray-400 mb-1">{lang === 'en' ? 'Department' : 'Phòng ban'}</p><div className="mt-1 font-semibold text-xs text-gray-700 dark:text-gray-300 line-clamp-1">{(data as any).department_name || (data as any).department?.name || (lang === 'en' ? 'Unassigned' : 'Chưa phân')}</div></div>
            </div>
            <WorkflowTrackingSummary kind={kind} id={item.id} hub={hub} onOpenTask={task => navigate(taskLink(task.id))} statusFilter={subtaskFilter} />
            <section><div className="grid grid-flow-col auto-cols-max items-center gap-2 mb-2"><h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('common.description')}</h3>{canManage && !isEditingDesc && (<button type="button" onClick={() => { setDescDraft(data.description || data.objective || ''); setIsEditingDesc(true); }} className="p-1 rounded-[6px] text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors border-0 shadow-none grid place-items-center cursor-pointer" title={lang === 'en' ? 'Quick edit description' : 'Chỉnh sửa nhanh mô tả'} aria-label={lang === 'en' ? 'Quick edit description' : 'Chỉnh sửa nhanh mô tả'}><Edit3 size={14} /></button>)}</div>{isEditingDesc ? (<div className="space-y-2"><textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] outline-none min-h-24 text-sm text-gray-900 dark:text-white focus:border-primary" /><div className="grid grid-flow-col auto-cols-max gap-2 justify-end"><button type="button" onClick={() => setIsEditingDesc(false)} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-[6px] text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">{t('common.cancel')}</button><button type="button" disabled={savingDesc} onClick={handleSaveDesc} className="px-3 py-1.5 bg-[#002e6d] text-white rounded-[6px] text-xs font-semibold hover:bg-[#002150] transition-colors disabled:opacity-50">{savingDesc ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : t('common.save')}</button></div></div>) : (<TaskDescriptionViewer description={data.description || data.objective} />)}</section>
            
            <section>
              {(() => {
                const validPanelSubtasks = visibleSubtasks.filter(s => (s as any).status !== 'deleted');
                const doneCount = validPanelSubtasks.filter(s => isTaskDone((s as any).status)).length;
                const openCount = validPanelSubtasks.filter(s => !isTaskDone((s as any).status)).length;
                return (
                  <div className="grid grid-flow-col justify-between items-center mb-3">
                    <button
                      type="button"
                      onClick={() => setSubtasksCollapsed(v => !v)}
                      className="grid grid-flow-col auto-cols-max items-center gap-2 font-bold text-sm text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer select-none"
                      aria-expanded={!subtasksCollapsed}
                      title={subtasksCollapsed ? (lang === 'en' ? 'Expand tasks' : 'Mở rộng task') : (lang === 'en' ? 'Collapse tasks' : 'Thu gọn task')}
                    >
                      <Users size={16}/>
                      <span>{kind === 'campaign' ? t('projects.tasksInCampaign') : t('projects.tasksInProject')}</span>
                      {doneCount > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {doneCount} {lang === 'en' ? 'completed' : 'hoàn thành'}
                        </span>
                      )}
                      {openCount > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {openCount} {lang === 'en' ? 'in progress' : 'chưa hoàn thành'}
                        </span>
                      )}
                      <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${subtasksCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                    {!subtasksCollapsed && (
                      <div className="grid grid-flow-col auto-cols-max items-center gap-1 bg-slate-100 dark:bg-[#0a192f] p-0.5 rounded-lg text-xs">
                        <button type="button" onClick={() => setSubtaskFilter('open')} className={`px-2 py-0.5 rounded-md transition-colors ${subtaskFilter === 'open' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{t('common.active') || 'Chưa xong'}</button>
                        <button type="button" onClick={() => setSubtaskFilter('completed')} className={`px-2 py-0.5 rounded-md transition-colors ${subtaskFilter === 'completed' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{t('common.completed') || 'Đã xong'}</button>
                        <button type="button" onClick={() => setSubtaskFilter('all')} className={`px-2 py-0.5 rounded-md transition-colors ${subtaskFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{t('common.all') || 'Tất cả'}</button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {!subtasksCollapsed && (<>
              <div className="space-y-2">
                {visibleSubtasks.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2 italic">{t('common.noData')}</p>
                ) : visibleSubtasks.map(sub => {
                  const canToggle = canManage || Number(sub.assignee_id) === Number(profile?.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => navigate(taskLink(taskKey(`${kind}_subtask`, sub.id)))}
                      className={`p-3 rounded-[8px] border text-sm group relative transition-all cursor-pointer min-w-0 overflow-hidden ${
                        isTaskDone(sub.status)
                          ? 'border-emerald-400/70 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60'
                          : 'border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0a192f]/50 hover:bg-gray-100/60 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      {/* Hover action buttons in top-right */}
                      <div
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity grid grid-flow-col auto-cols-max items-center gap-1 z-10"
                        onClick={event => event.stopPropagation()}
                      >
                        {canToggle && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void toggleSubtask(sub); }}
                            title={isTaskDone(sub.status) ? (lang === 'en' ? 'Reopen' : 'Mở lại') : (lang === 'en' ? 'Mark done' : 'Hoàn thành nhanh')}
                            aria-label={isTaskDone(sub.status) ? (lang === 'en' ? 'Reopen' : 'Mở lại') : (lang === 'en' ? 'Mark done' : 'Hoàn thành nhanh')}
                            className="p-1 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>
                        )}
                        <TaskPinButton taskId={taskKey(`${kind}_subtask`, sub.id)} size={13} className="!p-1" />
                        <button
                          type="button"
                          aria-label={`Xóa ${sub.title}`}
                          disabled={busy || !canManage}
                          onClick={() => removeSubtask(sub.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Main content layout: Title (with done checkmark icon) + Metadata (REQ-TOT-05 / Slide 4) */}
                      <div className="min-w-0 grid grid-cols-1 gap-1.5 pr-14 select-none">
                        {/* Row 1: Title */}
                        <span className={`text-sm font-semibold inline-block break-words line-clamp-2 ${isTaskDone(sub.status) ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
                          {sub.title}
                          {isTaskDone(sub.status) && (
                            <CheckCircle2 size={14} className="inline-block ml-1.5 text-emerald-500 dark:text-emerald-400 shrink-0 align-middle" />
                          )}
                        </span>

                          {/* Row 2: Badges */}
                          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                            <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-semibold lowercase ${priorityClass(sub.priority || data.priority || 'medium')}`}>
                              {t(`common.${sub.priority || data.priority || 'medium'}` as any).toLowerCase()}
                            </span>
                            {Boolean(sub.subtask_total_quantity) && (
                              <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                SL: {sub.subtask_total_quantity}
                              </span>
                            )}
                            {sub.due_date && (
                              <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] border border-red-200/80 dark:border-red-800/60 bg-red-50/80 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                <Calendar size={11} /> {dateValue(sub.due_date)}
                              </span>
                            )}
                          </div>

                          {/* Row 3: Meta */}
                          {(sub.assignee || sub.created_at) && (
                            <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto scrollbar-none">
                              {sub.assignee && (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-[6px] text-gray-700 dark:text-gray-300 text-[11px] font-medium">
                                  <Avatar name={sub.assignee.name} src={sub.assignee.avatar_url || undefined} className="w-4 h-4 text-[9px]" />
                                  <span className="line-clamp-1">{sub.assignee.name}</span>
                                </span>
                              )}
                              {sub.created_at && (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[11px] font-normal text-gray-400 dark:text-gray-500">
                                  <Clock3 size={11} />
                                  <span>{formatCreatedAt(sub.created_at)}</span>
                                  {sub.updated_at && new Date(sub.updated_at).getTime() > new Date(sub.created_at).getTime() + 1000 && (
                                    <span>· {lang === 'en' ? 'Edited' : 'Đã chỉnh sửa'}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                  );
                })}
              </div>
              {canManage && !showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-[8px] transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> {t('projects.addSubtask')}</button>}
              {canManage && showSubtaskForm && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-[#0a192f] rounded-[8px] border border-gray-200 dark:border-slate-700 space-y-3">
                  <input value={newSubtaskTitle} onChange={e=>setNewSubtaskTitle(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm"/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <select value={newSubtaskOwner} onChange={e=>setNewSubtaskOwner(e.target.value)} className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm"><option value="">{t('common.selectPic')}</option>{workAssignmentPeople(profile, people, data?.department_id).map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
                    <select value={newSubtaskPriority} onChange={e=>setNewSubtaskPriority(e.target.value)} className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm font-medium">
                      <option value="low">{t('common.low')}</option>
                      <option value="medium">{t('common.medium')}</option>
                      <option value="high">{t('common.high')}</option>
                    </select>
                    <input type="number" min="0" step="1" value={newSubtaskQuantity} onChange={e=>setNewSubtaskQuantity(e.target.value)} placeholder={t('tasks.quantity')} className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm"/>
                    <div className="tw-calendar-picker relative w-full"><input type="text" id="detail-panel-new-subtask-due" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'detail-panel-new-subtask-due', mode: 'single', minDate: data.start_date || undefined, maxDate: data.due_date || data.end_date || undefined }, e)} value={newSubtaskDue ? dateValue(newSubtaskDue) : ''} onChange={e=>setNewSubtaskDue(inputDate(e.target.value) || '')} placeholder="dd/mm/yyyy" className="p-2 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#071325] text-gray-900 dark:text-white outline-none text-sm w-full cursor-pointer"/></div>
                  </div>
                  <div className="grid grid-flow-col justify-end gap-2"><button type="button" onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm font-medium rounded-[8px] hover:bg-gray-200/70 dark:hover:bg-slate-800 transition-colors">{t('common.cancel')}</button><button type="button" disabled={busy} onClick={addSubtask} className="px-3.5 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-[8px] hover:bg-[#002557] transition-colors">{t('common.add')}</button></div>
                </div>
              )}
            </>)}</section>

            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3">Comments {comments.length > 0 && <span>({comments.length})</span>}</p>
              {comments.length > 0 && <div className="space-y-3 mb-4">
                {comments.map(c => <CommentMessage key={c.id} id={c.id} authorId={c.user_id}
                  actorId={profile?.id} authorName={c.author?.name || 'Member'} avatarUrl={c.author?.avatar_url}
                  body={c.body} createdAt={c.created_at} editedAt={kind === 'project' ? c.edited_at : c.new_value?.edited_at} readOnly={readOnly}
                  onEdit={async(id,body)=>{
                    if(readOnly||!profile?.id) return false;
                    await editOwnedComment(supabase,{kind,id:item.id},id,profile.id,body);
                    await details.refresh();onUpdated?.();return true;
                  }}
                  onDelete={async id=>{
                    if(readOnly||!profile?.id) return false;
                    await deleteOwnedComment(supabase,{kind,id:item.id},id,profile.id);
                    await details.refresh();onUpdated?.();return true;
                  }}/>) }
              </div>}
              {!readOnly&&<div className="mt-2">
                <SmartCommentInput
                  value={commentText}
                  onChange={setCommentText}
                  onSubmit={body => void addComment(body)}
                  people={people}
                  collaboratorIds={itemCollaboratorIds}
                  disabled={busy || !profile?.id}
                  saving={busy}
                  placeholder="Add a comment..."
                />
              </div>}

            </section>
          </div>
        )}
      </div>
    </aside>
  </>
  );
}
