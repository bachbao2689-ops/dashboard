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
type CalendarRange = (typeof ranges)[number]['id'] | 'custom';
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
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragHover, setDragHover] = useState<Date | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [status, setStatus] = useState('all');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<{ item: CalendarItem; left: number; top: number } | null>(null);
  const rangeMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const monthMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { 
      if (rangeOpen && !rangeMenuRef.current?.contains(event.target as Node)) setRangeOpen(false); 
      if (monthPickerOpen && !monthMenuRef.current?.contains(event.target as Node)) setMonthPickerOpen(false);
      if (showNotifications && !notifRef.current?.contains(event.target as Node)) setShowNotifications(false);
    };
    const closeEscape = (event: KeyboardEvent) => { 
      if (event.key === 'Escape') { setRangeOpen(false); setMonthPickerOpen(false); setShowNotifications(false); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [rangeOpen, monthPickerOpen, showNotifications]);

  const filtered = useMemo(() => items.filter(item => {
    const text = `${item.title} ${item.parentName || ''} ${item.record.task_ref || ''}`.toLocaleLowerCase('vi');
    return (filter === 'all' || category(item) === filter)
      && text.includes(query.trim().toLocaleLowerCase('vi'))
      && (status === 'all' || (status === 'open' ? !isCalendarDone(item.status) : status === 'done' ? isCalendarDone(item.status) : isCalendarOverdue(item, today)));
  }), [items, filter, query, status, today]);
  const days = useMemo(() => monthDays(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const rangeOffset = range === 'week' ? (cursor.getDay() + 6) % 7 : 0;
  const rangeLength = range === 'today' ? 1 : range === 'three' ? 3 : range === 'week' ? 7 : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const rangeStartDate = range === 'custom' && customStart ? customStart : (range === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12) : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - rangeOffset, 12));
  const rangeEndDate = range === 'custom' && customEnd ? customEnd : (range === 'custom' && customStart ? customStart : (range === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12) : new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), rangeStartDate.getDate() + rangeLength - 1, 12)));
  const visibleStart = localDay(rangeStartDate);
  const visibleEnd = localDay(rangeEndDate);
  const monthStart = localDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12));
  const monthEnd = localDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12));
  const monthItems = filtered.filter(item => (item.start && item.end && item.start <= monthEnd && item.end >= monthStart) || (today >= monthStart && today <= monthEnd && occursOnCalendar(item, today, today)));
  const unread = notifications.filter(notification => !notification.is_read);
  const unreadKeys = new Set(unread.map(notification => `${notification.entity_type}:${notification.entity_id}`));

  const slotMap = useMemo(() => {
    const slots: Record<string, string[]> = {};
    days.forEach(d => { slots[localDay(d)] = []; });
    
    const sorted = [...filtered].sort((a, b) => {
      const aMulti = (a.kind === 'project' || a.kind === 'campaign') && a.start && a.end && a.start !== a.end ? 1 : 0;
      const bMulti = (b.kind === 'project' || b.kind === 'campaign') && b.start && b.end && b.start !== b.end ? 1 : 0;
      if (aMulti !== bMulti) return bMulti - aMulti;
      const startA = a.start || a.due || '9999';
      const startB = b.start || b.due || '9999';
      if (startA !== startB) return startA.localeCompare(startB);
      const endA = a.end || a.due || '0000';
      const endB = b.end || b.due || '0000';
      return endB.localeCompare(endA);
    });

    sorted.forEach(item => {
      const spannedDays = days.map(d => localDay(d)).filter(day => occursOnCalendar(item, day, today));
      if (spannedDays.length === 0) return;
      let slotIndex = 0;
      while(true) {
        let free = true;
        for (const d of spannedDays) {
          if (slots[d][slotIndex] !== undefined) { free = false; break; }
        }
        if (free) break;
        slotIndex++;
      }
      for (const d of spannedDays) {
        while (slots[d].length <= slotIndex) slots[d].push(undefined as any);
        slots[d][slotIndex] = item.key;
      }
    });
    return slots;
  }, [filtered, days, today]);

  const move = (direction: number) => {
    const step = range === 'today' ? 1 : range === 'three' ? 3 : 7;
    const next = range === 'month'
      ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1, 12)
      : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + direction * step, 12);
    setCursor(next); setExpandedDays(new Set()); setHovered(null);
  };
  const selectRange = (next: CalendarRange) => { setRange(next); setCursor(new Date()); setRangeOpen(false); setExpandedDays(new Set()); setHovered(null); };
  const selectedRangeLabel = range === 'custom' && customStart && customEnd ? `${formatCalendarDay(localDay(customStart))} - ${formatCalendarDay(localDay(customEnd))}` : range === 'today' && localDay(cursor) !== today ? formatCalendarDay(localDay(cursor)) : ranges.find(option => option.id === range)?.label;
  const periodTitle = `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`;
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

  const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const ownerLabel = (item: CalendarItem) => {
    const members = item.record.memberNames as string[] | undefined;
    return members?.length ? members.join(', ') : item.owner || 'Chưa phân công';
  };

  return <section className="profile-calendar card-hub overflow-hidden rounded-xl shadow-sm" aria-label="Lịch công việc cá nhân" aria-busy={loading}>
    <div className="space-y-4 border-b border-gray-100 p-4 dark:border-slate-700 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"><CalendarDays size={21} className="text-primary" />Calendar của tôi</h2><p className="mt-1 text-xs text-gray-500">Task, Project và Campaign bạn tham gia — cập nhật cùng lịch làm việc.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={notifRef}>
            <button type="button" onClick={() => setShowNotifications(value => !value)} aria-expanded={showNotifications} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-primary hover:bg-primary/5 dark:border-slate-700 dark:text-blue-300"><Bell size={15} />Thông báo{unread.length > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] text-white">{unread.length}</span>}</button>
            {showNotifications && <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[320px] sm:w-[380px] rounded-2xl shadow-xl border border-gray-100 bg-white dark:bg-slate-900 dark:border-slate-700 overflow-hidden"><NotificationLog includeTeam={includeTeamNotifications} inline onClose={() => setShowNotifications(false)} /></div>}
          </div>
          <button type="button" onClick={onReport} aria-expanded={reportOpen} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90"><FileText size={15} />{reportOpen ? 'Đóng report' : 'Report của tôi'}</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-900/60" aria-label="Loại công việc">
          {filters.map(option => {
            let activeClass = 'bg-white text-primary shadow-sm dark:bg-slate-700 dark:text-white';
            if (option.id === 'task') activeClass = 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
            if (option.id === 'project') activeClass = 'bg-violet-50 text-violet-700 shadow-sm dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50';
            if (option.id === 'campaign') activeClass = 'bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50';
            
            return (
              <button 
                type="button" 
                key={option.id} 
                aria-pressed={filter === option.id} 
                onClick={() => setFilter(option.id)} 
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${filter === option.id ? activeClass : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-gray-400" /><input aria-label="Tìm công việc trong lịch" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm công việc..." className="h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-primary dark:border-slate-700" /></label>
          <select aria-label="Lọc trạng thái" value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"><option value="all">Mọi trạng thái</option><option value="open">Chưa hoàn thành</option><option value="done">Đã hoàn thành</option><option value="overdue">Quá hạn</option></select>
        </div>
      </div>
    </div>

    {error && <div role="alert" className="flex items-center justify-between gap-3 bg-red-50 px-5 py-3 text-xs text-red-700 dark:bg-red-950/30"><span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span><button type="button" onClick={onRefresh} className="shrink-0 font-semibold underline">Thử lại</button></div>}


    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <label className="group relative cursor-pointer block">
          <div className="grid h-12 w-12 shrink-0 place-content-center rounded-xl border border-blue-100 bg-blue-50/60 text-center dark:border-slate-700 dark:bg-slate-900 transition-colors group-hover:bg-blue-100 dark:group-hover:bg-slate-800">
            <span className="text-[9px] font-semibold uppercase text-gray-500">Tháng {cursor.getMonth() + 1}</span>
            <b className="text-lg leading-5 text-primary dark:text-blue-300">{cursor.getDate()}</b>
          </div>
          <input type="date" onClick={(e) => { try { (e.target as any).showPicker?.(); } catch (err) {} }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`} onChange={(e) => {
            if (e.target.value) {
              const [y, m, d] = e.target.value.split('-');
              setCursor(new Date(Number(y), Number(m) - 1, Number(d)));
              setRange('today');
            }
          }} />
        </label>
        <div className="relative" ref={monthMenuRef}>
          <button type="button" onClick={() => { setPickerYear(cursor.getFullYear()); setMonthPickerOpen(!monthPickerOpen); setRangeOpen(false); }} className="group flex items-center gap-1.5 text-left">
            <p className="text-base font-bold text-gray-900 dark:text-white transition-colors group-hover:text-primary">{periodTitle}</p>
            <ChevronDown size={14} className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          <p className="mt-0.5 text-xs text-gray-500">{formatCalendarDay(monthStart)} – {formatCalendarDay(monthEnd)} · {monthItems.length} công việc</p>
          
          {monthPickerOpen && <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-64 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setPickerYear(y => y - 1)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronLeft size={16}/></button>
              <span className="font-bold text-gray-900 dark:text-white">{pickerYear}</span>
              <button type="button" onClick={() => setPickerYear(y => y + 1)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({length: 12}).map((_, i) => (
                <button key={i} type="button" onClick={() => { setCursor(new Date(pickerYear, i, 1)); setMonthPickerOpen(false); }} className={`rounded-xl py-2 text-xs font-semibold transition-colors ${cursor.getMonth() === i && cursor.getFullYear() === pickerYear ? 'bg-primary text-white' : 'text-gray-700 hover:bg-primary/10 dark:text-gray-300 dark:hover:bg-slate-700'}`}>
                  Tháng {i + 1}
                </button>
              ))}
            </div>
          </div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2"><div className="inline-flex rounded-xl border border-gray-200 dark:border-slate-700"><button type="button" aria-label="Khoảng trước" onClick={() => move(-1)} className="rounded-l-xl p-2.5 hover:bg-primary/5"><ChevronLeft size={17} /></button><div ref={rangeMenuRef} className="relative border-x border-gray-200 dark:border-slate-700">
          <button type="button" onClick={() => { setPickerMonth(cursor.getMonth()); setPickerYear(cursor.getFullYear()); setRangeOpen(value => !value); setMonthPickerOpen(false); }} aria-expanded={rangeOpen} className="flex h-full min-w-[104px] items-center justify-center gap-1.5 px-3 text-xs font-semibold hover:bg-primary/5">
            {selectedRangeLabel}
            <ChevronDown size={14} className={`transition-transform ${rangeOpen ? 'rotate-180' : ''}`} />
          </button>
          {rangeOpen && <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-[280px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:w-[320px] sm:flex-row">
            
            {/* Calendar Grid */}
            <div className="p-3 sm:flex-1">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => { let m = pickerMonth - 1; let y = pickerYear; if (m < 0) { m = 11; y--; }; setPickerMonth(m); setPickerYear(y); }} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronLeft size={14}/></button>
                <span className="text-xs font-bold text-gray-900 dark:text-white">Tháng {pickerMonth + 1}, {pickerYear}</span>
                <button type="button" onClick={() => { let m = pickerMonth + 1; let y = pickerYear; if (m > 11) { m = 0; y++; }; setPickerMonth(m); setPickerYear(y); }} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronRight size={14}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="text-[10px] font-semibold text-gray-400">{d}</div>)}
                {(() => {
                  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                  const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
                  const offset = (firstDay + 6) % 7;
                  const days = [];
                  for (let i = 0; i < offset; i++) days.push(<div key={`e-${i}`} />);
                  
                  const activeStart = dragStart || (range === 'custom' ? customStart : cursor);
                  const activeEnd = dragStart ? dragHover : (range === 'custom' ? customEnd : null);
                  const s = activeStart && activeEnd ? (activeStart < activeEnd ? activeStart : activeEnd) : activeStart;
                  const e = activeStart && activeEnd ? (activeStart > activeEnd ? activeStart : activeEnd) : activeEnd;
                  const sStr = s ? localDay(s) : null;
                  const eStr = e ? localDay(e) : null;

                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(pickerYear, pickerMonth, i, 12);
                    const dateStr = localDay(date);
                    
                    let isSelected = false;
                    let isRange = false;
                    
                    if (range === 'custom' || dragStart) {
                      if (sStr === dateStr || eStr === dateStr) isSelected = true;
                      if (sStr && eStr && dateStr > sStr && dateStr < eStr) isRange = true;
                    } else if (range === 'today') {
                      isSelected = cursor.getDate() === i && cursor.getMonth() === pickerMonth && cursor.getFullYear() === pickerYear;
                    }
                    
                    days.push(
                      <div key={i} className={`relative ${isRange ? 'bg-primary/10 dark:bg-primary/20' : ''} ${(isSelected && eStr && dateStr === sStr && sStr !== eStr) ? 'rounded-l-full bg-primary/10 dark:bg-primary/20' : ''} ${(isSelected && sStr && dateStr === eStr && sStr !== eStr) ? 'rounded-r-full bg-primary/10 dark:bg-primary/20' : ''}`}>
                        <button type="button" 
                          onPointerEnter={() => { if (dragStart) setDragHover(date); }}
                          onClick={() => {
                            if (!dragStart) {
                              setDragStart(date);
                              setDragHover(date);
                              setRange('custom');
                            } else {
                              let start = dragStart;
                              let end = date;
                              if (end < start) { start = date; end = dragStart; }
                              setCustomStart(start);
                              setCustomEnd(end);
                              setDragStart(null);
                              setDragHover(null);
                              setCursor(start);
                            }
                          }} 
                          className={`relative z-10 h-7 w-full rounded-full text-xs font-medium transition-colors ${isSelected ? 'bg-primary text-white shadow-md' : 'text-gray-700 hover:bg-primary/20 dark:text-gray-200 dark:hover:bg-slate-700'}`}>
                          {i}
                        </button>
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-col border-t border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900 sm:w-32 sm:border-l sm:border-t-0">
              <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                {ranges.map(option => (
                  <button key={option.id} type="button" onClick={() => selectRange(option.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${range === option.id ? 'bg-white text-primary shadow-sm dark:bg-slate-800' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-700'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-gray-200 dark:border-slate-700">
                <button type="button" onClick={() => setRangeOpen(false)} className="w-full rounded-lg bg-primary py-2 text-center text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary/90">
                  Áp dụng
                </button>
              </div>
            </div>
            
          </div>}
        </div><button type="button" aria-label="Khoảng sau" onClick={() => move(1)} className="rounded-r-xl p-2.5 hover:bg-primary/5"><ChevronRight size={17} /></button></div><button type="button" aria-label="Đồng bộ lịch" title="Đồng bộ lịch" disabled={loading} onClick={onRefresh} className="rounded-xl p-2.5 text-gray-400 hover:bg-primary/5 hover:text-primary"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
    </div>

    {loading && !updatedAt ? <div role="status" className="grid min-h-72 place-items-center text-sm text-gray-400">Đang tải lịch công việc…</div> : <>
      <div className="grid grid-cols-7 border-y border-gray-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">{weekdayLabels.map((day, index) => <div key={`${day}-${index}`} className="py-2 text-center text-xs font-semibold text-gray-500">{day}</div>)}</div>
      <div className="calendar-days grid grid-cols-7">{days.map(date => {
        const day = localDay(date);
        const dayKeys = slotMap[day] || [];
        const itemsMap = new Map(filtered.map(i => [i.key, i]));
        const rows = dayKeys.map(k => k ? (itemsMap.get(k) || null) : null);
        const actualItemCount = rows.filter(Boolean).length;
        
        const muted = date.getMonth() !== cursor.getMonth();
        const inSelectedRange = day >= visibleStart && day <= visibleEnd;
        const visibleRows = expandedDays.has(day) ? rows : rows.slice(0, 3);
        const visibleItemCount = visibleRows.filter(Boolean).length;
        const hiddenCount = actualItemCount - visibleItemCount;
        return <div key={day} className={`calendar-day min-w-0 border-b border-r border-gray-100 p-2 dark:border-slate-700 ${day === today ? 'bg-blue-50/40 ring-1 ring-inset ring-primary/25 dark:bg-blue-950/20' : inSelectedRange && range !== 'month' ? 'bg-blue-50/20 dark:bg-blue-950/10' : muted ? 'bg-slate-50/70 dark:bg-slate-900/40' : 'bg-white/40 dark:bg-slate-800/20'}`}>
          <div className="mb-2 flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold ${day === today ? 'bg-primary text-white' : muted ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{date.getDate()}</span></div>
          <div className="calendar-event-list space-y-1">{visibleRows.map((item, index) => {
            if (!item) return <div key={`empty-${index}`} className="h-[26px]" />;
            
            const Icon = iconFor(item);
            const isMultiDay = (item.kind === 'project' || item.kind === 'campaign') && item.start && item.end && item.start !== item.end;
            
            if (!isMultiDay) {
              return <button key={item.key} type="button" onMouseEnter={event => showHover(item, event.currentTarget)} onMouseLeave={() => setHovered(null)} onFocus={event => showHover(item, event.currentTarget)} onBlur={() => setHovered(null)} onClick={() => onOpen(item)} className={`flex h-[26px] w-full min-w-0 items-center gap-1 rounded-[6px] border px-1.5 text-left text-[11px] font-medium transition-[filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${hovered?.item.key === item.key ? 'brightness-[0.85] shadow-sm ring-1 ring-primary/30 z-20 relative' : 'hover:brightness-[0.90]'} ${eventColor(item, today)}`}>
                {isCalendarDone(item.status) ? <CheckCircle2 size={11} className="shrink-0" /> : <Icon size={11} className="shrink-0" />}<span className="truncate">{item.title}</span>{unreadKeys.has(item.key) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}{item.due === day && <span className="ml-auto shrink-0 text-[9px] font-bold">Hạn</span>}
              </button>;
            }

            const prev = new Date(date); prev.setDate(prev.getDate() - 1);
            const next = new Date(date); next.setDate(next.getDate() + 1);
            const connectsLeft = occursOnCalendar(item, localDay(prev), today) && date.getDay() !== 1;
            const connectsRight = occursOnCalendar(item, localDay(next), today) && date.getDay() !== 0;

            const wClass = (connectsLeft && connectsRight) ? "w-[calc(100%+18px)]" : (connectsLeft || connectsRight) ? "w-[calc(100%+9px)]" : "w-full";
            const isHovered = hovered?.item.key === item.key;
            const baseMargin = `relative flex h-[26px] min-w-0 items-center gap-1 border-y text-left text-[11px] font-medium transition-[filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isHovered ? 'z-[30] brightness-[0.85] shadow-sm shadow-black/5 ring-1 ring-primary/30' : 'z-[20] hover:brightness-[0.90]'} ${eventColor(item, today)}`;
            const ml = connectsLeft ? "-ml-[9px] pl-[9px] rounded-l-none !border-l-transparent" : "rounded-l-[6px] border-l pl-1.5";
            const mr = connectsRight ? "pr-[9px] rounded-r-none !border-r-transparent" : "rounded-r-[6px] border-r pr-1.5";
            const showTitle = !connectsLeft;

            return <button key={item.key} type="button" onMouseEnter={event => showHover(item, event.currentTarget)} onMouseLeave={() => setHovered(null)} onFocus={event => showHover(item, event.currentTarget)} onBlur={() => setHovered(null)} onClick={() => onOpen(item)} className={`${baseMargin} ${wClass} ${ml} ${mr}`}>
              {showTitle && <>
                {isCalendarDone(item.status) ? <CheckCircle2 size={11} className="shrink-0" /> : <Icon size={11} className="shrink-0" />}
                <span className="truncate">{item.title}</span>
                {unreadKeys.has(item.key) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
              </>}
            </button>;
          })}{hiddenCount > 0 && <button type="button" onClick={() => setExpandedDays(current => new Set([...current, day]))} className="px-1 text-[11px] font-medium text-gray-500 hover:text-primary">+{hiddenCount} công việc</button>}{expandedDays.has(day) && actualItemCount > 3 && <button type="button" onClick={() => setExpandedDays(current => { const next = new Set(current); next.delete(day); return next; })} className="px-1 text-[11px] font-medium text-gray-500 hover:text-primary">Thu gọn</button>}</div>
          <span className="calendar-compact-count w-full rounded-md py-1 text-center text-[10px] font-semibold text-primary dark:text-blue-300">{actualItemCount > 0 ? `${actualItemCount} việc` : '—'}</span>
        </div>;
      })}</div>
    </>}

    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500 dark:border-slate-700 sm:px-5"><div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" />Task</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Project</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Campaign</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Hoàn thành</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Quá hạn</span></div><span role="status">{loading ? 'Đang đồng bộ…' : updatedAt ? `Cập nhật ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Chưa đồng bộ'}</span></div>
    {hovered && createPortal(<div role="tooltip" style={{ left: hovered.left, top: hovered.top }} className="pointer-events-none fixed z-[180] w-72 rounded-xl border border-blue-100 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800"><p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{hovered.item.title}</p><dl className="mt-2 space-y-1.5 text-xs"><div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">Thuộc</dt><dd className="font-medium text-gray-700 dark:text-gray-200">{hovered.item.parentName ? `${calendarKindLabel[hovered.item.kind]} · ${hovered.item.parentName}` : calendarKindLabel[hovered.item.kind]}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">Deadline</dt><dd className="font-medium text-gray-700 dark:text-gray-200">{hovered.item.due ? formatCalendarDay(hovered.item.due) : 'Chưa có'}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-400">PIC</dt><dd className="line-clamp-2 font-medium text-gray-700 dark:text-gray-200">{ownerLabel(hovered.item)}</dd></div></dl></div>, document.body)}
  </section>;
}
