export type WeekSelection = 'current' | 'previous' | string;

type ReportTask = {
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

export const weeklyReportRange = (selection: WeekSelection) => {
  if (selection !== 'current' && selection !== 'previous') {
    const parts = selection.split('|');
    if (parts.length === 2) return { start: parts[0], end: parts[1] };
  }
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - (selection === 'previous' ? 7 : 0));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { start: dateKey(monday), end: dateKey(sunday) };
};

const isClosed = (status?: string | null) => ['done', 'complete', 'completed', 'cancelled', 'canceled'].includes((status || '').toLowerCase());

// A task belongs to the week if it existed by Sunday and was still open then,
// or was closed during/after that week. Tasks closed before Monday stay in history.
export const tasksForWeeklyReport = <T extends ReportTask>(tasks: T[], weekStart: string, weekEnd: string): T[] =>
  tasks.filter(task => {
    const created = task.created_at?.slice(0, 10);
    if (created && created > weekEnd) return false;
    if (!isClosed(task.status)) return true;
    const lastChange = task.updated_at?.slice(0, 10) || created;
    return Boolean(lastChange && lastChange >= weekStart);
  });
