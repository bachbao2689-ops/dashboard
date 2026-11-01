import React, { useState } from 'react';
import { useTeamWorkload } from '../hooks/useTeamWorkload';
import { useTranslation } from '../i18n/translations';
import { Users, AlertTriangle, Activity } from 'lucide-react';
import { TeamWorkloadVisuals } from '../components/common/TeamWorkloadVisuals';
import { useRememberedState } from '../hooks/useRememberedState';
import { DepartmentFilterDropdown } from '../components/common/filters/DepartmentFilterDropdown';
import { DateFilterDropdown } from '../components/common/filters/DateFilterDropdown';

export const TeamWorkload: React.FC = () => {
  const { t } = useTranslation();
  const [selectedDepartment, setSelectedDepartment] = useRememberedState<string>('workload.departmentFilter', 'all');
  const [calendarFilter, setCalendarFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'dept' | 'calendar' | null>(null);

  const { workloads, departments, effectiveDepartmentFilter, canViewAllDepartments, isLoading, error } = useTeamWorkload(
    selectedDepartment,
    calendarFilter,
    customStartDate,
    customEndDate
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading team workload...</div>;
  }

  const totalMembers = workloads.length;
  const totalTasks = workloads.reduce((sum, w) => sum + w.activeTasksCount, 0);
  const averageLoad = totalMembers > 0 ? (totalTasks / totalMembers).toFixed(1) : '0';
  const overloadedCount = workloads.filter((w) => w.capacityPercentage > 100).length;


  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{t('workload.title')}</h1>
          {!canViewAllDepartments && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{departments[0]?.name ? t('workload.teamScope', { team: departments[0].name }) : t('workload.personalScope')}</p>}
        </div>

        <div className="mobile-actions-row flex flex-wrap items-center gap-2.5">
          {/* Department Filter Dropdown */}
          {canViewAllDepartments && (
            <DepartmentFilterDropdown
              value={effectiveDepartmentFilter === 'all' ? '' : effectiveDepartmentFilter}
              onChange={(deptId) => {
                setSelectedDepartment(deptId || 'all');
                setSelectedMemberId(null);
              }}
              departments={departments}
              isOpen={activeDropdown === 'dept'}
              onToggle={() => setActiveDropdown(activeDropdown === 'dept' ? null : 'dept')}
              onClose={() => setActiveDropdown(null)}
            />
          )}

          {/* Interactive Calendar Filter Dropdown */}
          <DateFilterDropdown
            calendarFilter={calendarFilter}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onSelectPreset={(preset) => {
              setCalendarFilter(preset);
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            onApplyCustomRange={(start, end) => {
              setCalendarFilter('custom');
              setCustomStartDate(start);
              setCustomEndDate(end);
            }}
            onClear={() => {
              setCalendarFilter('all');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            isOpen={activeDropdown === 'calendar'}
            onToggle={() => setActiveDropdown(activeDropdown === 'calendar' ? null : 'calendar')}
            onClose={() => setActiveDropdown(null)}
          />
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <p className="text-xs text-gray-500">Tải ước tính: 5 công việc đang mở tương ứng 100%; chưa có dữ liệu giờ làm thực tế.</p>

      {/* Top Notification & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-[8px] flex items-center gap-4">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-[8px] text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.totalMembers')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-[8px] flex items-center gap-4">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-[8px] text-purple-600 dark:text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.avgTasks')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageLoad}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-[8px] flex items-center gap-4">
          <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-[8px] text-red-600 dark:text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.overloaded')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overloadedCount}</p>
          </div>
        </div>
      </div>

      {totalMembers === 0 ? (
        <div className="glass-panel p-8 text-center text-gray-500 dark:text-gray-400 rounded-[8px]">
          {t('members.noMembers')}
        </div>
      ) : (
        <TeamWorkloadVisuals
          departmentFilter={effectiveDepartmentFilter}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
          showKpiRibbon={false}
          showComparisonChart
          showHeatmap
        />
      )}
    </div>
  );
};
