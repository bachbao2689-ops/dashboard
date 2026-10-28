import React from 'react';
import { cn } from './KpiCard';
import { statusMeta } from '../../utils/statusTheme';
import { useTranslation } from '../../i18n/translations';

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className }) => {
  const { lang } = useTranslation();
  const meta = statusMeta(status);
  const enLabelMap: Record<string, string> = {
    'Hoàn thành': 'Completed',
    'Đã duyệt': 'Approved',
    'Đang thực hiện': 'In Progress',
    'Chờ duyệt': 'In Review',
    'Lên kế hoạch': 'Planning',
    'Bản nháp': 'Draft',
    'Tạm dừng': 'On Hold',
    'Đang chờ': 'Pending',
    'Quá hạn': 'Overdue',
    'Từ chối': 'Rejected',
    'Đã hủy': 'Canceled',
    'Chưa bắt đầu': 'Todo',
  };
  const label = lang === 'en' ? (enLabelMap[meta.label] || meta.label) : meta.label;
  return <span className={cn('status-badge', `status-${meta.tone}`, className)}><span aria-hidden="true" className="status-dot" />{label}</span>;
};
