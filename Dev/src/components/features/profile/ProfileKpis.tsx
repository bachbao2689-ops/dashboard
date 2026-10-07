import React from 'react';
import { LeaderWorkload } from './LeaderWorkload';
import { StaffWorkload } from './StaffWorkload';

export const ProfileKpis: React.FC<{ role: string; activityTask?: React.ReactNode }> = ({ role, activityTask }) => {
  return (
    <div className="w-full">
       {role === 'manager' ? <LeaderWorkload activityTask={activityTask} /> : <><StaffWorkload />{activityTask}</>}
    </div>
  );
};
