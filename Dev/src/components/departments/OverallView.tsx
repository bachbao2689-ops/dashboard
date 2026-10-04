// src/components/departments/OverallView.tsx
import React from 'react';
import {
  AlertTriangle,
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
  OverallDashboardData,
  DepartmentId,
  PeriodFilter,
  AlertLevel,
} from '../../types/department';
import { DepartmentKpiCards } from './DepartmentKpiCards';
import { DepartmentComparisonChart } from './DepartmentComparisonChart';
import { DepartmentHeatmap } from './DepartmentHeatmap';

interface OverallViewProps {
  data: OverallDashboardData;
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  onSelectDepartment: (id: DepartmentId) => void;
  formattedTime: string;
  isRefreshing: boolean;
  onRefreshNow: () => void;
  isDark?: boolean;
}

export const OverallView: React.FC<OverallViewProps> = ({
  data,
  onSelectDepartment,
  isDark = false,
}) => {
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

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 2. Warning / Alert Banner */}
      <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="flex-1">{data.warningBanner}</span>
      </div>

      {/* 3. Top 8 KPI Cards Grid */}
      <DepartmentKpiCards kpis={data.kpis} isOverall />

      {/* 4. Middle Stage: Comparison Stacked Bar Chart */}
      <div className="w-full h-[250px]">
        <DepartmentComparisonChart
          data={data.comparison}
          onSelectDepartment={onSelectDepartment}
          isDark={isDark}
        />
      </div>

      {/* 5. Middle 2-Column Grid: Trend Chart + Workload Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Weekly Trend vs Target */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col h-[260px]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              Tỷ lệ hoàn thành theo tuần so với mục tiêu
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[#2a78d6] inline-block" />
                Thực tế
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-0.5 bg-[#898781] inline-block border-b border-dashed border-[#898781]" />
                Mục tiêu
              </span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.weeklyTrends}
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
                  domain={[30, 80]}
                  unit="%"
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
                          <span>Thực tế:</span>
                          <b>{payload[0].value}%</b>
                        </div>
                        {payload[1] && (
                          <div className="flex items-center justify-between gap-4 text-gray-500 dark:text-gray-400">
                            <span>Mục tiêu:</span>
                            <b>{payload[1].value}%</b>
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
                  dataKey="target"
                  name="Mục tiêu"
                  stroke="#898781"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Heatmap */}
        <div className="h-[260px]">
          <DepartmentHeatmap
            data={data.heatmap}
            onSelectDepartment={onSelectDepartment}
          />
        </div>
      </div>

      {/* 6. Cross-Department Project Progress Card */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
          Tiến độ project
        </p>
        <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
          {data.projects.map((proj) => {
            const badge = getStatusBadge(proj.status);
            return (
              <div
                key={proj.id}
                onClick={() => onSelectDepartment(proj.departmentId)}
                className="grid grid-cols-[140px_1fr_64px_96px] gap-3 items-center py-1.5 text-xs cursor-pointer hover:bg-gray-50/60 dark:hover:bg-slate-700/30 rounded-lg px-1 transition-colors"
                title={`Nhấp để xem phòng ban ${proj.department}`}
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white truncate block">
                    {proj.name}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                    {proj.department}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${badge.bar}`}
                    style={{ width: `${proj.progress}%` }}
                  />
                </div>
                <span className="text-right font-medium text-gray-700 dark:text-gray-300">
                  {proj.progress}%
                </span>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
