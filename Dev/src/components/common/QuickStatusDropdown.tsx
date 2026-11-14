import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useTranslation } from '../../i18n/translations';

export interface QuickStatusOption {
  value: string;
  label: string;
  dotColor: string;
}

export interface QuickStatusDropdownProps {
  currentStatus: string;
  options?: QuickStatusOption[];
  onSelect: (nextStatus: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const QuickStatusDropdown: React.FC<QuickStatusDropdownProps> = ({
  currentStatus,
  options,
  onSelect,
  disabled = false,
  className = '',
  title,
}) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';

  const defaultOptions: QuickStatusOption[] = [
    { value: 'planning', label: isEn ? 'Planning' : 'Lên kế hoạch', dotColor: 'bg-purple-500' },
    { value: 'in_progress', label: isEn ? 'In Progress' : 'Đang thực hiện', dotColor: 'bg-sky-500' },
    { value: 'pending_approval', label: isEn ? 'Pending Approval' : 'Chờ duyệt', dotColor: 'bg-amber-500' },
    { value: 'completed', label: isEn ? 'Completed' : 'Hoàn thành', dotColor: 'bg-emerald-500' },
    { value: 'on_hold', label: isEn ? 'On Hold' : 'Tạm dừng', dotColor: 'bg-amber-500' },
  ];

  const activeOptions = options && options.length > 0 ? options : defaultOptions;

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 165;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    if (left < 12) left = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 220 && rect.top > 180;
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;
    setCoords({ top, left, placeAbove });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const onScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`group/status inline-grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer transition-opacity select-none ${
          disabled ? 'cursor-default opacity-85' : 'hover:opacity-85'
        } ${className}`}
        title={title || (isEn ? 'Click to change status' : 'Bấm để đổi trạng thái')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <StatusBadge status={currentStatus} />
        {!disabled && (
          <ChevronDown
            size={12}
            className={`text-gray-400 group-hover/status:text-gray-600 dark:group-hover/status:text-gray-200 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            data-anchored-popover="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="w-[165px] rounded-[6px] border border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-[#071325]/95 backdrop-blur-md shadow-xl p-1 z-[9999] animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            role="listbox"
          >
            <div className="grid gap-0.5">
              {activeOptions.map((opt) => {
                const normCurrent = (currentStatus || '').toLowerCase().trim().replace(/[ _]+/g, '-');
                const normOpt = opt.value.toLowerCase().trim().replace(/[ _]+/g, '-');
                const isActive =
                  normCurrent === normOpt ||
                  (normOpt === 'pending-approval' && ['pending-approval', 'in-qa', 'in-review', 'review', 'chờ-duyệt'].includes(normCurrent)) ||
                  (normOpt === 'in-progress' && ['in-progress', 'active', 'doing', 'đang-làm', 'đang-thực-hiện'].includes(normCurrent)) ||
                  (normOpt === 'draft' && ['draft', 'todo', 'to-do', 'chưa-bắt-đầu'].includes(normCurrent)) ||
                  (normOpt === 'on-hold' && ['on-hold', 'paused', 'holding', 'tạm-dừng'].includes(normCurrent)) ||
                  (normOpt === 'completed' && ['completed', 'done', 'complete', 'hoàn-thành'].includes(normCurrent));
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      if (!isActive) {
                        void onSelect(opt.value);
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-[5px] text-xs font-semibold grid grid-cols-[auto_1fr_auto] items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors text-left ${
                      isActive
                        ? 'bg-primary/10 text-primary dark:text-primary font-bold'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                    <span className="truncate">{opt.label}</span>
                    {isActive ? <Check size={12} className="text-primary shrink-0" /> : <span className="w-3" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
