import React from 'react';
import { cn } from './KpiCard';
import { statusMeta } from '../../utils/statusTheme';

export const StatusBadge: React.FC<{ status: string; className?: string; bilingual?: boolean }> = ({ status, className, bilingual }) => {
  const meta = statusMeta(status);
  const bilingualMap: Record<string, string> = {
    'Hoàn thành': 'Hoàn thành (Done)',
    'Đã duyệt': 'Đã duyệt (Approved)',
    'Đang thực hiện': 'Đang thực hiện (In Progress)',
    'Chờ duyệt': 'Chờ duyệt (In Review)',
    'Lên kế hoạch': 'Lên kế hoạch (Planning)',
    'Đang chờ': 'Đang chờ (Pending)',
    'Quá hạn': 'Quá hạn (Overdue)',
    'Từ chối': 'Từ chối (Rejected)',
    'Đã hủy': 'Đã hủy (Canceled)',
    'Chưa bắt đầu': 'Chưa bắt đầu (Todo)',
  };
  const label = bilingual ? (bilingualMap[meta.label] || meta.label) : meta.label;
  return <span className={cn('status-badge', `status-${meta.tone}`, className)}><span aria-hidden="true" className="status-dot" />{label}</span>;
};
