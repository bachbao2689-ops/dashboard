import { useState, useEffect } from 'react';
import { CalendarDays, ChevronRight, FileText, FolderKanban, Megaphone, X } from 'lucide-react';
import type { CalendarItem } from '../../../lib/profileCalendar';
import { calendarKindLabel, formatCalendarDay, isCalendarDone } from '../../../lib/profileCalendar';

// The same drawer shape, information card and scroll/footer layout as TaskDetailPanel.
export function CalendarWorkDetail({ item, items, onClose, onOpen }: { item: CalendarItem; items: CalendarItem[]; onClose: () => void; onOpen: (item: CalendarItem) => void }) {
  const [width, setWidth] = useState(440);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setWidth(Math.max(300, Math.min(window.innerWidth - e.clientX, 800)));
    const up = () => setResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [resizing]);
  const children = items.filter(child => child.key !== item.key && (item.kind === 'project' ? child.parentId === item.id : child.campaignId === item.id));
  const Icon = item.kind === 'campaign' ? Megaphone : FolderKanban;
  const shadowClass = item.kind === 'campaign' || item.kind === 'campaign_subtask' ? 'shadow-drawer-campaign border-amber-500/20' : item.kind === 'project' || item.kind === 'project_subtask' ? 'shadow-drawer-project border-violet-500/20' : 'shadow-drawer-task border-blue-500/20';
  return <aside aria-label={`Chi tiết ${calendarKindLabel[item.kind]}`} style={{ '--panel-width': `${width}px` } as React.CSSProperties} className={`drawer-slide-in absolute right-0 top-0 z-[60] flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-l-3xl border-l bg-white dark:bg-slate-800 md:relative md:w-[var(--panel-width)] md:min-w-[var(--panel-width)] ${shadowClass} ${!resizing ? 'transition-[width,min-width] duration-300' : ''}`}>
    <div onMouseDown={() => setResizing(true)} className="hidden md:block absolute left-0 inset-y-0 w-2 -translate-x-1/2 cursor-col-resize z-10" />
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-slate-700"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary dark:text-blue-300"><Icon size={17} />{calendarKindLabel[item.kind]}</span><button type="button" aria-label="Đóng chi tiết công việc" onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-700"><X size={20} /></button></header>
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
      <div><h2 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">{item.title}</h2><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${isCalendarDone(item.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-primary'}`}>{isCalendarDone(item.status) ? 'Hoàn thành' : item.status || 'Planning'}</span>{item.priority && <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{item.priority} priority</span>}</div></div>
      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-blue-100 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50"><div><p className="text-[10px] uppercase text-gray-400">{item.kind === 'campaign' ? 'Owner / PIC' : 'Người tạo'}</p><p className="mt-1 font-semibold">{item.owner || 'Chưa cập nhật'}</p></div><div><p className="text-[10px] uppercase text-gray-400"><CalendarDays size={12} className="mr-1 inline" />Timeline</p><p className="mt-1 font-semibold">{formatCalendarDay(item.start)} – {formatCalendarDay(item.due)}</p></div>{item.kind === 'campaign' && item.record.budget != null && <div className="col-span-2"><p className="text-[10px] uppercase text-gray-400">Ngân sách</p><p className="mt-1 font-bold">{Number(item.record.budget).toLocaleString('vi-VN')}</p></div>}</section>
      <section><h3 className="mb-2 text-sm font-bold">{item.kind === 'campaign' ? 'Mục tiêu / Mô tả' : 'Description'}</h3><div className="whitespace-pre-wrap rounded-2xl border border-blue-100 bg-slate-50 p-4 text-sm leading-6 text-gray-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-gray-300">{item.description || 'Chưa có mô tả.'}</div></section>
      <section><h3 className="mb-3 text-sm font-bold">Công việc của tôi <span className="font-normal text-gray-400">({children.length})</span></h3><div className="space-y-2">{children.map(child => <button type="button" key={child.key} onClick={() => onOpen(child)} className="flex w-full items-center gap-2 rounded-xl border border-gray-100 bg-slate-50 p-3 text-left hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900/40"><FileText size={15} className="shrink-0 text-primary" /><span className="min-w-0 flex-1"><b className={`block truncate text-sm ${isCalendarDone(child.status) ? 'text-gray-400 line-through' : ''}`}>{child.title}</b><span className="mt-1 block text-xs text-gray-500">{calendarKindLabel[child.kind]} · {formatCalendarDay(child.due)}</span></span><ChevronRight size={15} /></button>)}{children.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Bạn chưa có task hoặc subtask trong mục này.</p>}</div></section>
    </div>
    <footer className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl border border-gray-200 text-sm font-semibold text-primary dark:border-slate-700 dark:text-blue-300">Về Calendar</button></footer>
  </aside>;
}
