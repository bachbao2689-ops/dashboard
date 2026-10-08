// src/components/departments/DepartmentComparisonChart.tsx
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { DepartmentComparisonItem, DepartmentId } from '../../types/department';

interface DepartmentComparisonChartProps {
  data: DepartmentComparisonItem[];
  onSelectDepartment: (id: DepartmentId) => void;
  isDark?: boolean;
}

export const DepartmentComparisonChart: React.FC<DepartmentComparisonChartProps> = ({
  data,
  onSelectDepartment,
  isDark = false,
}) => {
  const chartData = data.map((d) => ({
    ...d,
    displayLabel: `${d.name}  ${d.completionPct}%`,
  }));

  const tickColor = isDark ? '#94a3b8' : '#52514e';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(137,135,129,0.18)';

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-[#8fa8d0] rounded-2xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
            So sánh phòng ban (sắp theo số task quá hạn)
          </p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400">
            (Nhấp vào phòng ban để xem chi tiết drill-down)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-[#2a78d6] inline-block" />
            Hoàn thành
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-[#85B7EB] inline-block" />
            Đang làm
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-[#c3c2b7] dark:bg-[#64748b] inline-block" />
            Chưa bắt đầu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm bg-[#d03b3b] inline-block" />
            Quá hạn
          </span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 10, left: 15, bottom: 0 }}
            barSize={18}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const item = state.activePayload[0].payload as DepartmentComparisonItem;
                if (item && item.id) {
                  onSelectDepartment(item.id);
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
            />
            <YAxis
              type="category"
              dataKey="displayLabel"
              stroke={tickColor}
              tickLine={false}
              axisLine={false}
              tick={{ fill: tickColor, fontSize: 12, fontWeight: 500 }}
              width={125}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as DepartmentComparisonItem;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-[#8fa8d0] rounded-lg shadow-lg p-2.5 text-xs z-50">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center justify-between gap-4">
                      <span>{d.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{d.completionPct}% hoàn thành</span>
                    </p>
                    <div className="space-y-1 text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                          <i className="w-2 h-2 rounded-full bg-[#2a78d6]" /> Hoàn thành:
                        </span>
                        <b className="text-gray-900 dark:text-white">{d.done}</b>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                          <i className="w-2 h-2 rounded-full bg-[#85B7EB]" /> Đang làm:
                        </span>
                        <b className="text-gray-900 dark:text-white">{d.doing}</b>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                          <i className="w-2 h-2 rounded-full bg-[#c3c2b7]" /> Chưa bắt đầu:
                        </span>
                        <b className="text-gray-900 dark:text-white">{d.todo}</b>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                          <i className="w-2 h-2 rounded-full bg-[#d03b3b]" /> Quá hạn:
                        </span>
                        <b className="text-red-600 dark:text-red-400 font-bold">{d.late}</b>
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 dark:border-[#8fa8d0] text-[10px] text-blue-500 font-medium text-center">
                        Nhấp để xem chi tiết →
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="done" name="Hoàn thành" stackId="a" fill="#2a78d6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="doing" name="Đang làm" stackId="a" fill="#85B7EB" radius={[0, 0, 0, 0]} />
            <Bar dataKey="todo" name="Chưa bắt đầu" stackId="a" fill={isDark ? '#64748b' : '#c3c2b7'} radius={[0, 0, 0, 0]} />
            <Bar dataKey="late" name="Quá hạn" stackId="a" fill="#d03b3b" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
