import React from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '../../../../i18n/translations';
import {
  SearchInput,
  StatusFilterDropdown,
  PicFilterDropdown,
  DateFilterDropdown,
  PriorityFilterDropdown,
  GroupByDropdown,
  type FilterPerson
} from '../../../common/filters';

interface TaskListToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (value: string) => void;
  calendarFilter: string;
  customStartDate: string;
  customEndDate: string;
  onSelectCalendarPreset: (preset: string) => void;
  onApplyCustomDateRange: (start: string, end: string) => void;
  onClearDateRange: () => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  groupBy: string;
  onGroupChange: (value: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  people: FilterPerson[];
  currentUserId?: string | number;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  activeDropdown: string | null;
  setActiveDropdown: (dropdown: string | null) => void;
  onCreate: () => void;
  canCreateTask: boolean;
}

export const TaskListToolbar: React.FC<TaskListToolbarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  assigneeFilter,
  onAssigneeChange,
  calendarFilter,
  customStartDate,
  customEndDate,
  onSelectCalendarPreset,
  onApplyCustomDateRange,
  onClearDateRange,
  priorityFilter,
  onPriorityChange,
  groupBy,
  onGroupChange,
  hasActiveFilters,
  onResetFilters,
  people,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  activeDropdown,
  setActiveDropdown,
  onCreate,
  canCreateTask
}) => {
  const { t, lang } = useTranslation();
  const isEn = lang === 'en';

  const statusOptions = [
    { key: 'all', label: isEn ? 'All Statuses' : 'Tất cả trạng thái', dot: 'bg-gray-400' },
    { key: 'todo', label: isEn ? 'To Do' : 'Cần làm', dot: 'bg-slate-400' },
    { key: 'in_progress', label: isEn ? 'In Progress' : 'Đang làm', dot: 'bg-sky-400' },
    { key: 'review', label: isEn ? 'In Review' : 'Đang duyệt', dot: 'bg-amber-400' },
    { key: 'done', label: isEn ? 'Done' : 'Hoàn thành', dot: 'bg-emerald-500' },
    { key: 'overdue', label: isEn ? 'Overdue' : 'Quá hạn', dot: 'bg-rose-500' }
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 w-full">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
        {t('tasks.title')}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Search */}
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={t('tasks.search')}
        />

        {/* 2. Status Filter */}
        <StatusFilterDropdown
          value={statusFilter}
          onChange={onStatusChange}
          options={statusOptions}
          isOpen={activeDropdown === 'status'}
          onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
          onClose={() => setActiveDropdown(null)}
        />

        {/* 3. PIC / Assignee Filter */}
        <PicFilterDropdown
          value={assigneeFilter}
          onChange={onAssigneeChange}
          people={people}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          isOpen={activeDropdown === 'pic'}
          onToggle={() => setActiveDropdown(activeDropdown === 'pic' ? null : 'pic')}
          onClose={() => setActiveDropdown(null)}
        />

        {/* 4. Calendar Filter (Custom inline calendar) */}
        <DateFilterDropdown
          calendarFilter={calendarFilter}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onSelectPreset={onSelectCalendarPreset}
          onApplyCustomRange={onApplyCustomDateRange}
          onClear={onClearDateRange}
          isOpen={activeDropdown === 'calendar'}
          onToggle={() => setActiveDropdown(activeDropdown === 'calendar' ? null : 'calendar')}
          onClose={() => setActiveDropdown(null)}
        />

        {/* 5. Priority Filter */}
        <PriorityFilterDropdown
          value={priorityFilter}
          onChange={onPriorityChange}
          isOpen={activeDropdown === 'priority'}
          onToggle={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
          onClose={() => setActiveDropdown(null)}
        />

        {/* 6. Group By */}
        <GroupByDropdown
          value={groupBy}
          onChange={onGroupChange}
          isOpen={activeDropdown === 'group'}
          onToggle={() => setActiveDropdown(activeDropdown === 'group' ? null : 'group')}
          onClose={() => setActiveDropdown(null)}
        />

        {/* 7. Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            title={t('projects.clearFilters')}
            className="h-9 px-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
          >
            <X size={12} />
            <span className="hidden sm:inline">{t('projects.clearFilters')}</span>
          </button>
        )}

        {/* 8. Add New Task Button */}
        {canCreateTask && (
          <button
            type="button"
            onClick={onCreate}
            className="btn-add-new h-9 flex items-center gap-1.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer ml-1"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tasks.createBtn')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
