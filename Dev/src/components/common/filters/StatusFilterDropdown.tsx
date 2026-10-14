import React from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

export interface StatusFilterOption {
  key: string;
  label: string;
  dot: string;
}

interface StatusFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: StatusFilterOption[];
  label?: string;
  icon?: React.ReactNode;
  allKey?: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const StatusFilterDropdown: React.FC<StatusFilterDropdownProps> = ({
  value,
  onChange,
  options,
  label,
  icon,
  allKey = 'all',
  isOpen,
  onToggle,
  onClose,
  align = 'right'
}) => {
  const { t } = useTranslation();
  const defaultLabel = label || t('projects.filterStatus');

  const selectedOption = options.find(o => o.key === value);
  const isFiltered = allKey !== undefined ? value !== allKey : (value !== 'all' && value !== '');
  const displayLabel = isFiltered && selectedOption ? selectedOption.label : defaultLabel;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={onToggle}
        className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
          isFiltered
            ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
        }`}
      >
        {icon ? icon : <CheckCircle2 size={13} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150`}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {defaultLabel}
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
