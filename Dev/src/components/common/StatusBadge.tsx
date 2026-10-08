import React from 'react';
import { cn } from './KpiCard';
import { statusMeta } from '../../utils/statusTheme';

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className }) => {
  const meta = statusMeta(status);
  return <span className={cn('status-badge', `status-${meta.tone}`, className)}><span aria-hidden="true" className="status-dot" />{meta.label}</span>;
};
