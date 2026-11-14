// Shared semantic meanings for badges, legends and chart series.
export const statusMeta = (value: string) => {
  const key = (value || '').toLowerCase().trim().replace(/[ _]+/g, '-');
  if (['done', 'complete', 'completed', 'hoàn-thành'].includes(key)) return { label: 'Hoàn thành', tone: 'success', color: '#4eb648' };
  if (['approved', 'đã-duyệt'].includes(key)) return { label: 'Đã duyệt', tone: 'success', color: '#4eb648' };
  if (['active', 'doing', 'in-progress', 'đang-làm', 'đang-thực-hiện'].includes(key)) return { label: 'Đang thực hiện', tone: 'info', color: '#38bdf8' };
  if (['review', 'in-review', 'in-qa', 'pending-approval', 'chờ-duyệt'].includes(key)) return { label: 'Chờ duyệt', tone: 'warning', color: '#fbbf24' };
  if (['planning', 'planned', 'lên-kế-hoạch'].includes(key)) return { label: 'Lên kế hoạch', tone: 'purple', color: '#a855f7' };
  if (['scoping'].includes(key)) return { label: 'Làm rõ phạm vi', tone: 'rose', color: '#f43f5e' };
  if (['backlog'].includes(key)) return { label: 'Chờ xử lý', tone: 'neutral', color: '#94a3b8' };
  if (['draft', 'bản-nháp'].includes(key)) return { label: 'Bản nháp', tone: 'neutral', color: '#94a3b8' };
  if (['pending', 'đang-chờ'].includes(key)) return { label: 'Đang chờ', tone: 'warning', color: '#fbbf24' };
  if (['on-hold', 'on_hold', 'tạm-dừng', 'paused', 'holding'].includes(key)) return { label: 'Tạm dừng', tone: 'warning', color: '#fbbf24' };
  if (['overdue', 'quá-hạn'].includes(key)) return { label: 'Quá hạn', tone: 'danger', color: '#fb7185' };
  if (['rejected', 'từ-chối'].includes(key)) return { label: 'Từ chối', tone: 'danger', color: '#fb7185' };
  if (['archived', 'hidden', 'đã-ẩn', 'lưu-trữ'].includes(key)) return { label: 'Đã ẩn / Lưu trữ', tone: 'neutral', color: '#64748b' };
  if (['deleted', 'đã-xóa'].includes(key)) return { label: 'Đã xóa', tone: 'danger', color: '#94a3b8' };
  if (['cancelled', 'canceled'].includes(key)) return { label: 'Đã hủy', tone: 'neutral', color: '#94a3b8' };
  if (['todo', 'to-do', 'open', 'chưa-làm'].includes(key)) return { label: 'Chưa bắt đầu', tone: 'neutral', color: '#94a3b8' };
  return { label: value, tone: 'neutral', color: '#94a3b8' };
};

const EN_STATUS_LABELS: Record<string, string> = {
  'Hoàn thành': 'Completed',
  'Đã duyệt': 'Approved',
  'Đang thực hiện': 'In Progress',
  'Chờ duyệt': 'Pending Approval',
  'Lên kế hoạch': 'Planning',
  'Làm rõ phạm vi': 'Scoping',
  'Chờ xử lý': 'Backlog',
  'Bản nháp': 'Draft / To-do',
  'Tạm dừng': 'On Hold',
  'Đang chờ': 'Pending',
  'Quá hạn': 'Overdue',
  'Từ chối': 'Rejected',
  'Đã hủy': 'Canceled',
  'Chưa bắt đầu': 'Draft / To-do',
  'Đã ẩn / Lưu trữ': 'Archived',
  'Đã xóa': 'Deleted',
};

export const getStatusLabel = (value?: string | null, lang: string = 'vi') => {
  const meta = statusMeta(value || 'planning');
  return lang === 'en' ? (EN_STATUS_LABELS[meta.label] || meta.label) : meta.label;
};

export const getStatusBadgeVisual = (statusVal?: string | null) => {
  const s = (statusVal || '').toLowerCase().trim().replace(/[ _]+/g, '-');
  if (['archived', 'hidden', 'đã-ẩn', 'lưu-trữ'].includes(s)) {
    return {
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
      dotClass: 'bg-slate-500',
    };
  }
  if (['deleted', 'đã-xóa', 'rejected', 'từ-chối', 'overdue', 'quá-hạn'].includes(s)) {
    return {
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70',
      dotClass: 'bg-rose-500',
    };
  }
  if (['completed', 'complete', 'done', 'hoàn-thành', 'approved', 'đã-duyệt'].includes(s)) {
    return {
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70',
      dotClass: 'bg-emerald-500',
    };
  }
  if (['pending-approval', 'in-qa', 'in-review', 'review', 'chờ-duyệt', 'on-hold', 'paused', 'holding', 'tạm-dừng', 'pending', 'đang-chờ'].includes(s)) {
    return {
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70',
      dotClass: 'bg-amber-500',
    };
  }
  if (['active', 'in-progress', 'doing', 'đang-làm', 'đang-thực-hiện'].includes(s)) {
    return {
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70',
      dotClass: 'bg-sky-500',
    };
  }
  if (['planning', 'lên-kế-hoạch', 'planned'].includes(s)) {
    return {
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/70',
      dotClass: 'bg-purple-500',
    };
  }
  return {
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  };
};

export const priorityColor = (value: string) => /urgent|high|cao|khẩn/i.test(value) ? '#fb7185' : /medium|trung/i.test(value) ? '#fbbf24' : '#38bdf8';
