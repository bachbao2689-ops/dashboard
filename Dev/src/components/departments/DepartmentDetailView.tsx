// src/components/departments/DepartmentDetailView.tsx
import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Clock,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type {
  DepartmentDetailData,
  DepartmentId,
  TaskStatusFilter,
  AlertLevel,
} from '../../types/department';
import { DepartmentKpiCards } from './DepartmentKpiCards';

interface DepartmentDetailViewProps {
  data: DepartmentDetailData;
  onBack: () => void;
  onSelectDepartment: (id: DepartmentId) => void;
  formattedTime: string;
  isRefreshing: boolean;
  onRefreshNow: () => void;
  isDark?: boolean;
}

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  data,
  isDark = false,
}) => {
  const [taskFilter, setTaskFilter] = useState<TaskStatusFilter>('all');

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return data.tasks;
    return data.tasks.filter((t) => t.status === taskFilter);
  }, [data.tasks, taskFilter]);

  const tickColor = isDark ? '#94a3b8' : '#52514e';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(137,135,129,0.18)';

  const getStatusBadge = (status: AlertLevel) => {
    switch (status) {
      case 'ok':
        return {
          label: 'Đúng tiến độ',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
          bar: 'bg-emerald-500',
        };
      case 'risk':
        return {
          label: 'Có rủi ro',
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
          bar: 'bg-amber-500',
        };
      case 'late':
        return {
          label: 'Trễ',
          bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
          bar: 'bg-red-500',
        };
    }
  };

  const getTaskStatusStyle = (status: 'late' | 'doing' | 'todo') => {
    switch (status) {
      case 'late':
        return {
          label: 'Quá hạn',
          cls: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
        };
      case 'doing':
        return {
          label: 'Đang làm',
          cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        };
      case 'todo':
        return {
          label: 'Chưa bắt đầu',
          cls: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600',
        };
    }
  };

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'check':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />;
      case 'user-plus':
        return <UserPlus className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 3. Department KPI Cards Row */}
      <DepartmentKpiCards kpis={data.kpis} isOverall={false} />

      {/* 4. Active Projects Grid (Project đang chạy) */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
          Project đang chạy
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {data.projects.map((proj) => {
            const pct = Math.round((proj.completedTasks / proj.totalTasks) * 100);
            const badge = getStatusBadge(proj.status);

            return (
              <div
                key={proj.id}
                className="bg-gray-50/70 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                      {proj.name}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${badge.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                    <span>
                      {proj.completedTasks}/{proj.totalTasks} task ({pct}%)
                    </span>
                    <span>Hạn {proj.deadline}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-1 pt-1.5 border-t border-gray-200/50 dark:border-slate-700/50">
                  <span>Phụ trách: {proj.manager}</span>
                  {proj.overdueCount > 0 ? (
                    <span className="text-red-700 dark:text-red-400 font-semibold">
                      {proj.overdueCount} quá hạn
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Không quá hạn</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Active Tasks Table with Filter Chips */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
            Task đang hoạt động
          </p>
          <div className="flex items-center gap-1">
            {(
              [
                { key: 'all', label: 'Tất cả' },
                { key: 'late', label: 'Quá hạn' },
                { key: 'doing', label: 'Đang làm' },
                { key: 'todo', label: 'Chưa bắt đầu' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTaskFilter(f.key)}
                className={`px-2.5 py-0.5 text-xs rounded-full border transition-all ${
                  taskFilter === f.key
                    ? 'bg-blue-600 text-white border-blue-600 font-medium'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_96px_36px_84px_52px] gap-2.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 pb-1.5 px-1 border-b border-gray-100 dark:border-slate-700">
          <div>Task</div>
          <div>Trạng thái</div>
          <div className="text-center">PIC</div>
          <div>Hạn</div>
          <div>Ưu tiên</div>
        </div>

        {/* Table Body (Internal Scroll Container for zero layout shift) */}
        <div className="divide-y divide-gray-100 dark:divide-slate-700/60 max-h-[160px] overflow-y-auto scrollbar-hide">
          {filteredTasks.map((t) => {
            const statusStyle = getTaskStatusStyle(t.status);
            const isLate = t.status === 'late';
            const isHighPriority = t.priority === 'Cao';

            return (
              <div
                key={t.id}
                className="grid grid-cols-[minmax(0,1fr)_96px_36px_84px_52px] gap-2.5 items-center py-2 text-xs px-1 hover:bg-gray-50/60 dark:hover:bg-slate-700/20 rounded transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500">
                    {t.projectTag}
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.cls}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>
                <div className="flex justify-center">
                  <span
                    className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0"
                    title={t.assignee}
                  >
                    {t.assignee[0]}
                  </span>
                </div>
                <span
                  className={`text-xs ${
                    isLate
                      ? 'text-red-700 dark:text-red-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t.dueDate}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isHighPriority
                      ? 'text-red-700 dark:text-red-400 font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t.priority}
                </span>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
              Không có task nào trong trạng thái này
            </div>
          )}
        </div>
      </div>

      {/* 6. Burndown & Member Workload 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Burndown Chart Card */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              Burndown: task còn lại
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[#2a78d6] inline-block" />
                Thực tế
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-0.5 bg-[#898781] inline-block border-b border-dashed border-[#898781]" />
                Kế hoạch
              </span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.burndown}
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
                  domain={[0, 80]}
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
                          Tuần {label}
                        </p>
                        <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400">
                          <span>Thực tế còn lại:</span>
                          <b>{payload[0].value} task</b>
                        </div>
                        {payload[1] && (
                          <div className="flex items-center justify-between gap-4 text-gray-500 dark:text-gray-400">
                            <span>Kế hoạch:</span>
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
                  name="Thực tế"
                  stroke="#2a78d6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2a78d6' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="planned"
                  name="Kế hoạch"
                  stroke="#898781"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Workload Card */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[260px] justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              Mức tải theo thành viên (% công suất)
            </p>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              &gt;100% quá tải (đỏ)
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {data.members.map((m) => {
              const isOverload = m.capacityPct > 100;
              // Normalize bar width to max 110%
              const barWidth = Math.min(m.capacityPct, 110) / 110 * 100;
              const thresholdPos = (100 / 110) * 100;

              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[24px_52px_1fr_40px] gap-2 items-center text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] flex items-center justify-center shrink-0">
                    {m.initial}
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
                      title="Ngưỡng 100% công suất"
                    />
                  </div>
                  <span
                    className={`text-right font-semibold text-xs ${
                      isOverload
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {m.capacityPct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Recent Activity Feed Card */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
          Hoạt động gần đây
        </p>
        <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
          {data.activities.map((act) => (
            <div
              key={act.id}
              className="flex items-center gap-2.5 py-2 text-xs text-gray-700 dark:text-gray-300"
            >
              {getActivityIcon(act.icon)}
              <span className="flex-1 font-medium">{act.title}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
