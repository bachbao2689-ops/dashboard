import React from 'react';

import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ProfileKpis } from '../components/features/profile/ProfileKpis';
import { ProfileTeamTab } from '../components/features/profile/ProfileTeamTab';
import { ActivityTaskCard } from '../components/features/profile/ActivityTaskCard';
import { useAuthStore } from '../store/authStore';

export const MyTasks: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const isManager = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const role = isManager ? 'manager' : 'staff';

  return (
    <div className="w-full space-y-6">
      <ProfileHeader role={role} />
      <ProfileKpis role={role} activityTask={<ActivityTaskCard />} />
      {role === 'manager' && <div className="pb-24"><ProfileTeamTab /></div>}
    </div>
  );
};
