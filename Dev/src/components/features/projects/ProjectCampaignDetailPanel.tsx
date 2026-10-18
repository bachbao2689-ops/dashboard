import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { inputDate } from '../../../lib/workflowHub';
import { taskKey, taskLink, isTaskDone } from '../../../lib/taskTracking';
import { workflowDateError } from '../../../lib/workflowCalendar';
import { useProjectCampaignDetails } from '../../../hooks/useProjectCampaignDetails';
import { useWorkflowHub } from '../../../hooks/useWorkflowHub';
import { WorkflowTrackingSummary } from './WorkflowTrackingSummary';
import { X, Edit3, CheckCircle2, Trash2, Plus, Users } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { SmartCommentInput } from '../comments/SmartCommentInput';
import { RichCommentBody } from '../comments/RichCommentBody';
import { supabase } from '../../../services/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';

const dateValue = (d?: string | null) => d ? d.split('-').reverse().join('/') : '---';

type PanelProps = {item:any; kind:'project' | 'campaign'; onClose:() => void; onUpdated?:() => void};
export function ProjectCampaignDetailPanel(props:PanelProps) {
  const profile = useAuthStore(s => s.profile);
  return <ProjectCampaignDetailContent key={`${profile?.id}:${profile?.role}:${profile?.department_id}:${props.kind}:${props.item.id}`} {...props} />;
}
function ProjectCampaignDetailContent({item,kind,onClose,onUpdated}:PanelProps) {
  const { t } = useTranslation();
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
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');

  // Subtask form
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskOwner, setNewSubtaskOwner] = useState('');
  const [newSubtaskDue, setNewSubtaskDue] = useState('');

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
      ? { name:title.trim(), description:desc, start_date:startDate, due_date:dueDate }
      : { name:title.trim(), objective:desc, start_date:startDate, end_date:dueDate };
    if (await details.mutate(() => supabase.from(`${kind}s`).update(payload).eq('id', item.id).select('id').single(), 'Đã lưu thay đổi')) {
      setEditMode(false); onUpdated?.();
    }
  };

  const completeItem = async () => {
    if (!canManage) return;
    if (await details.mutate(() => supabase.from(`${kind}s`).update({status:'completed'}).eq('id', item.id).select('id').single(), 'Đã hoàn thành')) onUpdated?.();
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
      assignee_id:newSubtaskOwner ? Number(newSubtaskOwner) : null, [`${kind}_id`]:item.id};
    if (await details.mutate(() => supabase.from(`${kind}_subtasks`).insert(payload).select('id').single(), 'Đã thêm subtask')) {
      setNewSubtaskTitle(''); setNewSubtaskOwner(''); setNewSubtaskDue(''); setShowSubtaskForm(false); onUpdated?.();
    }
  };

  const [subtaskFilter, setSubtaskFilter] = useState<'open' | 'completed' | 'all'>('open');

  const completeSubtask = async (sub: any) => {
    if (readOnly || isTaskDone(sub.status)) return;
    if (await details.mutate(() => supabase.from(`${kind}_subtasks`).update({ status: 'completed' }).eq('id', sub.id).select('id').single(), 'Đã hoàn thành subtask')) {
      window.dispatchEvent(new Event('tasks:changed'));
      onUpdated?.();
    }
  };

  const visibleSubtasks = subtasks.filter(sub => {
    if (sub.status === 'deleted' || sub.status === 'archived') return false;
    if (subtaskFilter === 'open') return !isTaskDone(sub.status);
    if (subtaskFilter === 'completed') return isTaskDone(sub.status);
    return true;
  });

  const removeSubtask = async (id: string) => {
    if (!canManage) return;
    if (await details.mutate(() => supabase.from(`${kind}_subtasks`).update({status:'deleted'}).eq('id', id).select('id').single(), 'Đã xóa subtask')) onUpdated?.();
  };

  const shadowClass = kind === 'project' ? 'shadow-drawer-project border-violet-500/20' : 'shadow-drawer-campaign border-amber-500/20';

  if (!data) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[65] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside 
        style={{ '--panel-width': `${width}px` } as React.CSSProperties} 
        className={`dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] ${shadowClass} z-[70] drawer-slide-in ${!resizing ? 'transition-[width] duration-300' : ''}`}
      >
      <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{data.name}</h3>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      
      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
        {details.error && <p role="alert" className="mb-4 text-sm text-red-500">{details.error}<button onClick={() => void details.refresh()} className="ml-2 underline">Thử lại</button></p>}
        {!details.data ? <p role="status" className="text-sm text-gray-500">{details.loading ? 'Đang tải Project/Campaign…' : ''}</p> : editMode&&!readOnly ? (
          <div className="space-y-5">
            <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('projects.nameLabel')}</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.startDate')}</label><input type="text" id="detail-panel-start" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'detail-panel-start', mode: 'single', maxDate: due || undefined }, e)} value={start ? dateValue(start) : ''} onChange={e=>setStart(inputDate(e.target.value) || '')} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div>
              <div className="tw-calendar-picker relative"><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.endDate')}</label><input type="text" id="detail-panel-due" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'detail-panel-due', mode: 'single', minDate: start || undefined }, e)} value={due ? dateValue(due) : ''} onChange={e=>setDue(inputDate(e.target.value) || '')} placeholder="dd/mm/yyyy" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm cursor-pointer"/></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">{t('common.description')}</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" /></div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold">{t('common.cancel')}</button><button disabled={busy} onClick={saveEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold">{t('projects.saveChanges')}</button></div>
          </div>
        ) : (
          <div className="space-y-7">
            <div className="flex gap-2"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${kind==='project' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'} border capitalize`}>{kind === 'project' ? t('projects.projects') : t('projects.campaigns')}</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 capitalize">{data.status || 'planning'}</span></div>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm">
              <div><p className="text-[10px] uppercase text-gray-400">{t('common.owner')}</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={data.lead?.name || data.creator?.name || '---'} src={data.lead?.avatar_url || data.creator?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{data.lead?.name || data.creator?.name || '---'}</span></div></div>
              <div><p className="text-[10px] uppercase text-gray-400 mb-1">{t('common.timeline')}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap text-sm"><span className="font-normal text-gray-700 dark:text-gray-300">{dateValue(data.start_date)}</span><span className="text-gray-400">–</span><span className="font-bold text-red-600 dark:text-red-400">{dateValue(data.end_date || data.due_date)}</span></div></div>
            </div>
            <WorkflowTrackingSummary kind={kind} id={item.id} hub={hub} onOpenTask={task => navigate(taskLink(task.id))} statusFilter={subtaskFilter} />
            <section><h3 className="font-bold text-sm mb-2">{t('common.description')}</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{data.description || data.objective || t('tasks.noDescription')}</div></section>
            
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex gap-2 items-center"><Users size={16}/> {t('projects.subtasks')}</h3>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button type="button" onClick={() => setSubtaskFilter('open')} className={`px-2 py-0.5 rounded-md transition-colors ${subtaskFilter === 'open' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{t('common.active') || 'Chưa xong'}</button>
                  <button type="button" onClick={() => setSubtaskFilter('completed')} className={`px-2 py-0.5 rounded-md transition-colors ${subtaskFilter === 'completed' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{t('common.completed') || 'Đã xong'}</button>
                  <button type="button" onClick={() => setSubtaskFilter('all')} className={`px-2 py-0.5 rounded-md transition-colors ${subtaskFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{t('common.all') || 'Tất cả'}</button>
                </div>
              </div>
              <div className="space-y-2">
                {visibleSubtasks.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2 italic">{t('common.noData')}</p>
                ) : visibleSubtasks.map(sub => (
                  <div key={sub.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm flex justify-between items-start">
                    <div>
                      <button onClick={() => navigate(taskLink(taskKey(`${kind}_subtask`, sub.id)))} className={`text-left font-bold ${isTaskDone(sub.status) ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{sub.title}</button>
                      <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><Avatar name={sub.assignee?.name || t('common.unassigned')} src={sub.assignee?.avatar_url} className="w-4 h-4 text-[9px]" /> {sub.assignee?.name || t('common.unassigned')}</span>
                        {sub.due_date && <span className="font-bold text-red-600 dark:text-red-400">{dateValue(sub.due_date)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Number(sub.assignee_id) === Number(profile?.id) && !isTaskDone(sub.status) && (
                        <button aria-label={t('common.complete')} disabled={busy} onClick={() => void completeSubtask(sub)} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors" title={t('common.complete')}>
                          <CheckCircle2 size={15}/>
                        </button>
                      )}
                      <button aria-label={`Xóa ${sub.title}`} disabled={busy || !canManage} onClick={() => removeSubtask(sub.id)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
              {canManage && !showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> {t('projects.addSubtask')}</button>}
              {canManage && showSubtaskForm && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                  <input value={newSubtaskTitle} onChange={e=>setNewSubtaskTitle(e.target.value)} placeholder={t('projects.subtaskPlaceholder')} className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newSubtaskOwner} onChange={e=>setNewSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">{t('common.selectPic')}</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <div className="tw-calendar-picker relative w-full"><input type="text" id="detail-panel-new-subtask-due" readOnly onClick={e => (window as any).openCalendar?.({ displayId: 'detail-panel-new-subtask-due', mode: 'single', minDate: data.start_date || undefined, maxDate: data.due_date || data.end_date || undefined }, e)} value={newSubtaskDue ? dateValue(newSubtaskDue) : ''} onChange={e=>setNewSubtaskDue(inputDate(e.target.value) || '')} placeholder="dd/mm/yyyy" className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm w-full cursor-pointer"/></div>
                  </div>
                  <div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg">{t('common.cancel')}</button><button disabled={busy} onClick={addSubtask} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg">{t('common.add')}</button></div>
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3">Comments {comments.length > 0 && <span>({comments.length})</span>}</p>
              {comments.length > 0 && <div className="space-y-3 mb-4">
                {comments.map(c => {
                  const isMe = String(c.user_id) === String(profile?.id);
                  return (
                    <div key={c.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'} items-end`}>
                      {!isMe && <Avatar name={c.author?.name || 'Member'} src={c.author?.avatar_url} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
                      <div className={`group relative max-w-[85%] ${isMe ? 'order-1' : 'order-2'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-[#002e6d] text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-bl-sm'}`}>
                          <p className={`text-[11px] font-extrabold tracking-tight mb-1 ${isMe ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{c.author?.name || 'Member'}</p>
                          <RichCommentBody body={c.body} isMineBubble={isMe} />
                        </div>
                      </div>
                      {isMe && <Avatar name={profile?.name || ''} src={profile?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
                    </div>
                  );
                })}
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
      {details.data && !editMode && canManage && (
        <div className="p-4 md:p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => { setTitle(data.name); setDesc(data.description || data.objective || ''); setStart(data.start_date || ''); setDue(data.due_date || data.end_date || ''); setEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"><Edit3 className="w-4 h-4" /> {t('common.edit')}</button>
          <button disabled={busy || data.status === 'completed'} onClick={completeItem} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#001f4d] transition-colors"><CheckCircle2 className="w-4 h-4" /> {t('common.complete')}</button>
        </div>
      )}
    </aside>
  </>
  );
}
