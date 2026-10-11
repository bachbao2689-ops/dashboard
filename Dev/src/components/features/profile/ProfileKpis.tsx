import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, PlayCircle, UsersRound } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import { useTranslation } from '../../../i18n/translations';

const isDone = (status?: string | null) => ['done', 'completed', 'complete', 'cancelled', 'canceled'].includes((status || '').toLowerCase());

type Metric = { label: string; value: string; icon: React.ReactNode; tone: string };

export const ProfileKpis: React.FC<{ role: string }> = ({ role }) => {
  const { t } = useTranslation();
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
    { label: t('profile.onTime'), value: completed.length ? `${Math.round(completedOnTime / completed.length * 100)}%` : '—', icon: <CheckCircle2 size={14} />, tone: 'text-teal-600' },
    { label: t('profile.bottlenecks'), value: String(summary.overdue), icon: <AlertTriangle size={14} />, tone: 'text-red-600' },
    { label: t('profile.velocity'), value: completed.length ? `${cycleDays.toFixed(1)} ${t('profile.daysUnit')}` : '—', icon: <Clock3 size={14} />, tone: 'text-blue-600' },
    { label: t('profile.openTasks'), value: String(summary.open), icon: <UsersRound size={14} />, tone: 'text-violet-600' },
  ] : [
    { label: t('profile.today'), value: String(todayCount), icon: <PlayCircle size={14} />, tone: 'text-blue-600' },
    { label: t('profile.overdue'), value: String(summary.overdue), icon: <AlertTriangle size={14} />, tone: 'text-red-600' },
    { label: t('profile.dueSoon'), value: String(dueSoon), icon: <Clock3 size={14} />, tone: 'text-amber-600' },
    { label: t('profile.pendingApproval'), value: String(summary.pendingBorrow), icon: <CheckCircle2 size={14} />, tone: 'text-teal-600' },
  ];

  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 p-0.5" aria-label={t('profile.kpiTitle')}>
    {metrics.map(metric => {
      let toneColor = 'magnetic-blue';
      if (metric.tone.includes('red')) toneColor = 'magnetic-rose';
      else if (metric.tone.includes('teal')) toneColor = 'magnetic-emerald';
      else if (metric.tone.includes('amber')) toneColor = 'magnetic-amber';
      else if (metric.tone.includes('violet')) toneColor = 'magnetic-violet';

      return (
        <div key={metric.label} className={`min-w-0 rounded-xl border border-primary/10 bg-white/70 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/80 hover-magnetic-card ${toneColor} transition-all`}>
          <div className={`flex items-start gap-1.5 text-[10px] font-bold uppercase tracking-wide ${metric.tone}`}>{metric.icon}<span className="break-words sm:truncate">{metric.label}</span></div>
          <strong className="mt-1 block break-words text-lg font-bold leading-tight text-gray-900 dark:text-white sm:truncate">{loading ? '—' : metric.value}</strong>
        </div>
      );
    })}
  </div>;
};
