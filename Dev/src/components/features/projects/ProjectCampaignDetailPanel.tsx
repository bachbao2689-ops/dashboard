import React, { useState, useEffect } from 'react';
import { X, Edit3, CheckCircle2, MessageSquare, Trash2, Plus, Users } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { supabase } from '../../../services/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';

const dateValue = (d?: string | null) => d ? d.split('-').reverse().join('/') : '---';

export function ProjectCampaignDetailPanel({ item, kind, onClose, onUpdated }: { item: any, kind: 'project' | 'campaign', onClose: () => void, onUpdated?: () => void }) {
  const profile = useAuthStore(s => s.profile);
  const [data, setData] = useState<any>(item);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [width, setWidth] = useState(500);
  const [resizing, setResizing] = useState(false);
  
  
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

  const [people, setPeople] = useState<any[]>([]);

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);

  const loadData = async () => {
    
    try {
      const pRes = await supabase.from('users').select('id,name').eq('is_active', true);
      if (pRes.data) setPeople(pRes.data);

      if (kind === 'project') {
        const [dRes, sRes, cRes] = await Promise.all([
          supabase.from('projects').select('*, creator:created_by(name,avatar_url)').eq('id', item.id).single(),
          supabase.from('project_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('project_id', item.id).neq('status', 'deleted'),
          supabase.from('project_comments').select('*, author:user_id(name,avatar_url)').eq('project_id', item.id).order('created_at', { ascending: true })
        ]);
        if (dRes.data) setData(dRes.data);
        if (sRes.data) setSubtasks(sRes.data);
        if (cRes.data) setComments(cRes.data);
      } else {
        const [dRes, sRes, cRes] = await Promise.all([
          supabase.from('campaigns').select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').eq('id', item.id).single(),
          supabase.from('campaign_subtasks').select('*, assignee:assignee_id(name,avatar_url)').eq('campaign_id', item.id).neq('status', 'deleted'),
          supabase.from('campaign_comments').select('*, author:user_id(name,avatar_url)').eq('campaign_id', item.id).order('created_at', { ascending: true })
        ]);
        if (dRes.data) setData(dRes.data);
        if (sRes.data) setSubtasks(sRes.data);
        if (cRes.data) setComments(cRes.data);
      }
    } catch (e) {}
    
  };

  useEffect(() => { loadData(); }, [item.id, kind]);

  const saveEdit = async () => {
    if (!title.trim()) return;
    const table = kind === 'project' ? 'projects' : 'campaigns';
    const payload = kind === 'project' 
      ? { name: title.trim(), description: desc, start_date: start || null, due_date: due || null }
      : { name: title.trim(), objective: desc, start_date: start || null, end_date: due || null };
    
    const { error } = await supabase.from(table).update(payload).eq('id', item.id);
    if (!error) {
      toast.success('Đã lưu thay đổi');
      setEditMode(false);
      loadData();
      onUpdated?.();
    }
  };

  const completeItem = async () => {
    const table = kind === 'project' ? 'projects' : 'campaigns';
    const { error } = await supabase.from(table).update({ status: 'completed' }).eq('id', item.id);
    if (!error) {
      toast.success('Đã hoàn thành');
      loadData();
      onUpdated?.();
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const table = kind === 'project' ? 'project_comments' : 'campaign_comments';
    const payload: any = kind === 'project' ? { project_id: item.id, user_id: profile?.id, body: commentText } : { campaign_id: item.id, user_id: profile?.id, body: commentText };
    const { error } = await supabase.from(table).insert(payload);
    if (!error) {
      setCommentText('');
      loadData();
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    const table = kind === 'project' ? 'project_subtasks' : 'campaign_subtasks';
    const payload: any = { title: newSubtaskTitle.trim(), due_date: newSubtaskDue || null, status: 'todo' };
    if (newSubtaskOwner) payload.assignee_id = newSubtaskOwner;
    if (kind === 'project') payload.project_id = item.id; else payload.campaign_id = item.id;
    
    const { error } = await supabase.from(table).insert(payload);
    if (!error) {
      toast.success('Đã thêm subtask');
      setNewSubtaskTitle(''); setNewSubtaskOwner(''); setNewSubtaskDue(''); setShowSubtaskForm(false);
      loadData();
      onUpdated?.();
    }
  };

  const removeSubtask = async (id: string) => {
    const table = kind === 'project' ? 'project_subtasks' : 'campaign_subtasks';
    await supabase.from(table).update({ status: 'deleted' }).eq('id', id);
    loadData();
    onUpdated?.();
  };

  const shadowClass = kind === 'project' ? 'shadow-drawer-project border-violet-500/20' : 'shadow-drawer-campaign border-amber-500/20';

  if (!data) return null;

  return (
    <aside style={{ '--panel-width': `${width}px` } as React.CSSProperties} className={`drawer-slide-in absolute right-0 top-0 z-[60] flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-l-3xl border-l bg-white dark:bg-slate-800 md:relative md:w-[var(--panel-width)] md:min-w-[var(--panel-width)] ${shadowClass} ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
      <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{data.name}</h3>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      
      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
        {editMode ? (
          <div className="space-y-5">
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Tên</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Bắt đầu</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Kết thúc</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Mô tả</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" /></div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"><button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold">Hủy</button><button onClick={saveEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold">Lưu thay đổi</button></div>
          </div>
        ) : (
          <div className="space-y-7">
            <div className="flex gap-2"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${kind==='project' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-blue-50 text-primary border-blue-100'} border capitalize`}>{kind}</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 capitalize">{data.status || 'planning'}</span></div>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm">
              <div><p className="text-[10px] uppercase text-gray-400">Owner/Creator</p><div className="mt-1 font-semibold flex items-center gap-2"><Avatar name={data.creator?.name || data.lead?.name || '---'} src={data.creator?.avatar_url || data.lead?.avatar_url} className="w-5 h-5 text-[10px] shadow-sm" /> <span className="line-clamp-1">{data.creator?.name || data.lead?.name || '---'}</span></div></div>
              <div><p className="text-[10px] uppercase text-gray-400">Timeline</p><div className="mt-1 font-semibold">{dateValue(data.start_date)} – {dateValue(data.end_date || data.due_date)}</div></div>
            </div>
            <section><h3 className="font-bold text-sm mb-2">Description</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{data.description || data.objective || 'Chưa có mô tả.'}</div></section>
            
            <section>
              <h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> Subtasks</h3>
              <div className="space-y-2">
                {subtasks.map(sub => (
                  <div key={sub.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm flex justify-between items-start">
                    <div>
                      <b className="text-gray-900 dark:text-white">{sub.title}</b>
                      <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><Avatar name={sub.assignee?.name || 'Unassigned'} src={sub.assignee?.avatar_url} className="w-4 h-4 text-[9px]" /> {sub.assignee?.name || 'Unassigned'}</span>
                        {sub.due_date && <span>{dateValue(sub.due_date)}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeSubtask(sub.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
              {!showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> Thêm Subtask</button>}
              {showSubtaskForm && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                  <input value={newSubtaskTitle} onChange={e=>setNewSubtaskTitle(e.target.value)} placeholder="Tên subtask..." className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newSubtaskOwner} onChange={e=>setNewSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">Chọn PIC</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <input type="date" value={newSubtaskDue} onChange={e=>setNewSubtaskDue(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/>
                  </div>
                  <div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg">Hủy</button><button onClick={addSubtask} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg">Thêm</button></div>
                </div>
              )}
            </section>

            <section>
              <h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> Activity & Comments</h3>
              <div className="space-y-3">
                {comments.map(c => {
                  const isMe = c.user_id === profile?.id;
                  return (
                    <div key={c.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'} items-end`}>
                      {!isMe && <Avatar name={c.author?.name || 'Member'} src={c.author?.avatar_url} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
                      <div className={`group relative max-w-[85%] ${isMe ? 'order-1' : 'order-2'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-[#002e6d] text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-bl-sm'}`}>
                          <p className={`text-[11px] font-bold mb-1 ${isMe ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400'}`}>{c.author?.name || 'Member'}</p>
                          <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                        </div>
                      </div>
                      {isMe && <Avatar name={profile?.name || ''} src={profile?.avatar_url || undefined} className="w-7 h-7 text-[10px] shadow-sm shrink-0 mb-1" />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4"><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }} rows={3} placeholder="Viết bình luận…" className="w-full p-3 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" /></div>
            </section>
          </div>
        )}
      </div>
      {!editMode && (
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3 shrink-0 bg-white dark:bg-slate-800">
          <button onClick={() => { setTitle(data.name); setDesc(data.description || data.objective || ''); setStart(data.start_date || ''); setDue(data.due_date || data.end_date || ''); setEditMode(true); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"><Edit3 className="w-4 h-4" /> Chỉnh sửa</button>
          <button onClick={completeItem} className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#001f4d] transition-colors"><CheckCircle2 className="w-4 h-4" /> Complete</button>
        </div>
      )}
    </aside>
  );
}
