import React from 'react';

import { ProfileHeader } from '../components/features/profile/ProfileHeader';
import { ActivityTaskCard } from '../components/features/profile/ActivityTaskCard';
import { useAuthStore } from '../store/authStore';

export const MyTasks: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const isManager = profile?.role === 'admin' || profile?.role === 'manager' || profile?.employment_level === 'Leader';
  const role = isManager ? 'manager' : 'staff';

  return (
    <div className="w-full space-y-6">
      <ProfileHeader role={role} />
      <ActivityTaskCard />
    </div>
  );
};
