import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Calendar, CheckCircle2, ChevronDown, FileText, ImagePlus, Layers3, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';

export type WeeklyReportTask = { id: string; task_ref?: string | null; title: string; status?: string | null; description?: string | null; project?: { id?: string; name?: string | null } | null; created_at?: string | null; updated_at?: string | null; due_date?: string | null };
export type ReportReference = { id: string; name: string; status?: string | null; description?: string | null; kind: 'project' | 'campaign' };
type ReportRow = { id: string; entity_id: string; created_at: string; metadata?: { body?: string; image_url?: string | null; week_start?: string; week_end?: string } | null };

interface WeeklyReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownerName: string;
  userId?: number | null;
  canEdit?: boolean;
  weekStart: string;
  weekEnd: string;
  tasks: WeeklyReportTask[];
  references?: ReportReference[];
  onOpenTask?: (taskId: string) => void;
  onRemindTask?: (task: WeeklyReportTask) => void;
  onRemindMember?: () => void;
  reminding?: boolean;
  variant?: 'drawer' | 'inline';
}

const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const done = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN');

export const WeeklyReportDrawer: React.FC<WeeklyReportDrawerProps> = ({
  isOpen, onClose, ownerName, userId, canEdit = false, weekStart, weekEnd, tasks,
  references = [], onOpenTask, onRemindTask, onRemindMember, reminding = false, variant = 'drawer',
}) => {
  const [reports, setReports] = useState<Record<string, ReportRow>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [openReferenceKinds, setOpenReferenceKinds] = useState<Record<'project' | 'campaign', boolean>>({ project: false, campaign: false });
  const uploadRef = useRef<HTMLInputElement>(null);

  const loadReports = useCallback(async () => {
    if (!tasks.length) return setReports({});
    const { data, error } = await supabase.from('activity_log')
      .select('id,entity_id,created_at,metadata')
      .eq('entity_type', 'task')
      .eq('action', 'weekly_report')
      .in('entity_id', tasks.map(task => task.id))
      .order('created_at', { ascending: false });
    if (error) return console.warn('Could not load weekly reports:', error.message);
    const latest = (data || [])
      .filter((row: any) => row.metadata?.week_start === weekStart && row.metadata?.week_end === weekEnd)
      .reduce((acc: Record<string, ReportRow>, row: any) => acc[row.entity_id] ? acc : { ...acc, [row.entity_id]: row }, {});
    setReports(latest);
  }, [tasks, weekEnd, weekStart]);

  useEffect(() => { if (isOpen) void loadReports(); }, [isOpen, loadReports]);
  useEffect(() => {
    const report = activeTaskId ? reports[activeTaskId] : null;
    setDraft(report?.metadata?.body || '');
    setImageUrl(report?.metadata?.image_url || '');
  }, [activeTaskId, reports]);

  const selectedTask = tasks.find(task => task.id === activeTaskId) || null;
  const stats = useMemo(() => {
    const inWeek = (date?: string | null) => Boolean(date && date.slice(0, 10) >= weekStart && date.slice(0, 10) <= weekEnd);
    return {
      created: tasks.filter(task => inWeek(task.created_at)).length,
      doing: tasks.filter(task => !done(task.status) && (inWeek(task.updated_at) || inWeek(task.due_date))).length,
      done: tasks.filter(task => done(task.status) && (inWeek(task.updated_at) || inWeek(task.created_at))).length,
    };
  }, [tasks, weekEnd, weekStart]);
  const referenceGroups = useMemo(() => ({ project: references.filter(item => item.kind === 'project'), campaign: references.filter(item => item.kind === 'campaign') }), [references]);

  const saveReport = async () => {
    if (!selectedTask || !userId || !draft.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId, user_id: userId, action: 'weekly_report', entity_type: 'task', entity_id: selectedTask.id,
      metadata: { body: draft.trim(), image_url: imageUrl.trim() || null, week_start: weekStart, week_end: weekEnd },
    });
    setSaving(false);
    if (error) return toast.error('Không thể lưu weekly report');
    toast.success('Đã lưu weekly report');
    await loadReports();
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const { data, error } = await supabase.storage.from('attachments').upload(`weekly-reports/${Date.now()}-${cleanName}`, file, { upsert: false });
    setSaving(false);
    if (error || !data) return toast.error('Chưa thể tải ảnh. Bạn có thể dán link ảnh vào ô bên trên.');
    setImageUrl(supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl);
  };

  if (!isOpen) return null;

  const taskCard = (task: WeeklyReportTask) => {
    const isOpenTask = activeTaskId === task.id;
    const report = reports[task.id];
    return (
      <article key={task.id} className={`overflow-hidden rounded-xl border transition-colors ${isOpenTask ? 'border-primary/40 bg-primary/[0.03]' : 'border-gray-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30'}`}>
        <button onClick={() => setActiveTaskId(isOpenTask ? null : task.id)} className="flex w-full items-center gap-3 p-3 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpenTask ? 'rotate-180' : ''}`} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-sm text-gray-900 dark:text-white">{task.title}</b>
            <span className="mt-1 inline-flex rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-slate-700">{task.project?.name || 'Task lẻ'} · {(task.status || 'todo').replace('-', ' ')}</span>
          </span>
          {report ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-xs text-amber-600">Chưa report</span>}
        </button>
        {isOpenTask && <div className="border-t border-primary/10 p-3">
          <p className="mb-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm text-gray-600 dark:bg-slate-800 dark:text-gray-300">{task.description || 'Chưa có mô tả task.'}</p>
          {canEdit ? <>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={4} placeholder="Cập nhật kết quả, tiến độ, blocker của task trong tuần..." className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900" />
            <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="Dán link hình report..." className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
            <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={event => void uploadImage(event.target.files?.[0])} />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => uploadRef.current?.click()} className="rounded-xl border border-dashed border-primary/30 px-3 py-2 text-xs font-semibold text-primary"><ImagePlus className="mr-1 inline h-4 w-4" />Tải hình</button>
              <button disabled={saving || !draft.trim()} onClick={() => void saveReport()} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send className="mr-1 inline h-4 w-4" />Lưu report</button>
              {onOpenTask && <button onClick={() => onOpenTask(task.id)} className="rounded-xl px-3 py-2 text-xs font-semibold text-primary">Mở task</button>}
            </div>
          </> : <>
            <div className="whitespace-pre-wrap rounded-xl bg-white p-3 text-sm text-gray-600 dark:bg-slate-800 dark:text-gray-300">{report?.metadata?.body || 'Chưa có weekly report.'}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {report?.metadata?.image_url && <a href={report.metadata.image_url} target="_blank" rel="noreferrer" className="inline-flex text-xs font-semibold text-primary hover:underline"><ImagePlus className="mr-1 h-4 w-4" />Mở hình report</a>}
              {onOpenTask && <button onClick={() => onOpenTask(task.id)} className="text-xs font-semibold text-primary hover:underline">Mở task</button>}
              {!report && onRemindTask && <button disabled={reminding} onClick={() => onRemindTask(task)} className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"><BellRing className="mr-1 h-3.5 w-3.5" />Nhắc report task</button>}
            </div>
          </>}
        </div>}
      </article>
    );
  };

  const content = <>
    <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700 md:px-6">
      <div><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Weekly Report</p><h2 className="text-lg font-bold text-gray-900 dark:text-white">{ownerName}</h2><p className="mt-1 text-xs text-gray-500"><Calendar className="mr-1 inline h-3.5 w-3.5" />{dateLabel(weekStart)} – {dateLabel(weekEnd)}</p></div>
      <div className="flex items-center gap-1">
        {onRemindMember && <button disabled={reminding} onClick={onRemindMember} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"><BellRing className="mr-1 inline h-3.5 w-3.5" />Nhắc PIC</button>}
        <button aria-label="Đóng báo cáo" onClick={onClose} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
      </div>
    </header>
    <main className="custom-scrollbar space-y-5 overflow-y-auto p-5 md:p-6">
      <div className="grid grid-cols-3 gap-3">
        {[['Created', stats.created, 'border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200'], ['Doing', stats.doing, 'border-blue-100 bg-blue-50/60 text-primary dark:border-blue-900/40 dark:bg-blue-950/20'], ['Done', stats.done, 'border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400']].map(([label, count, color]) => <div key={String(label)} className={`rounded-xl border p-3 text-center ${color}`}><b className="text-lg">{count}</b><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p></div>)}
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900 dark:text-white"><FileText className="mr-2 inline h-4 w-4 text-primary" />Task report</h3><span className="text-xs text-gray-500">{Object.keys(reports).length}/{tasks.length} đã cập nhật</span></div>
        <div className="space-y-2">{tasks.map(taskCard)}{tasks.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">Không có task trong tuần được chọn.</p>}</div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900 dark:text-white"><Layers3 className="mr-2 inline h-4 w-4 text-primary" />Projects & Campaigns</h3><span className="text-xs text-gray-500">{references.length} mục</span></div>
        <div className="space-y-2">{(['project', 'campaign'] as const).map(kind => <div key={kind} className="overflow-hidden rounded-xl border border-gray-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30"><button onClick={() => setOpenReferenceKinds(current => ({ ...current, [kind]: !current[kind] }))} className="flex w-full items-center justify-between p-3 text-left"><span className="text-sm font-semibold text-gray-800 dark:text-white">{kind === 'project' ? 'Projects' : 'Campaigns'} <span className="ml-1 text-xs font-medium text-gray-400">{referenceGroups[kind].length}</span></span><ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openReferenceKinds[kind] ? 'rotate-180' : ''}`} /></button>{openReferenceKinds[kind] && <div className="border-t border-gray-100 p-2 dark:border-slate-700">{referenceGroups[kind].map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2"><span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-200">{item.name}</span><span className="shrink-0 text-xs text-gray-500">{item.status || 'active'}</span></div>)}{referenceGroups[kind].length === 0 && <p className="p-2 text-sm text-gray-500">Chưa có {kind === 'project' ? 'Project' : 'Campaign'} liên quan.</p>}</div>}</div>)}</div>
      </section>
    </main>
  </>;

  if (variant === 'inline') return <section className="mt-5 overflow-hidden rounded-xl border border-gray-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30">{content}</section>;
  return <><button aria-label="Đóng báo cáo" onClick={onClose} className="fixed inset-0 z-[105] cursor-default bg-slate-950/[0.04]" /><aside className="drawer-slide-in fixed inset-y-0 right-0 z-[110] flex h-full w-full max-w-[620px] flex-col overflow-hidden rounded-l-3xl border-l-4 border-l-primary bg-white shadow-2xl dark:bg-slate-800 md:w-[min(620px,calc(100vw-2rem))]">{content}</aside></>;
};
