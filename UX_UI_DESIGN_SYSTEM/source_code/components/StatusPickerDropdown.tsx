import React, { useRef } from 'react';
import { DESIGN_TOKENS, WorkflowStatusKey } from '../tokens/design-tokens';
import { WorkflowHexagonIcon } from './StatusHexagonBadge';
import { useClickOutside } from '../hooks/useClickOutside';

export interface StatusPickerDropdownProps {
  currentStatus: WorkflowStatusKey;
  isOpen: boolean;
  onSelect: (status: WorkflowStatusKey) => void;
  onClose: () => void;
  isNearBottom?: boolean;
  className?: string;
}

export const STATUS_MARKETING_SUBTITLES: Record<WorkflowStatusKey, string> = {
  backlog: 'Ý tưởng & Chờ duyệt',
  planned: 'Đã lên kế hoạch',
  scoping: 'Làm rõ Brief & Phạm vi',
  in_progress: 'Đang triển khai',
  in_qa: 'Rà soát & Duyệt nội dung',
  completed: 'Đã nghiệm thu & Hoàn tất',
  canceled: 'Đã hủy bỏ',
};

/**
 * StatusPickerDropdown: Cyber liquid popover for selecting among 7 workflow statuses.
 * Includes title, close action, marketing terminology subtitle, and auto top/bottom positioning.
 */
export const StatusPickerDropdown: React.FC<StatusPickerDropdownProps> = ({
  currentStatus,
  isOpen,
  onSelect,
  onClose,
  isNearBottom = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, onClose, isOpen);

  if (!isOpen) return null;

  const allStatuses = Object.keys(DESIGN_TOKENS.colors.status) as WorkflowStatusKey[];

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      className={`absolute left-0 z-50 w-60 sm:w-64 p-2 rounded-2xl frosted-popover space-y-1 animate-in fade-in zoom-in-95 text-left ${
        isNearBottom ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
      } ${className}`}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-gray-100 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          Đổi trạng thái task
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5 rounded-md transition-colors"
          aria-label="Đóng bảng đổi trạng thái"
        >
          ✕
        </button>
      </div>

      {allStatuses.map((st) => {
        const cfg = DESIGN_TOKENS.colors.status[st];
        const isCurrent = currentStatus === st;
        return (
          <button
            key={st}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(st);
            }}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
              isCurrent
                ? 'bg-blue-50/90 dark:bg-slate-800 font-bold ring-1 ring-blue-400/40'
                : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <WorkflowHexagonIcon status={st} size={15} />
              <div className="flex flex-col min-w-0">
                <span className={`text-[11px] font-bold ${cfg.textColor} leading-tight`}>
                  {cfg.label}
                </span>
                <span className="text-[9.5px] text-gray-500 dark:text-slate-400 leading-tight truncate">
                  {STATUS_MARKETING_SUBTITLES[st]}
                </span>
              </div>
            </div>
            {isCurrent && <span className="text-emerald-500 text-xs shrink-0">✓</span>}
          </button>
        );
      })}
    </div>
  );
};
