import React from 'react';
import { cn } from './KpiCard';

interface StatusBadgeProps {
  status: 'In Progress' | 'Complete' | 'Pending' | 'Approved' | 'Rejected';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const colors = {
    'In Progress': 'bg-purple-100 text-purple-700',
    'Complete': 'bg-green-100 text-green-700',
    'Pending': 'bg-blue-100 text-blue-700',
    'Approved': 'bg-orange-100 text-orange-700',
    'Rejected': 'bg-gray-200 text-gray-700',
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-medium", colors[status], className)}>
      {status}
    </span>
  );
};
