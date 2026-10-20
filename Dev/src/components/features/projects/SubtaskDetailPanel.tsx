import {useReadEntityNotifications} from '../../../hooks/useReadEntityNotifications';
import {useTaskDetailVisibility} from '../../../hooks/useTaskDetailVisibility';
import {hasCanonicalNotifications} from '../../../store/notificationStore';
import React, { useCallback, useEffect, useState } from 'react';
import { TaskComments } from '../comments/TaskComments';
import { Avatar } from '../../common/Avatar';

import { AlignLeft, Calendar, CheckCircle2, Edit3, ImagePlus, MessageSquare, User, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import {useMobileReadOnly} from '../../../hooks/useMobileReadOnly';
import { supabase } from '../../../services/supabase';
import { updateTrackedTask } from '../../../services/workspaceTasks';
import { taskKey } from '../../../lib/taskTracking';
import { TaskPinButton } from '../tasks/TaskPinButton';
import { TaskDescriptionViewer } from '../tasks/TaskDescriptionViewer';
import { TaskDescriptionEditor } from '../tasks/TaskDescriptionEditor';
import { useTranslation } from '../../../i18n/translations';

type Person = { id: number; name: string };
type Subtask = {
  id: string;
  title: string;
  status?: string | null;
  due_date?: string | null;
  assignee_id?: number | null;
  assignee?: { name?: string } | null;
  project_id?: string | number | null;
  campaign_id?: string | number | null;
  priority?: string | null;
};
type ParentDetails = { name: string; priority?: string | null; departmentName?: string | null };
const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const isDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
const displayDate = (date?: string | null) => date ? new Date(date).toLocaleDateString('vi-VN') : '---';

interface SubtaskDetailPanelProps {
  embedded?: boolean;
  commentsFocusToken?: number;
  entityType?: 'project_subtask' | 'campaign_subtask';
  parentName?: string;
  subtask: Subtask | null;
  profile: { id?: number; name?: string } | null;
  people: Person[];
  onClose: () => void;
  onUpdated: (subtask?: Subtask) => void;
}

export const SubtaskDetailPanel: React.FC<SubtaskDetailPanelProps> = ({ subtask, profile, people, onClose, onUpdated, entityType = 'project_subtask', parentName, embedded = false, commentsFocusToken = 0 }) => {
  const { t } = useTranslation();
  useTaskDetailVisibility(Boolean(subtask));
  useReadEntityNotifications(entityType,subtask?.id,Boolean(subtask));
  const readOnly=useMobileReadOnly();
  const [parentDetails, setParentDetails] = useState<ParentDetails | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [commentFocus, setCommentFocus] = useState(0);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftImageUrl, setDraftImageUrl] = useState('');
  const [width, setWidth] = useState(560);
  const [resizing, setResizing] = useState(false);
  
  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let active = true;
    setCanEdit(false);
    setEditing(false);
    if (subtask?.id && profile?.id) {
      const kind = entityType === 'project_subtask' ? 'project' : 'campaign';
      void supabase.rpc('workflow_old_task_access', { k: kind, tid: subtask.id, editing: true })
        .then(({ data }) => { if (active) setCanEdit(data === true); });
    }
    return () => { active = false; };
  }, [subtask?.id, entityType, profile?.id]);

  useEffect(() => {
    const parentId = entityType === 'campaign_subtask' ? subtask?.campaign_id : subtask?.project_id;
    if (!parentId) { setParentDetails(null); setParentLoading(false); return; }
    let active = true;
    setParentDetails(null);
    setParentLoading(true);
    const loadParent = async () => {
      const { data: parent, error } = await (entityType === 'project_subtask'
        ? supabase.from('projects').select('name,priority,department_id').eq('id', parentId).maybeSingle()
        : supabase.from('campaigns').select('name,department_id').eq('id', parentId).maybeSingle());
      if (!active) return;
      if (error || !parent) {
        if (error) console.warn('Could not load subtask parent', error.message);
        setParentLoading(false);
        return;
      }
      let departmentName: string | null = null;
      if (parent.department_id) {
        const { data: department, error: departmentError } = await supabase.from('departments').select('name').eq('id', parent.department_id).maybeSingle();
        if (departmentError) console.warn('Could not load parent department', departmentError.message);
        departmentName = department?.name || null;
      }
      if (active) {
        setParentDetails({ name: parent.name, priority: 'priority' in parent ? parent.priority as string : null, departmentName });
        setParentLoading(false);
      }
    };
    void loadParent();
    return () => { active = false; };
  }, [subtask?.id, subtask?.project_id, subtask?.campaign_id, entityType]);

  const [subtaskCollaborators, setSubtaskCollaborators] = useState<(string | number)[]>([]);
  useEffect(() => {
    let active = true;
    const parentId = entityType === 'campaign_subtask' ? subtask?.campaign_id : subtask?.project_id;
    const ids = new Set<string | number>();
    if (subtask?.assignee_id) ids.add(subtask.assignee_id);

    if (parentId) {
      const table = entityType === 'campaign_subtask' ? 'campaign_subtasks' : 'project_subtasks';
      const parentKey = entityType === 'campaign_subtask' ? 'campaign_id' : 'project_id';
      supabase
        .from(table)
        .select('assignee_id')
        .eq(parentKey, parentId)
        .neq('status', 'deleted')
        .then(({ data }) => {
          if (!active) return;
          (data || []).forEach(r => {
            if (r.assignee_id) ids.add(r.assignee_id);
          });
          setSubtaskCollaborators(Array.from(ids));
        });
    } else {
      setSubtaskCollaborators(Array.from(ids));
    }
    return () => {
      active = false;
    };
  }, [subtask?.id, subtask?.assignee_id, subtask?.project_id, subtask?.campaign_id, entityType]);


  const subtaskId = subtask?.id;
  const reload = useCallback(async () => {
    if (!subtaskId) return;
    const detailsResult = await supabase.from('activity_log').select('metadata').eq('entity_type',entityType).eq('entity_id',subtaskId).eq('action','details_updated').order('created_at',{ascending:false}).limit(1);
    const details = detailsResult.data?.[0]?.metadata || {};
    setDescription(details.description || '');
    setImageUrl(details.image_url || '');
  }, [subtaskId, entityType]);

  useEffect(() => {
    setCommentFocus(0);
    setEditing(false);
    void reload();
  }, [reload]);

  const notifyMentionedPeople = async (_body: string, mentions: number[]) => {
    if (hasCanonicalNotifications() || !subtask || !profile?.id) return;
    const targets = people.filter(person => person.id !== profile.id && mentions.includes(person.id));
    if (!targets.length) return;
    await supabase.from('notifications').insert(targets.map(person => ({
      user_id: person.id,
      type: 'system',
      message: `${profile.name || 'Một thành viên'} đã nhắc bạn trong subtask: ${subtask.title}`,
      entity_type: entityType,
      entity_id: subtask.id
    })));
  };

  const saveDetails = async () => {
    if (readOnly||!canEdit||!subtask || !profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: profile.id,
      action: 'details_updated',
      entity_type: entityType,
      entity_id: subtask.id,
      metadata: { description: draftDescription.trim(), image_url: draftImageUrl.trim() || null }
    });
    setSaving(false);
    if (error) return toast.error('Không thể lưu thông tin subtask');
    setDescription(draftDescription.trim());
    setImageUrl(draftImageUrl.trim());
    setEditing(false);
    toast.success('Đã lưu subtask');
  };



  const complete = async () => {
    if (readOnly||!canEdit||!subtask || saving || isDone(subtask.status)) return;
    setSaving(true);
    try {
      await updateTrackedTask(taskKey(entityType, subtask.id), { status: 'completed' });
      onUpdated({ ...subtask, status: 'completed' });
      toast.success('Đã hoàn thành subtask');
    } catch (error: any) { toast.error(error.message || 'Không thể hoàn thành subtask'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!subtask?.id) return;
    const channel = supabase.channel(`realtime-activity_log-${subtask?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `entity_id=eq.${subtask?.id}` }, () => {
        void reload();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [subtask?.id, reload]);

  if (!subtask) return null;
  const completed = isDone(subtask.status);
  const priority = subtask.priority || parentDetails?.priority || 'Chưa đặt';

  return (
    <>
      {!embedded && <div
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 z-[85] xl:hidden backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />}
      <aside 
        style={{ '--panel-width': `${width}px` } as React.CSSProperties} 
        className={embedded ? 'flex flex-col h-full min-h-0 w-full bg-white dark:bg-slate-800' : `dashboard-detail-drawer bg-white dark:bg-slate-800 shrink-0 w-full max-w-full xl:max-w-[calc(100vw-32px)] xl:w-[var(--panel-width)] xl:max-w-[min(var(--panel-width),50vw)] shadow-drawer-subtask z-[90] drawer-slide-in ${!resizing ? 'transition-[width] duration-300' : ''}`}
      >
      {!embedded && <div onMouseDown={() => setResizing(true)} className="hidden xl:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div><span className="text-xs font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">SUBTASK</span><span className="ml-2 text-xs capitalize text-gray-500">{priority} {t('common.priority').toLowerCase()}</span></div>
        <div className="flex items-center gap-1"><TaskPinButton taskId={subtask ? taskKey(entityType, subtask.id) : null} /><button aria-label={t('common.close')} onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
        <section><h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{subtask.title}</h2><div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />{completed ? t('common.completed') : subtask.status || 'To do'}</span><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><Clock className="w-4 h-4 inline mr-1 text-red-500" />{priority}</span></div></section>
        
        <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />{t('common.assignee')}</p>{subtask.assignee ? <div className="flex items-center gap-2"><Avatar name={subtask.assignee.name || t('common.unassigned')} src={(subtask.assignee as any)?.avatar_url} /><b className="text-sm">{subtask.assignee.name}</b></div> : <span className="text-sm text-gray-500">{t('common.unassigned')}</span>}</div>
          <div><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />{t('common.dueDate')}</p><b className="text-sm font-bold text-red-600 dark:text-red-400">{subtask.due_date ? displayDate(subtask.due_date) : t('common.noDueDate')}</b></div>
          <div><p className="text-xs text-gray-500 uppercase mb-2">{entityType === 'campaign_subtask' ? t('projects.col.campaign') : t('projects.col.project')}</p>{entityType === 'campaign_subtask' ? <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 line-clamp-1 ${parentLoading ? 'h-4 w-24 animate-pulse' : ''}`}>{parentLoading ? '' : parentDetails?.name || parentName || t('projects.col.campaign')}</span> : <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 line-clamp-1 ${parentLoading ? 'h-4 w-24 animate-pulse' : ''}`}>{parentLoading ? '' : parentDetails?.name || parentName || t('projects.col.project')}</span>}</div>
          <div><p className="text-xs text-gray-500 uppercase mb-2">{t('common.department')}</p><b className={`text-sm ${parentLoading ? 'inline-block h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-slate-700' : ''}`}>{parentLoading ? '' : parentDetails?.departmentName || t('common.unassigned')}</b></div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />{t('common.description')}</p>
            {!editing && !readOnly && canEdit && (
              <button
                onClick={() => {
                  setDraftDescription(description);
                  setDraftImageUrl(imageUrl);
                  setEditing(true);
                }}
                className="text-xs text-primary font-semibold cursor-pointer hover:underline"
              >
                <Edit3 className="w-3.5 h-3.5 inline mr-1" />{t('common.edit')}
              </button>
            )}
          </div>
          {editing && !readOnly && canEdit ? (
            <TaskDescriptionEditor
              value={draftDescription}
              onChange={setDraftDescription}
              onSave={saveDetails}
              onCancel={() => setEditing(false)}
              saving={saving}
              placeholder={t('projects.subtaskPlaceholder')}
              autoFocus
            />
          ) : (
            <>
              <TaskDescriptionViewer description={description} />
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <ImagePlus className="h-4 w-4" />{t('projects.openSubtaskImage')}
                </a>
              )}
            </>
          )}
        </section>

        <TaskComments key={`${profile?.id}:${entityType}:${subtask.id}`} target={{kind:entityType,id:subtask.id}} people={people} collaboratorIds={subtaskCollaborators} focusRequest={commentsFocusToken || commentFocus ? `${commentsFocusToken}:${commentFocus}` : undefined} onSent={async (body,mentions) => { onUpdated(); await notifyMentionedPeople(body,mentions); }} onDeleted={() => { onUpdated(); }}/>

      </div>

      {readOnly?<div className="push-mobile-readonly">Xem tiến độ trên điện thoại · Cập nhật công việc trên máy tính</div>:(<div className="sticky bottom-0 z-10 flex min-h-[76px] shrink-0 gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button onClick={() => setCommentFocus(value => value + 1)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-2 text-sm font-bold transition-colors"><MessageSquare className="mr-2 inline h-4 w-4" />{t('common.comment')}</button>
        <button disabled={completed || saving || !canEdit} onClick={complete} className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-2 inline h-4 w-4" />{completed ? t('common.completed') : t('common.complete')}</button>
      </div>)}
    </aside>
  </>
  );
};
