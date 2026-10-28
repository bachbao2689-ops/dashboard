import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Edit3 } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { statusMeta } from '../../../utils/statusTheme';
import { priorityClass } from './projectPresentation';

interface EntityActionBadgesProps {
  priority: string;
  status: string;
  onPriorityChange?: (newPriority: string) => unknown;
  onStatusChange?: (newStatus: string) => unknown;
  onEdit?: () => void;
  canManage?: boolean;
}

export const EntityActionBadges: React.FC<EntityActionBadgesProps> = ({
  priority,
  status,
  onPriorityChange,
  onStatusChange,
  onEdit,
  canManage = true,
}) => {
  const { lang, t } = useTranslation();
  const isEn = lang === 'en';

  const [priorityOpen, setPriorityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPriorityOpen(false);
        setStatusOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPriorityOpen(false);
        setStatusOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentPriority = (priority || 'medium').toLowerCase();
  const currentStatus = (status || 'planning').toLowerCase();

  const priorityOptions = [
    { value: 'urgent', label: isEn ? 'Urgent' : 'Khẩn cấp', dotClass: 'bg-rose-500' },
    { value: 'high', label: isEn ? 'High' : 'Cao', dotClass: 'bg-red-500' },
    { value: 'medium', label: isEn ? 'Medium' : 'Trung bình', dotClass: 'bg-amber-500' },
    { value: 'low', label: isEn ? 'Low' : 'Thấp', dotClass: 'bg-blue-500' },
  ];

  const statusOptions = [
    { value: 'planning', label: isEn ? 'Planning' : 'Lên kế hoạch', dotClass: 'bg-amber-400' },
    { value: 'active', label: isEn ? 'In Progress' : 'Đang thực hiện', dotClass: 'bg-sky-400' },
    { value: 'completed', label: isEn ? 'Completed' : 'Hoàn thành', dotClass: 'bg-emerald-500' },
    { value: 'on_hold', label: isEn ? 'On Hold' : 'Tạm dừng', dotClass: 'bg-slate-400' },
  ];

  const currentPriorityOpt = priorityOptions.find((p) => p.value === currentPriority) || {
    value: currentPriority,
    label: t(`common.${currentPriority}` as any) || currentPriority,
    dotClass: 'bg-amber-500',
  };

  const meta = statusMeta(currentStatus);
  const enStatusMap: Record<string, string> = {
    'Hoàn thành': 'Completed',
    'Đã duyệt': 'Approved',
    'Đang thực hiện': 'In Progress',
    'Chờ duyệt': 'In Review',
    'Lên kế hoạch': 'Planning',
    'Đang chờ': 'Pending',
    'Quá hạn': 'Overdue',
    'Từ chối': 'Rejected',
    'Đã hủy': 'Canceled',
    'Chưa bắt đầu': 'Todo',
  };
  const currentStatusLabel = isEn ? (enStatusMap[meta.label] || meta.label) : meta.label;

  return (
    <div ref={containerRef} className="grid grid-cols-[auto_auto_1fr] items-center gap-2 w-full relative">
      {/* 1. Priority Dropdown Button */}
      <div className="relative inline-block">
        <button
          type="button"
          disabled={!canManage || !onPriorityChange}
          onClick={() => {
            setStatusOpen(false);
            setPriorityOpen((v) => !v);
          }}
          className={`inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize border border-transparent transition-all ${priorityClass(
            currentPriority,
          )} ${
            canManage && onPriorityChange
              ? 'cursor-pointer hover:shadow-xs hover:border-black/10 dark:hover:border-white/10'
              : 'cursor-default'
          }`}
          aria-expanded={priorityOpen}
          aria-haspopup="listbox"
          title={isEn ? 'Change priority' : 'Đổi mức ưu tiên'}
        >
          <span>{currentPriorityOpt.label}</span>
          {canManage && onPriorityChange && (
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${priorityOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {priorityOpen && (
          <div
            className="absolute top-full left-0 mt-1.5 z-40 w-36 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 backdrop-blur-md"
            role="listbox"
          >
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPriorityOpen(false);
                  if (opt.value !== currentPriority) {
                    onPriorityChange?.(opt.value);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                  currentPriority === opt.value
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Status Dropdown Button */}
      <div className="relative inline-block">
        <button
          type="button"
          disabled={!canManage || !onStatusChange}
          onClick={() => {
            setPriorityOpen(false);
            setStatusOpen((v) => !v);
          }}
          className={`status-badge status-${meta.tone} inline-grid grid-flow-col auto-cols-max items-center gap-1.5 transition-all ${
            canManage && onStatusChange
              ? 'cursor-pointer hover:shadow-xs hover:opacity-90'
              : 'cursor-default'
          }`}
          aria-expanded={statusOpen}
          aria-haspopup="listbox"
          title={isEn ? 'Change status' : 'Đổi trạng thái'}
        >
          <span aria-hidden="true" className="status-dot" />
          <span>{currentStatusLabel}</span>
          {canManage && onStatusChange && (
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {statusOpen && (
          <div
            className="absolute top-full left-0 mt-1.5 z-40 w-44 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 backdrop-blur-md"
            role="listbox"
          >
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStatusOpen(false);
                  if (opt.value !== currentStatus) {
                    onStatusChange?.(opt.value);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                  currentStatus === opt.value
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Edit Icon Button (right aligned) */}
      {canManage && onEdit && (
        <div className="justify-self-end">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title={isEn ? 'Edit details' : 'Chỉnh sửa'}
            aria-label={isEn ? 'Edit details' : 'Chỉnh sửa'}
          >
            <Edit3 size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
