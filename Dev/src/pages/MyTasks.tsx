import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ProfileKpis } from '../components/features/profile/ProfileKpis';
import { ProfileInfoTab } from '../components/features/profile/ProfileInfoTab';
import { ProfileActivityTab } from '../components/features/profile/ProfileActivityTab';
import { ProfilePermissionTab } from '../components/features/profile/ProfilePermissionTab';
import { ProfileTeamTab } from '../components/features/profile/ProfileTeamTab';
import { ProfileSettingsTab } from '../components/features/profile/ProfileSettingsTab';

export type ProfileTab = 'info' | 'activity' | 'permission' | 'team' | 'settings';

export const MyTasks: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const role = user?.user_metadata?.role || 'manager'; // Use manager as default for demo

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');

  const tabs = [
    { id: 'info', label: 'Thông tin' },
    { id: 'activity', label: 'Hoạt động' },
    { id: 'permission', label: 'Permission' },
    ...(role === 'manager' ? [{ id: 'team', label: '👥 Đội ngũ' }] : []),
    { id: 'settings', label: '⚙️ Cài đặt' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ProfileHeader role={role} onTabChange={setActiveTab} />
      <ProfileKpis role={role} />
      
      {/* Tabs Navigation */}
      <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto hide-scrollbar gap-1 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ProfileTab)}
            className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap rounded-xl ${
              activeTab === tab.id
                ? 'bg-gray-100 dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2 pb-24">
        {activeTab === 'info' && <ProfileInfoTab />}
        {activeTab === 'activity' && <ProfileActivityTab />}
        {activeTab === 'permission' && <ProfilePermissionTab role={role} />}
        {activeTab === 'team' && role === 'manager' && <ProfileTeamTab />}
        {activeTab === 'settings' && <ProfileSettingsTab />}
      </div>
    </div>
  );
};
