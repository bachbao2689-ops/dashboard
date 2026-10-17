// Historical Departments UI preview from a2f4087. Figures are illustrative.
import React, { useState, useMemo, useCallback } from 'react';
import type { DepartmentId, PeriodFilter, OverallDashboardData } from '../types/department';
import {
  DEPARTMENT_DETAILS,
  getAdjustedOverallData,
} from '../data/departmentPreviewData';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { RotateCw } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n/translations';
import { OverallView } from '../components/departments/OverallView';
import { DepartmentDetailView } from '../components/departments/DepartmentDetailView';

export const DepartmentsLegacyPreview: React.FC = () => {
  const isDark = useUiStore((state) => state.theme === 'dark');
  const { t } = useTranslation();
  const [view, setView] = useState<'overall' | 'detail'>('overall');
  const [selectedDept, setSelectedDept] = useState<DepartmentId>('marketing');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // Simulated data update on refresh without layout shift
  const handleRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  const {
    formattedTime,
    isRefreshing,
    refreshNow,
  } = useAutoRefresh({
    intervalMinutes: 5,
    onRefresh: handleRefresh,
    showToastOnManual: false,
  });

  // Dynamically calculate overall data based on period and refresh cycles
  const overallData: OverallDashboardData = useMemo(() => {
    const base = getAdjustedOverallData(period);
    if (refreshCounter === 0) return base;

    // Subtle simulated data jitter preserving totals
    const jitter = (refreshCounter % 3) - 1;
    return {
      ...base,
      kpis: {
        ...base.kpis,
        inProgressTasks: Math.max(70, base.kpis.inProgressTasks + jitter),
      },
    };
  }, [period, refreshCounter]);

  // Dynamically retrieve detail data for current department
  const currentDetailData = useMemo(() => {
    const base = DEPARTMENT_DETAILS[selectedDept] || DEPARTMENT_DETAILS.marketing;
    if (refreshCounter === 0) return base;

    return {
      ...base,
      kpis: {
        ...base.kpis,
        inProgressTasks: base.kpis.inProgressTasks,
      },
    };
  }, [selectedDept, refreshCounter]);

  const handleSelectDepartment = useCallback((id: DepartmentId) => {
    setSelectedDept(id);
    setView('detail');
  }, []);

  const handleBackToOverall = useCallback(() => {
    setView('overall');
  }, []);

  const tabs: { id: 'overall' | DepartmentId; label: string }[] = [
    { id: 'overall', label: t('departments.tabOverall') },
    { id: 'marketing', label: t('departments.deptMarketing') },
    { id: 'sale', label: t('departments.deptSale') },
    { id: 'ecommerce', label: t('departments.deptEcommerce') },
    { id: 'design', label: t('departments.deptDesign') },
    { id: 'accounting', label: t('departments.deptAccounting') },
    { id: 'hr', label: t('departments.deptHr') },
  ];
  const activeTab = view === 'overall' ? 'overall' : selectedDept;
  const segBtn = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
      active
        ? 'bg-[#093570] text-white shadow-sm dark:bg-blue-600'
        : 'text-gray-500 hover:text-gray-900 hover:bg-white dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-700'
    }`;

  return (
    <div className="w-full flex flex-col gap-3 pb-4 font-sans">
      {/* Unified header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {view === 'overall' ? t('nav.departments') : currentDetailData.name}
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('departments.refreshIn', { time: formattedTime })}</span>
              <button
                type="button"
                onClick={refreshNow}
                disabled={isRefreshing}
                className="ml-0.5 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={t('departments.refreshNow')}
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {view === 'overall'
              ? t('departments.overallSubtitle')
              : t('departments.detailSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-x-auto scrollbar-hide max-w-full">
            {tabs.map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                onClick={() =>
                  tItem.id === 'overall' ? handleBackToOverall() : handleSelectDepartment(tItem.id)
                }
                className={segBtn(activeTab === tItem.id)}
              >
                {tItem.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            {(
              [
                ['week', t('departments.periodWeek')],
                ['month', t('departments.periodMonth')],
                ['quarter', t('departments.periodQuarter')],
              ] as [PeriodFilter, string][]
            ).map(([p, label]) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} className={segBtn(period === p)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {view === 'overall' ? (
          <OverallView
            data={overallData}
            period={period}
            onPeriodChange={setPeriod}
            onSelectDepartment={handleSelectDepartment}
            formattedTime={formattedTime}
            isRefreshing={isRefreshing}
            onRefreshNow={refreshNow}
            isDark={isDark}
          />
        ) : (
          <DepartmentDetailView
            data={currentDetailData}
            onBack={handleBackToOverall}
            onSelectDepartment={handleSelectDepartment}
            formattedTime={formattedTime}
            isRefreshing={isRefreshing}
            onRefreshNow={refreshNow}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
};
