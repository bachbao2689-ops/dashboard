// src/pages/Departments2.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { DepartmentId, PeriodFilter } from '../types/department';
import {useWorkspaceData} from '../hooks/useWorkspaceData';
import {useWorkflowHub} from '../hooks/useWorkflowHub';
import {buildDepartmentTracking} from '../lib/departmentTracking';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { RotateCw } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n/translations';
import { OverallView } from '../components/departments/OverallView';
import { DepartmentDetailView } from '../components/departments/DepartmentDetailView';

export const Departments2: React.FC = () => {
  const isDark = useUiStore((state) => state.theme === 'dark');
  const { t } = useTranslation();
  const [view, setView] = useState<'overall' | 'detail'>('overall');
  const [selectedDept, setSelectedDept] = useState<DepartmentId>('');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const workspace=useWorkspaceData();const hub=useWorkflowHub();
  const handleRefresh=useCallback(async()=>{await Promise.all([workspace.refetch(),hub.refresh()]);},[workspace.refetch,hub.refresh]);
  const {formattedTime,isRefreshing,refreshNow}=useAutoRefresh({intervalMinutes:5,onRefresh:handleRefresh,showToastOnManual:true});
  const tracked=useMemo(()=>buildDepartmentTracking(workspace.tasks,workspace.users,workspace.departments,hub.tracks,period),[workspace.tasks,workspace.users,workspace.departments,hub.tracks,period]);
  const overallData=tracked.overall;
  const currentDetailData=tracked.detail[selectedDept]||tracked.detail[workspace.departments[0]?.id];
  const handleSelectDepartment = useCallback((id: DepartmentId) => {
    setSelectedDept(id);
    setView('detail');
  }, []);

  const handleBackToOverall = useCallback(() => {
    setView('overall');
  }, []);

  const tabs=[{id:'overall',label:t('departments.tabOverall')},...workspace.departments.map(d=>({id:d.id,label:d.name}))];
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
              {view === 'overall' ? t('nav.departments') : currentDetailData?.name||t('nav.departments')}
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

      {(workspace.error||hub.error)&&<p role="alert">{workspace.error||hub.error}</p>}
      <p className="text-xs text-gray-500">Dữ liệu theo quyền truy cập · Tải ước tính: 5 task/người = 100% · Chưa có dữ liệu thì hiển thị —.</p>
      <div>
        {view === 'overall' || !currentDetailData ? (
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
