import {FilterPopover} from './FilterPopover';
import {ActionButton} from '../ActionButton';
import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Avatar } from '../Avatar';
import { useTranslation } from '../../../i18n/translations';

export interface FilterPerson {
  id: string | number;
  name: string;
  avatar_url?: string | null;
  department_name?: string | null;
  departments?: { name: string } | null;
}

interface PicFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  people: FilterPerson[];
  currentUserId?: string | number;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  label?: string;
  allKey?: string;
  allLabel?: string;
  showUnassigned?: boolean;
  showMe?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
  compact?: boolean;
}

export const PicFilterDropdown: React.FC<PicFilterDropdownProps> = ({
  value,
  onChange,
  people,
  currentUserId,
  currentUserName = 'Me',
  currentUserAvatar,
  label,
  allKey = 'all',
  allLabel,
  showUnassigned = true,
  showMe = true,
  isOpen,
  onToggle,
  onClose,
  align = 'right',
  compact = false,
}) => {
  const { t } = useTranslation();
  const defaultLabel = label || t('projects.filterPic');
  const [searchQuery, setSearchQuery] = useState('');
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

  const selectedPerson = people.find(p => String(p.id) === value);
  const displayLabel =
    value === allKey
      ? defaultLabel
      : showMe && value === 'me'
      ? `${t('projects.picAssignedToMe')}`
      : showUnassigned && value === 'unassigned'
      ? t('projects.picUnassigned')
      : selectedPerson?.name || defaultLabel;

  const isFiltered = value !== allKey;

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className="mobile-filter-control relative inline-block text-left">
      <ActionButton
        icon={<Users size={14} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />}
        type="button"
        aria-expanded={isOpen}
        data-filtered={isFiltered ? 'true' : undefined}
        title={isFiltered ? `${t('projects.filterPic')}: ${displayLabel}` : defaultLabel}
        aria-label={isFiltered ? `${t('projects.filterPic')}: ${displayLabel}` : defaultLabel}
        onClick={e => {
          e.stopPropagation();
          onToggle();
          setSearchQuery('');
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
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] grid grid-rows-[auto_1fr] max-h-80`}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-1 pb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('projects.searchPic')}
              className="w-full px-2.5 py-1.5 text-xs rounded-[6px] border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-0.5">
            {/* All PIC */}
            <button
              type="button"
              onClick={() => {
                onChange(allKey);
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                value === allKey
                  ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{allLabel || t('projects.allPics')}</span>
              {value === allKey && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
            </button>

            {/* Assigned to Me */}
            {showMe && currentUserId && (
              <button
                type="button"
                onClick={() => {
                  onChange('me');
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                  value === 'me'
                    ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar name={currentUserName} src={currentUserAvatar || undefined} className="w-5 h-5 text-[9px]" />
                  <span>{t('projects.picAssignedToMe')} ({currentUserName})</span>
                </div>
                {value === 'me' && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
              </button>
            )}

            {/* Unassigned */}
            {showUnassigned && (
              <button
                type="button"
                onClick={() => {
                  onChange('unassigned');
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                  value === 'unassigned'
                    ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-gray-400">
                    ?
                  </div>
                  <span>{t('projects.picUnassigned')}</span>
                </div>
                {value === 'unassigned' && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
              </button>
            )}

            {filteredPeople.length > 0 && <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />}

            {/* People List */}
            {filteredPeople.map(p => {
              const active = value === String(p.id);
              const deptName = p.departments?.name || p.department_name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(String(p.id));
                    onClose();
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                    active
                      ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={p.name} src={p.avatar_url || undefined} className="w-5 h-5 text-[9px] shrink-0" />
                    <span className="truncate">{p.name}</span>
                    {deptName && (
                      <span className="text-[10px] text-gray-400 truncate">({deptName})</span>
                    )}
                  </div>
                  {active && <CheckCircle2 size={12} className="text-primary dark:text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </FilterPopover>
      )}
    </div>
  );
};
