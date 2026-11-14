import React from 'react';
import { cn } from './KpiCard';
import { statusMeta, getStatusLabel } from '../../utils/statusTheme';
import { useTranslation } from '../../i18n/translations';

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className }) => {
  const { lang } = useTranslation();
  const meta = statusMeta(status);
  const label = getStatusLabel(status, lang);
  return <span className={cn('status-badge', `status-${meta.tone}`, className)}>{label}</span>;
};
