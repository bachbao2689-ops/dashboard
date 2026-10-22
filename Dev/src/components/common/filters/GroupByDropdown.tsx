import {FilterPopover} from './FilterPopover';
import {ActionButton} from '../ActionButton';
import React, { useRef, useEffect } from 'react';
import { Layers, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

interface GroupByDropdownProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const GroupByDropdown: React.FC<GroupByDropdownProps> = ({
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
  align = 'right'
}) => {
  const { t } = useTranslation();
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

  const options = [
    { key: 'none', label: t('common.none') },
    { key: 'department', label: t('common.department') },
    { key: 'project', label: t('common.project') },
    { key: 'assignee', label: t('common.assignee') },
    { key: 'status', label: t('common.status') }
  ];

  const selectedOption = options.find(o => o.key === value);
  const displayLabel = value !== 'none' && selectedOption ? `${selectedOption.label}` : (t('common.none') === 'None' ? 'Group: None' : 'Nhóm: Không');
  const isGrouped = value !== 'none';

  return (
    <div ref={containerRef} className="mobile-filter-control relative inline-block text-left">
      <ActionButton icon={<Layers size={13} className={isGrouped ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
        type="button"
        aria-expanded={isOpen}
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
        className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
          isGrouped
            ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
        }`}
      >

        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </ActionButton>

      {isOpen && (
        <FilterPopover onClose={onClose} anchorRef={containerRef} panelRef={panelRef} align={align}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150`}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t('common.none') === 'None' ? 'Group Tasks' : 'Nhóm công việc'}
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
                <span>{opt.label}</span>
                {active && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
              </button>
            );
          })}
        </FilterPopover>
      )}
    </div>
  );
};
