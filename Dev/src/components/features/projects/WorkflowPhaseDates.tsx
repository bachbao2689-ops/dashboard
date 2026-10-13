import { Calendar, Clock } from 'lucide-react';
import { daysUntil, displayDate, isDone } from '../../../lib/workflowHub';

export function WorkflowPhaseDates({ start, due, status, en, inherited = false }: { start?: string | null; due?: string | null; status: string; en: boolean; inherited?: boolean }) {
  const remaining = daysUntil(due);
  const done = isDone(status);
  const overdue = !done && remaining != null && remaining < 0;
  const label = done ? (en ? 'Completed' : 'Hoàn thành') : remaining == null ? (en ? 'No deadline' : 'Chưa có hạn') : remaining < 0 ? (en ? `${Math.abs(remaining)}d overdue` : `Trễ ${Math.abs(remaining)} ngày`) : remaining === 0 ? (en ? 'Due today' : 'Hạn hôm nay') : (en ? `${remaining}d left` : `Còn ${remaining} ngày`);
  return <div className="workflow-phase-dates">
    <p><Calendar size={13}/><span>{displayDate(start)} – {displayDate(due)}</span></p>
    <span className={`workflow-days-badge ${overdue ? 'is-overdue' : done ? 'is-complete' : ''}`}><Clock size={11}/>{label}</span>
    {inherited && <small>{en ? 'Inherited from Project/Campaign' : 'Theo lịch Project/Campaign'}</small>}
  </div>;
}
