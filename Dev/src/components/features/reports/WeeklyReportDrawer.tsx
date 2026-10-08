import { WeeklyReportPreview } from './WeeklyReportPreview';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CalendarDays, ChevronDown, ExternalLink, ImagePlus, Layers3, Send, X, CheckSquare , } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { notifyTaskParticipants } from '../../../services/taskNotifications';
import { useAuthStore } from '../../../store/authStore';
import type { WeekSelection } from '../../../lib/weeklyReport';

export type WeeklyReportTask = {
  id: string;
  task_ref?: string | null;
  title: string;
  status?: string | null;
  description?: string | null;
  project?: { id?: string; name?: string | null } | null;
  created_at?: string | null;
  updated_at?: string | null;
  due_date?: string | null;
};
export type ReportReference = { id: string; name: string; status?: string | null; description?: string | null; kind: 'project' | 'campaign' };
type ReportMetadata = {
  body?: string;
  blocker?: string | null;
  next_step?: string | null;
  image_url?: string | null;
  unchanged?: boolean;
  week_start?: string;
  week_end?: string;
};
type ReportRow = { id: string; entity_id: string; created_at: string; metadata?: ReportMetadata | null };
type ReportMode = 'progress' | 'unchanged';
type ReportTab = 'pending' | 'reported';

interface WeeklyReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownerName: string;
  userId?: number | null;
  canEdit?: boolean;
  weekStart: string;
  weekEnd: string;
  weekSelection?: WeekSelection;
  onWeekSelectionChange?: (selection: WeekSelection) => void;
  tasks: WeeklyReportTask[];
  references?: ReportReference[];
  onOpenTask?: (taskId: string) => void;
  onRemindTask?: (task: WeeklyReportTask) => void;
  onRemindMember?: () => void;
  onReportSaved?: () => void;
  reminding?: boolean;
  variant?: 'drawer' | 'inline';
  showWeekSelection?: boolean;
  showHeader?: boolean;
}

const workspaceId = '9000eae0-528c-47a2-b6f3-eba019d4edca';
const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN');

export const WeeklyReportDrawer: React.FC<WeeklyReportDrawerProps> = ({
  isOpen, onClose, ownerName, userId, canEdit = false, weekStart, weekEnd,
  weekSelection, onWeekSelectionChange, tasks, references = [], onOpenTask,
  onRemindTask, onRemindMember, onReportSaved, reminding = false, variant = 'drawer', showWeekSelection = true, showHeader = true,
}) => {
  const profile = useAuthStore(state => state.profile);
  const [reports, setReports] = useState<Record<string, ReportRow>>({});
  const [loadingReports, setLoadingReports] = useState(false);
  const [tab, setTab] = useState<ReportTab>('pending');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [summaryImage, setSummaryImage] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [reportedThisSession, setReportedThisSession] = useState<Set<string>>(new Set());
  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(30, Math.min(70, newWidth)));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const removeSummaryImage = async () => {
    setSummaryImage(null);
    if (!userId) return;
    await supabase.from('activity_log').delete().match({
      workspace_id: workspaceId, user_id: userId, action: 'weekly_summary_image', entity_id: userId
    });
  };

  const submitFinalReport = () => {
    toast.success('Đã gửi báo cáo tuần cho Leader!');
  };

  const summaryUploadRef = useRef<HTMLInputElement>(null);


  const [mode, setMode] = useState<ReportMode | null>(null);
  const [body, setBody] = useState('');
  const [blocker, setBlocker] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const uploadRef = useRef<HTMLInputElement>(null);

  const loadReports = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!tasks.length) { setReports({}); setLoadingReports(false); return; }
    setLoadingReports(true);
    let query = supabase.from('activity_log')
      .select('id,entity_id,created_at,metadata')
      .eq('entity_type', 'task')
      .eq('action', 'weekly_report')
      .in('entity_id', tasks.map(task => task.id))
      .order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (currentRequest !== requestId.current) return;
    if (error) {
      console.warn('Could not load weekly reports:', error.message);
      setReports({});
      setLoadingReports(false);
      return;
    }
    const latest: Record<string, ReportRow> = {};
    (data || []).forEach((row: any) => {
      if (row.metadata?.week_start === weekStart && row.metadata?.week_end === weekEnd && !latest[row.entity_id]) latest[row.entity_id] = row;
    });
    setReports(latest);
    setLoadingReports(false);
  }, [tasks, userId, weekEnd, weekStart]);

  useEffect(() => {
    setReports({});
    setTab('pending');
    setActiveTaskId(null);
  }, [weekStart, weekEnd, userId]);
  useEffect(() => { if (isOpen) void loadReports(); }, [isOpen, loadReports]);
  useEffect(() => {
    const metadata = activeTaskId ? reports[activeTaskId]?.metadata : null;
    setMode(metadata ? (metadata.unchanged ? 'unchanged' : 'progress') : null);
    setBody(metadata?.body || '');
    setBlocker(metadata?.blocker || '');
    setNextStep(metadata?.next_step || '');
    setImageUrl(metadata?.image_url || '');
    setShowMore(Boolean(metadata?.blocker || metadata?.next_step || metadata?.image_url));
  }, [activeTaskId, reports]);

  const pendingTasks = useMemo(() => tasks.filter(task => !reports[task.id] || reportedThisSession.has(task.id)), [tasks, reports, reportedThisSession]);
  const reportedTasks = useMemo(() => tasks.filter(task => Boolean(reports[task.id])), [tasks, reports]);
  const visibleTasks = tab === 'pending' ? pendingTasks : reportedTasks;
  // @ts-ignore
  const imageReports = useMemo(() => reportedTasks.flatMap(task => {
    const report = reports[task.id];
    return report?.metadata?.image_url ? [{ task, report }] : [];
  }), [reportedTasks, reports]);
  const reportProgress = tasks.length ? Math.round((reportedTasks.length / tasks.length) * 100) : 0;
  const referenceGroups = useMemo(() => ({
    project: references.filter(item => item.kind === 'project'),
    campaign: references.filter(item => item.kind === 'campaign'),
  }), [references]);
  const visibleReferences = useMemo(() => references.filter(item => item.name.toLocaleLowerCase().includes(referenceSearch.trim().toLocaleLowerCase())), [references, referenceSearch]);
  const selectedTask = tasks.find(task => task.id === activeTaskId);

  const saveReport = async (reportMode: ReportMode, noteOverride?: string) => {
    if (!selectedTask || !userId) return;
    const content = (noteOverride ?? body).trim();
    if (reportMode === 'progress' && !content) return toast.error('Hãy ghi kết quả của task trong tuần');
    setSaving(true);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action: 'weekly_report',
      entity_type: 'task',
      entity_id: selectedTask.id,
      metadata: {
        body: content,
        blocker: reportMode === 'progress' ? blocker.trim() || null : null,
        next_step: reportMode === 'progress' ? nextStep.trim() || null : null,
        image_url: reportMode === 'progress' ? imageUrl.trim() || null : null,
        unchanged: reportMode === 'unchanged',
        entity_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
      },
    });
    setSaving(false);
    if (error) return toast.error('Không thể lưu weekly report');
    if (profile?.id === userId) void notifyTaskParticipants(selectedTask, { id: userId, name: ownerName, department_id: profile.department_id }, 'weekly_report');
    toast.success(reportMode === 'unchanged' ? 'Đã ghi nhận: Không thay đổi' : 'Đã lưu report');
    onReportSaved?.();
    setReportedThisSession(prev => new Set(prev).add(selectedTask.id));
    await loadReports();
  };

  const uploadSummaryImage = async (file?: File) => {
    if (!file || !userId) return;
    setSaving(true);
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const { data, error } = await supabase.storage.from('attachments').upload(`weekly-reports/${Date.now()}-${cleanName}`, file, { upsert: false });
    if (!error && data) {
      const url = supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
      setSummaryImage(url);
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId, user_id: userId, action: 'weekly_summary_image', entity_type: 'user', entity_id: userId,
        metadata: { image_url: url, entity_id: userId, week_start: weekStart, week_end: weekEnd }
      });
      toast.success('Đã tải lên hình ảnh báo cáo tuần');
    } else { console.error(error); toast.error('Lỗi tải ảnh: ' + (error?.message || 'Không rõ nguyên nhân')); }
    setSaving(false);
  };

  const bulkCompleteTasks = async () => {
    if (!userId || selectedTasks.size === 0) return;
    setSaving(true);
    const payloads = Array.from(selectedTasks).map(taskId => ({
      workspace_id: workspaceId, user_id: userId, action: 'weekly_report', entity_type: 'task', entity_id: taskId,
      metadata: { body: 'Đã hoàn thành', unchanged: false, entity_id: userId, week_start: weekStart, week_end: weekEnd }
    }));
    const { error } = await supabase.from('activity_log').insert(payloads);
    setSaving(false);
    if (!error) {
      toast.success(`Đã đánh dấu hoàn thành ${selectedTasks.size} tasks`);
      onReportSaved?.();
      setSelectedTasks(new Set());
      setReportedThisSession(prev => new Set([...prev, ...Array.from(selectedTasks)]));
      await loadReports();
    }
  };

  const quickCompleteTask = async (taskId: string) => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('activity_log').insert({
      workspace_id: workspaceId, user_id: userId, action: 'weekly_report', entity_type: 'task', entity_id: taskId,
      metadata: { body: 'Đã hoàn thành', unchanged: false, entity_id: userId, week_start: weekStart, week_end: weekEnd }
    });
    setSaving(false);
    if (!error) {
      toast.success('Đã đánh dấu hoàn thành');
      onReportSaved?.();
      await loadReports();
    }
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === pendingTasks.length) setSelectedTasks(new Set());
    else setSelectedTasks(new Set(pendingTasks.map(t => t.id)));
  };
  const toggleSelectTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTasks(next);
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const { data, error } = await supabase.storage.from('attachments').upload(`weekly-reports/${Date.now()}-${cleanName}`, file, { upsert: false });
    setSaving(false);
    if (error || !data) return toast.error('Chưa thể tải ảnh. Bạn có thể dán link ảnh.');
    setImageUrl(supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl);
    setShowMore(true);
  };

  if (!isOpen) return null;

  const renderTask = (task: WeeklyReportTask) => {
    const report = reports[task.id];
    const expanded = activeTaskId === task.id;
    return <article key={task.id} className={`overflow-hidden rounded-xl border transition-colors ${expanded ? 'border-primary/30 bg-primary/[0.02]' : 'border-gray-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30'}`}>
      <div className="group flex w-full items-center gap-3 p-3 text-left hover:bg-primary/[0.03] relative cursor-pointer" onClick={() => setActiveTaskId(expanded ? null : task.id)}>
        {!report && canEdit && <input type="checkbox" checked={selectedTasks.has(task.id)} onClick={(e) => toggleSelectTask(task.id, e)} className="shrink-0 w-4 h-4 rounded border-gray-300 text-primary cursor-pointer" />}
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <span className="min-w-0 flex-1 pr-24"><b className="block truncate text-sm text-gray-900 dark:text-white">{task.title}</b><span className="mt-1 block truncate text-[11px] text-gray-500">{task.project?.name || 'Task lẻ'} · {(task.status || 'todo').replaceAll('_', ' ')}</span></span>
        <div className="absolute right-3 flex items-center gap-2">
          {!report && canEdit && <button onClick={(e) => { e.stopPropagation(); quickCompleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm hover:bg-emerald-200">Hoàn thành</button>}
          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${report ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>{report ? (report.metadata?.unchanged ? 'Không thay đổi' : 'Đã report') : 'Chưa report'}</span>
        </div>
      </div>
      {expanded && <div className="space-y-3 border-t border-gray-100 p-3 dark:border-slate-700">
        {canEdit ? <>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { if (mode !== 'progress' && report?.metadata?.unchanged) setBody(''); setMode('progress'); }} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'progress' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary/30 dark:border-slate-700 dark:text-gray-300'}`}>Có cập nhật</button>
            <button type="button" disabled={saving} onClick={() => { if (mode !== 'unchanged' && !report?.metadata?.unchanged) setBody(''); setMode('unchanged'); if (!report) void saveReport('unchanged', ''); }} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${mode === 'unchanged' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-300 dark:border-slate-700 dark:text-gray-300'}`}>Không thay đổi</button>
          </div>
          {mode === 'progress' && <>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Kết quả tuần này <span className="text-red-500">*</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={3} placeholder="Đã làm được gì? Tiến độ hiện tại?" className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm font-normal text-gray-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <button type="button" aria-expanded={showMore} onClick={() => setShowMore(value => !value)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{showMore ? 'Ẩn' : 'Thêm'} vướng mắc, bước tiếp theo và minh chứng <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} /></button>
            {showMore && <div className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Vướng mắc / cần hỗ trợ<textarea value={blocker} onChange={event => setBlocker(event.target.value)} rows={2} placeholder="Tùy chọn" className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /></label>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Việc tiếp theo<textarea value={nextStep} onChange={event => setNextStep(event.target.value)} rows={2} placeholder="Tùy chọn" className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /></label>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">Link minh chứng<input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="Dán link ảnh hoặc tài liệu" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /></label>
              <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={event => void uploadImage(event.target.files?.[0])} />
              <button type="button" onClick={() => uploadRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary"><ImagePlus size={14} />Tải ảnh</button>
            </div>}
            <button type="button" disabled={saving || !body.trim()} onClick={() => void saveReport('progress')} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"><Send size={14} />{report ? 'Lưu chỉnh sửa' : 'Lưu report'}</button>
          </>}
          {mode === 'unchanged' && <div className="space-y-2"><label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Ghi chú (tùy chọn)<textarea value={body} onChange={event => setBody(event.target.value)} rows={2} placeholder="Ví dụ: Đang chờ phản hồi từ đối tác" className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm font-normal outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900" /></label>{report && <button type="button" disabled={saving || (report.metadata?.unchanged && body.trim() === (report.metadata?.body || ''))} onClick={() => void saveReport('unchanged')} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Lưu ghi chú</button>}</div>}
          {onOpenTask && <button type="button" onClick={() => onOpenTask(task.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Mở task <ExternalLink size={13} /></button>}
        </> : <>
          {report ? <div className="space-y-2 rounded-xl bg-white p-3 text-sm leading-6 text-gray-700 dark:bg-slate-800 dark:text-gray-200"><p className="font-semibold text-gray-900 dark:text-white">{report.metadata?.unchanged ? 'Không thay đổi trong tuần' : 'Kết quả tuần này'}</p>{report.metadata?.body && <p className="whitespace-pre-wrap">{report.metadata.body}</p>}{report.metadata?.blocker && <p><b>Vướng mắc: </b>{report.metadata.blocker}</p>}{report.metadata?.next_step && <p><b>Việc tiếp theo: </b>{report.metadata.next_step}</p>}{report.metadata?.image_url && <div className="space-y-2"><a href={report.metadata.image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><ImagePlus size={14} />Mở minh chứng</a><a href={report.metadata.image_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700"><img src={report.metadata.image_url} alt={`Minh chứng report: ${task.title}`} loading="lazy" className="max-h-72 w-full bg-slate-50 object-contain dark:bg-slate-900" /></a></div>}</div> : <p className="rounded-xl bg-white p-3 text-sm text-gray-500 dark:bg-slate-800">Task này chưa được report trong tuần.</p>}
          <div className="flex flex-wrap items-center gap-3">{onOpenTask && <button type="button" onClick={() => onOpenTask(task.id)} className="text-xs font-semibold text-primary hover:underline">Mở task</button>}{!report && onRemindTask && <button type="button" disabled={reminding} onClick={() => onRemindTask(task)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"><BellRing size={14} />Nhắc report task</button>}</div>
        </>}
      </div>}
    </article>;
  };

  const leftColumn = <>
    {showHeader && <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-slate-700 md:px-6 shrink-0 bg-white dark:bg-slate-800 z-10">
      <div className="flex flex-col min-w-0">
        <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white">{ownerName}</h2>
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-gray-500 tracking-wider mt-0.5"><CalendarDays size={12} />{dateLabel(weekStart)} – {dateLabel(weekEnd)}</p>
      </div>
      
      <div className="flex shrink-0 items-center gap-2">
        {showWeekSelection && weekSelection && onWeekSelectionChange && (
          <div className="flex items-center gap-2 mr-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900/50">
              {(['current', 'previous'] as const).map(option => <button key={option} type="button" aria-pressed={weekSelection === option} onClick={() => onWeekSelectionChange(option)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${weekSelection === option ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white' : 'text-gray-500 hover:text-primary'}`}>{option === 'current' ? 'Tuần này' : 'Tuần trước'}</button>)}
            </div>
            {canEdit && (
              <>
                <input ref={summaryUploadRef} type="file" accept="image/*" className="sr-only" onChange={event => void uploadSummaryImage(event.target.files?.[0])} />
                <button type="button" onClick={() => summaryUploadRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 shadow-sm transition-all"><ImagePlus size={14}/> Thêm Hình</button>
              </>
            )}
          </div>
        )}
        
        {onRemindMember && pendingTasks.length > 0 && <button type="button" disabled={reminding || loadingReports} onClick={onRemindMember} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"><BellRing size={14} />Nhắc PIC</button>}
        
        {variant !== 'inline' && <button type="button" aria-label="Đóng báo cáo" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"><X size={19} /></button>}
      </div>
    </header>}
    <main className="flex-1 min-h-0 custom-scrollbar space-y-5 overflow-y-auto p-5 md:p-6">

      {summaryImage && <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm relative group max-h-[300px]">
        <img src={summaryImage} alt="Hình ảnh report tuần" className="w-full h-full object-cover" />
      </div>}
      <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tiến độ report</p><p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{loadingReports ? 'Đang tải…' : `${reportedTasks.length}/${tasks.length} task đã cập nhật`}</p></div><span className="text-lg font-bold text-primary">{reportProgress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${reportProgress}%` }} /></div></section>
      {!canEdit && variant === 'inline' && imageReports.length > 0 && <section className="space-y-3"><h3 className="text-sm font-bold text-gray-900 dark:text-white">Hình ảnh report của PIC</h3><div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{imageReports.map(({ task, report }) => <a key={report.id} href={report.metadata?.image_url || '#'} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-gray-100 bg-white transition-colors hover:border-primary/30 dark:border-slate-700 dark:bg-slate-800"><img src={report.metadata?.image_url || ''} alt={`Minh chứng report: ${task.title}`} loading="lazy" className="h-44 w-full bg-slate-50 object-contain dark:bg-slate-900" /><span className="block truncate px-3 py-2 text-xs font-semibold text-gray-700 group-hover:text-primary dark:text-gray-200">{task.title}</span></a>)}</div></section>}
      <section>
        <div className="mb-3 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900/50"><button type="button" aria-pressed={tab === 'pending'} onClick={() => { setTab('pending'); setActiveTaskId(null); }} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ${tab === 'pending' ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white' : 'text-gray-500'}`}>Cần cập nhật ({pendingTasks.length})</button><button type="button" aria-pressed={tab === 'reported'} onClick={() => { setTab('reported'); setActiveTaskId(null); }} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ${tab === 'reported' ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white' : 'text-gray-500'}`}>Đã cập nhật ({reportedTasks.length})</button></div>
        
        {tab === 'pending' && canEdit && pendingTasks.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-2 mb-3">
            <label className="flex items-center gap-2 px-2 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={selectedTasks.size === pendingTasks.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer" />
              Chọn tất cả
            </label>
            {selectedTasks.size > 0 && (
              <button type="button" onClick={bulkCompleteTasks} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1">
                <CheckSquare size={14}/> Hoàn thành {selectedTasks.size} task
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">{loadingReports ? <p className="rounded-xl p-5 text-center text-sm text-gray-500">Đang tải task report…</p> : visibleTasks.length ? visibleTasks.map(renderTask) : <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-slate-700">{tasks.length === 0 ? 'Không có task cần report trong tuần này.' : tab === 'pending' ? 'Đã cập nhật đủ task trong tuần.' : 'Chưa có task nào được cập nhật.'}</p>}</div>
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"><button type="button" aria-expanded={referenceOpen} onClick={() => setReferenceOpen(value => !value)} className="flex w-full items-center justify-between gap-3 p-3 text-left"><span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white"><Layers3 size={16} className="text-primary" />Projects/Campaigns <span className="text-xs font-medium text-gray-400">{referenceGroups.project.length}/{referenceGroups.campaign.length}</span></span><ChevronDown size={16} className={`text-gray-400 transition-transform ${referenceOpen ? 'rotate-180' : ''}`} /></button>{referenceOpen && <div className="space-y-2 border-t border-gray-100 p-3 dark:border-slate-700"><p className="text-xs text-gray-500">Danh sách tham chiếu, không cần report lại tại đây.</p><input type="search" value={referenceSearch} onChange={event => setReferenceSearch(event.target.value)} placeholder="Tìm Project hoặc Campaign..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800" /><div className="max-h-56 space-y-1 overflow-y-auto">{visibleReferences.map(item => <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs dark:bg-slate-800"><span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-200">{item.name}</span><span className="shrink-0 text-gray-400">{item.kind === 'project' ? 'Project' : 'Campaign'} · {item.status || 'active'}</span></div>)}{visibleReferences.length === 0 && <p className="py-3 text-center text-xs text-gray-500">Không có mục phù hợp.</p>}</div></div>}</section>
    </main>
  </>;

  const rightColumn = (
    <WeeklyReportPreview
      weekStart={weekStart}
      weekEnd={weekEnd}
      reportProgress={reportProgress}
      reportedTasks={reportedTasks}
      totalTasks={tasks.length}
      summaryImage={summaryImage}
      reports={reports}
      onRemoveSummaryImage={removeSummaryImage}
      onSubmitReport={submitFinalReport}
      onEditTask={(taskId) => {
        setActiveTaskId(taskId);
        const el = document.getElementById(`task-item-${taskId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
    />
  );

  const content = (
    <div ref={containerRef} className={`flex h-full w-full ${isResizing ? 'select-none pointer-events-none' : ''}`}>
      <div style={{ width: `${leftWidth}%` }} className={`min-w-[30%] flex flex-col ${isResizing ? 'pointer-events-auto' : ''}`}>{leftColumn}</div>
      <div 
        onMouseDown={() => setIsResizing(true)}
        className="hidden lg:flex w-1.5 cursor-col-resize hover:bg-primary/50 bg-gray-100 dark:bg-slate-700 transition-colors z-20 shrink-0 pointer-events-auto"
      />
      <div style={{ width: `${100 - leftWidth}%` }} className={`hidden lg:flex min-w-[30%] flex-col ${isResizing ? 'pointer-events-auto' : ''}`}>{rightColumn}</div>
    </div>
  );


  if (variant === 'inline') return showHeader
    ? <section className="mt-5 h-[800px] max-h-[85vh] flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">{content}</section>
    : <div className="h-[800px] max-h-[85vh] flex flex-col overflow-hidden">{content}</div>;
  return <><button type="button" aria-label="Đóng báo cáo" onClick={onClose} className="fixed inset-0 z-[105] cursor-default bg-slate-950/[0.04]" /><aside className="drawer-slide-in fixed inset-y-0 right-0 z-[110] flex h-full w-full max-w-[620px] flex-col overflow-hidden rounded-l-3xl border-l-4 border-l-primary bg-white shadow-2xl dark:bg-slate-800 md:w-[min(1200px,calc(100vw-2rem))]">{content}</aside></>;
};
