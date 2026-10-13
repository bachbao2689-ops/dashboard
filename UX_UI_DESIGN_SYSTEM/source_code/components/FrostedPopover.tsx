import React, { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export interface FrostedPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  placement?: 'bottom' | 'top' | 'auto';
  isNearBottom?: boolean;
}

/**
 * FrostedPopover: Strictly Local Frosted Glass Popover (NO FULL-SCREEN BLUR).
 * Uses backdrop-blur-2xl bg-white/88 dark:bg-slate-900/88 with delicate borders and deep soft shadow.
 * Only pixels directly underneath this popup frame are frosted; rest of page remains 100% crisp.
 */
export const FrostedPopover: React.FC<FrostedPopoverProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className = '',
  placement = 'auto',
  isNearBottom = false,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, onClose, isOpen);

  if (!isOpen) return null;

  const directionClass =
    placement === 'top' || (placement === 'auto' && isNearBottom)
      ? 'bottom-[calc(100%+8px)]'
      : 'top-[calc(100%+8px)]';

  return (
    <div
      ref={popoverRef}
      role="tooltip"
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 left-0 ${directionClass} w-72 sm:w-80 p-4 rounded-2xl frosted-popover text-left pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100 dark:border-slate-800">
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xs p-1 rounded-md transition-colors"
            aria-label="Đóng popup"
          >
            ✕
          </button>
        </div>
      )}
      <div className="space-y-2 text-[11px] text-gray-600 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
};
