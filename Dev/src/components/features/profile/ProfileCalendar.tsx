import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Bell, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FileText, FolderKanban, Megaphone, RefreshCw, Search } from 'lucide-react';
import type { CalendarItem } from '../../../lib/profileCalendar';
import { calendarKindLabel, formatCalendarDay, isCalendarDone, isCalendarOverdue, localDay, monthDays, occursOnCalendar } from '../../../lib/profileCalendar';
import type { CalendarNotification } from '../../../hooks/useProfileCalendar';
import { NotificationLog } from './NotificationLog';
import './ProfileCalendar.css';

interface Props {
  items: CalendarItem[];
  notifications: CalendarNotification[];
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
  onRefresh: () => void;
  onOpen: (item: CalendarItem) => void;
  onReport: () => void;
  reportOpen: boolean;
  includeTeamNotifications: boolean;
}

const filters = [{ id: 'all', label: 'Tất cả' }, { id: 'task', label: 'Tasks' }, { id: 'project', label: 'Projects' }, { id: 'campaign', label: 'Campaigns' }] as const;
const ranges = [{ id: 'today', label: 'Hôm nay' }, { id: 'three', label: '3 ngày' }, { id: 'week', label: '1 tuần' }, { id: 'month', label: '1 tháng' }] as const;
type CalendarRange = (typeof ranges)[number]['id'];
const iconFor = (item: CalendarItem) => item.kind === 'project' ? FolderKanban : item.kind === 'campaign' ? Megaphone : FileText;
const category = (item: CalendarItem) => item.kind.includes('subtask') ? 'task' : item.kind;
const eventColor = (item: CalendarItem, today: string) => isCalendarDone(item.status)
  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
  : isCalendarOverdue(item, today)
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
    : item.kind === 'campaign' || item.kind === 'campaign_subtask'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
      : item.kind === 'project' || item.kind === 'project_subtask'
        ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300'
        : 'border-blue-200 bg-blue-50 text-primary dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300';

export function ProfileCalendar({ items, notifications, loading, error, updatedAt, onRefresh, onOpen, onReport, reportOpen, includeTeamNotifications }: Props) {
  const [today, setToday] = useState(() => localDay(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setToday(localDay(new Date())), 60000);
    return () => clearInterval(timer);
  }, []);
  const [cursor, setCursor] = useState(() => new Date());
  const [range, setRange] = useState<CalendarRange>('today');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [status, setStatus] = useState('all');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<{ item: CalendarItem; left: number; top: number } | null>(null);
  const rangeMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rangeOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!rangeMenuRef.current?.contains(event.target as Node)) setRangeOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setRangeOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [rangeOpen]);

  const filtered = useMemo(() => items.filter(item => {
    const text = `${item.title} ${item.parentName || ''} ${item.record.task_ref || ''}`.toLocaleLowerCase('vi');
    return (filter === 'all' || category(item) === filter)
      && text.includes(query.trim().toLocaleLowerCase('vi'))
      && (status === 'all' || (status === 'open' ? !isCalendarDone(item.status) : status === 'done' ? isCalendarDone(item.status) : isCalendarOverdue(item, today)));
  }), [items, filter, query, status, today]);
  const days = useMemo(() => {
    if (range === 'month') return monthDays(cursor.getFullYear(), cursor.getMonth());
    const offset = range === 'week' ? (cursor.getDay() + 6) % 7 : 0;
    const length = range === 'today' ? 1 : range === 'three' ? 3 : 7;
    return Array.from({ length }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - offset + index, 12));
  }, [cursor, range]);
  const visibleStart = range === 'month' ? localDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1)) : localDay(days[0]);
  const visibleEnd = range === 'month' ? localDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) : localDay(days[days.length - 1]);
  const inPeriod = filtered.filter(item => (item.start && item.end && item.start <= visibleEnd && item.end >= visibleStart) || (today >= visibleStart && today <= visibleEnd && occursOnCalendar(item, today, today)));
  const unread = notifications.filter(notification => !notification.is_read);
  const unreadKeys = new Set(unread.map(notification => `${notification.entity_type}:${notification.entity_id}`));
  const ordered = (rows: CalendarItem[], day = today) => [...rows].sort((a, b) => Number(isCalendarDone(a.status)) - Number(isCalendarDone(b.status)) || Number(b.due === day) - Number(a.due === day) || (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title, 'vi'));

  const move = (direction: number) => {
    const step = range === 'today' ? 1 : range === 'three' ? 3 : 7;
    const next = range === 'month'
      ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1, 12)
      : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + direction * step, 12);
    setCursor(next); setExpandedDays(new Set()); setHovered(null);
  };
  const selectRange = (next: CalendarRange) => { setRange(next); setCursor(new Date()); setRangeOpen(false); setExpandedDays(new Set()); setHovered(null); };
  const selectedRangeLabel = range === 'today' && localDay(cursor) !== today ? formatCalendarDay(localDay(cursor)) : ranges.find(option => option.id === range)?.label;
  const periodTitle = range === 'month' ? `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}` : range === 'week' ? `Tuần ${formatCalendarDay(visibleStart)} – ${formatCalendarDay(visibleEnd)}` : range === 'three' ? `3 ngày từ ${formatCalendarDay(visibleStart)}` : localDay(cursor) === today ? 'Hôm nay' : formatCalendarDay(localDay(cursor));
  const showHover = (item: CalendarItem, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setHovered({ item, left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)), top: rect.bottom + 180 > window.innerHeight ? Math.max(12, rect.top - 172) : rect.bottom + 8 });
  };
  useEffect(() => {
    if (!hovered) return;
    const hide = () => setHovered(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [hovered]);

  const gridColumns = range === 'month' || range === 'week' ? 'grid-cols-7' : range === 'three' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1';
  const weekdayLabels = range === 'month' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : days.map(date => date.toLocaleDateString('vi-VN', { weekday: 'short' }));
  const ownerLabel = (item: CalendarItem) => {
    const members = item.record.memberNames as string[] | undefined;
    return members?.length ? members.join(', ') : item.owner || 'Chưa phân công';
  };

  return <section className="profile-calendar card-hub overflow-hidden rounded-xl shadow-sm" aria-label="Lịch công việc cá nhân" aria-busy={loading}>
    <div className="space-y-4 border-b border-gray-100 p-4 dark:border-slate-700 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"><CalendarDays size={21} className="text-primary" />Calendar của tôi</h2><p className="mt-1 text-xs text-gray-500">Task, Project và Campaign bạn tham gia — cập nhật cùng lịch làm việc.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowNotifications(value => !value)} aria-expanded={showNotifications} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-primary hover:bg-primary/5 dark:border-slate-700 dark:text-blue-300"><Bell size={15} />Thông báo{unread.length > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] text-white">{unread.length}</span>}</button>
          <button type="button" onClick={onReport} aria-expanded={reportOpen} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90"><FileText size={15} />{reportOpen ? 'Đóng report' : 'Report của tôi'}</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-900/60" aria-label="Loại công việc">{filters.map(option => <button type="button" key={option.id} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${filter === option.id ? 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white' : 'text-gray-500 hover:text-primary dark:text-gray-400'}`}>{option.label}</button>)}</div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-gray-400" /><input aria-label="Tìm công việc trong lịch" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm công việc..." className="h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-primary dark:border-slate-700" /></label>
          <select aria-label="Lọc trạng thái" value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"><option value="all">Mọi trạng thái</option><option value="open">Chưa hoàn thành</option><option value="done">Đã hoàn thành</option><option value="overdue">Quá hạn</option></select>
        </div>
      </div>
    </div>

    {error && <div role="alert" className="flex items-center justify-between gap-3 bg-red-50 px-5 py-3 text-xs text-red-700 dark:bg-red-950/30"><span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span><button type="button" onClick={onRefresh} className="shrink-0 font-semibold underline">Thử lại</button></div>}
    {showNotifications && <div className="border-b border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-900/30"><NotificationLog includeTeam={includeTeamNotifications} inline onClose={() => setShowNotifications(false)} /></div>}

    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-content-center rounded-xl border border-blue-100 bg-blue-50/60 text-center dark:border-slate-700 dark:bg-slate-900"><span className="text-[9px] font-semibold uppercase text-gray-500">Tháng {cursor.getMonth() + 1}</span><b className="text-lg leading-5 text-primary dark:text-blue-300">{cursor.getDate()}</b></div><div><p className="text-base font-bold text-gray-900 dark:text-white">{periodTitle}</p><p className="mt-0.5 text-xs text-gray-500">{formatCalendarDay(visibleStart)} – {formatCalendarDay(visibleEnd)} · {inPeriod.length} công việc</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700"><button type="button" aria-label="Khoảng trước" onClick={() => move(-1)} className="p-2.5 hover:bg-primary/5"><ChevronLeft size={17} /></button><div ref={rangeMenuRef} className="relative border-x border-gray-200 dark:border-slate-700"><button type="button" onClick={() => setRangeOpen(value => !value)} aria-expanded={rangeOpen} className="flex h-full min-w-[104px] items-center justify-center gap-1.5 px-3 text-xs font-semibold hover:bg-primary/5">{selectedRangeLabel}<ChevronDown size={14} className={`transition-transform ${rangeOpen ? 'rotate-180' : ''}`} /></button>{rangeOpen && <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-36 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">{ranges.map(option => <button key={option.id} type="button" onClick={() => selectRange(option.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${range === option.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary/5 dark:text-gray-300'}`}>{option.label}</button>)}</div>}</div><button type="button" aria-label="Khoảng sau" onClick={() => move(1)} className="p-2.5 hover:bg-primary/5"><ChevronRight size={17} /></button></div><button type="button" aria-label="Đồng bộ lịch" title="Đồng bộ lịch" disabled={loading} onClick={onRefresh} className="rounded-xl p-2.5 text-gray-400 hover:bg-primary/5 hover:text-primary"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
    </div>

    {loading && !updatedAt ? <div role="status" className="grid min-h-72 place-items-center text-sm text-gray-400">Đang tải lịch công việc…</div> : <>
      <div className={`grid ${gridColumns} border-y border-gray-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40`}>{weekdayLabels.map((day, index) => <div key={`${day}-${index}`} className="py-2 text-center text-xs font-semibold capitalize text-gray-500">{day}</div>)}</div>
      <div className={`calendar-days grid ${gridColumns}`}>{days.map(date => {
        const day = localDay(date);
        const rows = ordered(filtered.filter(item => occursOnCalendar(item, day, today)), day);
        const muted = range === 'month' && date.getMonth() !== cursor.getMonth();
        const visibleRows = expandedDays.has(day) ? rows : rows.slice(0, range === 'month' ? 3 : 8);
        return <div key={day} className={`calendar-day min-w-0 border-b border-r border-gray-100 p-2 dark:border-slate-700 ${day === today ? 'bg-blue-50/40 ring-1 ring-inset ring-primary/25 dark:bg-blue-950/20' : muted ? 'bg-slate-50/70 dark:bg-slate-900/40' : 'bg-white/40 dark:bg-slate-800/20'}`}>
          <div className="mb-2 flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold ${day === today ? 'bg-primary text-white' : muted ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{date.getDate()}</span>{range !== 'month' && <span className="text-xs font-semibold capitalize text-gray-500">{date.toLocaleDateString('vi-VN', { weekday: 'long' })}</span>}</div>
          <div className="calendar-event-list space-y-1">{visibleRows.map(item => {
            const Icon = iconFor(item);
            return <button key={item.key} type="button" onMouseEnter={event => showHover(item, event.currentTarget)} onMouseLeave={() => setHovered(null)} onFocus={event => showHover(item, event.currentTarget)} onBlur={() => setHovered(null)} onClick={() => onOpen(item)} className={`flex w-full min-w-0 items-center gap-1 rounded-[6px] border px-1.5 py-1 text-left text-[11px] font-medium transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${eventColor(item, today)}`}>
              {isCalendarDone(item.status) ? <CheckCircle2 size={11} className="shrink-0" /> : <Icon size={11} className="shrink-0" />}<span className="truncate">{item.title}</span>{unreadKeys.has(item.key) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}{item.due === day && <span className="ml-auto shrink-0 text-[9px] font-bold">Hạn</span>}
            </button>;
          })}{rows.length > visibleRows.length && <button type="button" onClick={() => setExpandedDays(current => new Set([...current, day]))} className="px-1 text-[11px] font-medium text-gray-500 hover:text-primary">+{rows.length - visibleRows.length} công việc</button>}{expandedDays.has(day) && rows.length > (range === 'month' ? 3 : 8) && <button type="button" onClick={() => setExpandedDays(current => { const next = new Set(current); next.delete(day); return next; })} className="px-1 text-[11px] font-medium text-gray-500 hover:text-primary">Thu gọn</button>}</div>
          <span className="calendar-compact-count w-full rounded-md py-1 text-center text-[10px] font-semibold text-primary dark:text-blue-300">{rows.length > 0 ? `${rows.length} việc` : '—'}</span>
        </div>;
      })}</div>
    </>}

    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500 dark:border-slate-700 sm:px-5"><div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" />Task</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Project</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Campaign</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Hoàn thành</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Quá hạn</span></div><span role="status">{loading ? 'Đang đồng bộ…' : updatedAt ? `Cập nhật ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Chưa đồng bộ'}</span></div>
    {hovered && createPortal(<div role="tooltip" style={{ left: hovered.left, top: hovered.top }} className="pointer-events-none fixed z-[180] w-72 rounded-xl border border-blue-100 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800"><p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{hovered.item.title}</p><dl className="mt-2 space-y-1.5 text-xs"><div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">Thuộc</dt><dd className="font-medium text-gray-700 dark:text-gray-200">{hovered.item.parentName ? `${calendarKindLabel[hovered.item.kind]} · ${hovered.item.parentName}` : calendarKindLabel[hovered.item.kind]}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">Deadline</dt><dd className="font-medium text-gray-700 dark:text-gray-200">{hovered.item.due ? formatCalendarDay(hovered.item.due) : 'Chưa có'}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">PIC</dt><dd className="line-clamp-2 font-medium text-gray-700 dark:text-gray-200">{ownerLabel(hovered.item)}</dd></div></dl></div>, document.body)}
  </section>;
}
