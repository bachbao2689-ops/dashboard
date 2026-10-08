// Shared semantic meanings for badges, legends and chart series.
export const statusMeta = (value: string) => {
  const key = value.toLowerCase().trim().replace(/[ _]+/g, '-');
  if (['done', 'complete', 'completed', 'hoàn-thành'].includes(key)) return { label: 'Hoàn thành', tone: 'success', color: '#4eb648' };
  if (['approved', 'đã-duyệt'].includes(key)) return { label: 'Đã duyệt', tone: 'success', color: '#4eb648' };
  if (['active', 'doing', 'in-progress', 'đang-làm', 'đang-thực-hiện'].includes(key)) return { label: 'Đang thực hiện', tone: 'info', color: '#38bdf8' };
  if (['review', 'in-review', 'pending', 'planning', 'chờ-duyệt'].includes(key)) return { label: key === 'planning' ? 'Lên kế hoạch' : key === 'pending' ? 'Đang chờ' : 'Chờ duyệt', tone: 'warning', color: '#fbbf24' };
  if (['overdue', 'quá-hạn'].includes(key)) return { label: 'Quá hạn', tone: 'danger', color: '#fb7185' };
  if (['rejected', 'từ-chối'].includes(key)) return { label: 'Từ chối', tone: 'danger', color: '#fb7185' };
  if (['cancelled', 'canceled'].includes(key)) return { label: 'Đã hủy', tone: 'neutral', color: '#94a3b8' };
  if (['todo', 'to-do', 'open', 'chưa-làm'].includes(key)) return { label: 'Chưa bắt đầu', tone: 'neutral', color: '#94a3b8' };
  return { label: value, tone: 'neutral', color: '#94a3b8' };
};
export const priorityColor = (value: string) => /urgent|high|cao|khẩn/i.test(value) ? '#fb7185' : /medium|trung/i.test(value) ? '#fbbf24' : '#38bdf8';
