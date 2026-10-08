export type CalendarKind = 'task' | 'project' | 'campaign' | 'project_subtask' | 'campaign_subtask';

export interface CalendarItem {
  key: string;
  id: string;
  kind: CalendarKind;
  title: string;
  status?: string | null;
  priority?: string | null;
  description?: string | null;
  start: string | null;
  end: string | null;
  due: string | null;
  dateBasis: 'start' | 'created' | 'due' | 'none';
  parentId?: string | null;
  parentName?: string | null;
  campaignId?: string | null;
  owner?: string | null;
  record: Record<string, any>;
}

export const calendarKindLabel: Record<CalendarKind, string> = {
  task: 'Task', project: 'Project', campaign: 'Campaign',
  project_subtask: 'Subtask · Project', campaign_subtask: 'Subtask · Campaign',
};

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Date-only deadlines retain their calendar day; timestamps use the viewer's timezone.
export function calendarDay(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && localDay(date) === value ? value : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDay(date);
}

export function calendarDates(record: Record<string, any>, kind: CalendarKind) {
  const scheduled = calendarDay(record.start_date);
  const created = calendarDay(record.created_at);
  const due = calendarDay(kind === 'campaign' ? record.end_date : record.due_date);
  const start = scheduled || (created && due && created > due ? due : created) || due;
  // Imported deadlines can predate creation. Keep those deadlines visible too.
  const first = start && due && due < start ? due : start;
  return {
    start: first, end: start && due && due > start ? due : start, due,
    dateBasis: (scheduled ? 'start' : created ? 'created' : due ? 'due' : 'none') as CalendarItem['dateBasis'],
  };
}

export const isCalendarDone = (status?: string | null) => ['done', 'complete', 'completed', 'cancelled', 'canceled'].includes((status || '').toLowerCase());
export const isCalendarVisible = (status?: string | null) => !['deleted', 'archived'].includes((status || '').toLowerCase());
export const isCalendarOverdue = (item: CalendarItem, today: string) => Boolean(item.due && item.due < today && !isCalendarDone(item.status));
export const occursOn = (item: CalendarItem, day: string) => Boolean(item.start && item.end && item.start <= day && item.end >= day);
// Keep unfinished overdue/undated work discoverable during the morning check-in.
export const occursOnCalendar = (item: CalendarItem, day: string, today: string) => occursOn(item, day)
  || (day === today && !isCalendarDone(item.status) && Boolean(item.start && item.start <= today) && (!item.due || item.due < today));

export function monthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => new Date(year, month, 1 - offset + index, 12));
}

export const formatCalendarDay = (day?: string | null) => day ? new Date(`${day}T12:00:00`).toLocaleDateString('vi-VN') : 'Chưa lên lịch';
