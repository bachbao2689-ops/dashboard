import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlignLeft, Calendar, CheckCircle2, Edit3, ImagePlus, MessageSquare, Reply, Save, Send, User, X } from 'lucide-react';
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
};
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
  subtask: Subtask | null;
  profile: { id?: number; name?: string } | null;
  people: Person[];
  onClose: () => void;
  onUpdated: (subtask?: Subtask) => void;
}

export const SubtaskDetailPanel: React.FC<SubtaskDetailPanelProps> = ({ subtask, profile, people, onClose, onUpdated }) => {
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftImageUrl, setDraftImageUrl] = useState('');
  const [commentText, setCommentText] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    if (!subtask?.id) return;
    const [commentsResult, detailsResult] = await Promise.all([
      supabase
        .from('activity_log')
        .select('id,user_id,created_at,metadata,user:user_id(name)')
        .eq('entity_type', 'project_subtask')
        .eq('entity_id', subtask.id)
        .eq('action', 'comment')
        .order('created_at', { ascending: true }),
      supabase
        .from('activity_log')
        .select('metadata')
        .eq('entity_type', 'project_subtask')
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
  }, [subtask?.id]);

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
      entity_type: 'project_subtask',
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
      entity_type: 'project_subtask',
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
      entity_type: 'project_subtask',
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
    const { error } = await supabase.from('project_subtasks').update({ status: 'completed' }).eq('id', subtask.id);
    setSaving(false);
    if (error) return toast.error('Không thể hoàn thành subtask');
    const updated = { ...subtask, status: 'completed' };
    onUpdated(updated);
    toast.success('Đã hoàn thành subtask');
  };

  if (!subtask) return null;
  const completed = isDone(subtask.status);
  useEffect(() => {
    if (!subtask?.id) return;
    const channel = supabase.channel(`realtime-activity_log-${subtask?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `entity_id=eq.${subtask?.id}` }, () => {
        void reload();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [subtask?.id, reload]);

  return (
    <aside className="drawer-slide-in absolute right-0 top-0 z-[90] flex h-full w-full max-w-[560px] flex-col overflow-hidden rounded-l-3xl border-l-4 border-l-emerald-400 bg-white shadow-2xl dark:bg-slate-800 md:w-[min(560px,calc(100vw-2rem))]">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subtask</p><h2 className={`truncate text-xl font-bold text-gray-900 dark:text-white ${completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{subtask.title}</h2></div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Đóng subtask"><X className="h-5 w-5 text-gray-500" /></button>
      </header>
      <main className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:px-8">
        <div className="flex gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-primary'}`}>{completed ? 'Completed' : 'In progress'}</span></div>
        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
          <div><p className="text-[10px] uppercase text-gray-400"><User className="mr-1 inline h-3.5 w-3.5" />PIC</p><p className="mt-1 font-semibold">{subtask.assignee?.name || 'Unassigned'}</p></div>
          <div><p className="text-[10px] uppercase text-gray-400"><Calendar className="mr-1 inline h-3.5 w-3.5" />Due date</p><p className="mt-1 font-semibold">{displayDate(subtask.due_date)}</p></div>
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold"><AlignLeft className="mr-2 inline h-4 w-4" />Description</h3>{!editing && <button onClick={() => { setDraftDescription(description); setDraftImageUrl(imageUrl); setEditing(true); }} className="text-xs font-semibold text-primary"><Edit3 className="mr-1 inline h-3.5 w-3.5" />Edit</button>}</div>
          {editing ? <div className="space-y-3"><textarea rows={4} value={draftDescription} onChange={event => setDraftDescription(event.target.value)} placeholder="Mô tả subtask..." className="w-full rounded-2xl border border-blue-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><input value={draftImageUrl} onChange={event => setDraftImageUrl(event.target.value)} placeholder="Dán link hình ảnh / brief..." className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><input ref={imageInputRef} type="file" accept="image/*" className="sr-only" onChange={event => void uploadImage(event.target.files?.[0])} /><button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><ImagePlus className="h-4 w-4" />Tải hình ảnh</button><div className="flex justify-end gap-2"><button onClick={() => setEditing(false)} className="rounded-xl px-3 py-2 text-sm">Hủy</button><button disabled={saving} onClick={saveDetails} className="rounded-xl bg-[#002e6d] px-3 py-2 text-sm font-semibold text-white"><Save className="mr-1 inline h-4 w-4" />Lưu</button></div></div> : <><div className="min-h-[80px] whitespace-pre-wrap rounded-2xl border border-blue-100 bg-slate-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-gray-300">{description || 'Chưa có mô tả.'}</div>{imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ImagePlus className="h-4 w-4" />Mở hình ảnh / tệp đính kèm</a>}</>}
        </section>
        <section>
          <h3 className="mb-3 text-sm font-bold"><MessageSquare className="mr-2 inline h-4 w-4" />Activity & Comments</h3>
          <div className="space-y-3">{comments.length === 0 && <p className="text-sm text-gray-500">Chưa có bình luận trong subtask này.</p>}{comments.map(item => {
            const mine = Number(item.user_id) === Number(profile?.id);
            return <div key={item.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}><div className="flex max-w-[88%] items-center gap-1.5"><div className={`rounded-2xl px-3 py-2.5 text-sm shadow-sm ${mine ? 'order-2 rounded-br-md bg-[#002e6d] text-white' : 'rounded-bl-md bg-slate-100 text-gray-800 dark:bg-slate-700 dark:text-slate-100'}`}><p className={`mb-1 text-[11px] font-bold ${mine ? 'text-blue-100' : 'text-gray-500 dark:text-slate-300'}`}>{item.user?.name || 'Member'}</p><p className="whitespace-pre-wrap">{item.metadata?.body || ''}</p></div><button onClick={() => replyTo(item.user?.name)} className="order-1 rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-primary group-hover:opacity-100 dark:hover:bg-slate-700" title="Trả lời và nhắc tên"><Reply className="h-3.5 w-3.5" /></button></div></div>;
          })}</div>
          <div className="relative mt-4"><textarea ref={commentRef} value={commentText} onChange={event => setCommentText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && commentText.trim()) { event.preventDefault(); void addComment(); } }} rows={3} placeholder="Viết bình luận… Gõ @ để nhắc PIC" className="w-full rounded-2xl border border-blue-100 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />{mentionOptions.length > 0 && <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">{mentionOptions.map(person => <button key={person.id} onMouseDown={event => event.preventDefault()} onClick={() => chooseMention(person)} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"><b>{person.name}</b><span className="ml-2 text-xs text-gray-400">@{person.name.replace(/\s+/g, '')}</span></button>)}</div>}<button disabled={!commentText.trim() || saving} onClick={addComment} className="mt-2 rounded-xl bg-[#002e6d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="mr-1 inline h-4 w-4" />Gửi bình luận</button></div>
        </section>
      </main>
      <footer className="flex shrink-0 gap-3 border-t border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><button onClick={() => { setDraftDescription(description); setDraftImageUrl(imageUrl); setEditing(true); }} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold dark:border-slate-700"><Edit3 className="mr-2 inline h-4 w-4" />Chỉnh sửa</button><button disabled={completed || saving} onClick={complete} className="flex-1 rounded-xl bg-[#002e6d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-2 inline h-4 w-4" />{completed ? 'Completed' : 'Complete'}</button></footer>
    </aside>
  );
};
