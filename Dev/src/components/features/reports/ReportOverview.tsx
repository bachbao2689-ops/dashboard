import { useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock3, Image, Layers3, PauseCircle } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { ActionButton } from '../../common/ActionButton';
import { entryDone, reportBreakdown, reportMetrics, type ReportEntry, type ReportNotes } from '../../../lib/executiveWeeklyReport';
import type { ReportCopy } from './reportCopy';

export function ReportOverview({ entries, notes, cutoff, c, unknownCompletions, onOpenTask, onSelectMember }: {
  entries: ReportEntry[]; notes: ReportNotes; cutoff: string; c: ReportCopy; unknownCompletions: number;
  onOpenTask: (id: string) => void; onSelectMember: (id: string) => void;
}) {
  const [dimension, setDimension] = useState<'channel' | 'parent'>('channel');
  const [showAllPeople, setShowAllPeople] = useState(false);
  const metrics = reportMetrics(entries, cutoff);
  const channels = reportBreakdown(entries, dimension, dimension === 'channel' ? c.noChannel : c.standalone);
  const people = reportBreakdown(entries, 'member', c.unassigned);
  const attention = entries.filter(entry => entry.blocker || (!entryDone(entry) && entry.dueDate && entry.dueDate < cutoff));
  const kpis = [
    { label: c.total, value: metrics.total, icon: Layers3, color: 'text-primary dark:text-blue-300', hint: `${metrics.reported}/${metrics.total} ${c.reported.toLowerCase()}` },
    { label: c.done, value: metrics.done, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', hint: `${metrics.completion}% ${c.completion.toLowerCase()}` },
    { label: c.doing, value: metrics.doing, icon: Clock3, color: 'text-sky-600 dark:text-sky-400', hint: `${metrics.overdue} ${c.overdue.toLowerCase()}` },
    { label: c.pending, value: metrics.pending, icon: PauseCircle, color: 'text-amber-600 dark:text-amber-400', hint: `${metrics.evidence} ${c.evidence.toLowerCase()}` },
  ];
  const row = (group: typeof channels[number], maximum: number, member = false) => <div key={group.id} className="group grid min-w-0 grid-cols-[minmax(80px,0.8fr)_minmax(80px,1.4fr)_28px] items-center gap-3 py-2">
    {member ? <button type="button" onClick={() => onSelectMember(group.id || 'unassigned')} className="flex min-w-0 items-center gap-2 text-left text-xs font-medium text-gray-700 transition-colors hover:text-primary dark:text-slate-200"><Avatar name={group.name} src={group.avatar || undefined} className="h-6 w-6 shrink-0 text-[10px]" /><span className="truncate" title={group.name}>{group.name}</span></button>
      : <span className="truncate text-xs font-medium text-gray-700 dark:text-slate-200" title={group.name}>{group.name}</span>}
    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label={`${group.name}: ${group.done} ${c.done}, ${group.doing} ${c.doing}, ${group.pending} ${c.pending}`}>
      <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${group.total / maximum * 100}%` }}>
        <span className="bg-emerald-500" style={{ width: `${group.done / group.total * 100}%` }} /><span className="bg-sky-400" style={{ width: `${group.doing / group.total * 100}%` }} /><span className="bg-amber-400" style={{ width: `${group.pending / group.total * 100}%` }} />
      </div>
    </div><span className="text-right text-xs font-bold tabular-nums text-gray-900 dark:text-white">{group.total}</span>
  </div>;
  return <div className="space-y-5">
    <section aria-label={c.overview} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {kpis.map(({ label, value, icon: Icon, color, hint }) => <article key={label} className="card-hub min-w-0 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-medium text-gray-500 dark:text-slate-400" title={label}>{label}</p><Icon size={17} className={`shrink-0 ${color}`} /></div>
        <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${color}`}>{value}</p>
        <p className="mt-2 truncate text-[11px] text-gray-500 dark:text-slate-400" title={hint}>{hint}</p>
      </article>)}
    </section>
    {unknownCompletions > 0 && <p className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><AlertCircle size={16} className="shrink-0" />{unknownCompletions} {c.missingDates}</p>}
    <section className="card-hub grid min-w-0 gap-5 rounded-2xl p-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="min-w-0"><h3 className="text-sm font-bold text-gray-900 dark:text-white">{c.summary}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600 dark:text-slate-300">{notes.summary || c.noSummary}</p></div>
      <div className="min-w-0 border-t border-blue-100/70 pt-4 dark:border-slate-700 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><h3 className="text-sm font-bold text-gray-900 dark:text-white">{c.outputs}</h3>
        <div className="mt-3 flex flex-wrap gap-2">{Object.entries(metrics.outputTotals).filter(([, count]) => count > 0).map(([unit, count]) => <span key={unit} className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-primary dark:bg-sky-950/40 dark:text-sky-200">{count.toLocaleString()} <span className="text-xs font-normal">{c[unit as 'image']}</span></span>)}</div>
        {!Object.values(metrics.outputTotals).some(Boolean) && <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{c.missingEvidence}</p>}
        <p className="mt-3 text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">{c.outputsHint}</p>
      </div>
    </section>
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <section className="card-hub min-w-0 rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-gray-900 dark:text-white">{dimension === 'channel' ? c.byChannel : c.byProject}</h3><div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{(['channel', 'parent'] as const).map(key => <button type="button" key={key} aria-pressed={dimension === key} onClick={() => setDimension(key)} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${dimension === key ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-sky-200' : 'text-gray-500 dark:text-slate-400'}`}>{key === 'channel' ? c.channel : c.project}</button>)}</div></div>
        <div className="max-h-80 overflow-y-auto">{channels.length ? channels.map(group => row(group, Math.max(...channels.map(item => item.total)))) : <p className="py-8 text-center text-xs text-gray-400">{c.noData}</p>}</div>
      </section>
      <section className="card-hub min-w-0 rounded-2xl p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-gray-900 dark:text-white">{c.byMember}</h3><span className="text-xs text-gray-400">{people.length} PIC</span></div>
        <div>{(showAllPeople ? people : people.slice(0, 7)).map(group => row(group, Math.max(...people.map(item => item.total)), true))}</div>
        {!people.length && <p className="py-8 text-center text-xs text-gray-400">{c.noData}</p>}
        {people.length > 7 && <button type="button" className="mt-2 text-xs font-semibold text-primary dark:text-sky-300" onClick={() => setShowAllPeople(!showAllPeople)}>{showAllPeople ? '−' : c.showAll} ({people.length})</button>}
      </section>
    </div>
    <div className="flex flex-wrap justify-end gap-4 text-[11px] text-gray-500 dark:text-slate-400">{[[c.done, 'bg-emerald-500'], [c.doing, 'bg-sky-400'], [c.pending, 'bg-amber-400']].map(([name, color]) => <span key={name} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{name}</span>)}</div>
    <section className="card-hub grid min-w-0 gap-5 rounded-2xl p-5 lg:grid-cols-2">
      <div className="min-w-0"><h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><AlertCircle size={17} className="text-amber-500" />{c.decisions}</h3>
        {notes.decisions && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-slate-300">{notes.decisions}</p>}
        {!notes.decisions && !attention.length && <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">{c.noIssues}</p>}
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{attention.map(entry => <button key={entry.id} type="button" onClick={() => onOpenTask(entry.id)} className="flex w-full min-w-0 items-center gap-2 rounded-xl bg-amber-50/70 px-3 py-2 text-left transition-colors hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"><span className="min-w-0 flex-1"><b className="block truncate text-xs text-gray-800 dark:text-slate-200">{entry.title}</b><span className="mt-1 block truncate text-[11px] text-amber-700 dark:text-amber-300">{entry.blocker || `${c.overdue} · ${entry.dueDate}`}</span></span><ArrowUpRight size={14} className="shrink-0 text-amber-600" /></button>)}</div>
      </div>
      <div className="min-w-0 border-t border-blue-100/70 pt-4 dark:border-slate-700 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><h3 className="text-sm font-bold text-gray-900 dark:text-white">{c.nextWeek}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-slate-300">{notes.nextWeek || c.noPlan}</p>
        {!notes.nextWeek && entries.some(entry => entry.nextStep) && <div className="mt-3 space-y-2">{entries.filter(entry => entry.nextStep).slice(0, 4).map(entry => <ActionButton key={entry.id} icon={<Image size={14} />} onClick={() => onOpenTask(entry.id)} className="flex max-w-full items-center gap-2 text-xs font-medium text-primary dark:text-sky-300"><span className="truncate" title={entry.nextStep}>{entry.nextStep}</span></ActionButton>)}</div>}
      </div>
    </section>
  </div>;
}
