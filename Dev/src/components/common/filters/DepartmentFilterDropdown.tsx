import {FilterPopover} from './FilterPopover';
import {ActionButton} from '../ActionButton';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Building2, ChevronDown, CheckCircle2, Search, X } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

interface DepartmentFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  departments: { id: string | number; name: string }[];
  label?: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
  disabled?: boolean;
  compact?: boolean;
}

export const DepartmentFilterDropdown: React.FC<DepartmentFilterDropdownProps> = ({
  value,
  onChange,
  departments,
  label,
  isOpen,
  onToggle,
  onClose,
  align = 'right',
  disabled = false,
  compact = false,
}) => {
  const { t, lang } = useTranslation();
  const defaultLabel = label || t('common.allDepartments');
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isOpen, onClose]);

  const selectedDept = departments.find(d => String(d.id) === String(value));
  const displayLabel = value && selectedDept ? selectedDept.name : defaultLabel;
  const isFiltered = Boolean(value);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.trim().toLowerCase();
    return departments.filter(d => (d.name || '').toLowerCase().includes(q));
  }, [departments, searchQuery]);

  return (
    <div ref={containerRef} className="mobile-filter-control relative inline-block text-left">
      <ActionButton
        icon={<Building2 size={14} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
        type="button"
        aria-expanded={isOpen}
        disabled={disabled}
        title={
          disabled
            ? (selectedDept ? `Cố định: ${selectedDept.name}` : 'Cố định theo phòng ban')
            : isFiltered
            ? `${t('common.department')}: ${displayLabel}`
            : defaultLabel
        }
        aria-label={
          disabled
            ? (selectedDept ? `Cố định: ${selectedDept.name}` : 'Cố định theo phòng ban')
            : isFiltered
            ? `${t('common.department')}: ${displayLabel}`
            : defaultLabel
        }
        onClick={e => {
          if (disabled) return;
          e.stopPropagation();
          onToggle();
        }}
        className={
          compact
            ? `w-[34px] h-[34px] p-0 rounded-[8px] text-xs font-medium grid place-items-center transition-colors relative ${
                disabled
                  ? 'bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 opacity-90 cursor-default'
                  : isFiltered
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 font-semibold cursor-pointer'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/60 cursor-pointer'
              }`
            : `h-9 px-3 rounded-[8px] border text-xs font-medium inline-grid grid-flow-col auto-cols-max items-center gap-1.5 transition-all shadow-2xs ${
                disabled
                  ? 'border-sky-500/50 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 opacity-90 cursor-default font-semibold'
                  : isFiltered
                  ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold cursor-pointer'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60 cursor-pointer'
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
            {!disabled && <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
          </>
        )}
      </ActionButton>

      {isOpen && (
        <FilterPopover onClose={onClose} anchorRef={containerRef} panelRef={panelRef} align={align}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 grid grid-rows-[auto_auto_1fr] max-h-80`}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-1.5 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t('common.department')}
          </div>

          {/* Quick Search Department Input */}
          <div className="pb-1.5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'en' ? 'Search department...' : 'Tìm phòng ban...'}
                className="w-full text-xs pl-7 pr-6 py-1.5 rounded-[6px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar grid grid-cols-1 gap-0.5 max-h-56">
            <button
              type="button"
              onClick={() => {
                onChange('');
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                !value
                  ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{defaultLabel}</span>
              {!value && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
            </button>
            {filteredDepartments.map(d => {
              const active = String(d.id) === String(value);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onChange(String(d.id));
                    onClose();
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                    active
                      ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="truncate">{d.name}</span>
                  {active && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
                </button>
              );
            })}
            {filteredDepartments.length === 0 && (
              <div className="py-3 text-center text-xs text-gray-400">
                {lang === 'en' ? 'No departments found' : 'Không tìm thấy phòng ban'}
              </div>
            )}
          </div>
        </FilterPopover>
      )}
    </div>
  );
};
