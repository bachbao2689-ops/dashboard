import { useTranslation } from '../../../i18n/translations';
import React from 'react';
import { UsersRound } from 'lucide-react';
import { ProfileTeamTab } from '../profile/ProfileTeamTab';

export const LeaderReports: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('reports.title')}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <UsersRound size={15} />{t('reports.subtitle')}
        </p>
      </header>
      <ProfileTeamTab embedded />
    </div>
  );
};
