import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FolderKanban, MessageSquare, Plus, Users, X, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { Modal } from '../components/common/Modal';

type Project = { id: string; name: string; description: string | null; status: string; start_date: string | null; due_date: string | null; priority: string; created_by: number | null };
type Person = { id: number; name: string; department_id: string | null; departments?: { name: string } | null };

const dateValue = (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

export const Projects: React.FC = () => {
  const profile = useAuthStore(s => s.profile);
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const [projects, setProjects] = useState<Project[]>([]); const [people, setPeople] = useState<Person[]>([]);
  const [members, setMembers] = useState<Record<string, string[]>>({}); const [selected, setSelected] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [start, setStart] = useState(''); const [due, setDue] = useState(''); const [priority, setPriority] = useState('medium'); const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]); const [comments, setComments] = useState<any[]>([]); const [editingCommentId, setEditingCommentId] = useState<string | null>(null); const [editingCommentText, setEditingCommentText] = useState('');
  const removeComment = async (id: string) => { await supabase.from('project_comments').delete().eq('id', id); setComments(comments.filter(c => c.id !== id)); };
  const saveEditedComment = async (id: string) => { await supabase.from('project_comments').update({ body: editingCommentText }).eq('id', id); setComments(comments.map(c => c.id === id ? { ...c, body: editingCommentText } : c)); setEditingCommentId(null); };
  const [newSubtask, setNewSubtask] = useState(''); const [editMode, setEditMode] = useState(false); const [showSubtaskForm, setShowSubtaskForm] = useState(false); const [width, setWidth] = useState(500); const [resizing, setResizing] = useState(false); const [subtaskOwner, setSubtaskOwner] = useState(''); const [subtaskDue, setSubtaskDue] = useState(''); const [comment, setComment] = useState('');

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(400, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);
  const visiblePeople = useMemo(() => (profile?.role === 'admin' || profile?.role === 'manager') ? people : people.filter(p => p.department_id === profile?.department_id), [people, profile]);
  const load = async () => {
    const [projectRes, peopleRes, memberRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id,name,department_id').eq('is_active', true).order('name'),
      supabase.from('project_members').select('project_id,user_id'),
    ]);
    if (projectRes.error) return toast.error('Không thể tải Project');
    setProjects(projectRes.data || []); setPeople(peopleRes.data || []);
    setMembers((memberRes.data || []).reduce((acc: Record<string, string[]>, item: any) => ({ ...acc, [item.project_id]: [...(acc[item.project_id] || []), String(item.user_id)] }), {}));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!selected) return; (async () => { const [s, c] = await Promise.all([supabase.from('project_subtasks').select('*, assignee:assignee_id(name)').eq('project_id', selected.id).order('created_at'), supabase.from('project_comments').select('*, author:author_id(name)').eq('project_id', selected.id).order('created_at')]); setSubtasks(s.data || []); setComments(c.data || []); })(); }, [selected]);
  const createProject = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title) return;
    const { data, error } = await supabase.from('projects').insert({ name: title, description, start_date: start || null, due_date: due || null, priority, status: 'active', workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca', created_by: profile?.id || null }).select().single(); 
    if (error || !data) return toast.error('Không thể tạo Project'); 
    if (ownerIds.length) await supabase.from('project_members').insert(ownerIds.map(user_id => ({ project_id: data.id, user_id: Number(user_id) }))); 
    setCreateOpen(false); setTitle(''); setDescription(''); setOwnerIds([]); load(); toast.success('Đã tạo Project');
  };
const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskOwner, setEditSubtaskOwner] = useState('');
  const [editSubtaskDue, setEditSubtaskDue] = useState('');

  const removeSubtask = async (id: string) => { await supabase.from('project_subtasks').delete().eq('id', id); setSubtasks(subtasks.filter(s => s.id !== id)); };
  const saveEditedSubtask = async (id: string) => {
    await supabase.from('project_subtasks').update({ title: editSubtaskTitle, assignee_id: editSubtaskOwner ? Number(editSubtaskOwner) : null, due_date: editSubtaskDue || null }).eq('id', id);
    const { data } = await supabase.from('project_subtasks').select('*, assignee:assignee_id(name)').eq('id', id).single();
    setSubtasks(subtasks.map(s => s.id === id ? data : s)); setEditingSubtaskId(null);
  };

  const saveInlineEdit = async () => {
    if (!title || !selected) return;
    const { data, error } = await supabase.from('projects').update({ name: title, description, start_date: start || null, due_date: due || null, priority }).eq('id', selected.id).select().single();
    if (error || !data) return toast.error('Lỗi cập nhật');
    await supabase.from('project_members').delete().eq('project_id', selected.id);
    if (ownerIds.length) await supabase.from('project_members').insert(ownerIds.map(user_id => ({ project_id: data.id, user_id: Number(user_id) })));
    setEditMode(false); load(); toast.success('Đã lưu thông tin');
    setSelected({ ...selected, name: title, description, start_date: start || null, due_date: due || null, priority });
  };

  const addSubtask = async () => { if (!selected || !newSubtask) return; await supabase.from('project_subtasks').insert({ project_id: selected.id, title: newSubtask, assignee_id: subtaskOwner ? Number(subtaskOwner) : null, due_date: subtaskDue || null }); setNewSubtask(''); setSubtaskOwner(''); setSubtaskDue(''); setSelected({ ...selected }); };
  const addComment = async () => { if (!selected || !comment) return; await supabase.from('project_comments').insert({ project_id: selected.id, author_id: profile?.id || null, body: comment }); setComment(''); setSelected({ ...selected }); };
  return (
  <div className="h-full flex overflow-hidden relative">
    {/* Left Side: Projects List */}
    <div className={`h-full flex flex-col min-w-0 transition-all duration-300 flex-1 p-1 space-y-6 overflow-auto ${selected ? 'hidden md:flex pr-4' : ''}`}>
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderKanban className="text-primary"/> Projects</h1><p className="text-sm text-gray-500 mt-1">Theo dõi project, PIC, subtask và trao đổi.</p></div>{canCreate && <button onClick={() => { setEditMode(false); setTitle(''); setDescription(''); setStart(''); setDue(''); setPriority('medium'); setOwnerIds([]); setCreateOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={18}/> New Project</button>}</div><div className="card-hub rounded-2xl overflow-hidden"><table className="w-full text-left"><thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500"><tr><th className="p-4">Project</th><th>Owner</th><th>Dates</th><th>Priority</th><th>Status</th></tr></thead><tbody>{projects.map(project => <tr key={project.id} onClick={() => setSelected(project)} className="border-t border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-primary/5"><td className="p-4"><b className="text-gray-900 dark:text-white">{project.name}</b><p className="text-xs text-gray-500 line-clamp-1 mt-1">{project.description || 'No description'}</p></td><td><div className="flex -space-x-2">{(members[project.id] || []).slice(0,4).map(id => <span key={id} className="w-7 h-7 rounded-full bg-primary/15 border-2 border-white dark:border-slate-900 grid place-items-center text-[10px] font-bold">{people.find(p => String(p.id) === id)?.name?.[0] || '?'}</span>)}</div></td><td className="text-sm text-gray-600 dark:text-gray-300">{dateValue(project.start_date || '')} – {dateValue(project.due_date || '')}</td><td><span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">{project.priority}</span></td><td className="text-sm text-primary font-medium">{project.status}</td></tr>)}</tbody></table>{!projects.length && <div className="p-12 text-center text-gray-500">Chưa có Project nào.</div>}</div>
  
  
    </div>

    {/* Right Side: Detail Panel */}
    <div style={window.innerWidth >= 768 ? { width: selected ? width : 0, minWidth: selected ? width : 0 } : { width: selected ? '100%' : 0 }} className={`h-full bg-white dark:bg-slate-800 rounded-l-3xl shadow-xl shrink-0 ${selected ? 'border-l-4 border-l-amber-400' : 'border-l-0 border-transparent'} absolute md:relative right-0 top-0 z-[60] flex flex-col overflow-hidden ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
      {selected && <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />}
      {selected && (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1">{selected.name}</h3>
            <div className="flex items-center gap-2">
              (<button onClick={() => { setTitle(selected.name); setDescription(selected.description || ''); setStart(selected.start_date || ''); setDue(selected.due_date || ''); setPriority(selected.priority || 'medium'); setOwnerIds(members[selected.id] || []); setEditMode(!editMode); }} className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"> <Edit3 size={16} /> </button>)
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {editMode ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tên Project</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Bắt đầu</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Kết thúc</label><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"/></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Độ ưu tiên</label><select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none mt-1 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Người phụ trách (PIC)</label><select multiple value={ownerIds} onChange={e=>setOwnerIds(Array.from(e.target.selectedOptions).map(o=>o.value))} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none h-32 mt-1 text-sm">{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Mô tả</label><textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none min-h-24 mt-1 text-sm" placeholder="Nhập mô tả..."/></div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">Hủy</button>
                  <button onClick={saveInlineEdit} className="px-5 py-2.5 bg-[#002e6d] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#002150] transition-colors">Lưu Project</button>
                </div>
              </div>
            ) : (
<div className="space-y-7 animate-in fade-in duration-200">
              <div className="flex gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-100">Project</span><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">{selected?.priority || 'medium'} Priority</span></div>
      <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm"><div><p className="text-[10px] uppercase text-gray-400">Owners</p><div className="mt-1 font-semibold">{(members[selected?.id || ''] || []).map(id=>people.find(p=>String(p.id)===id)?.name).filter(Boolean).join(', ') || 'Unassigned'}</div></div><div><p className="text-[10px] uppercase text-gray-400">Timeline</p><div className="mt-1 font-semibold">{dateValue(selected?.start_date || '')} – {dateValue(selected?.due_date || '')}</div></div></div>
      <section><h3 className="font-bold text-sm mb-2">Description</h3><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">{selected?.description || 'No description yet.'}</div></section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><Users size={16}/> Subtasks</h3><div className="space-y-2">{subtasks.map(s=>(
  <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-sm group relative">
    {editingSubtaskId === s.id ? (
      <div className="space-y-2">
         <input value={editSubtaskTitle} onChange={e=>setEditSubtaskTitle(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg" />
         <div className="grid grid-cols-2 gap-2">
           <select value={editSubtaskOwner} onChange={e=>setEditSubtaskOwner(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select>
           <input type="date" value={editSubtaskDue} onChange={e=>setEditSubtaskDue(e.target.value)} className="p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none rounded-lg" />
         </div>
         <div className="flex gap-2 justify-end">
           <button onClick={()=>setEditingSubtaskId(null)} className="text-xs text-gray-500 hover:text-gray-700">Hủy</button>
           <button onClick={()=>saveEditedSubtask(s.id)} className="text-xs text-primary font-bold">Lưu</button>
         </div>
      </div>
    ) : (
      <div className="flex justify-between items-center">
        <div>
          <b>{s.title}</b><span className="ml-2 text-gray-500">{s.assignee?.name || 'Unassigned'} · {dateValue(s.due_date || '')}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={()=>{ setEditingSubtaskId(s.id); setEditSubtaskTitle(s.title); setEditSubtaskOwner(String(s.assignee_id || '')); setEditSubtaskDue(s.due_date || ''); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={()=>removeSubtask(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
        </div>
      </div>
    )}
  </div>
))}</div>{!showSubtaskForm && <button onClick={() => setShowSubtaskForm(true)} className="mt-3 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 w-full text-center border-dashed"><Plus size={16} className="inline mr-1" /> Thêm Subtask</button>}
{showSubtaskForm && <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3"><input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder="Tên subtask..." className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/><div className="grid grid-cols-2 gap-2"><select value={subtaskOwner} onChange={e=>setSubtaskOwner(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"><option value="">Chọn PIC</option>{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name} {p.departments?.name ? '('+p.departments.name+')' : ''}</option>)}</select><input type="date" value={subtaskDue} onChange={e=>setSubtaskDue(e.target.value)} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"/></div><div className="flex gap-2 justify-end"><button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">Hủy</button><button onClick={() => { addSubtask(); setShowSubtaskForm(false); }} className="px-3 py-1.5 bg-[#002e6d] text-white text-sm font-semibold rounded-lg shadow-sm">Giao việc</button></div></div>}</section>
      <section><h3 className="font-bold text-sm flex gap-2 items-center mb-3"><MessageSquare size={16}/> Activity & Comments</h3><div className="space-y-2">{comments.map(c=>(
  <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm group relative">
    <div className="flex justify-between items-start">
      <b>{c.author?.name || 'Member'}</b>
      {c.author_id === profile?.id && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.body); }} className="text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
          <button onClick={() => removeComment(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
        </div>
      )}
    </div>
    {editingCommentId === c.id ? (
      <div className="mt-2">
        <textarea value={editingCommentText} onChange={e=>setEditingCommentText(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg outline-none" rows={2} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditedComment(c.id); } }} />
        <div className="flex justify-end gap-2 mt-1">
          <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500 hover:text-gray-700">Hủy</button>
          <button onClick={() => saveEditedComment(c.id)} className="text-xs text-primary font-bold">Lưu</button>
        </div>
      </div>
    ) : (
      <p className="whitespace-pre-wrap mt-1">{c.body}</p>
    )}
  </div>
))}</div><div className="mt-4 relative"><textarea value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (comment.trim()) addComment(); } }} rows={3} placeholder="Viết bình luận cho team... (Nhấn Enter để gửi)" className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm" /></div></section>
            </div>
            )}
          </div>
        </div>
      )}
    </div>

    <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={editMode ? "Chỉnh sửa Project" : "Create New Project"}><form onSubmit={createProject} className="space-y-4"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Project Title" className="input-hub w-full"/><label className="text-sm font-semibold">Owner / PIC</label><select multiple value={ownerIds} onChange={e=>setOwnerIds(Array.from(e.target.selectedOptions).map(o=>o.value))} className="input-hub w-full h-32">{visiblePeople.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><div className="grid grid-cols-2 gap-3"><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="input-hub"/><input type="date" value={due} onChange={e=>setDue(e.target.value)} className="input-hub"/></div><select value={priority} onChange={e=>setPriority(e.target.value)} className="input-hub w-full"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" className="input-hub w-full min-h-28"/><button className="btn-primary w-full">{editMode ? 'Lưu thay đổi' : 'Create Project'}</button></form></Modal>
  </div>
);
};
