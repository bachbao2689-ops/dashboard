import React from 'react';
import { UsersRound } from 'lucide-react';
import { ProfileTeamTab } from '../profile/ProfileTeamTab';

export const LeaderReports: React.FC = () => <div className="w-full space-y-5 p-4 md:p-6">
  <header>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Report của Team</h1>
    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><UsersRound size={15} />Tổng quan tiến độ bên trái; chọn PIC để xem nội dung và hình minh chứng bên phải.</p>
  </header>
  <ProfileTeamTab embedded />
</div>;
