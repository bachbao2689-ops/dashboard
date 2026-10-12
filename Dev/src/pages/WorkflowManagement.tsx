import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Calendar, ChevronDown, ChevronRight, Edit3, FolderKanban, GitBranch, Plus, RefreshCw, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/common/Avatar';
import { MultiSelect } from '../components/common/MultiSelect';
import { StatusBadge } from '../components/common/StatusBadge';
import { TaskDetailPanel } from '../components/features/tasks/TaskDetailPanel';
import { SubtaskDetailPanel } from '../components/features/projects/SubtaskDetailPanel';
import { WorkflowStatusPicker, canonicalWorkflowStatus, type WorkflowTaskStatus } from '../components/features/tasks/WorkflowStatusPicker';
import { useTasks, type Task } from '../hooks/useTasks';
import { displayDate, inputDate, taskProgress, type HubPhase, type HubTrack, type WorkflowPerson } from '../lib/workflowHub';

const field = 'w-full px-3 py-2.5 rounded-xl border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 dark:border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50';
const panel = 'bg-white/80 dark:bg-slate-800/70 border border-blue-100 dark:border-slate-700 rounded-2xl shadow-sm';

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-sm font-semibold min-w-0">{label}<div className="tw-calendar-picker relative mt-1"><input id={id} type="text" readOnly value={value} onChange={e => onChange(e.target.value)} placeholder="dd/mm/yyyy" className={`${field} cursor-pointer`} onClick={e => (window as any).openCalendar?.({ displayId: id, mode: 'single' }, e)} /></div></label>;
}
function People({ people }: { people: WorkflowPerson[] }) {
  return <div className="flex flex-wrap gap-2">{people.length ? people.map(p => <span key={p.id} title={p.role === 'sub_pic' ? 'Sub-PIC' : 'PIC'} className="inline-flex items-center gap-1.5 text-xs"><Avatar name={p.name} src={p.avatar_url} className="w-6 h-6 text-[10px]" />{p.name}{p.role === 'sub_pic' && <span className="text-gray-400">· SUB</span>}</span>) : <span className="text-xs text-gray-400">Chưa giao PIC</span>}</div>;
}

export const WorkflowManagement: React.FC = () => {
  const profile = useAuthStore(s => s.profile);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tracks, setTracks] = useState<HubTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [people, setPeople] = useState<WorkflowPerson[]>([]);
  const { tasks, error: taskError, refetch } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form, setForm] = useState<'phase' | 'task' | null>(null);
  const [editingPhase, setEditingPhase] = useState<HubPhase | null>(null);
  const [taskPhase, setTaskPhase] = useState<HubPhase | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [status, setStatus] = useState('todo');
  const [pics, setPics] = useState<string[]>([]);
  const [subPics, setSubPics] = useState<string[]>([]);
  const [opportunity, setOpportunity] = useState('');
  const [opportunityNote, setOpportunityNote] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const lock = useRef(false);
  const request = useRef(0);
  const load = async () => {
    const token = ++request.current;
    if (!profile) { setTracks([]); setLoading(false); return; }
    setError('');
    const { data, error: failure } = await supabase.rpc('workflow_hub_index');
    if (token !== request.current) return;
    if (failure) { setTracks([]); setError(failure.message); }
    else setTracks((data || []) as HubTrack[]);
    setLoading(false);
  };
  useEffect(() => {
    setTracks([]); setForm(null); setSelectedTask(null); setExpanded(null); setLoading(true); void load();
    let channel = supabase.channel(`workflow-hub-${profile?.id}-${Math.random()}`);
    for (const table of ['projects', 'campaigns', 'project_members', 'campaign_members', 'workflow_phases', 'workflow_phase_members', 'tasks', 'comments']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { void load(); });
    }
    channel.subscribe();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { request.current++; clearInterval(timer); window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, [profile?.id]);
  useEffect(() => {
    if (!profile) return;
    supabase.from('users').select('id,name,avatar_url').eq('is_active', true).order('name').then(({ data }) => setPeople(data || []));
  }, [profile?.id]);
  const selected = tracks.find(w => w.entity_type === (params.has('campaign') ? 'campaign' : 'project') && w.entity_id === (params.get('campaign') || params.get('project'))) || (!params.has('campaign') && !params.has('project') ? tracks[0] : undefined);
  const filtered = tracks.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));
  const selectedTasks = useMemo(() => tasks.filter(t => selected?.phases.some(p => p.id === t.workflow_phase_id)), [tasks, selected]);
  const unplanned = tasks.filter(t => !t.workflow_phase_id && selected && (selected.entity_type === 'project' ? t.project_id : t.campaign_id) === selected.entity_id);
  const phaseTasks = (phase: HubPhase) => selectedTasks.filter(t => t.workflow_phase_id === phase.id);
  const taskPeople = useMemo(() => {
    const list = [...(taskPhase?.members || []), ...(selected?.pics || [])];
    return list.filter((p, i) => list.findIndex(v => v.id === p.id) === i);
  }, [taskPhase, selected]);
  const changeTrack = (w: HubTrack) => { setParams({ [w.entity_type]: w.entity_id }); setExpanded(null); setForm(null); setSelectedTask(null); };
  const openPhase = (phase: HubPhase | null) => {
    setSelectedTask(null); setEditingPhase(phase); setTitle(phase?.title || ''); setStart(displayDate(phase?.start_date).replace('—', '')); setDue(displayDate(phase?.due_date).replace('—', ''));
    setStatus(phase?.status || 'todo'); setPics(phase?.members.filter(p => p.role === 'pic').map(p => String(p.id)) || []); setSubPics(phase?.members.filter(p => p.role === 'sub_pic').map(p => String(p.id)) || []);
    setOpportunity(phase?.opportunity == null ? '' : String(phase.opportunity)); setOpportunityNote(phase?.opportunity_note || ''); setForm('phase');
  };
  const openTask = (phase: HubPhase) => {
    setTaskPhase(phase); setSelectedTask(null); setTitle(''); setDescription(''); setPriority('medium'); setAssignee(String(profile?.id || ''));
    setStart(displayDate(phase.start_date).replace('—', '')); setDue(displayDate(phase.due_date).replace('—', '')); setForm('task');
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current || !selected) return;
    lock.current = true; setSaving(true);
    try {
      if (!title.trim()) throw new Error('Nhập tên.');
      const startDate = inputDate(start), endDate = inputDate(due);
      if (startDate && endDate && endDate < startDate) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
      const rpc = form === 'phase' ? supabase.rpc('workflow_save_phase', {
        p_workflow: selected.id, p_phase: editingPhase?.id || null, p_expected: editingPhase?.version || 0,
        p_data: { title: title.trim(), start_date: startDate, due_date: endDate, status, pic_ids: pics.map(Number), sub_pic_ids: subPics.filter(id => !pics.includes(id)).map(Number), opportunity: opportunity === '' ? null : Number(opportunity), opportunity_note: opportunityNote.trim() || null }
      }) : supabase.rpc('workflow_create_task', {
        p_phase: taskPhase?.id, p_data: { title: title.trim(), description, start_date: startDate, due_date: endDate, priority, assignee_id: Number(assignee) }
      });
      const { error: failure } = await rpc;
      if (failure) throw failure;
      toast.success(form === 'phase' ? 'Đã lưu phase' : 'Đã tạo task — đồng bộ All Tasks');
      setForm(null); await Promise.all([load(), refetch()]); window.dispatchEvent(new Event('tasks:changed'));
    } catch (err: any) { toast.error(err.message || 'Không thể lưu.'); }
    finally { lock.current = false; setSaving(false); }
  };
  const sideOpen = Boolean(form || selectedTask);
  useEffect(() => {
    if (selectedTask && !tasks.some(t => t.id === selectedTask.id)) setSelectedTask(null);
    if (form === 'phase' && !selected?.root) setForm(null);
    if (form === 'task' && !selected?.phases.some(p => p.id === taskPhase?.id && p.can_edit_tasks)) setForm(null);
  }, [selected, tasks]);
  const linkTask = async (task: Task, phaseId: string) => {
    if (!phaseId || linking) return;
    setLinking(true);
    const legacy = task.id.startsWith('ps-') || task.id.startsWith('cs-');
    const { error: failure } = await supabase.rpc('workflow_link_task', { p_phase: phaseId, p_task: legacy ? task.id.slice(3) : task.id, p_kind: task.id.startsWith('ps-') ? 'project_subtask' : task.id.startsWith('cs-') ? 'campaign_subtask' : 'task' });
    setLinking(false);
    if (failure) return toast.error(failure.message);
    toast.success('Đã gắn task vào phase, giữ nguyên comments và files');
    await Promise.all([load(), refetch()]); window.dispatchEvent(new Event('tasks:changed'));
  };
  const changeTaskStatus = async (task: Task, stage: WorkflowTaskStatus) => {
    const table = task.id.startsWith('ps-') ? 'project_subtasks' : task.id.startsWith('cs-') ? 'campaign_subtasks' : 'tasks';
    const id = table === 'tasks' ? task.id : task.id.slice(3);
    const { data, error: failure } = await supabase.from(table).update({ status: canonicalWorkflowStatus[stage], workflow_status: stage }).eq('id', id).select('id').maybeSingle();
    if (failure || !data) { toast.error(failure?.message || 'Không có quyền cập nhật task'); throw new Error('Task write denied'); }
    await refetch(); window.dispatchEvent(new Event('tasks:changed'));
  };
  return <div className="flex min-w-0 gap-4 items-start text-[#002e6d] dark:text-slate-100">
    <div className="flex-1 min-w-0 space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold flex items-center gap-2"><GitBranch size={22} />Workflow Management</h1><p className="text-xs text-gray-500 mt-1">Project/Campaign → Phase → Tasks · Dữ liệu đồng bộ, không tạo bản sao.</p></div><button className={secondary} onClick={() => { void load(); void refetch(); }} title="Làm mới"><RefreshCw size={15} />Làm mới</button></header>
      {error || taskError ? <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 p-4 text-sm">{error || taskError}<button className="ml-3 underline" onClick={() => { void load(); void refetch(); }}>Thử lại</button></div> : null}
      <section className={`${panel} p-4 flex flex-wrap gap-3`}>
        <input aria-label="Tìm Project/Campaign" className={`${field} sm:!w-52`} placeholder="Tìm Project/Campaign..." value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="Chọn Project/Campaign" className={`${field} flex-1 min-w-0 sm:min-w-[220px]`} value={selected?.id || ''} onChange={e => { const w = tracks.find(v => v.id === e.target.value); if (w) changeTrack(w); }}><option value="" disabled>Chọn Project/Campaign</option>{filtered.map(w => <option key={w.id} value={w.id}>{w.entity_type === 'project' ? 'Project' : 'Campaign'} · {w.name}</option>)}</select>
        <button className={secondary} onClick={() => navigate('/projects')}><FolderKanban size={16} />Projects/Campaigns<ArrowRight size={14} /></button>
      </section>
      {loading ? <div className={`${panel} p-10 text-center text-sm text-gray-500`}>Đang tải Workflow...</div> : !selected ? <div className={`${panel} p-10 text-center`}><h2 className="font-bold">{params.has('project') || params.has('campaign') ? 'Project/Campaign không khả dụng trong phạm vi của bạn' : 'Chưa có Project/Campaign trong phạm vi của bạn'}</h2><p className="text-sm text-gray-500 mt-2">Tạo mới tại Projects/Campaigns hoặc nhờ PIC giao phase.</p></div> : <>
        <section className={`${panel} p-5 space-y-4`}>
          <div className="flex flex-wrap gap-3 items-start justify-between"><div className="min-w-0"><span className="text-[10px] uppercase font-bold text-gray-500">{selected.entity_type === 'project' ? 'Project' : 'Campaign'}</span><h2 className="text-lg font-bold break-words">{selected.name}</h2></div><StatusBadge status={selected.status || 'todo'} /></div>
          <div className="grid sm:grid-cols-2 gap-4"><div><p className="text-[10px] uppercase text-gray-500 mb-2">PIC toàn bộ</p><People people={selected.pics} /></div><div><p className="text-[10px] uppercase text-gray-500 mb-2">Timeline</p><span className="text-sm inline-flex items-center gap-2"><Calendar size={14} />{displayDate(selected.start_date)} – {displayDate(selected.due_date)}</span></div></div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><Shield size={13} />{selected.root ? 'PIC toàn bộ / quản trị: quản lý tất cả phase.' : 'Phạm vi giới hạn: chỉ phase/task được giao hoặc được nhắc đến.'}</p>
          {selected.asset && /^https?:\/\//i.test(selected.asset) && <a href={selected.asset} target="_blank" rel="noreferrer" className="text-xs underline">Tài liệu từ Projects/Campaigns</a>}
        </section>
        <section className={`${panel} p-4 sm:p-5 space-y-4`}>
          <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="font-bold">Lộ trình triển khai <span className="text-xs text-gray-500 font-normal">· {selected.root ? selected.phases.length + ' phase' : selected.phases.length + ' phase được phép xem'}</span></h3>{selected.root && <button className={primary} onClick={() => openPhase(null)}><Plus size={16} />Thêm phase</button>}</div>
          {!selected.phases.length && <p className="text-sm text-gray-500 py-6">{selected.root ? 'Chưa có phase. PIC tạo lộ trình và giao PIC/sub-PIC cho từng giai đoạn.' : 'Bạn xem được thông tin chung, nhưng chưa được giao phase. Nhờ PIC cấp quyền cho giai đoạn cần tham gia.'}</p>}
          <div className="space-y-3">{selected.phases.map(phase => {
            const rows = phaseTasks(phase); const progress = taskProgress(rows); const isOpen = expanded === phase.id;
            return <article key={phase.id} className="rounded-xl border border-blue-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 bg-slate-50/60 dark:bg-slate-900/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-slate-700 text-xs flex items-center justify-center font-bold shrink-0">{phase.position}</span><h4 className="font-bold break-words">{phase.title}</h4></div><StatusBadge status={phase.status} /></div>
                <People people={phase.members} />
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500"><span>{displayDate(phase.start_date)} – {displayDate(phase.due_date)}</span><span>{phase.can_edit_tasks ? `${progress.done}/${progress.total} task hoàn thành` : `${progress.total} task trong phạm vi được xem`}</span><span title={phase.opportunity_note || undefined}>Cơ hội qua phase: <b className="text-primary dark:text-blue-300">{phase.opportunity == null ? 'Chưa đánh giá' : `${phase.opportunity}% · PIC đánh giá`}</b></span></div>
                {phase.can_edit_tasks && <div className="flex items-center gap-3"><div className="flex-1 h-1.5 bg-blue-50 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress.percent || 0}%` }} /></div><span className="text-xs font-bold">{progress.percent == null ? '—' : progress.percent + '%'}</span></div>}
                <div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => setExpanded(isOpen ? null : phase.id)} aria-expanded={isOpen}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{isOpen ? 'Thu gọn' : 'Xem chi tiết'}</button>{selected.root && <button className={secondary} onClick={() => openPhase(phase)}><Edit3 size={14} />Chỉnh sửa phase</button>}{phase.can_edit_tasks && !['completed', 'cancelled'].includes(phase.status) && <button className={primary} onClick={() => openTask(phase)}><Plus size={14} />Tạo task</button>}</div>
              </div>
              {isOpen && <div className="p-3 sm:p-4 space-y-2 animate-slide-up">
                {phase.opportunity_note && <p className="text-xs text-gray-500 break-words">Cơ sở đánh giá: {phase.opportunity_note}</p>}
                {!rows.length && <p className="text-sm text-gray-500 py-4">Chưa có task trong phạm vi được xem.</p>}
                {rows.map(task => <div key={task.id} className="w-full p-3 rounded-xl border border-blue-100 dark:border-slate-700 flex flex-wrap items-center gap-3"><button onClick={() => { setForm(null); setSelectedTask(task); }} className="flex-1 min-w-0 text-left hover:text-primary transition-colors"><p className={`text-sm font-semibold break-words ${['done','complete','completed'].includes(task.status) ? 'line-through opacity-60' : ''}`}>{task.title}</p><p className="text-xs text-gray-500 mt-1">{task.assignee?.name || 'Chưa giao PIC'} · Hạn {displayDate(task.due_date)}</p></button><WorkflowStatusPicker status={task.status} stage={task.workflow_status} disabled={!phase.can_edit_tasks && String(task.assignee_id)!==String(profile?.id)} onChange={stage=>changeTaskStatus(task,stage)}/><ChevronRight size={14} className="shrink-0" /></div>)}
              </div>}
            </article>;
          })}</div>
        </section>
        {selected.root && unplanned.length > 0 && <section className={`${panel} p-5 space-y-3`}><h3 className="font-bold">Task hiện có chưa thuộc phase <span className="text-xs font-normal text-gray-500">· {unplanned.length}</span></h3><p className="text-xs text-gray-500">Gắn task cũ vào phase, không tạo bản sao và không mất comments/files.</p>{unplanned.map(task => <div key={task.id} className="flex flex-wrap gap-3 items-center rounded-xl border border-blue-100 dark:border-slate-700 p-3"><button className="flex-1 min-w-0 text-left text-sm font-semibold break-words" onClick={() => { setForm(null); setSelectedTask(task); }}>{task.title}</button><StatusBadge status={task.status} /><select aria-label={`Gắn phase cho ${task.title}`} disabled={linking} className={`${field} sm:!w-44`} value="" onChange={e => { void linkTask(task, e.target.value); }}><option value="">Gắn vào phase...</option>{selected.phases.filter(p => !['completed', 'cancelled'].includes(p.status)).map(p => <option key={p.id} value={p.id}>{p.position}. {p.title}</option>)}</select></div>)}</section>}
      </>}
    </div>
    {sideOpen && <div className="fixed inset-0 z-[130] lg:sticky lg:top-0 lg:inset-auto lg:z-10 w-full lg:w-[min(480px,45%)] lg:shrink-0 h-[100dvh] lg:h-[calc(100dvh-110px)] min-h-0 drawer-slide-in bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-blue-100 dark:border-slate-700">
      {selectedTask ? selectedTask.id.startsWith('ps-') || selectedTask.id.startsWith('cs-') ? <SubtaskDetailPanel embedded subtask={{ ...(tasks.find(t => t.id === selectedTask.id) || selectedTask), id: selectedTask.id.slice(3), assignee_id: Number(selectedTask.assignee_id) }} entityType={selectedTask.id.startsWith('ps-') ? 'project_subtask' : 'campaign_subtask'} profile={profile} people={people} onClose={() => setSelectedTask(null)} onUpdated={() => { void refetch(); void load(); }} /> : <TaskDetailPanel task={tasks.find(t => t.id === selectedTask.id) || selectedTask} isOpen onClose={() => setSelectedTask(null)} embedded onTaskUpdated={() => { void refetch(); void load(); }} /> : <form onSubmit={save} className="h-full flex flex-col">
        <header className="p-5 border-b border-blue-100 dark:border-slate-700 flex justify-between gap-3 shrink-0"><div><h2 className="font-bold">{form === 'phase' ? editingPhase ? 'Chỉnh sửa phase' : 'Thêm phase' : 'Tạo task trong phase'}</h2><p className="text-xs text-gray-500 mt-1 break-words">{form === 'task' ? taskPhase?.title : selected?.name}</p></div><button type="button" disabled={saving} aria-label="Đóng" onClick={() => setForm(null)}><X size={18} /></button></header>
        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <label className="block text-sm font-semibold">{form === 'phase' ? 'Tên phase' : 'Tên task'} *<input autoFocus required value={title} onChange={e => setTitle(e.target.value)} className={`${field} mt-1`} /></label>
          <div className="grid grid-cols-2 gap-3"><DateField id="workflow-start" label="Ngày bắt đầu" value={start} onChange={setStart} /><DateField id="workflow-due" label="Ngày kết thúc" value={due} onChange={setDue} /></div>
          {form === 'phase' ? <>
            <div><label className="block text-sm font-semibold mb-1">PIC phase *</label><MultiSelect options={people.map(p => ({ value: String(p.id), label: p.name }))} value={pics} onChange={setPics} placeholder="Chọn PIC phase..." /></div>
            <div><label className="block text-sm font-semibold mb-1">Sub-PIC · chỉ xem phase này</label><MultiSelect options={people.filter(p => !pics.includes(String(p.id))).map(p => ({ value: String(p.id), label: p.name }))} value={subPics} onChange={setSubPics} placeholder="Tag người tham gia phase..." /></div>
            <label className="block text-sm font-semibold">Status<select value={status} onChange={e => setStatus(e.target.value)} className={`${field} mt-1`}><option value="todo">Chưa bắt đầu</option><option value="in_progress">Đang thực hiện</option><option value="in_review">Chờ duyệt</option><option value="completed">Hoàn thành</option><option value="on_hold">Tạm dừng</option><option value="cancelled">Dừng triển khai</option></select></label>
            <label className="block text-sm font-semibold">Cơ hội tiếp tục (%) · tùy chọn<input type="number" min="0" max="100" value={opportunity} onChange={e => setOpportunity(e.target.value)} className={`${field} mt-1`} placeholder="Để trống nếu chưa đánh giá" /></label>
            <label className="block text-sm font-semibold">Cơ sở đánh giá<textarea required={opportunity !== ''} value={opportunityNote} onChange={e => setOpportunityNote(e.target.value)} className={`${field} mt-1`} rows={3} placeholder="Kết quả, dữ liệu hoặc lý do PIC đánh giá..." /></label>
            <p className="text-xs text-gray-500">Tiến độ tính theo task thật đã hoàn thành / tổng task. Cơ hội qua phase là đánh giá của PIC, không phải xác suất tự suy diễn. Hoàn thành phase trước khi bắt đầu giai đoạn tiếp theo.</p>
          </> : <>
            <label className="block text-sm font-semibold">PIC thực thi *<select required className={`${field} mt-1`} value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Chọn PIC</option>{taskPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="block text-sm font-semibold">Priority<select className={`${field} mt-1`} value={priority} onChange={e => setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="block text-sm font-semibold">Mô tả<textarea className={`${field} mt-1`} rows={4} value={description} onChange={e => setDescription(e.target.value)} /></label>
            <p className="text-xs text-gray-500">Task được lưu một lần vào All Tasks, liên kết đúng Project/Campaign và phase để tính performance của PIC.</p>
          </>}
        </div>
        <footer className="border-t border-blue-100 dark:border-slate-700 p-4 flex gap-3 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><button type="button" disabled={saving} className={`${secondary} flex-1`} onClick={() => setForm(null)}>Hủy</button><button disabled={saving} className={`${primary} flex-1`}>{saving ? 'Đang lưu...' : form === 'phase' ? 'Lưu phase' : 'Tạo task'}</button></footer>
      </form>}
    </div>}
  </div>;
};
