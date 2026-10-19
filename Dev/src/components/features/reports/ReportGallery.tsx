import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, FileImage, Link2, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../common/ActionButton';
import { Avatar } from '../../common/Avatar';
import { StatusBadge } from '../../common/StatusBadge';
import { PicFilterDropdown } from '../../common/filters/PicFilterDropdown';
import { useRememberedState } from '../../../hooks/useRememberedState';
import { OUTPUT_UNITS, entryDone, safeReportUrl, type ReportEntry, type ReportOutput } from '../../../lib/executiveWeeklyReport';
import { taskLink } from '../../../lib/taskTracking';
import { saveTaskOutputs, uploadReportEvidence } from '../../../services/teamWeeklyReports';
import { ReportDialog } from './ReportDialog';
import type { ReportCopy } from './reportCopy';

const inputClass = 'w-full min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white';

function EntryStatus({ entry, c }: { entry: ReportEntry; c: ReportCopy }) {
  return entry.completedAfterPeriod
    ? <span className="status-badge status-info shrink-0 text-[10px]"><span className="status-dot" />{c.openAtCutoff}</span>
    : <StatusBadge status={entryDone(entry) ? 'done' : entry.status} className="shrink-0 text-[10px]" />;
}

export function ReportGallery({ entries, c, start, end, taskWorkspaces, editable, selectedMember, onSelectMember, onSaved }: {
  entries: ReportEntry[]; c: ReportCopy; start: string; end: string; taskWorkspaces: Map<string, string>;
  editable: boolean; selectedMember: string; onSelectMember: (id: string) => void; onSaved: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useRememberedState('reports.gallery.search', '');
  const [filter, setFilter] = useRememberedState<'all' | 'evidence' | 'missing'>('reports.gallery.filter', 'all');
  const [parent, setParent] = useState('all');
  const [picOpen, setPicOpen] = useState(false);
  const [limit, setLimit] = useState(12);
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const people = useMemo(() => [...new Map(entries.filter(entry => entry.memberId).map(entry => [entry.memberId, { id: entry.memberId, name: entry.memberName || c.unassigned, avatar_url: entry.avatar }])).values()], [entries, c]);
  const effectiveMember = selectedMember === 'unassigned' || people.some(person => person.id === selectedMember) ? selectedMember : 'all';
  const parents = useMemo(() => [...new Map(entries.map(entry => [entry.parentId, entry.parentName || c.standalone])).entries()], [entries, c]);
  const visible = useMemo(() => entries.filter(entry => {
    const search = query.trim().toLocaleLowerCase();
    return (effectiveMember === 'all' || (effectiveMember === 'unassigned' ? !entry.memberId : entry.memberId === effectiveMember))
      && (parent === 'all' || parent === entry.parentId)
      && (filter === 'all' || (filter === 'evidence' ? entry.outputs.some(output => output.url) : !entry.reported))
      && (!search || `${entry.title} ${entry.body} ${entry.parentName} ${entry.channel} ${entry.outputs.map(output => output.name).join(' ')}`.toLocaleLowerCase().includes(search));
  }), [entries, query, effectiveMember, parent, filter]);
  const selected = entries.find(entry => entry.id === selectedId);
  const clear = () => { setQuery(''); setFilter('all'); setParent('all'); onSelectMember('all'); setLimit(12); };
  const openTask = (entry: ReportEntry) => { setSelectedId(''); navigate(taskLink(entry.id)); };
  return <section id="weekly-report-gallery" className="card-hub min-w-0 rounded-2xl p-4 md:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-bold text-gray-900 dark:text-white">{c.gallery}</h2><p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">{c.galleryHint}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary dark:bg-blue-950/40 dark:text-blue-200">{visible.length}/{entries.length}</span></header>
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[150px] flex-1"><Search size={15} className="absolute left-3 top-3 text-gray-400" /><span className="sr-only">{c.search}</span><input value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} className={`${inputClass} !py-2 !pl-9 text-xs`} placeholder={c.search} /></label>
      <PicFilterDropdown value={effectiveMember} onChange={value => { onSelectMember(value); setLimit(12); }} people={people} showMe={false} isOpen={picOpen} onToggle={() => setPicOpen(!picOpen)} onClose={() => setPicOpen(false)} />
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{(['all', 'evidence', 'missing'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(12); }} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${filter === value ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-sky-200' : 'text-gray-500 dark:text-slate-400'}`}>{value === 'all' ? c.all : value === 'evidence' ? c.onlyEvidence : c.missingReport}</button>)}</div>
      {(query || filter !== 'all' || parent !== 'all' || effectiveMember !== 'all') && <ActionButton icon={<X size={15} />} onClick={clear} className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{c.clear}</ActionButton>}
    </div>
    {parents.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label={c.project}>{[['all', c.all], ...parents].map(([id, name]) => <button type="button" key={id} onClick={() => { setParent(id); setLimit(12); }} aria-pressed={parent === id} title={name} className={`max-w-[220px] shrink-0 truncate rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${parent === id ? 'border-blue-200 bg-blue-50 text-primary dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-sky-200' : 'border-gray-100 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{name}</button>)}</div>}
    {visible.length ? <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">{visible.slice(0, limit).map(entry => {
      const thumbnail = entry.outputs.find(output => output.kind === 'image' && safeReportUrl(output.url));
      return <article key={entry.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-blue-100/70 bg-white transition-colors hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600">
        <div className="relative flex h-40 items-center justify-center bg-slate-50 dark:bg-slate-950/60">
          <div className="flex flex-col items-center gap-2 text-slate-400"><FileImage size={30} strokeWidth={1.3} /><span className="text-[11px]">{c.noEvidence}</span></div>
          {thumbnail && <img src={thumbnail.url} alt={thumbnail.name || entry.title} loading="lazy" className="absolute inset-0 h-full w-full bg-slate-50 object-contain dark:bg-slate-950" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
          <span className="absolute right-2 top-2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-200">{entry.outputs.filter(output => output.url).length} {c.evidence.toLowerCase()}</span>
        </div>
        <div className="flex flex-1 flex-col p-4"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400" title={entry.parentName}>{entry.parentName || c.standalone}</p>
          <h3 className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white" title={entry.title}>{entry.title}</h3>
          <p className="mt-2 truncate text-xs text-gray-500 dark:text-slate-400" title={entry.body}>{entry.body || c.noResult}</p>
          <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5"><Avatar name={entry.memberName || '?'} src={entry.avatar || undefined} className="h-6 w-6 shrink-0 text-[10px]" /><span className="truncate text-[11px] text-gray-600 dark:text-slate-300">{entry.memberName || c.unassigned}</span></span><EntryStatus entry={entry} c={c} /></div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-slate-700"><span className={`truncate text-[10px] ${entry.reported ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{entry.reported ? c.reported : c.missingReport}</span><ActionButton icon={<ArrowUpRight size={14} />} onClick={() => { setSelectedId(entry.id); setEditing(false); }} className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-blue-50 dark:text-sky-300 dark:hover:bg-slate-800">{c.view}</ActionButton></div>
        </div>
      </article>;
    })}</div> : <p className="py-16 text-center text-sm text-gray-400">{entries.length ? c.noResults : c.noData}</p>}
    {visible.length > limit && <div className="mt-5 text-center"><ActionButton icon={<Plus size={16} />} onClick={() => setLimit(limit + 12)} className="inline-flex items-center gap-2 rounded-xl border border-blue-100 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-blue-50 dark:border-slate-700 dark:text-sky-300 dark:hover:bg-slate-800">{c.showMore} ({visible.length - limit})</ActionButton></div>}
    {selected && (editing ? <OutputEditor entry={selected} c={c} workspaceId={taskWorkspaces.get(selected.id) || ''} start={start} end={end} onClose={() => setEditing(false)} onSaved={async () => { await onSaved(); setEditing(false); }} />
      : <ReportDialog title={selected.title} closeLabel={c.close} onClose={() => setSelectedId('')} footer={<>
        {editable && <ActionButton icon={<Plus size={16} />} onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{c.editOutputs}</ActionButton>}
        <ActionButton icon={<ArrowUpRight size={16} />} onClick={() => openTask(selected)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#001f4d]">{c.openTask}</ActionButton>
      </>}>
        <div className="flex flex-wrap items-center gap-2"><EntryStatus entry={selected} c={c} /><span className="text-xs text-gray-500 dark:text-slate-400">{selected.memberName || c.unassigned}</span>{selected.dueDate && <span className="text-xs text-gray-500 dark:text-slate-400">{c.due}: {selected.dueDate.split('-').reverse().join('/')}</span>}</div>
        {selected.parentKind !== 'standalone' && <button type="button" onClick={() => { setSelectedId(''); navigate(`/projects?${selected.parentKind}=${encodeURIComponent(selected.parentId.split(':')[1])}`); }} className="flex max-w-full items-center gap-2 text-xs font-semibold text-primary dark:text-sky-300"><span className="truncate">{selected.parentName}</span><ArrowUpRight size={14} /></button>}
        {[[c.result, selected.body || c.noResult], [c.blocker, selected.blocker], [c.nextStep, selected.nextStep]].filter(([, value]) => value).map(([label, value]) => <section key={label}><h3 className="text-xs font-bold text-gray-900 dark:text-white">{label}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-slate-300">{value}</p></section>)}
        <section><h3 className="text-xs font-bold text-gray-900 dark:text-white">{c.outputs}</h3><div className="mt-3 space-y-3">{selected.outputs.length ? selected.outputs.map(output => <article key={output.id} className="rounded-xl border border-gray-100 p-3 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2"><b className="min-w-0 break-words text-xs text-gray-800 dark:text-slate-200">{output.name || c.evidence}</b>{output.quantity > 0 && <span className="shrink-0 text-xs font-semibold text-primary dark:text-sky-300">{output.quantity} {c[output.unit]}</span>}</div>
          {safeReportUrl(output.url) && <a href={safeReportUrl(output.url)} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-medium text-primary dark:text-sky-300">{output.kind === 'image' ? <img src={safeReportUrl(output.url)} alt={output.name || selected.title} loading="lazy" className="max-h-80 w-full rounded-lg bg-slate-50 object-contain dark:bg-slate-950" /> : <span className="flex items-center gap-1.5"><Link2 size={14} />{c.openEvidence}</span>}</a>}
        </article>) : <p className="text-xs text-gray-400">{c.noEvidence}</p>}</div></section>
      </ReportDialog>)}
  </section>;
}

function OutputEditor({ entry, c, workspaceId, start, end, onClose, onSaved }: {
  entry: ReportEntry; c: ReportCopy; workspaceId: string; start: string; end: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [channel, setChannel] = useState(entry.channel);
  const [outputs, setOutputs] = useState<ReportOutput[]>(() => entry.outputs.filter(output => output.quantity > 0));
  const [busy, setBusy] = useState(false), lock = useRef(false), uploadRef = useRef<HTMLInputElement>(null);
  const update = (id: string, values: Partial<ReportOutput>) => setOutputs(previous => previous.map(output => output.id === id ? { ...output, ...values } : output));
  const save = async () => {
    if (lock.current) return;
    if (outputs.some(output => !output.name.trim() || !Number.isInteger(output.quantity) || output.quantity < 1 || (output.url && !safeReportUrl(output.url)))) return toast.error(c.outputValidation);
    lock.current = true; setBusy(true);
    try { await saveTaskOutputs(entry.id, workspaceId, start, end, channel, outputs); await onSaved(); toast.success(c.outputSaved); }
    catch (error) { toast.error(error instanceof Error ? error.message : c.outputValidation); }
    finally { lock.current = false; setBusy(false); }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, 50 - outputs.length))) {
        const uploaded = await uploadReportEvidence(file);
        setOutputs(previous => [...previous, { id: crypto.randomUUID(), ...uploaded, unit: uploaded.kind === 'image' ? 'image' : 'file', quantity: 1 }]);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : c.outputValidation); }
    finally { lock.current = false; setBusy(false); if (uploadRef.current) uploadRef.current.value = ''; }
  };
  return <ReportDialog title={`${c.editOutputs} · ${entry.title}`} closeLabel={c.close} onClose={onClose} busy={busy} footer={<ActionButton icon={<Save size={16} />} disabled={busy || !workspaceId} onClick={() => void save()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#001f4d] disabled:opacity-50">{busy ? c.saving : c.saveOutputs}</ActionButton>}>
    <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">{c.outputsHint}</p>
    <label className="block space-y-2 text-xs font-semibold text-gray-700 dark:text-slate-300">{c.channel}<input maxLength={80} value={channel} disabled={busy} onChange={event => setChannel(event.target.value)} className={inputClass} placeholder="KSHOP, ECOM, Social…" /></label>
    <div className="flex flex-wrap gap-2"><ActionButton icon={<Plus size={15} />} disabled={busy || outputs.length >= 50} onClick={() => setOutputs([...outputs, { id: crypto.randomUUID(), name: '', url: '', quantity: 1, unit: 'file', kind: 'link' }])} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50">{c.addOutput}</ActionButton>
      <ActionButton icon={<Upload size={15} />} disabled={busy || outputs.length >= 50} onClick={() => uploadRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50">{c.upload}</ActionButton><input ref={uploadRef} type="file" multiple className="hidden" onChange={event => void upload(event.target.files)} /></div>
    {outputs.map((output, index) => <fieldset key={output.id} disabled={busy} className="space-y-3 rounded-2xl border border-blue-100 p-4 dark:border-slate-700"><legend className="px-1 text-xs font-bold text-gray-500">{c.outputs} {index + 1}</legend>
      <div className="flex items-start gap-2"><label className="min-w-0 flex-1 space-y-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{c.name}<input value={output.name} maxLength={200} onChange={event => update(output.id, { name: event.target.value })} className={inputClass} /></label><button type="button" aria-label={`${c.remove} ${index + 1}`} onClick={() => setOutputs(outputs.filter(item => item.id !== output.id))} className="mt-5 rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={16} /></button></div>
      <label className="block space-y-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{c.url}<input type="url" value={output.url} onChange={event => update(output.id, { url: event.target.value })} placeholder="https://…" className={inputClass} /></label>
      <div className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] gap-3"><label className="space-y-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{c.quantity}<input type="number" min={1} max={100000} step={1} value={Number.isNaN(output.quantity) ? '' : output.quantity} onChange={event => update(output.id, { quantity: event.target.valueAsNumber })} className={inputClass} /></label><fieldset><legend className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{c.unit}</legend><div className="flex flex-wrap gap-1">{OUTPUT_UNITS.map(unit => <label key={unit} className={`cursor-pointer rounded-lg border px-2 py-2 text-[11px] transition-colors ${output.unit === unit ? 'border-blue-200 bg-blue-50 text-primary dark:border-blue-400/40 dark:bg-blue-950/30 dark:text-sky-200' : 'border-gray-100 text-gray-500 dark:border-slate-700 dark:text-slate-400'}`}><input type="radio" className="sr-only" name={`unit-${output.id}`} checked={output.unit === unit} onChange={() => update(output.id, { unit })} />{c[unit]}</label>)}</div></fieldset></div>
      {output.url && <fieldset><legend className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{c.kind}</legend><div className="flex gap-3">{(['image', 'file', 'link'] as const).map(kind => <label key={kind} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300"><input type="radio" name={`kind-${output.id}`} checked={output.kind === kind} onChange={() => update(output.id, { kind })} />{c[kind]}</label>)}</div></fieldset>}
    </fieldset>)}
    {busy && <p role="status" className="text-xs text-primary dark:text-sky-300">{c.saving}</p>}
  </ReportDialog>;
}
