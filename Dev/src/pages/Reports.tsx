import { lazy, Suspense } from 'react';
import { useAuthStore } from '../store/authStore';
import { canViewTeamManagement } from '../lib/roleScope';
import { useTranslation } from '../i18n/translations';

const ReportAnalytics = lazy(() =>
  import('../components/features/reports/ReportAnalytics').then((module) => ({
    default: module.ReportAnalytics,
  })),
);

export function Reports({ standalone = false }: { standalone?: boolean }) {
  const profile = useAuthStore((state) => state.profile);
  const { t } = useTranslation();
  if (!standalone && !canViewTeamManagement(profile)) return null;
  return (
    <Suspense
      fallback={
        <div
          className="m-6 h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
          role="status"
          aria-label={t('common.loading')}
        />
      }
    >
      <ReportAnalytics standalone={standalone} />
    </Suspense>
  );
}
