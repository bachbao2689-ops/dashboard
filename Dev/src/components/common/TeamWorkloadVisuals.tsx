import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, Flame, Layers3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeamWorkload } from '../../hooks/useTeamWorkload';
import { useTranslation } from '../../i18n/translations';
import { useUiStore } from '../../store/uiStore';
import { taskLink } from '../../lib/taskTracking';

interface TeamWorkloadVisualsProps {
  departmentFilter?: string;
  selectedMemberId?: string | null;
  onSelectMember?: (id: string | null) => void;
  showMemberDrilldown?: boolean;
  showKpiRibbon?: boolean;
  showComparisonChart?: boolean;
  showHeatmap?: boolean;
  compact?: boolean;
}

export const TeamWorkloadVisuals: React.FC<TeamWorkloadVisualsProps> = ({
  departmentFilter = 'all',
  selectedMemberId: controlledMemberId,
  onSelectMember,
  showMemberDrilldown = false,
  showKpiRibbon = true,
  showComparisonChart = true,
  showHeatmap = true,
  compact = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDark = useUiStore((state) => state.theme === 'dark');
  const { workloads, burndown, heatmap, summary } = useTeamWorkload(departmentFilter);
  const [internalMemberId, setInternalMemberId] = useState<string | null>(null);

  const activeMemberId = controlledMemberId !== undefined ? controlledMemberId : internalMemberId;
  const handleSelectMember = (id: string) => {
    const next = activeMemberId === id ? null : id;
    if (onSelectMember) {
      onSelectMember(next);
    } else {
      setInternalMemberId(next);
    }
  };

  const selectedMember = workloads.find((w) => String(w.id) === String(activeMemberId)) || null;

  const tickColor = isDark ? '#94a3b8' : '#52514e';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(137,135,129,0.18)';

  const maxBurndown = Math.max(
    10,
    ...burndown.map((b) => Math.max(b.actual, b.planned)),
  );
  const yDomainMax = Math.ceil(maxBurndown / 10) * 10;

  const comparisonData = workloads.map((m) => ({
    id: m.id,
    name: m.name,
    displayLabel: `${m.name.length > 14 ? `${m.name.slice(0, 13)}…` : m.name}  ${m.completionPct}%`,
    done: m.doneTotal,
    doing: m.inProgressCount,
    todo: m.todoCount,
    late: m.overdueCount,
    total: m.totalTasksCount,
    completionPct: m.completionPct,
    capacityPercentage: m.capacityPercentage,
  }));

  if (workloads.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Alert / Notification Banner */}
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-xl border shadow-xs ${
          summary.overloadedCount > 0 || summary.overdueTasks > 0
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
            : 'bg-blue-50/80 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/50'
        }`}
      >
        <AlertTriangle
          className={`w-4 h-4 shrink-0 ${
            summary.overloadedCount > 0 || summary.overdueTasks > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-blue-600 dark:text-blue-400'
          }`}
        />
        <span className="flex-1">
          {summary.overloadedCount > 0 || summary.overdueTasks > 0
            ? `Cảnh báo tải công việc: Có ${summary.overloadedCount} thành viên vượt ngưỡng >100% capacity và ${summary.overdueTasks} công việc quá hạn cần ưu tiên xử lý.`
            : `Tải công việc ổn định: ${summary.totalMembers} thành viên đang xử lý ${summary.openTasks} công việc mở (Trung bình ${summary.averageLoad} task/người · 5 task mở = 100% capacity).`}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-slate-700">
          Live Tracking · Team Workload
        </span>
      </div>

      {/* Executive KPI Ribbon (Optional) */}
      {showKpiRibbon && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('departments.kpiCompletion')}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
              {summary.completionRate}%
            </b>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
              {summary.doneTasks}/{summary.totalTasks} công việc
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('departments.kpiInProgress')}</span>
              <Layers3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
              {summary.inProgressTasks}
            </b>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              +{summary.todoTasks} chờ thực hiện
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('departments.kpiOverdue')}</span>
              <Clock className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
            <b
              className={`text-2xl font-bold tracking-tight leading-tight my-0.5 ${
                summary.overdueTasks > 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {summary.overdueTasks}
            </b>
            <span
              className={`text-[11px] truncate font-medium ${
                summary.overdueTasks > 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {summary.overdueTasks > 0 ? 'Cần ưu tiên xử lý' : 'Không có task trễ'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('workload.totalMembers')}</span>
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
              {summary.totalMembers}
            </b>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {summary.openTasks} task đang mở
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('workload.avgTasks')}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                {summary.avgCapacity}%
              </span>
            </div>
            <b className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight my-0.5">
              {summary.averageLoad}
            </b>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Chuẩn 5 task = 100%
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('workload.overloaded')}</span>
              <Flame className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
            <b
              className={`text-2xl font-bold tracking-tight leading-tight my-0.5 ${
                summary.overloadedCount > 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {summary.overloadedCount}
            </b>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {summary.highLoadCount} thành viên ≥80% tải
            </span>
          </div>
        </div>
      )}

      {/* Core 2-Column Grid from Departments UI: BURNDOWN: REMAINING TASKS + MEMBER WORKLOAD (% CAPACITY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Left Card: Burndown Chart */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[270px]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              {t('departments.burndownTitle')}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[#2a78d6] inline-block" />
                {t('departments.actual')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-0.5 bg-[#898781] inline-block border-b border-dashed border-[#898781]" />
                {t('departments.planned')}
              </span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={burndown}
                margin={{ top: 8, right: 12, left: -15, bottom: 0 }}
              >
                <XAxis
                  dataKey="week"
                  stroke={tickColor}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  tick={{ fill: tickColor, fontSize: 11 }}
                />
                <YAxis
                  domain={[0, yDomainMax]}
                  stroke={tickColor}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  tick={{ fill: tickColor, fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">
                          {t('departments.weekLabel', { label: String(label) })}
                        </p>
                        <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400">
                          <span>{t('departments.actualRemaining')}</span>
                          <b>{payload[0].value} task</b>
                        </div>
                        {payload[1] && (
                          <div className="flex items-center justify-between gap-4 text-gray-500 dark:text-gray-400">
                            <span>{t('departments.planned')}</span>
                            <b>{payload[1].value} task</b>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name={t('departments.actual')}
                  stroke="#2a78d6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2a78d6' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="planned"
                  name={t('departments.planned')}
                  stroke="#898781"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Member Workload (% Capacity) */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[270px] justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              {t('departments.memberWorkload')}
            </p>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {t('departments.overloadNotice')}
            </span>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1 justify-center">
            {workloads.map((m) => {
              const isOverload = m.capacityPercentage > 100;
              const barWidth = (Math.min(m.capacityPercentage, 110) / 110) * 100;
              const thresholdPos = (100 / 110) * 100;
              const isSelected = String(activeMemberId) === String(m.id);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMember(m.id)}
                  className={`grid grid-cols-[24px_88px_1fr_44px] sm:grid-cols-[24px_110px_1fr_48px] gap-2 items-center text-xs text-left rounded-lg px-1.5 py-1 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-slate-700/70 ring-1 ring-blue-500/30'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                  }`}
                  title={`${m.name}: ${m.activeTasksCount} task đang mở (${m.capacityPercentage}% capacity)`}
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] flex items-center justify-center shrink-0 overflow-hidden">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.initial
                    )}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 truncate font-medium">
                    {m.name}
                  </span>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverload ? 'bg-[#d03b3b]' : 'bg-[#2a78d6]'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                    {/* 100% threshold marker */}
                    <span
                      className="absolute top-0 bottom-0 w-[1px] bg-gray-400 dark:bg-gray-500"
                      style={{ left: `${thresholdPos}%` }}
                      title={t('departments.capacityThreshold')}
                    />
                  </div>
                  <span
                    className={`text-right font-semibold text-xs ${
                      isOverload
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {m.capacityPercentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Creative Adaptive Visuals Row: Stacked Member Task Breakdown & 4-Week Workload Heatmap */}
      {(showComparisonChart || showHeatmap) && !compact && (
        <div
          className={`grid grid-cols-1 ${
            showComparisonChart && showHeatmap ? 'lg:grid-cols-12' : ''
          } gap-2.5`}
        >
          {showComparisonChart && (
            <div
              className={`${
                showHeatmap ? 'lg:col-span-7' : 'col-span-full'
              } bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[270px]`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
                    PHÂN BỔ TRẠNG THÁI CÔNG VIỆC THEO THÀNH VIÊN
                  </p>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">
                    Nhấp vào từng thanh để xem danh sách công việc đang mở của thành viên
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-sm bg-[#2a78d6] inline-block" />
                    {t('departments.kpiCompletion')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-sm bg-[#85B7EB] inline-block" />
                    {t('departments.kpiInProgress')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-sm bg-[#c3c2b7] dark:bg-[#64748b] inline-block" />
                    {t('departments.filterTodo')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-sm bg-[#d03b3b] inline-block" />
                    {t('departments.kpiOverdue')}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={comparisonData.slice(0, 8)}
                    margin={{ top: 4, right: 10, left: 10, bottom: 0 }}
                    barSize={16}
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload.length > 0) {
                        const item = state.activePayload[0].payload;
                        if (item && item.id) {
                          handleSelectMember(String(item.id));
                        }
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <XAxis
                      type="number"
                      stroke={tickColor}
                      tickLine={false}
                      axisLine={{ stroke: gridColor }}
                      tick={{ fill: tickColor, fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="displayLabel"
                      stroke={tickColor}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                      width={135}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-2.5 text-xs z-50">
                            <p className="font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center justify-between gap-4">
                              <span>{d.name}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-bold">
                                {d.completionPct}% {t('departments.completionSuffix')}
                              </span>
                            </p>
                            <div className="space-y-1 text-gray-600 dark:text-gray-300">
                              <div className="flex justify-between gap-3">
                                <span className="flex items-center gap-1.5">
                                  <i className="w-2 h-2 rounded-full bg-[#2a78d6]" /> {t('departments.kpiCompletion')}:
                                </span>
                                <b className="text-gray-900 dark:text-white">{d.done}</b>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span className="flex items-center gap-1.5">
                                  <i className="w-2 h-2 rounded-full bg-[#85B7EB]" /> {t('departments.kpiInProgress')}:
                                </span>
                                <b className="text-gray-900 dark:text-white">{d.doing}</b>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span className="flex items-center gap-1.5">
                                  <i className="w-2 h-2 rounded-full bg-[#c3c2b7]" /> {t('departments.filterTodo')}:
                                </span>
                                <b className="text-gray-900 dark:text-white">{d.todo}</b>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span className="flex items-center gap-1.5">
                                  <i className="w-2 h-2 rounded-full bg-[#d03b3b]" /> {t('departments.kpiOverdue')}:
                                </span>
                                <b className="text-red-600 dark:text-red-400 font-bold">{d.late}</b>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="done" name={t('departments.kpiCompletion')} stackId="a" fill="#2a78d6" />
                    <Bar dataKey="doing" name={t('departments.kpiInProgress')} stackId="a" fill="#85B7EB" />
                    <Bar
                      dataKey="todo"
                      name={t('departments.filterTodo')}
                      stackId="a"
                      fill={isDark ? '#64748b' : '#c3c2b7'}
                    />
                    <Bar
                      dataKey="late"
                      name={t('departments.kpiOverdue')}
                      stackId="a"
                      fill="#d03b3b"
                      radius={[0, 3, 3, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {showHeatmap && (
            <div
              className={`${
                showComparisonChart ? 'lg:col-span-5' : 'col-span-full'
              } bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[270px] justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
                  {t('departments.workloadTitle')}
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {t('departments.overloadNotice')}
                </span>
              </div>

              <div className="grid grid-cols-[96px_repeat(4,1fr)] gap-1 text-xs overflow-y-auto custom-scrollbar pr-1">
                <div />
                {[1, 2, 3, 4].map((num) => (
                  <div
                    key={num}
                    className="text-center font-medium text-gray-400 dark:text-gray-500 text-[11px] py-1"
                  >
                    {t('departments.weekNum', { num })}
                  </div>
                ))}

                {heatmap.slice(0, 6).map((row) => (
                  <React.Fragment key={row.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectMember(String(row.id))}
                      className="text-left text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium py-1 px-1 rounded transition-colors text-xs truncate"
                      title={row.name}
                    >
                      {row.name}
                    </button>
                    {row.weeks.map((val, idx) => {
                      const isOverload = val > 100;
                      const alpha = isOverload ? 0.75 : Math.max(0.12, (val - 20) / 100);
                      const rgb = isOverload ? '208, 59, 59' : '42, 120, 214';
                      const bgColor = `rgba(${rgb}, ${alpha.toFixed(2)})`;

                      return (
                        <div
                          key={`${row.id}-w${idx}`}
                          style={{ backgroundColor: bgColor }}
                          className={`py-1 text-center rounded text-xs font-medium ${
                            isOverload
                              ? 'text-white font-bold shadow-sm'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                          title={`${row.name} - Tuần ${idx + 1}: ${val}%`}
                        >
                          {val}%
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Member Drilldown Drawer/Card (when showMemberDrilldown is enabled and a member is clicked) */}
      {showMemberDrilldown && selectedMember && (
        <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                {selectedMember.initial}
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedMember.name} · {selectedMember.activeTasksCount} công việc đang mở ({selectedMember.capacityPercentage}% capacity)
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Hoàn thành: {selectedMember.doneTotal} · Đang làm: {selectedMember.inProgressCount} · Chờ làm: {selectedMember.todoCount} · Quá hạn: {selectedMember.overdueCount}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelectMember(selectedMember.id)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700"
            >
              Đóng chi tiết
            </button>
          </div>

          {selectedMember.tasks.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">{t('dashboard.noUpcoming')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {selectedMember.tasks.map((task: any) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => navigate(taskLink(task.id))}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 bg-gray-50/70 dark:bg-slate-900/40 text-left transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-gray-900 dark:text-white">
                      {task.title}
                    </b>
                    <span className="block truncate text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {task.project?.name || task.campaign?.name || 'Task lẻ'} · Hạn: {task.due_date || '—'}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                    Mở task
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
