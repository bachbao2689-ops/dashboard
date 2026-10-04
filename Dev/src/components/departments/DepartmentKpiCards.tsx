// src/components/departments/DepartmentKpiCards.tsx
import React from 'react';
import type { DepartmentKpis } from '../../types/department';

interface DepartmentKpiCardsProps {
  kpis: DepartmentKpis;
  isOverall?: boolean;
}

export const DepartmentKpiCards: React.FC<DepartmentKpiCardsProps> = ({ kpis, isOverall = false }) => {
  const budgetPct = Math.round((kpis.budgetActual / kpis.budgetTotal) * 100);
  const formattedActual = (kpis.budgetActual / 1000000).toLocaleString('vi-VN');
  const formattedTotal = (kpis.budgetTotal / 1000000).toLocaleString('vi-VN');

  // Dynamic polarity and threshold resolvers
  const isOverdueZero = kpis.overdueTasks === 0;
  const overdueValueColor = isOverdueZero
    ? 'text-gray-900 dark:text-white'
    : 'text-red-700 dark:text-red-400';
  const overdueDeltaColor = isOverdueZero
    ? 'text-gray-500 dark:text-gray-400'
    : 'text-red-700 dark:text-red-400 font-semibold';

  const isOnTimePositive = kpis.onTimeDelta.startsWith('▲') || kpis.onTimeDelta.startsWith('+');
  const isOnTimeNegative = kpis.onTimeDelta.startsWith('▼') || kpis.onTimeDelta.startsWith('-');
  const onTimeDeltaColor = isOnTimePositive
    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
    : isOnTimeNegative
    ? 'text-red-700 dark:text-red-400 font-semibold'
    : 'text-gray-500 dark:text-gray-400 font-medium';

  const hasProjectsAtRisk = isOverall && kpis.projectsAtRiskOrCount > 0;
  const projectRiskColor = hasProjectsAtRisk
    ? 'text-amber-800 dark:text-amber-300'
    : 'text-gray-900 dark:text-white';

  const budgetBadgeClass =
    budgetPct > 100
      ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
      : budgetPct > 90
      ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
      : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {/* 1. Hoàn thành */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hoàn thành</span>
        <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
          {kpis.completionRate}%
        </b>
        <span
          className={`text-[11px] truncate font-medium ${
            isOverall
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {kpis.completionDelta}
        </span>
      </div>

      {/* 2. Quá hạn */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Quá hạn</span>
        <b className={`text-2xl font-bold tracking-tight leading-tight my-0.5 ${overdueValueColor}`}>
          {kpis.overdueTasks}
        </b>
        <span className={`text-[11px] truncate font-medium ${overdueDeltaColor}`}>
          {kpis.overdueDelta}
        </span>
      </div>

      {/* 3. Đang làm */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Đang làm</span>
        <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
          {kpis.inProgressTasks}
        </b>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {kpis.inProgressSub}
        </span>
      </div>

      {/* 4. Đúng hạn */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Đúng hạn</span>
        <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
          {kpis.onTimeRate}%
        </b>
        <span className={`text-[11px] truncate font-medium ${onTimeDeltaColor}`}>
          {kpis.onTimeDelta}
        </span>
      </div>

      {/* 5. Dự án rủi ro / Project */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
          {isOverall ? 'Dự án rủi ro' : 'Project'}
        </span>
        <b className={`text-2xl font-bold tracking-tight leading-tight my-0.5 ${projectRiskColor}`}>
          {kpis.projectsAtRiskOrCount}
        </b>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {kpis.projectsSub}
        </span>
      </div>

      {/* 6. Mandatory R1 Metric: Ngân sách (Budget vs Actual) */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Ngân sách</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${budgetBadgeClass}`}>
            {budgetPct}%
          </span>
        </div>
        <div className="my-0.5">
          <b className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            ₫{formattedActual}M
          </b>
          <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${
                budgetPct > 100
                  ? 'bg-red-500'
                  : budgetPct > 90
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          trên ₫{formattedTotal}M
        </span>
      </div>

      {/* 7. Mandatory R1 Metric: Thời gian task TB */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Thời gian TB</span>
        <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
          {kpis.avgTaskDuration}d
        </b>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          Mục tiêu ≤ {kpis.avgTaskDurationTarget}d
        </span>
      </div>

      {/* 8. Mandatory R1 Metric: Đánh giá hài lòng */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Độ hài lòng</span>
        <b className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 leading-tight my-0.5">
          {kpis.satisfactionScore} <span className="text-xs font-normal text-gray-400">/ 5.0</span>
        </b>
        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate font-medium">
          ★ Tích cực (92%)
        </span>
      </div>
    </div>
  );
};
