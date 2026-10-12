import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, PlayCircle, UsersRound, Info } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import { useTranslation } from '../../../i18n/translations';

const isDone = (status?: string | null) => ['done', 'completed', 'complete', 'cancelled', 'canceled'].includes((status || '').toLowerCase());

interface MetricTooltip {
  title: string;
  mechanism: string;
  formula: string;
  note?: string;
}

type Metric = {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  tooltip: MetricTooltip;
};

export const ProfileKpis: React.FC<{ role: string }> = ({ role }) => {
  const { t, lang } = useTranslation();
  const { tasks, summary, loading } = useProfileWorkload();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

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

  useEffect(() => {
    if (!activeTooltip) return;
    const handleClickOutside = () => setActiveTooltip(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeTooltip]);

  const metrics: Metric[] = manager ? [
    {
      id: 'onTime',
      label: t('profile.onTime'),
      value: completed.length ? `${Math.round(completedOnTime / completed.length * 100)}%` : '—',
      icon: <CheckCircle2 size={14} />,
      tone: 'text-teal-600',
      tooltip: {
        title: lang === 'vi' ? 'Đúng hạn (On-time Rate)' : 'On-Time Rate',
        mechanism: lang === 'vi'
          ? 'Đo lường % task hoàn thành đúng cam kết deadline.'
          : 'Percentage of tasks completed on or before deadline.',
        formula: '(Task xong đúng hạn / Tổng task đã xong) × 100%',
        note: lang === 'vi'
          ? 'Hệ thống tính mốc Deadline lúc 23:59:59 của ngày đáo hạn.'
          : 'Based on 23:59:59 cutoff of the deadline date.'
      }
    },
    {
      id: 'bottlenecks',
      label: t('profile.bottlenecks'),
      value: String(summary.overdue),
      icon: <AlertTriangle size={14} />,
      tone: 'text-red-600',
      tooltip: {
        title: lang === 'vi' ? 'Điểm nghẽn (Bottlenecks)' : 'Bottlenecks',
        mechanism: lang === 'vi'
          ? 'Số lượng điểm nóng bị quá hạn, gây tắc nghẽn guồng máy vận hành.'
          : 'Number of overdue tasks causing operational bottlenecks.',
        formula: lang === 'vi' ? 'Tổng số task chưa xong nhưng đã quá hạn Deadline' : 'Total uncompleted tasks past due date',
        note: lang === 'vi' ? 'Chỉ số càng thấp thì tiến độ công việc càng thông suốt.' : 'Lower number indicates healthier workflow.'
      }
    },
    {
      id: 'velocity',
      label: t('profile.velocity'),
      value: completed.length ? `${cycleDays.toFixed(1)} ${t('profile.daysUnit')}` : '—',
      icon: <Clock3 size={14} />,
      tone: 'text-blue-600',
      tooltip: {
        title: lang === 'vi' ? 'Vận tốc (Velocity)' : 'Velocity',
        mechanism: lang === 'vi'
          ? 'Tốc độ tiêu hoá công việc trung bình (số ngày để xong 1 task).'
          : 'Average days taken to complete a task from creation to completion.',
        formula: lang === 'vi' ? 'Tổng thời gian các task xong / Tổng số task đã xong' : 'Total completion time / Total completed tasks',
        note: lang === 'vi'
          ? 'VD: 1.6 ngày nghĩa là trung bình team mất 1.6 ngày để xong 1 đầu việc.'
          : 'e.g. 1.6 days means 1.6 days per task on average.'
      }
    },
    {
      id: 'openTasks',
      label: t('profile.openTasks'),
      value: String(summary.open),
      icon: <UsersRound size={14} />,
      tone: 'text-violet-600',
      tooltip: {
        title: lang === 'vi' ? 'Task đang mở (Open Tasks)' : 'Open Tasks',
        mechanism: lang === 'vi'
          ? 'Khối lượng công việc (Workload) hiện tại đang đảm nhiệm.'
          : 'Current active workload under responsibility.',
        formula: lang === 'vi' ? 'Tổng task ở trạng thái chưa hoàn thành (Todo, In Progress...)' : 'Total tasks in Todo, In Progress, Review...',
        note: lang === 'vi' ? 'Phản ánh áp lực công việc hiện tại của nhân sự và team.' : 'Reflects total ongoing task load.'
      }
    }
  ] : [
    {
      id: 'today',
      label: t('profile.today'),
      value: String(todayCount),
      icon: <PlayCircle size={14} />,
      tone: 'text-blue-600',
      tooltip: {
        title: lang === 'vi' ? 'Hạn hôm nay (Today)' : 'Due Today',
        mechanism: lang === 'vi'
          ? 'Các đầu việc cần tập trung xử lý và hoàn tất ngay trong ngày.'
          : 'Tasks that need to be completed today.',
        formula: lang === 'vi' ? 'Số task chưa xong có Deadline là hôm nay' : 'Uncompleted tasks due today'
      }
    },
    {
      id: 'overdue',
      label: t('profile.overdue'),
      value: String(summary.overdue),
      icon: <AlertTriangle size={14} />,
      tone: 'text-red-600',
      tooltip: {
        title: lang === 'vi' ? 'Quá hạn (Overdue)' : 'Overdue Tasks',
        mechanism: lang === 'vi'
          ? 'Các task đã vượt quá thời hạn cam kết, cần ưu tiên xử lý gấp.'
          : 'Tasks past their committed deadline requiring immediate focus.',
        formula: lang === 'vi' ? 'Số task chưa xong có Deadline trước hôm nay' : 'Uncompleted tasks with past due dates'
      }
    },
    {
      id: 'dueSoon',
      label: t('profile.dueSoon'),
      value: String(dueSoon),
      icon: <Clock3 size={14} />,
      tone: 'text-amber-600',
      tooltip: {
        title: lang === 'vi' ? 'Sắp đến hạn (Due Soon)' : 'Due Soon',
        mechanism: lang === 'vi'
          ? 'Các task sắp đến hạn trong vòng 3 ngày tới để chủ động tiến độ.'
          : 'Tasks due within the next 3 days to help plan ahead.',
        formula: lang === 'vi' ? 'Số task có Deadline trong 1 - 3 ngày tới' : 'Uncompleted tasks due in 1-3 days'
      }
    },
    {
      id: 'pendingApproval',
      label: t('profile.pendingApproval'),
      value: String(summary.pendingBorrow),
      icon: <CheckCircle2 size={14} />,
      tone: 'text-teal-600',
      tooltip: {
        title: lang === 'vi' ? 'Chờ duyệt (Pending)' : 'Pending Approvals',
        mechanism: lang === 'vi'
          ? 'Yêu cầu mượn thiết bị đang gửi chờ Leader/Manager phê duyệt.'
          : 'Equipment borrow requests waiting for approval.',
        formula: lang === 'vi' ? 'Số phiếu mượn thiết bị ở trạng thái chờ duyệt' : 'Total borrow requests with Pending status'
      }
    }
  ];

  const getTooltipAlignClass = (idx: number) => {
    const mobileClass = idx % 2 === 0 ? 'left-0' : 'right-0';
    if (idx === 0) return `${mobileClass} sm:left-0 sm:right-auto sm:translate-x-0`;
    if (idx === 3) return `${mobileClass} sm:right-0 sm:left-auto sm:translate-x-0`;
    return `${mobileClass} sm:left-1/2 sm:-translate-x-1/2 sm:right-auto`;
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 p-0.5" aria-label={t('profile.kpiTitle')}>
      {metrics.map((metric, index) => {
        let toneColor = 'magnetic-blue';
        if (metric.tone.includes('red')) toneColor = 'magnetic-rose';
        else if (metric.tone.includes('teal')) toneColor = 'magnetic-emerald';
        else if (metric.tone.includes('amber')) toneColor = 'magnetic-amber';
        else if (metric.tone.includes('violet')) toneColor = 'magnetic-violet';

        const isTooltipOpen = activeTooltip === metric.id;

        return (
          <div
            key={metric.id}
            className={`min-w-0 rounded-xl border border-primary/10 bg-white/70 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/80 hover-magnetic-card ${toneColor} transition-all relative group/card`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${metric.tone}`}>
                {metric.icon}
                <span className="break-words sm:truncate">{metric.label}</span>
              </div>

              {/* Chữ i khoanh tròn ở góc trên bên phải */}
              <div
                className="relative flex items-center shrink-0"
                onMouseEnter={() => setActiveTooltip(metric.id)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(prev => prev === metric.id ? null : metric.id);
                  }}
                  className="flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-help"
                  aria-label={`Thông tin chỉ số ${metric.tooltip.title}`}
                >
                  <Info size={11} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <strong className="mt-1 block break-words text-lg font-bold leading-tight text-gray-900 dark:text-white sm:truncate">
              {loading ? '—' : metric.value}
            </strong>

            {/* Tooltip hiển thị khi hover hoặc click vào icon i */}
            {isTooltipOpen && (
              <div
                role="tooltip"
                onMouseEnter={() => setActiveTooltip(metric.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                className={`absolute z-[70] ${getTooltipAlignClass(index)} top-full mt-2 w-64 sm:w-72 p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/90 dark:border-slate-700/90 shadow-xl animate-fade-in-up text-left`}
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                  <span className={`p-1 rounded-md bg-gray-100 dark:bg-slate-800 ${metric.tone}`}>
                    {metric.icon}
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {metric.tooltip.title}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">Cơ chế: </span>
                    <span>{metric.tooltip.mechanism}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 text-[10px] leading-relaxed">
                    <span className="font-semibold text-gray-500 dark:text-slate-400 block mb-0.5">Cách tính:</span>
                    <span className="font-mono text-primary dark:text-blue-400 font-medium">{metric.tooltip.formula}</span>
                  </div>

                  {metric.tooltip.note && (
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 italic">
                      *{metric.tooltip.note}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
