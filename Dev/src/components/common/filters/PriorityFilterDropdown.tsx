import React, { useRef, useEffect } from 'react';
import { ArrowUpDown, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

interface PriorityFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const PriorityFilterDropdown: React.FC<PriorityFilterDropdownProps> = ({
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
  align = 'right'
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isOpen, onClose]);

  const options = [
    { key: 'all', label: t('projects.allPriorities'), dot: 'bg-gray-400' },
    { key: 'urgent', label: t('projects.priorityUrgent'), dot: 'bg-red-500' },
    { key: 'high', label: t('projects.priorityHigh'), dot: 'bg-rose-500' },
    { key: 'medium', label: t('projects.priorityMedium'), dot: 'bg-amber-400' },
    { key: 'low', label: t('projects.priorityLow'), dot: 'bg-blue-400' }
  ];

  const selectedOption = options.find(o => o.key === value);
  const displayLabel = value !== 'all' && selectedOption ? selectedOption.label : t('projects.filterPriority');
  const isFiltered = value !== 'all';

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
        className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
          isFiltered
            ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
        }`}
      >
        <ArrowUpDown size={13} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />
        <span className="max-w-[110px] truncate">{displayLabel}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150`}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t('projects.filterPriority')}
          </div>
          {options.map(opt => {
            const active = value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  onClose();
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                  active
                    ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </span>
                {active && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
