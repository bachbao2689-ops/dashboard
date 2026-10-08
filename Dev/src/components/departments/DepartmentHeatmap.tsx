// src/components/departments/DepartmentHeatmap.tsx
import React from 'react';
import type { HeatmapRow, DepartmentId } from '../../types/department';

interface DepartmentHeatmapProps {
  data: HeatmapRow[];
  onSelectDepartment?: (id: DepartmentId) => void;
}

export const DepartmentHeatmap: React.FC<DepartmentHeatmapProps> = ({
  data,
  onSelectDepartment,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-[#8fa8d0] rounded-2xl p-4 shadow-sm flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
          Mức tải công việc (% công suất)
        </p>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          &gt;100% quá tải (đỏ)
        </span>
      </div>

      <div className="grid grid-cols-[84px_repeat(4,1fr)] gap-1 text-xs">
        {/* Header row */}
        <div />
        <div className="text-center font-medium text-gray-400 dark:text-gray-500 text-[11px] py-1">
          Tuần 1
        </div>
        <div className="text-center font-medium text-gray-400 dark:text-gray-500 text-[11px] py-1">
          Tuần 2
        </div>
        <div className="text-center font-medium text-gray-400 dark:text-gray-500 text-[11px] py-1">
          Tuần 3
        </div>
        <div className="text-center font-medium text-gray-400 dark:text-gray-500 text-[11px] py-1">
          Tuần 4
        </div>

        {/* Data rows */}
        {data.map((row) => (
          <React.Fragment key={row.id}>
            <button
              type="button"
              onClick={() => onSelectDepartment?.(row.id)}
              className="text-left text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium py-1 px-1 rounded transition-colors text-xs truncate"
              title={`Xem chi tiết ${row.name}`}
            >
              {row.name}
            </button>
            {row.weeks.map((val, idx) => {
              const isOverload = val > 100;
              const alpha = isOverload ? 0.75 : Math.max(0.12, (val - 30) / 100);
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
  );
};
