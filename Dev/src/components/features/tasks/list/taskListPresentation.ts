export const mapStatus = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('done') || ['completed', 'complete'].includes(s) || s.includes('hoàn thành')) return 'done';
  if(['cancelled','canceled'].includes(s))return 'cancelled';
  if (s.includes('progress') || s.includes('đang')) return 'in-progress';
  if (s.includes('review')) return 'review';
  if (s.includes('overdue')) return 'overdue';
  return 'todo';
};

export const mapPriority = (prio: string | undefined) => {
  if (!prio) return '—';
  const p = prio.toLowerCase();
  if(p.includes('urgent')||p.includes('khẩn'))return 'Urgent';
  if (p.includes('high') || p.includes('cao')) return 'High';
  if (p.includes('low') || p.includes('thấp')) return 'Low';
  return 'Medium';
};
