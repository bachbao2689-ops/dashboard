import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, PlayCircle, UsersRound } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';

const isDone = (status?: string | null) => ['done', 'completed', 'complete', 'cancelled', 'canceled'].includes((status || '').toLowerCase());

type Metric = { label: string; value: string; icon: React.ReactNode; tone: string };

export const ProfileKpis: React.FC<{ role: string }> = ({ role }) => {
  const { tasks, summary, loading } = useProfileWorkload();
  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(now.getDate() + 3);

  const manager = role === 'manager';
  const completed = tasks.filter(task => isDone(task.status));
  const completedOnTime = completed.filter(task => !task.due_date || new Date(task.updated_at) <= new Date(`${task.due_date}T23:59:59`)).length;
  const cycleDays = completed.length
    ? completed.reduce((sum, task) => sum + Math.max(0, new Date(task.updated_at).getTime() - new Date(task.created_at).getTime()), 0) / completed.length / 86_400_000
    : 0;
  const todayCount = tasks.filter(task => !isDone(task.status) && task.due_date && new Date(task.due_date).toDateString() === now.toDateString()).length;
  const dueSoon = tasks.filter(task => !isDone(task.status) && task.due_date && new Date(task.due_date) > now && new Date(task.due_date) <= inThreeDays).length;

  const metrics: Metric[] = manager ? [
    { label: 'Đúng hạn', value: completed.length ? `${Math.round(completedOnTime / completed.length * 100)}%` : '—', icon: <CheckCircle2 size={14} />, tone: 'text-teal-600' },
    { label: 'Điểm nghẽn', value: String(summary.overdue), icon: <AlertTriangle size={14} />, tone: 'text-red-600' },
    { label: 'Vận tốc', value: completed.length ? `${cycleDays.toFixed(1)} ngày` : '—', icon: <Clock3 size={14} />, tone: 'text-blue-600' },
    { label: 'Task đang mở', value: String(summary.open), icon: <UsersRound size={14} />, tone: 'text-violet-600' },
  ] : [
    { label: 'Hôm nay', value: String(todayCount), icon: <PlayCircle size={14} />, tone: 'text-blue-600' },
    { label: 'Quá hạn', value: String(summary.overdue), icon: <AlertTriangle size={14} />, tone: 'text-red-600' },
    { label: 'Sắp đến hạn', value: String(dueSoon), icon: <Clock3 size={14} />, tone: 'text-amber-600' },
    { label: 'Chờ duyệt', value: String(summary.pendingBorrow), icon: <CheckCircle2 size={14} />, tone: 'text-teal-600' },
  ];

  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Chỉ số công việc cá nhân">
    {metrics.map(metric => <div key={metric.label} className="min-w-0 rounded-xl border border-primary/10 bg-white/70 px-3 py-2.5 dark:border-[#8fa8d0] dark:bg-slate-800/80">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${metric.tone}`}>{metric.icon}<span className="truncate">{metric.label}</span></div>
      <strong className="mt-1 block truncate text-lg font-bold leading-tight text-gray-900 dark:text-white">{loading ? '—' : metric.value}</strong>
    </div>)}
  </div>;
};
