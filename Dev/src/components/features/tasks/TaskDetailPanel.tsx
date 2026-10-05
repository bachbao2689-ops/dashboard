import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Clock, MessageSquare, CheckCircle2, User, Calendar, AlignLeft, Activity, Edit3, Save, Send } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { notifyTaskParticipants } from '../../../services/taskNotifications';
import { Avatar } from '../../common/Avatar';
import toast from 'react-hot-toast';

interface TaskDetailPanelProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (task?: any) => void;
}

type Comment = { id: string; body: string; created_at: string; is_edited: boolean; author?: { name?: string; avatar_url?: string | null } | null };
const priorityStyle = (priority?: string) => {
  const value = (priority || 'medium').toLowerCase();
  if (value.includes('urgent') || value.includes('high') || value.includes('cao')) return 'border-red-400';
  if (value.includes('low') || value.includes('thấp')) return 'border-blue-400';
  return 'border-amber-400';
};

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, isOpen, onClose, onTaskUpdated }) => {
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const commentInput = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    if (!task?.id) return;
    const { data, error } = await supabase.from('comments').select('id, body, created_at, is_edited, author:author_id(name, avatar_url)').eq('task_id', task.id).order('created_at', { ascending: true });
    if (error) { console.warn('Could not load task comments:', error.message); return; }
    setComments((data || []) as Comment[]);
  }, [task?.id]);

  useEffect(() => {
    setDescription(task?.description || '');
    setEditingDescription(false);
    setCommentText('');
    void loadComments();
  }, [task?.id, task?.description, loadComments]);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: MouseEvent) => { const next = document.body.clientWidth - event.clientX; if (next >= 360 && next <= 800) setWidth(next); };
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);

  const saveDescription = async () => {
    if (!task) return;
    setSaving(true);
    const { error } = await supabase.from('tasks').update({ description, updated_at: new Date().toISOString() }).eq('id', task.id);
    setSaving(false);
    if (error) return toast.error('Không thể lưu mô tả');
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_updated');
    setEditingDescription(false); onTaskUpdated?.({ description }); toast.success('Đã lưu mô tả');
  };

  const addComment = async () => {
    const body = commentText.trim();
    if (!task || !profileId || !body) return;
    setSaving(true);
    const { error } = await supabase.from('comments').insert({ task_id: task.id, author_id: profileId, body });
    if (!error) await supabase.from('tasks').update({ comments_count: comments.length + 1, updated_at: new Date().toISOString() }).eq('id', task.id);
    setSaving(false);
    if (error) return toast.error('Không thể gửi bình luận');
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_comment');
    setCommentText(''); await loadComments(); onTaskUpdated?.({ comments_count: comments.length + 1 }); toast.success('Đã gửi bình luận');
  };

  const completeTask = async () => {
    if (!task || ['done', 'completed', 'complete'].includes((task.status || '').toLowerCase())) return;
    setSaving(true);
    const { error } = await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', task.id);
    setSaving(false);
    if (error) return toast.error('Không thể hoàn thành task');
    await notifyTaskParticipants(task, { id: profileId, name: profile?.name, department_id: profile?.department_id }, 'task_completed');
    onTaskUpdated?.({ status: 'done' }); toast.success('Task đã hoàn thành');
  };

  const isDone = ['done', 'completed', 'complete'].includes((task?.status || '').toLowerCase());
  return <div style={window.innerWidth >= 768 ? { width: isOpen ? width : 0, minWidth: isOpen ? width : 0 } : { width: isOpen ? '100%' : 0 }} className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl border-l-4 ${priorityStyle(task?.priority)} shadow-xl shrink-0 absolute md:relative right-0 top-0 z-[60] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
    {isOpen && <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
      <div><span className="text-xs font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-gray-200 dark:border-slate-700">{task?.task_ref || 'TASK'}</span><span className="ml-2 text-xs capitalize text-gray-500">{task?.priority || 'medium'} priority</span></div>
      <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
    </div>
    {task && <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 space-y-7">
      <section><h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{task.title}</h2><div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />{isDone ? 'Completed' : task.status || 'To do'}</span><span className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-slate-700"><Clock className="w-4 h-4 inline mr-1 text-red-500" />{task.priority || 'Medium'}</span></div></section>
      <section className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700"><div><p className="text-xs text-gray-500 uppercase mb-2"><User className="w-3.5 h-3.5 inline mr-1" />Assignee</p>{task.assignee ? <div className="flex items-center gap-2"><Avatar name={task.assignee.name} src={task.assignee.avatar_url} /><b className="text-sm">{task.assignee.name}</b></div> : <span className="text-sm text-gray-500">Unassigned</span>}</div><div><p className="text-xs text-gray-500 uppercase mb-2"><Calendar className="w-3.5 h-3.5 inline mr-1" />Due date</p><b className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Chưa đặt hạn'}</b></div><div><p className="text-xs text-gray-500 uppercase mb-2">Project</p><b className="text-sm">{task.project?.name || 'No project'}</b></div><div><p className="text-xs text-gray-500 uppercase mb-2">Department</p><b className="text-sm">{task.department?.name || 'N/A'}</b></div></section>
      <section><div className="flex justify-between items-center mb-2"><p className="text-sm font-bold"><AlignLeft className="w-4 h-4 inline mr-2" />Description</p>{!editingDescription && <button onClick={() => setEditingDescription(true)} className="text-xs text-primary font-semibold"><Edit3 className="w-3.5 h-3.5 inline mr-1" />Edit</button>}</div>{editingDescription ? <><textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} className="w-full p-4 rounded-2xl border border-primary/40 bg-white dark:bg-slate-900 outline-none" placeholder="Nhập mô tả task..." /><div className="flex gap-2 mt-2 justify-end"><button onClick={() => { setDescription(task.description || ''); setEditingDescription(false); }} className="px-3 py-2 text-sm">Hủy</button><button disabled={saving} onClick={saveDescription} className="px-3 py-2 text-sm bg-primary text-white rounded-lg"><Save className="w-4 h-4 inline mr-1" />Lưu</button></div></> : <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 whitespace-pre-wrap text-sm min-h-[88px]">{description || 'Chưa có mô tả.'}</div>}</section>
      <section><p className="text-sm font-bold mb-3"><Activity className="w-4 h-4 inline mr-2" />Activity & Comments</p><div className="space-y-3">{comments.length === 0 && <p className="text-sm text-gray-500">Chưa có bình luận. Hãy bắt đầu trao đổi về task này.</p>}{comments.map(comment => <div key={comment.id} className="p-3 rounded-xl border border-gray-200 dark:border-slate-700"><div className="flex justify-between gap-3"><b className="text-sm">{comment.author?.name || 'Staff'}</b><span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString('vi-VN')}</span></div><p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p></div>)}</div><div className="mt-4"><textarea ref={commentInput} value={commentText} onChange={event => setCommentText(event.target.value)} rows={3} placeholder="Viết bình luận cho team..." className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none" /><button disabled={!commentText.trim() || saving} onClick={addComment} className="mt-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold"><Send className="w-4 h-4 inline mr-1" />Gửi bình luận</button></div></section>
    </div>}
    <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0"><button onClick={() => commentInput.current?.focus()} className="flex-1 px-4 py-2.5 border rounded-xl font-bold text-sm"><MessageSquare className="w-4 h-4 inline mr-2" />Comment</button><button disabled={isDone || saving} onClick={completeTask} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50"><CheckCircle2 className="w-4 h-4 inline mr-2" />{isDone ? 'Completed' : 'Complete'}</button></div>
  </div>;
};
