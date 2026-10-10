import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from "../../common/Avatar";

import { AlignLeft, Calendar, CheckCircle2, Edit3, ImagePlus, MessageSquare, Reply, Save, Send, User, X, Activity, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';

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
type ActivityComment = {
  id: string;
  user_id: number;
  created_at: string;
  metadata?: { body?: string } | null;
  user?: { name?: string } | null;
};

const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const isDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
const displayDate = (date?: string | null) => date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa đặt hạn';

interface SubtaskDetailPanelProps {
  entityType?: 'project_subtask' | 'campaign_subtask';
  subtask: Subtask | null;
  profile: { id?: number; name?: string } | null;
  people: Person[];
  onClose: () => void;
  onUpdated: (subtask?: Subtask) => void;
}

export const SubtaskDetailPanel: React.FC<SubtaskDetailPanelProps> = ({ subtask, profile, people, onClose, onUpdated, entityType = 'project_subtask' }) => {
  const [parentDetails, setParentDetails] = useState<ParentDetails | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftImageUrl, setDraftImageUrl] = useState('');
  const [commentText, setCommentText] = useState('');
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
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parentId = entityType === 'campaign_subtask' ? subtask?.campaign_id : subtask?.project_id;
    if (!parentId) { setParentDetails(null); setParentLoading(false); return; }
    let active = true;
    setParentDetails(null);
    setParentLoading(true);
    const loadParent = async () => {
      const table = entityType === 'campaign_subtask' ? 'campaigns' : 'projects';
      const { data: parent, error } = await supabase.from(table).select('name,priority,department_id').eq('id', parentId).maybeSingle();
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
        setParentDetails({ name: parent.name, priority: parent.priority, departmentName });
        setParentLoading(false);
      }
    };
    void loadParent();
    return () => { active = false; };
  }, [subtask?.id, subtask?.project_id, subtask?.campaign_id, entityType]);

  const reload = useCallback(async () => {
    if (!subtask?.id) return;
    const [commentsResult, detailsResult] = await Promise.all([
      supabase
        .from('activity_log')
        .select('id,user_id,created_at,metadata,user:user_id(name)')
        .eq('entity_type', entityType)
        .eq('entity_id', subtask.id)
        .eq('action', 'comment')
        .order('created_at', { ascending: true }),
      supabase
        .from('activity_log')
        .select('metadata')
        .eq('entity_type', entityType)
        .eq('entity_id', subtask.id)
        .eq('action', 'details_updated')
        .order('created_at', { ascending: false })
        .limit(1)
    ]);
    if (commentsResult.error) console.warn('Could not load subtask comments', commentsResult.error.message);
    setComments((commentsResult.data || []) as ActivityComment[]);
    const details = detailsResult.data?.[0]?.metadata || {};
    setDescription(details.description || '');
    setImageUrl(details.image_url || '');
  }, [subtask?.id, entityType]);

  useEffect(() => {
    setCommentText('');
    setEditing(false);
    void reload();
  }, [reload]);

  const mentionQuery = useMemo(() => {
    const match = commentText.match(/(?:^|\s)@([^\s@]*)$/);
    return match ? match[1].toLowerCase() : null;
  }, [commentText]);
  const mentionOptions = useMemo(() => mentionQuery === null ? [] : people.filter(person => person.name.toLowerCase().includes(mentionQuery)).slice(0, 5), [mentionQuery, people]);

  const chooseMention = (person: Person) => {
    setCommentText(value => value.replace(/@[^\s@]*$/, `@${person.name.replace(/\s+/g, '')} `));
    commentRef.current?.focus();
  };

  const notifyMentionedPeople = async (body: string) => {
    if (!subtask || !profile?.id) return;
    const targets = people.filter(person => person.id !== profile.id && body.toLowerCase().includes(`@${person.name.replace(/\s+/g, '').toLowerCase()}`));
    if (!targets.length) return;
    await supabase.from('notifications').insert(targets.map(person => ({
      user_id: person.id,
      type: 'system',
      message: `${profile.name || 'Một thành viên'} đã nhắc bạn trong subtask: ${subtask.title}`,
      entity_type: entityType,
      entity_id: subtask.id
    })));
  };

  const addComment = async () => {
    const body = commentText.trim();
    if (!subtask || !profile?.id || !body) return;
    setSaving(true);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: profile.id,
      action: 'comment',
      entity_type: entityType,
      entity_id: subtask.id,
      metadata: { body }
    });
    setSaving(false);
    if (error) return toast.error('Không thể gửi bình luận');
    await notifyMentionedPeople(body);
    setCommentText('');
    await reload();
    onUpdated();
  };

  const replyTo = (author?: string) => {
    if (!author) return;
    setCommentText(value => `${value}${value && !value.endsWith(' ') ? ' ' : ''}@${author.replace(/\s+/g, '')} `);
    window.setTimeout(() => commentRef.current?.focus(), 0);
  };

  const saveDetails = async () => {
    if (!subtask || !profile?.id) return;
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

  const uploadImage = async (file?: File) => {
    if (!file) return;
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    setSaving(true);
    const { data, error } = await supabase.storage.from('attachments').upload(`subtasks/${Date.now()}-${cleanName}`, file, { upsert: false });
    setSaving(false);
    if (error || !data) return toast.error('Chưa thể tải ảnh. Hãy dán link ảnh hoặc kiểm tra bucket attachments.');
    const url = supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
    setDraftImageUrl(url);
    toast.success('Đã tải ảnh lên, nhấn Lưu để cập nhật subtask');
  };

  const complete = async () => {
    if (!subtask || isDone(subtask.status)) return;
    setSaving(true);
    const { error } = await supabase.from(entityType === 'campaign_subtask' ? 'campaign_subtasks' : 'project_subtasks').update({ status: 'completed' }).eq('id', subtask.id);
    setSaving(false);
    if (error) return toast.error('Không thể hoàn thành subtask');
    const updated = { ...subtask, status: 'completed' };
    onUpdated(updated);
    toast.success('Đã hoàn thành subtask');
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
    <aside style={{ '--panel-width': `${width}px` } as React.CSSProperties} className={`drawer-slide-in absolute right-0 top-0 z-[90] flex h-full w-full max-w-full md:max-w-[calc(100vw-40px)] md:w-[var(--panel-width)] md:min-w-[var(--panel-width)] flex-col overflow-hidden rounded-l-3xl border-l border-emerald-500/20 bg-white shadow-drawer-subtask dark:bg-slate-800 ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
      <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div><span className="text-xs font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-gray-200 dark:border-slate-700">SUBTASK</span><span className="ml-2 text-xs capitalize text-gray-500">{priority} priority</span></div>
        <button aria-label="Đóng chi tiết task" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
        <section><h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">{subtask.title}</h2><div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />{completed ? 'Completed' : subtask.status || 'To do'}</span><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><Clock className="w-4 h-4 inline mr-1 text-red-500" />{priority}</span></div></section>
        
        <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />Assignee</p>{subtask.assignee ? <div className="flex items-center gap-2"><Avatar name={subtask.assignee.name || 'Unassigned'} src={(subtask.assignee as any)?.avatar_url} /><b className="text-sm">{subtask.assignee.name}</b></div> : <span className="text-sm text-gray-500">Unassigned</span>}</div>
          <div><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />Due date</p><b className="text-sm">{subtask.due_date ? displayDate(subtask.due_date) : 'Chưa đặt hạn'}</b></div>
          <div><p className="text-xs text-gray-500 uppercase mb-2">{entityType === 'campaign_subtask' ? 'Campaign' : 'Project'}</p><b className={`text-sm ${parentLoading ? 'inline-block h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-slate-700' : ''}`}>{parentLoading ? '' : parentDetails?.name || 'Chưa tìm thấy'}</b></div>
          <div><p className="text-xs text-gray-500 uppercase mb-2">Department</p><b className={`text-sm ${parentLoading ? 'inline-block h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-slate-700' : ''}`}>{parentLoading ? '' : parentDetails?.departmentName || 'Chưa phân phòng ban'}</b></div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-2"><p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />Description</p>{!editing && <button onClick={() => { setDraftDescription(description); setDraftImageUrl(imageUrl); setEditing(true); }} className="text-xs text-primary font-semibold"><Edit3 className="w-3.5 h-3.5 inline mr-1" />Edit</button>}</div>
          {editing ? <div className="space-y-3"><textarea rows={4} value={draftDescription} onChange={event => setDraftDescription(event.target.value)} placeholder="Mô tả subtask..." className="w-full rounded-2xl border border-blue-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><input value={draftImageUrl} onChange={event => setDraftImageUrl(event.target.value)} placeholder="Dán link hình ảnh / brief..." className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><input ref={imageInputRef} type="file" accept="image/*" className="sr-only" onChange={event => void uploadImage(event.target.files?.[0])} /><button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><ImagePlus className="h-4 w-4" />Tải hình ảnh</button><div className="flex justify-end gap-2"><button onClick={() => setEditing(false)} className="px-3 py-2 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Hủy</button><button disabled={saving} onClick={saveDetails} className="px-3 py-2 text-sm bg-[#002e6d] text-white rounded-xl"><Save className="mr-1 inline h-4 w-4" />Lưu</button></div></div> : <><div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 whitespace-pre-wrap text-sm min-h-[88px]">{description || 'Chưa có mô tả.'}</div>{imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ImagePlus className="h-4 w-4" />Mở hình ảnh / tệp đính kèm</a>}</>}
        </section>

        <section>
          <p className="text-sm font-bold mb-3"><Activity className="w-4 h-4 inline mr-2" />Activity & Comments</p>
          <div className="space-y-3">{comments.length === 0 && <p className="text-sm text-gray-500">Chưa có bình luận. Hãy bắt đầu trao đổi về task này.</p>}
          <div className="space-y-4">
            {comments.map(item => {
              const mine = Number(item.user_id) === Number(profile?.id);
              return (
                <div key={item.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : 'flex-row'} items-end group animate-slide-up`}>
                  {!mine && <Avatar name={item.user?.name || 'Staff'} src={(item.user as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
                  <div className={`flex flex-col max-w-[85%] ${mine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${mine ? 'bg-[#002e6d] text-white rounded-br-sm' : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded-bl-sm'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[11px] font-bold ${mine ? 'text-blue-100' : 'text-gray-500 dark:text-slate-300'}`}>{item.user?.name || 'Staff'}</span>
                        <span className={`text-[9px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(item.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{item.metadata?.body || ''}</p>
                    </div>
                  </div>
                  {mine && <Avatar name={item.user?.name || 'Staff'} src={(item.user as any)?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
                  <button onClick={() => replyTo(item.user?.name)} className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-primary group-hover:opacity-100 dark:hover:bg-slate-700" title="Trả lời và nhắc tên"><Reply className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
          </div>
          <div className="relative mt-4">
            <textarea ref={commentRef} value={commentText} onChange={event => setCommentText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && commentText.trim()) { event.preventDefault(); void addComment(); } }} rows={3} placeholder="Viết bình luận… Gõ @ để nhắc PIC" className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none" />
            {mentionOptions.length > 0 && <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">{mentionOptions.map(person => <button key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => chooseMention(person)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"><b>{person.name}</b><span className="ml-2 text-xs text-gray-400">@{person.name.replace(/\s+/g, '')}</span></button>)}</div>}
            <button disabled={!commentText.trim() || saving} onClick={addComment} className="mt-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"><Send className="mr-1 inline h-4 w-4" />Gửi bình luận</button>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-10 flex min-h-[76px] shrink-0 gap-3 border-t border-gray-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button onClick={() => commentRef.current?.focus()} className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 px-3 py-2 text-sm font-bold transition-colors"><MessageSquare className="mr-2 inline h-4 w-4" />Comment</button>
        <button disabled={completed || saving} onClick={complete} className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-2 inline h-4 w-4" />{completed ? 'Completed' : 'Complete'}</button>
      </div>
    </aside>
  );};
