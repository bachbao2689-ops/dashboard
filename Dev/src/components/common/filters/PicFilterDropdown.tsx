import React, { useState } from 'react';
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
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const PicFilterDropdown: React.FC<PicFilterDropdownProps> = ({
  value,
  onChange,
  people,
  currentUserId,
  currentUserName = 'Me',
  currentUserAvatar,
  label,
  isOpen,
  onToggle,
  onClose,
  align = 'right'
}) => {
  const { t } = useTranslation();
  const defaultLabel = label || t('projects.filterPic');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPerson = people.find(p => String(p.id) === value);
  const displayLabel =
    value === 'all'
      ? defaultLabel
      : value === 'me'
      ? `${t('projects.picAssignedToMe')}`
      : value === 'unassigned'
      ? t('projects.picUnassigned')
      : selectedPerson?.name || defaultLabel;

  const isFiltered = value !== 'all';

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          onToggle();
          setSearchQuery('');
        }}
        className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
          isFiltered
            ? 'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-blue-400 font-semibold'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
        }`}
      >
        <Users size={13} className={isFiltered ? 'text-primary dark:text-blue-400' : 'text-gray-400'} />
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-80`}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-1 pb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('projects.searchPic')}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-0.5">
            {/* All PIC */}
            <button
              type="button"
              onClick={() => {
                onChange('all');
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                value === 'all'
                  ? 'font-bold text-primary dark:text-blue-400 bg-primary/5 dark:bg-primary/10'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{t('projects.allPics')}</span>
              {value === 'all' && <CheckCircle2 size={12} className="text-primary dark:text-blue-400" />}
            </button>

            {/* Assigned to Me */}
            {currentUserId && (
              <button
                type="button"
                onClick={() => {
                  onChange('me');
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
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
            <button
              type="button"
              onClick={() => {
                onChange('unassigned');
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
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
        </div>
      )}
    </div>
  );
};
