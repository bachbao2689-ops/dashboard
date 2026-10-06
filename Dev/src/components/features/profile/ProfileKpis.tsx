import React from 'react';
import { LeaderWorkload } from './LeaderWorkload';
import { StaffWorkload } from './StaffWorkload';

export const ProfileKpis: React.FC<{ role: string }> = ({ role }) => {
  return (
    <div className="w-full">
       {role === 'manager' ? <LeaderWorkload /> : <StaffWorkload />}
    </div>
  );
};
