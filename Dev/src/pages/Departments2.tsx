import {ActionButton} from '../components/common/ActionButton';
// src/pages/Departments2.tsx
import React, { useState, useCallback } from 'react';
import type { DepartmentId, PeriodFilter } from '../types/department';
import {useDepartmentTracking} from '../hooks/useDepartmentTracking';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { RotateCw } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n/translations';
import { OverallView } from '../components/departments/OverallView';
import { DepartmentDetailView } from '../components/departments/DepartmentDetailView';

const DepartmentsLegacyPreview = React.lazy(() => import('./DepartmentsLegacyPreview').then(module => ({ default: module.DepartmentsLegacyPreview })));
const canPreviewLegacy = import.meta.env.VITE_SUPABASE_URL?.includes('samuuyxxtocqmtujnnhe.supabase.co') || false;

const TrackedDepartments: React.FC = () => {
  const isDark = useUiStore((state) => state.theme === 'dark');
  const { t } = useTranslation();
  const [view, setView] = useState<'overall' | 'detail'>('overall');
  const [selectedDept, setSelectedDept] = useState<DepartmentId>('marketing');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const tracking=useDepartmentTracking(period);
  const {formattedTime,isRefreshing,refreshNow}=useAutoRefresh({intervalMinutes:5,onRefresh:()=>{void tracking.refresh();},showToastOnManual:false});
  const overallData=tracking.overall;
  const currentDetailData=tracking.details[selectedDept];
  const handleSelectDepartment = useCallback((id: DepartmentId) => {
    setSelectedDept(id);
    setView('detail');
  }, []);

  const handleBackToOverall = useCallback(() => {
    setView('overall');
  }, []);

  const tabs: {id:string;label:string}[]=[{id:'overall',label:t('departments.tabOverall')},...tracking.departments.map(d=>({id:d.id,label:d.name}))];
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
              <ActionButton icon={<RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />}
                type="button"
                onClick={refreshNow}
                disabled={isRefreshing}
                className="ml-0.5 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={t('departments.refreshNow')}
              >

              </ActionButton>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {view === 'overall'
              ? t('departments.overallSubtitle')
              : t('departments.detailSubtitle')}
          </p>
        </div>

        <div className="mobile-actions-row flex flex-wrap items-center gap-2">
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

export const Departments2: React.FC = () => {
  const [mode, setMode] = useState<'legacy' | 'tracked'>(canPreviewLegacy ? 'legacy' : 'tracked');

  return (
    <div className="min-w-0 space-y-4">
      {canPreviewLegacy && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Xem lại giao diện Departments</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Bản trước tracking dùng dữ liệu minh họa; không phản ánh số liệu đang vận hành.</p>
          </div>
          <div role="group" aria-label="Chọn phiên bản Departments" className="inline-flex max-w-full gap-1 rounded-xl border border-blue-100 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => setMode('legacy')} aria-pressed={mode === 'legacy'} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === 'legacy' ? 'bg-[#093570] text-white' : 'text-gray-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>UI trước tracking</button>
            <button type="button" onClick={() => setMode('tracked')} aria-pressed={mode === 'tracked'} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === 'tracked' ? 'bg-[#093570] text-white' : 'text-gray-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>Dữ liệu hiện tại</button>
          </div>
        </div>
      )}
      {mode === 'legacy' && canPreviewLegacy ? (
        <React.Suspense fallback={<div role="status" className="rounded-2xl bg-gray-100 p-6 text-sm text-gray-500 animate-pulse dark:bg-slate-800">Đang tải giao diện…</div>}>
          <DepartmentsLegacyPreview />
        </React.Suspense>
      ) : <TrackedDepartments />}
    </div>
  );
};
