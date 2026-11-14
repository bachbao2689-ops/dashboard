import {FilterPopover} from './FilterPopover';
import {ActionButton} from '../ActionButton';
import React, { useRef, useEffect } from 'react';
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
  compact?: boolean;
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
  align = 'right',
  compact = false,
}) => {
  const { t } = useTranslation();
  const defaultLabel = label || t('projects.filterStatus');
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isOpen, onClose]);

  const selectedOption = options.find(o => o.key === value);
  const isFiltered = allKey !== undefined ? value !== allKey : (value !== 'all' && value !== '');
  const displayLabel = isFiltered && selectedOption ? selectedOption.label : defaultLabel;

  return (
    <div ref={containerRef} className="mobile-filter-control relative inline-block text-left">
      <ActionButton
        icon={icon || <CheckCircle2 size={14} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
        type="button"
        aria-expanded={isOpen}
        data-filtered={isFiltered ? 'true' : undefined}
        title={isFiltered ? `${t('projects.filterStatus')}: ${displayLabel}` : defaultLabel}
        aria-label={isFiltered ? `${t('projects.filterStatus')}: ${displayLabel}` : defaultLabel}
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
        className={
          compact
            ? `filter-dropdown-trigger w-[34px] h-[34px] p-0 rounded-[8px] text-xs font-medium grid place-items-center transition-colors relative cursor-pointer ${
                isFiltered
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/60'
              }`
            : `filter-dropdown-trigger h-9 px-3 rounded-[8px] border text-xs font-medium inline-grid grid-flow-col auto-cols-max items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                isFiltered
                  ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`
        }
      >
        {compact ? (
          isFiltered && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-white dark:ring-slate-900 pointer-events-none" />
          )
        ) : (
          <>
            <span className="max-w-[120px] truncate">{displayLabel}</span>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </ActionButton>

      {isOpen && (
        <FilterPopover onClose={onClose} anchorRef={containerRef} panelRef={panelRef} align={align}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] grid grid-cols-1 gap-0.5`}
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
                className={`w-full text-left px-3 py-1.5 text-xs grid grid-cols-[1fr_auto] items-center hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                  active
                    ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </span>
                {active && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
              </button>
            );
          })}
        </FilterPopover>
      )}
    </div>
  );
};
