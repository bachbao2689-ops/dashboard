import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, CheckCircle2, Download, FilePenLine, History, RefreshCw, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../common/ActionButton';
import { DepartmentFilterDropdown } from '../../common/filters/DepartmentFilterDropdown';
import { DateFilterDropdown } from '../../common/filters/DateFilterDropdown';
import { useExecutiveWeeklyReport } from '../../../hooks/useExecutiveWeeklyReport';
import { useRememberedState } from '../../../hooks/useRememberedState';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { weeklyReportRange, type WeekSelection } from '../../../lib/weeklyReport';
import { EMPTY_REPORT_NOTES, OUTPUT_UNITS, type ReportNotes, type ReportSnapshot } from '../../../lib/executiveWeeklyReport';
import { taskDay, taskLink } from '../../../lib/taskTracking';
import { saveTeamReport } from '../../../services/teamWeeklyReports';
import { printWeeklyReport } from '../../../services/printWeeklyReport';
import { ReportOverview } from './ReportOverview';
import { ReportGallery } from './ReportGallery';
import { ReportDialog } from './ReportDialog';
import { reportCopy, type ReportCopy } from './reportCopy';

const secondary = 'flex h-9 shrink-0 items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-xs font-semibold text-primary transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 disabled:opacity-40';
const primary = 'flex h-9 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-[#001f4d] disabled:opacity-40';
const dateLabel = (value: string) => value.split('-').reverse().join('/');
const timestamp = () => new Date().toISOString();

export function WeeklyReportWorkspace() {
  const { lang } = useTranslation(), c = reportCopy[lang];
  const profile = useAuthStore(state => state.profile);
  const [week, setWeek] = useRememberedState<WeekSelection>('reports.teamWeek', 'previous');
  const [department, setDepartment] = useRememberedState('reports.department', 'all');
  const [filterOpen, setFilterOpen] = useState<'department' | 'date' | null>(null);
  const { start, end } = useMemo(() => weeklyReportRange(week), [week]);
  const data = useExecutiveWeeklyReport(start, end, department);
  const ckey = `${profile?.id}:${data.effectiveDepartmentFilter}:${start}:${end}`;
  const applyDates = (a: string, b: string) => {
    if (!a || !b || a > b || (Date.parse(b) - Date.parse(a)) / 86400000 > 366) return;
    setWeek(`${a}|${b}`); setFilterOpen(null);
  };
  return <div className="min-w-0 space-y-5 p-4 md:p-6">
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70 dark:text-sky-300/80">K COFFEE · TEAM REPORT</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{c.title}</h1><p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-slate-400">{c.subtitle}</p></div>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{(['previous', 'current'] as const).map(value => <button type="button" key={value} aria-pressed={week === value} onClick={() => setWeek(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${week === value ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-sky-200' : 'text-gray-500 dark:text-slate-400'}`}>{value === 'current' ? c.current : c.previous}</button>)}</div>
        <DateFilterDropdown calendarFilter="custom" customStartDate={start} customEndDate={end} onApplyCustomRange={applyDates} onSelectPreset={() => {}} onClear={() => setWeek('previous')} isOpen={filterOpen === 'date'} onToggle={() => setFilterOpen(filterOpen === 'date' ? null : 'date')} onClose={() => setFilterOpen(null)} />
        {data.canViewAllDepartments && <DepartmentFilterDropdown value={data.effectiveDepartmentFilter === 'all' ? '' : data.effectiveDepartmentFilter} onChange={value => setDepartment(value || 'all')} departments={data.departments} isOpen={filterOpen === 'department'} onToggle={() => setFilterOpen(filterOpen === 'department' ? null : 'department')} onClose={() => setFilterOpen(null)} />}
        <ActionButton icon={<RefreshCw size={15} />} label={c.retry} onClick={() => void data.refetch()} disabled={data.loading} className={secondary}>{c.retry}</ActionButton>
      </div>
    </header>
    {data.error ? <section role="alert" className="card-hub rounded-2xl p-6 text-sm text-rose-600 dark:text-rose-300"><p>{data.error}</p><button type="button" onClick={() => void data.refetch()} className="mt-3 underline">{c.retry}</button></section>
      : data.loading ? <div aria-label={c.reconnecting} role="status" className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div><div className="h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /></div>
      : <ReportContent key={ckey} data={data} c={c} lang={lang} start={start} end={end} />}
  </div>;
}

function validSnapshot(value: ReportSnapshot | undefined, start: string, end: string, department: string): value is ReportSnapshot {
  return Boolean(value && value.schema === 1 && value.weekStart === start && value.weekEnd === end && value.departmentId === department
    && value.notes && ['summary', 'decisions', 'nextWeek'].every(key => typeof value.notes[key as keyof ReportNotes] === 'string')
    && Array.isArray(value.entries) && value.entries.every(entry => entry && ['id', 'title', 'status', 'memberId', 'memberName', 'parentId', 'parentName', 'dueDate', 'body', 'blocker', 'nextStep', 'channel'].every(key => typeof entry[key as keyof typeof entry] === 'string')
      && Array.isArray(entry.outputs) && entry.outputs.every(output => output && typeof output.name === 'string' && typeof output.url === 'string' && OUTPUT_UNITS.includes(output.unit)
        && typeof output.quantity === 'number' && Number.isFinite(output.quantity) && output.quantity >= 0)));
}

function normalizeNotes(value: ReportNotes | undefined): ReportNotes {
  return Object.fromEntries(Object.keys(EMPTY_REPORT_NOTES).map(key => [key, typeof value?.[key as keyof ReportNotes] === 'string' ? value[key as keyof ReportNotes].slice(0, 5000) : ''])) as ReportNotes;
}

function ReportContent({ data, c, lang, start, end }: { data: ReturnType<typeof useExecutiveWeeklyReport>; c: ReportCopy; lang: 'vi' | 'en'; start: string; end: string }) {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [selectedMember, setSelectedMember] = useRememberedState('reports.gallery.member', 'all');
  const [compose, setCompose] = useState(false), [history, setHistory] = useState(false);
  const [today, setToday] = useState(() => taskDay(timestamp()));
  useEffect(() => { const timer = setInterval(() => setToday(taskDay(timestamp())), 60000); return () => clearInterval(timer); }, []);
  const departmentId = data.effectiveDepartmentFilter;
  const departmentName = data.departments.find(item => item.id === departmentId)?.name || (departmentId === 'all' ? c.allDepartments : profile?.department_name || c.department);
  const historyRows = data.records.filter(row => row.action === 'team_weekly_report_published' && validSnapshot(row.metadata.snapshot, start, end, departmentId));
  const selectedRecord = historyRows.find(row => row.id === selectedSnapshot);
  const snapshot = selectedRecord?.metadata.snapshot;
  const ownLatest = data.records.find(row => row.user_id === profile?.id);
  const notes = normalizeNotes(snapshot?.notes || ownLatest?.metadata.notes || data.records[0]?.metadata.notes);
  const entries = snapshot?.entries || data.entries;
  const cutoff = [snapshot ? taskDay(snapshot.capturedAt) : today, end].sort()[0];
  const liveSnapshot = (overrides = notes): ReportSnapshot => ({
    schema: 1, weekStart: start, weekEnd: end, departmentId, departmentName,
    authorName: profile?.name || '', capturedAt: timestamp(), notes: overrides, entries: data.entries,
  });
  const exportPdf = () => { try { printWeeklyReport(snapshot || liveSnapshot(), lang, Boolean(snapshot)); } catch (error) { toast.error(error instanceof Error ? error.message : c.printUnavailable); } };
  return <>
    <section className="card-hub flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-2xl p-4 md:px-5">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-bold text-gray-900 dark:text-white" title={departmentName}>{departmentName}</h2><span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${snapshot ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${snapshot ? 'bg-indigo-400' : data.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />{snapshot ? c.snapshot : data.connected ? c.connected : c.reconnecting}</span></div><p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400"><CalendarDays size={13} />{dateLabel(start)} – {dateLabel(end)}</p></div>
      <div className="flex max-w-full items-center gap-1 sm:flex-wrap sm:gap-2">
        {historyRows.length > 0 && <div className="flex shrink-0 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{[false, true].map(published => <ActionButton icon={published ? <CheckCircle2 size={14} /> : <Activity size={14} />} label={published ? c.published : c.live} type="button" key={String(published)} onClick={() => setSelectedSnapshot(published ? historyRows[0].id : '')} aria-pressed={published === Boolean(snapshot)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${published === Boolean(snapshot) ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-sky-200' : 'text-gray-500 dark:text-slate-400'}`}>{published ? c.published : c.live}</ActionButton>)}</div>}
        <ActionButton icon={<History size={15} />} onClick={() => setHistory(true)} className={secondary}>{c.history}</ActionButton>
        <ActionButton icon={<Download size={15} />} label={c.print} onClick={exportPdf} disabled={!entries.length} title={c.printHint} className={secondary}>{c.print}</ActionButton>
        {!snapshot && departmentId !== 'all' && <ActionButton icon={<FilePenLine size={15} />} disabled={!data.workspaceId} onClick={() => setCompose(true)} className={primary}>{c.compose}</ActionButton>}
      </div>
      <p className="w-full text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">{snapshot ? `${c.snapshotHint} ${selectedRecord ? new Date(selectedRecord.created_at).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB') : ''} · ${snapshot.authorName}` : departmentId === 'all' ? c.selectDepartment : c.draftHint}</p>
    </section>
    <ReportOverview entries={entries} notes={notes} cutoff={cutoff} c={c} unknownCompletions={snapshot ? 0 : data.unknownCompletions} onOpenTask={id => navigate(taskLink(id))} onSelectMember={id => { setSelectedMember(id); document.getElementById('weekly-report-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
    <ReportGallery key={selectedSnapshot || 'live'} entries={entries} c={c} start={start} end={end} editable={!snapshot} taskWorkspaces={data.taskWorkspaces} selectedMember={selectedMember} onSelectMember={setSelectedMember} onSaved={data.reload} />
    {compose && <ReportComposer c={c} initial={notes} makeSnapshot={liveSnapshot} workspaceId={data.workspaceId} onClose={() => setCompose(false)} onSaved={async published => { await data.reload(); setCompose(false); if (published) setSelectedSnapshot(published); }} />}
    {history && <ReportDialog title={c.history} closeLabel={c.close} onClose={() => setHistory(false)}>{historyRows.length ? historyRows.map((row, index) => <button type="button" key={row.id} onClick={() => { setSelectedSnapshot(row.id); setHistory(false); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-blue-100 p-4 text-left transition-colors hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800"><span className="min-w-0"><b className="block truncate text-sm text-gray-900 dark:text-white">{c.revision} {historyRows.length - index} · {row.metadata.snapshot?.authorName}</b><span className="mt-1 block text-xs text-gray-500 dark:text-slate-400">{new Date(row.created_at).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB')}</span></span><ArrowUpRight size={16} className="shrink-0 text-primary dark:text-sky-300" /></button>) : <p className="py-10 text-center text-sm text-gray-400">{c.noHistory}</p>}</ReportDialog>}
  </>;
}

function ReportComposer({ c, initial, makeSnapshot, workspaceId, onClose, onSaved }: {
  c: ReportCopy; initial: ReportNotes; makeSnapshot: (notes: ReportNotes) => ReportSnapshot; workspaceId: string;
  onClose: () => void; onSaved: (publishedId: string | null) => Promise<void>;
}) {
  const [notes, setNotes] = useState<ReportNotes>({ ...EMPTY_REPORT_NOTES, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (publish: boolean) => {
    if (busy) return; setBusy(true); setError('');
    try { const id = await saveTeamReport(workspaceId, makeSnapshot(notes), publish); await onSaved(publish ? id : null); toast.success(publish ? c.sent : c.saved); }
    catch (failure) { setError(failure instanceof Error ? failure.message : c.outputValidation); }
    finally { setBusy(false); }
  };
  return <ReportDialog title={c.compose} closeLabel={c.close} onClose={onClose} busy={busy} footer={<>
    <ActionButton icon={<Save size={15} />} disabled={busy} onClick={() => void save(false)} className={secondary}>{busy ? c.saving : c.save}</ActionButton>
    <ActionButton icon={<Send size={15} />} disabled={busy || !notes.summary.trim()} onClick={() => void save(true)} className={primary}>{c.publish}</ActionButton>
  </>}>
    <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-primary dark:bg-blue-950/30 dark:text-sky-200">{c.publishHint}</p>
    {(['summary', 'decisions', 'nextWeek'] as const).map(key => <label key={key} className="block space-y-2 text-sm font-semibold text-gray-800 dark:text-slate-200">{c[key]}{key === 'summary' && <span className="ml-1 text-rose-500">*</span>}<textarea value={notes[key]} maxLength={5000} disabled={busy} onChange={event => setNotes({ ...notes, [key]: event.target.value })} placeholder={c[`${key}Hint`]} rows={key === 'summary' ? 5 : 4} className="w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm font-normal text-gray-900 outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>)}
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
  </ReportDialog>;
}
