export type Project = { id: string; name: string; description: string | null; status: string; start_date: string | null; due_date: string | null; priority: string; created_by: number | null; campaign_id?: string | null; department_id?: string | null; lead_id?: number | null };

export type Person = { id: number; name: string; department_id: string | null; departments?: { name: string } | null };

export const strictFormatVN = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const ymd = dateStr.split('T')[0];
  const parts = ymd.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

export const dateValue = strictFormatVN;

export const priorityClass = (value: string) => value === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : value === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' : value === 'low' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';

export const getDueStatusColor = (endDateStr?: string | null, status?: string | null) => {
  if (!endDateStr) return 'border-transparent';
  const isDone = ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
  if (isDone) return 'border-emerald-500';
  const parts = endDateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return 'border-transparent';
  const end = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 3) return 'border-emerald-500';
  if (diffDays >= 0) return 'border-amber-500';
  return 'border-red-500';
};

export const getDueStatusLabel = (endDateStr?: string | null, status?: string | null, isEn?: boolean) => {
  if (!endDateStr) return null;
  const isDone = ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
  if (isDone) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30">
        {isEn ? 'Completed' : 'Hoàn thành'}
      </span>
    );
  }
  const parts = endDateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return null;
  const end = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const color = diffDays > 3
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
    : diffDays >= 0
    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
  const label = diffDays < 0
    ? (isEn ? `${Math.abs(diffDays)}d overdue` : `Trễ ${Math.abs(diffDays)} ngày`)
    : diffDays === 0
    ? (isEn ? 'Due today' : 'Hôm nay')
    : (isEn ? `${diffDays}d left` : `Còn ${diffDays} ngày`);

  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${color}`}>{label}</span>;
};
