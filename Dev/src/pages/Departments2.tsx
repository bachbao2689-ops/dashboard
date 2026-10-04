// src/pages/Departments2.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { DepartmentId, PeriodFilter, OverallDashboardData } from '../types/department';
import {
  DEPARTMENT_DETAILS,
  getAdjustedOverallData,
} from '../data/departmentData';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useUiStore } from '../store/uiStore';
import { OverallView } from '../components/departments/OverallView';
import { DepartmentDetailView } from '../components/departments/DepartmentDetailView';

export const Departments2: React.FC = () => {
  const isDark = useUiStore((state) => state.theme === 'dark');
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
    showToastOnManual: true,
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

  return (
    <div className="h-full flex flex-col overflow-y-auto lg:overflow-hidden max-h-[calc(100vh-120px)] scrollbar-hide">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-0.5">
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
