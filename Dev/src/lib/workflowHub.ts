export interface WorkflowPerson { id: number; name: string; avatar_url?: string; role?: 'pic' | 'sub_pic' }
export interface HubPhase {
  id: string; title: string; position: number; start_date: string | null; due_date: string | null;
  status: string; version: number; opportunity: number | null; opportunity_note: string | null;
  can_edit_tasks: boolean; members: WorkflowPerson[];
  description?: string; gate_criteria?: GateCriterion[];
}
export interface GateCriterion { id: string; label: string; weight: number; checked: boolean }
export interface HubTrack {
  id: string; entity_type: 'project' | 'campaign'; entity_id: string; name: string; status: string;
  start_date: string | null; due_date: string | null; root: boolean; asset: string | null;
  pics: WorkflowPerson[]; phases: HubPhase[];
  sub_pics?: WorkflowPerson[];
}
export const workflowLink = (kind: 'project' | 'campaign', id: string) => `/?${kind}=${encodeURIComponent(id)}`;
export const isDone = (status: string) => ['done', 'completed', 'complete'].includes(status.toLowerCase());
export function taskProgress(tasks: { status: string }[]) {
  const active = tasks.filter(t => !['deleted', 'archived', 'canceled', 'cancelled'].includes(t.status));
  const done = active.filter(t => isDone(t.status)).length;
  return { total: active.length, done, percent: active.length ? Math.round(done * 100 / active.length) : null };
}
export const displayDate = (s: string | null | undefined) => s ? s.split('T')[0].split('-').reverse().join('/') : '—';
export const inputDate = (s: string) => s.includes('/') ? s.split('/').reverse().join('-') : s || null;

type MetricTask = { status: string; due_date?: string | null; start_date?: string | null; created_at?: string | null; completed_at?: string | null };
export const localDay = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export function gateScore(criteria: GateCriterion[]) {
  const total = criteria.reduce((n, c) => n + c.weight, 0);
  return total ? Math.round(criteria.reduce((n, c) => n + (c.checked ? c.weight : 0), 0) * 100 / total) : null;
}
export function workflowMetrics(tasks: MetricTask[], now = new Date()) {
  const day = localDay(now), month = day.slice(0, 7);
  const current = tasks.filter(t => !['deleted', 'archived', 'canceled', 'cancelled'].includes(t.status));
  // Each task belongs to one slice. Overdue never appears again in Todo/Doing.
  const buckets = [0, 0, 0, 0, 0];
  for (const t of current) {
    const created = t.created_at ? localDay(new Date(t.created_at)) : t.start_date;
    const completed = t.completed_at ? localDay(new Date(t.completed_at)) : null;
    const due = t.due_date?.slice(0, 10);
    const relevant = created?.slice(0, 7) === month || completed?.slice(0, 7) === month || due?.slice(0, 7) === month || (created && created <= day && !isDone(t.status));
    if (!relevant) continue;
    const index = isDone(t.status) ? 0 : due && due < day ? 3 : ['in_review', 'review', 'pending', 'in_qa', 'feedback'].includes(t.status) ? 2 : ['in_progress', 'in-progress', 'doing', 'scoping'].includes(t.status) ? 1 : 4;
    buckets[index]++;
  }
  const completed = current.filter(t => isDone(t.status) && t.completed_at);
  const cycle = completed.map(t => ({ end: Date.parse(t.completed_at!), start: Date.parse(t.start_date || t.created_at || '') })).filter(t => Number.isFinite(t.start) && t.end >= t.start);
  const dated = completed.filter(t => t.due_date);
  return {
    progress: taskProgress(current).percent,
    velocity: cycle.length ? Math.round(cycle.reduce((n, t) => n + (t.end - t.start) / 86400000, 0) / cycle.length * 10) / 10 : null,
    onTime: dated.length ? Math.round(dated.filter(t => localDay(new Date(t.completed_at!)) <= t.due_date!.slice(0, 10)).length * 100 / dated.length) : null,
    buckets,
  };
}
