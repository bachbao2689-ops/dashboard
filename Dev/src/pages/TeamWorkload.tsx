import React, { useState } from 'react';
import { useTeamWorkload } from '../hooks/useTeamWorkload';
import { useTranslation } from '../i18n/translations';
import { Users, AlertTriangle, Activity, Calendar, Building2, BarChart3 } from 'lucide-react';
import { TeamWorkloadVisuals } from '../components/common/TeamWorkloadVisuals';
import { useRememberedState } from '../hooks/useRememberedState';

export const TeamWorkload: React.FC = () => {
  const { t } = useTranslation();
  const [selectedDepartment, setSelectedDepartment] = useRememberedState<string>('workload.departmentFilter', 'all');
  const { workloads, departments, effectiveDepartmentFilter, canViewAllDepartments, isLoading, error } = useTeamWorkload(selectedDepartment);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading team workload...</div>;
  }

  const totalMembers = workloads.length;
  const totalTasks = workloads.reduce((sum, w) => sum + w.activeTasksCount, 0);
  const averageLoad = totalMembers > 0 ? (totalTasks / totalMembers).toFixed(1) : '0';
  const overloadedCount = workloads.filter((w) => w.capacityPercentage > 100).length;

  const segBtn = (active: boolean) =>
    `px-2.5 py-1 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
      active
        ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(30,90,170,.18)] ring-1 ring-blue-300/80 dark:from-blue-500/35 dark:to-cyan-500/20 dark:!text-blue-100 dark:ring-blue-300/40'
        : 'text-gray-500 hover:text-gray-900 hover:bg-white/80 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-700/60'
    }`;

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('workload.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('workload.subtitle')}</p>
          {!canViewAllDepartments && <p className="text-xs text-gray-500 dark:text-gray-400">{departments[0]?.name ? t('workload.teamScope', { team: departments[0].name }) : t('workload.personalScope')}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter Buttons */}
          {(canViewAllDepartments || departments.length > 0) && (
            <div
              role="group"
              aria-label="Lọc theo phòng ban"
              className="inline-flex items-center gap-1 p-1 rounded-2xl bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs overflow-x-auto custom-scrollbar max-w-full"
            >
              <span className="pl-2 pr-1 text-gray-400 dark:text-gray-500 flex items-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </span>
              {canViewAllDepartments && <button
                type="button"
                onClick={() => {
                  setSelectedDepartment('all');
                  setSelectedMemberId(null);
                }}
                className={segBtn(effectiveDepartmentFilter === 'all')}
              >
                {t('departments.tabOverall')}
              </button>}
              {canViewAllDepartments ? departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    setSelectedDepartment(dept.id);
                    setSelectedMemberId(null);
                  }}
                  className={segBtn(String(effectiveDepartmentFilter) === String(dept.id))}
                >
                  {dept.name}
                </button>
              )) : <span className="px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-100">{departments[0]?.name || t('workload.personalScope')}</span>}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('workload.weekOf')} {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const url = `/reports/visualize?period=month${effectiveDepartmentFilter !== 'all' ? `&dept=${effectiveDepartmentFilter}` : ''}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            title="Mở Báo cáo Visualize (View Report)"
            className="grid grid-flow-col auto-cols-max items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#002e6d] to-[#094191] hover:from-[#002150] hover:to-[#002e6d] shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>View Report</span>
          </button>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <p className="text-xs text-gray-500">Tải ước tính: 5 công việc đang mở tương ứng 100%; chưa có dữ liệu giờ làm thực tế.</p>

      {/* Top Notification & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.totalMembers')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.avgTasks')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageLoad}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('workload.overloaded')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overloadedCount}</p>
          </div>
        </div>
      </div>

      {totalMembers === 0 ? (
        <div className="glass-panel p-8 text-center text-gray-500 dark:text-gray-400 rounded-xl">
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
