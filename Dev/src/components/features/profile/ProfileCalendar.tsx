import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, FileText, FolderKanban, Megaphone, RefreshCw, Search, X } from 'lucide-react';
import type { CalendarItem } from '../../../lib/profileCalendar';
import { calendarKindLabel, formatCalendarDay, isCalendarDone, isCalendarOverdue, localDay, monthDays, occursOnCalendar } from '../../../lib/profileCalendar';
import type { CalendarNotification } from '../../../hooks/useProfileCalendar';
import './ProfileCalendar.css';

interface Props {
  items: CalendarItem[];
  notifications: CalendarNotification[];
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
  onRefresh: () => void;
  onOpen: (item: CalendarItem) => void;
  onReadNotification: (notification: CalendarNotification) => void;
  onReport: () => void;
  reportOpen: boolean;
}

const filters = [{ id: 'all', label: 'Tất cả' }, { id: 'task', label: 'Tasks' }, { id: 'project', label: 'Projects' }, { id: 'campaign', label: 'Campaigns' }] as const;
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

export function ProfileCalendar({ items, notifications, loading, error, updatedAt, onRefresh, onOpen, onReadNotification, onReport, reportOpen }: Props) {
  const [today, setToday] = useState(() => localDay(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setToday(localDay(new Date())), 60000);
    return () => clearInterval(timer);
  }, []);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUndated, setShowUndated] = useState(false);
  const [status, setStatus] = useState('all');
  const agendaRef = useRef<HTMLDivElement>(null);
  const focusDay = (day: string) => {
    setSelectedDay(day); setShowUndated(false);
    agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filtered = useMemo(() => items.filter(item => {
    const text = `${item.title} ${item.parentName || ''} ${item.record.task_ref || ''}`.toLocaleLowerCase('vi');
    return (filter === 'all' || category(item) === filter)
      && text.includes(query.trim().toLocaleLowerCase('vi'))
      && (status === 'all' || (status === 'open' ? !isCalendarDone(item.status) : status === 'done' ? isCalendarDone(item.status) : isCalendarOverdue(item, today)));
  }), [items, filter, query, status, today]);
  const days = useMemo(() => {
    if (view !== 'week') return monthDays(cursor.getFullYear(), cursor.getMonth());
    const offset = (cursor.getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - offset + index, 12));
  }, [cursor, view]);
  const visibleStart = view === 'week' ? localDay(days[0]) : localDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const visibleEnd = view === 'week' ? localDay(days[6]) : localDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
  const inPeriod = filtered.filter(item => (item.start && item.end && item.start <= visibleEnd && item.end >= visibleStart) || (today >= visibleStart && today <= visibleEnd && occursOnCalendar(item, today, today)));
  const undated = filtered.filter(item => !item.record.start_date && !item.due);
  const unread = notifications.filter(notification => !notification.is_read);
  const unreadKeys = new Set(unread.map(notification => `${notification.entity_type}:${notification.entity_id}`));
  const ordered = (rows: CalendarItem[], day = today) => [...rows].sort((a, b) => Number(isCalendarDone(a.status)) - Number(isCalendarDone(b.status)) || Number(b.due === day) - Number(a.due === day) || (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title, 'vi'));
  const selectedItems = ordered(showUndated ? undated : filtered.filter(item => occursOnCalendar(item, selectedDay, today)), selectedDay);

  const move = (direction: number) => {
    const next = view === 'week'
      ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + direction * 7, 12)
      : new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1, 12);
    setCursor(next); setSelectedDay(localDay(next)); setShowUndated(false);
  };
  const goToday = () => { const now = new Date(); setCursor(now); setSelectedDay(localDay(now)); setShowUndated(false); };

  const renderRow = (item: CalendarItem) => {
    const Icon = iconFor(item);
    return <button key={item.key} type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white/60 p-3 text-left transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900/30">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${eventColor(item, today)}`}><Icon size={16} /></span>
      <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-semibold ${isCalendarDone(item.status) ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{item.title}</span><span className="mt-1 block truncate text-xs text-gray-500">{calendarKindLabel[item.kind]}{item.parentName ? ` · ${item.parentName}` : ''} · {item.due ? `Hạn ${formatCalendarDay(item.due)}` : 'Chưa có deadline'}</span></span>
      {unreadKeys.has(item.key) && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Có thông báo mới" />}
      <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${isCalendarDone(item.status) ? 'bg-emerald-50 text-emerald-700' : isCalendarOverdue(item, today) ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-primary'}`}>{isCalendarDone(item.status) ? 'Hoàn thành' : isCalendarOverdue(item, today) ? 'Quá hạn' : item.status || 'todo'}</span>
      <ChevronRight size={15} className="shrink-0 text-gray-400" />
    </button>;
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
    {showNotifications && <div className="border-b border-gray-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Thông báo công việc <span className="font-normal text-gray-400">· 50 gần nhất</span></h3><button type="button" aria-label="Đóng thông báo lịch" onClick={() => setShowNotifications(false)} className="rounded-lg p-1.5 hover:bg-primary/5"><X size={16} /></button></div>
      <div className="max-h-64 space-y-1 overflow-y-auto">{notifications.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">Chưa có thông báo.</p> : notifications.map(notification => {
        const target = items.find(item => item.id === notification.entity_id && item.kind === notification.entity_type);
        return <button key={notification.id} type="button" onClick={() => { onReadNotification(notification); if (target) onOpen(target); }} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-primary/5 ${!notification.is_read ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}><Bell size={15} className={`mt-1 shrink-0 ${notification.is_read ? 'text-gray-400' : 'text-primary'}`} /><span className="min-w-0"><span className="block text-sm">{notification.message}</span><time className="mt-1 block text-[11px] text-gray-400">{new Date(notification.created_at).toLocaleString('vi-VN')}</time>{!target && <span className="text-[11px] text-gray-400">Không có công việc tương ứng trong lịch cá nhân.</span>}</span></button>;
      })}</div>
    </div>}

    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-content-center rounded-xl border border-blue-100 bg-blue-50/60 text-center dark:border-slate-700 dark:bg-slate-900"><span className="text-[9px] font-semibold uppercase text-gray-500">Tháng {cursor.getMonth() + 1}</span><b className="text-lg leading-5 text-primary dark:text-blue-300">{cursor.getDate()}</b></div><div><label className="calendar-month-label relative block cursor-pointer text-base font-bold text-gray-900 dark:text-white">Tháng {cursor.getMonth() + 1}, {cursor.getFullYear()}<input type="month" aria-label="Chọn tháng và năm" value={`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`} onChange={event => { const [year, month] = event.target.value.split('-').map(Number); if (year && month) { const date = new Date(year, month - 1, 1, 12); setCursor(date); setSelectedDay(localDay(date)); setShowUndated(false); } }} className="absolute inset-0 w-full cursor-pointer opacity-0" /></label><p className="mt-0.5 text-xs text-gray-500">{formatCalendarDay(visibleStart)} – {formatCalendarDay(visibleEnd)} · {inPeriod.length} công việc</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700"><button type="button" aria-label={view === 'week' ? 'Tuần trước' : 'Tháng trước'} onClick={() => move(-1)} className="p-2.5 hover:bg-primary/5"><ChevronLeft size={17} /></button><button type="button" onClick={goToday} className="border-x border-gray-200 px-3 text-xs font-semibold hover:bg-primary/5 dark:border-slate-700">Hôm nay</button><button type="button" aria-label={view === 'week' ? 'Tuần sau' : 'Tháng sau'} onClick={() => move(1)} className="p-2.5 hover:bg-primary/5"><ChevronRight size={17} /></button></div><select aria-label="Chế độ xem lịch" value={view} onChange={event => setView(event.target.value as typeof view)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"><option value="month">Theo tháng</option><option value="week">Theo tuần</option><option value="list">Danh sách</option></select><button type="button" aria-label="Đồng bộ lịch" title="Đồng bộ lịch" disabled={loading} onClick={onRefresh} className="rounded-xl p-2.5 text-gray-400 hover:bg-primary/5 hover:text-primary"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
    </div>

    {loading && !updatedAt ? <div role="status" className="grid min-h-72 place-items-center text-sm text-gray-400">Đang tải lịch công việc…</div> : view === 'list' ? <div className="space-y-2 border-t border-gray-100 p-4 dark:border-slate-700 sm:p-5">{undated.length > 0 && <button type="button" onClick={() => { setShowUndated(true); requestAnimationFrame(() => agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} className="mb-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-primary dark:border-slate-700">Chưa lên lịch ({undated.length})</button>}{ordered(inPeriod).map(renderRow)}{inPeriod.length === 0 && <p className="py-12 text-center text-sm text-gray-400">Không có công việc phù hợp trong tháng này.</p>}</div> : <>
      <div className="grid grid-cols-7 border-y border-gray-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500">{day}</div>)}</div>
      <div className="calendar-days grid grid-cols-7">{days.map(date => {
        const day = localDay(date);
        const rows = ordered(filtered.filter(item => occursOnCalendar(item, day, today)), day);
        const muted = date.getMonth() !== cursor.getMonth();
        const active = day === selectedDay && !showUndated;
        return <div key={day} className={`calendar-day min-w-0 border-b border-r border-gray-100 p-2 dark:border-slate-700 ${active ? 'bg-blue-50/40 ring-1 ring-inset ring-primary/25 dark:bg-blue-950/20' : muted ? 'bg-slate-50/70 dark:bg-slate-900/40' : 'bg-white/40 dark:bg-slate-800/20'}`}>
          <button type="button" aria-label={`Xem ${rows.length} công việc ngày ${formatCalendarDay(day)}`} aria-pressed={active} onClick={() => focusDay(day)} className={`mb-2 grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold transition-colors ${day === today ? 'bg-primary text-white' : muted ? 'text-gray-400 hover:bg-primary/10' : 'text-gray-700 hover:bg-primary/10 dark:text-gray-200'}`}>{date.getDate()}</button>
          <div className="calendar-event-list space-y-1">{rows.slice(0, 3).map(item => {
            const Icon = iconFor(item);
            return <button key={item.key} type="button" title={`${item.title} · ${calendarKindLabel[item.kind]}${item.due ? ` · Hạn ${formatCalendarDay(item.due)}` : ''}`} onClick={() => onOpen(item)} className={`flex w-full min-w-0 items-center gap-1 rounded-[6px] border px-1.5 py-1 text-left text-[11px] font-medium transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${eventColor(item, today)}`}>
              {isCalendarDone(item.status) ? <CheckCircle2 size={11} className="shrink-0" /> : <Icon size={11} className="shrink-0" />}<span className="truncate">{item.title}</span>{unreadKeys.has(item.key) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}{item.due === day && <span className="ml-auto shrink-0 text-[9px] font-bold">Hạn</span>}
            </button>;
          })}{rows.length > 3 && <button type="button" onClick={() => focusDay(day)} className="px-1 text-[11px] font-medium text-gray-500 hover:text-primary">+{rows.length - 3} công việc</button>}</div>
          <button type="button" onClick={() => focusDay(day)} aria-label={`${rows.length} công việc ngày ${formatCalendarDay(day)}`} className="calendar-compact-count w-full rounded-md py-1 text-center text-[10px] font-semibold text-primary dark:text-blue-300">{rows.length > 0 ? `${rows.length} việc` : '—'}</button>
        </div>;
      })}</div>
    </>}

    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500 dark:border-slate-700 sm:px-5"><div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" />Task</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Project</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Campaign</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Hoàn thành</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Quá hạn</span></div><span role="status">{loading ? 'Đang đồng bộ…' : updatedAt ? `Cập nhật ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Chưa đồng bộ'}</span></div>
    {(view !== 'list' || showUndated) && <div ref={agendaRef} className="scroll-mt-4 border-t border-gray-100 p-4 dark:border-slate-700 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-gray-900 dark:text-white">{showUndated ? 'Chưa lên lịch' : `Ngày ${formatCalendarDay(selectedDay)}`} <span className="ml-1 font-normal text-gray-400">· {selectedItems.length} công việc</span></h3>{undated.length > 0 && <button type="button" onClick={() => setShowUndated(value => !value)} aria-pressed={showUndated} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-primary dark:border-slate-700">{showUndated ? 'Về ngày đã chọn' : `Chưa lên lịch (${undated.length})`}</button>}</div><div className="max-h-80 space-y-2 overflow-y-auto">{selectedItems.map(renderRow)}{selectedItems.length === 0 && <p className="py-7 text-center text-sm text-gray-400">{items.length ? 'Không có công việc phù hợp trong ngày này.' : 'Chưa có công việc được giao. Lịch sẽ cập nhật khi có công việc mới.'}</p>}</div><p className="mt-3 text-[11px] leading-5 text-gray-400">Lịch dùng ngày bắt đầu và deadline. Nếu chưa có ngày bắt đầu, dùng ngày tạo công việc; ngày giao lại chưa được lưu riêng.</p></div>}
  </section>;
}
