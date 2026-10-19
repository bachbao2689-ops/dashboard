import { lazy, Suspense } from 'react';
import { useAuthStore } from '../store/authStore';
import { canViewTeamManagement } from '../lib/roleScope';
import { LeaderReports } from '../components/features/reports/LeaderReports';
import { useTranslation } from '../i18n/translations';
import { useRememberedState } from '../hooks/useRememberedState';

const ReportAnalytics = lazy(() => import('../components/features/reports/ReportAnalytics').then(module => ({ default: module.ReportAnalytics })));

export function Reports() {
  const profile = useAuthStore(state => state.profile);
  if (!canViewTeamManagement(profile)) return null;
  return <ReportViews />;
}

function ReportViews() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useRememberedState<'analytics' | 'team-report'>('reports.activeTab', 'team-report');
  return <div className="min-w-0 space-y-5">
    <div className="flex gap-2 border-b border-gray-200 px-4 pt-5 dark:border-gray-700 md:px-6" role="tablist" aria-label="Report views">
      {(['team-report', 'analytics'] as const).map(tab => <button key={tab} type="button" role="tab" id={`report-tab-${tab}`} aria-controls={`report-panel-${tab}`} aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-primary text-primary dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}>
        {tab === 'team-report' ? t('reports.title') : 'Reports & Analytics'}
      </button>)}
    </div>
    <div role="tabpanel" id={`report-panel-${activeTab}`} aria-labelledby={`report-tab-${activeTab}`}>
      {activeTab === 'team-report' ? <LeaderReports /> : <Suspense fallback={<div className="m-6 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" role="status" aria-label={t('common.loading')} />}><ReportAnalytics /></Suspense>}
    </div>
  </div>;
}
