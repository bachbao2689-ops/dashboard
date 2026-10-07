import React from 'react';
import { LeaderWorkload } from './LeaderWorkload';
import { StaffWorkload } from './StaffWorkload';
import { NotificationLog } from './NotificationLog';

export const ProfileKpis: React.FC<{ role: string; activityTask?: React.ReactNode }> = ({ role, activityTask }) => {
  return (
    <div className="w-full">
       {role === 'manager' ? <LeaderWorkload activityTask={activityTask} /> : <><StaffWorkload /><div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">{activityTask}<NotificationLog /></div></>}
    </div>
  );
};
