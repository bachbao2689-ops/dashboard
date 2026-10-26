export interface WorkflowPerson { id: number; name: string; avatar_url?: string; role?: 'pic' | 'sub_pic' }
export interface HubPhase {
  id: string; title: string; position: number; start_date: string | null; due_date: string | null;
  status: string; version: number; opportunity: number | null; opportunity_note: string | null;
  can_edit_tasks: boolean; members: WorkflowPerson[];
  description?: string; gate_criteria?: GateCriterion[];
}
export interface GateCriterion { id: string; label: string; weight: number; checked: boolean; starred?: boolean }
export interface KeyGateCriterion extends GateCriterion { phaseId: string; phaseTitle: string; phasePosition: number }
export function extractKeyGateCriteria(track?: Pick<HubTrack, 'phases'> | null, starredMap?: Record<string, boolean>): KeyGateCriterion[] {
  if (!track?.phases?.length) return [];
  const result: KeyGateCriterion[] = [];
  for (const phase of track.phases) {
    for (const c of phase.gate_criteria || []) {
      const isStarred = starredMap && c.id in starredMap ? starredMap[c.id] : Boolean(c.starred);
      if (isStarred) {
        result.push({ ...c, starred: true, phaseId: phase.id, phaseTitle: phase.title, phasePosition: phase.position });
      }
    }
  }
  return result;
}
export function formatEntityDuration(startDate?: string | null, endDate?: string | null, isEn = false): string {
  const s = startDate ? Date.parse(startDate.slice(0, 10)) : NaN;
  const e = endDate ? Date.parse(endDate.slice(0, 10)) : NaN;
  if (Number.isFinite(s) && Number.isFinite(e) && e >= s) {
    const days = Math.max(1, Math.round((e - s) / 86400000) + 1);
    return isEn ? `Completes in ${days} days` : `Hoàn thành trong ${days} ngày`;
  }
  if (endDate) {
    const rem = daysUntil(endDate);
    if (rem != null) {
      if (rem >= 0) return isEn ? `Completes in ${Math.max(1, rem)} days` : `Hoàn thành trong ${Math.max(1, rem)} ngày`;
      return isEn ? `${Math.abs(rem)}d overdue` : `Trễ ${Math.abs(rem)} ngày`;
    }
  }
  return isEn ? 'No duration set' : 'Chưa định thời gian';
}
export interface HubTrack {
  id: string; entity_type: 'project' | 'campaign'; entity_id: string; name: string; status: string;
  start_date: string | null; due_date: string | null; root: boolean; asset: string | null;
  pics: WorkflowPerson[]; phases: HubPhase[];
  creator?: WorkflowPerson | null;
  sub_pics?: WorkflowPerson[];
  description?: string | null; priority?: string | null; department_id?: string | null;
  campaign_id?: string | null; budget?: number | null; channels?: string[] | null;
}
export function workflowTaskPeople(
  track: Pick<HubTrack, 'root' | 'pics' | 'creator'> | undefined,
  phase: Pick<HubPhase, 'members'> | undefined,
  actor: { id: number; name: string; avatar_url?: string | null } | null | undefined,
): WorkflowPerson[] {
  // The server's root flag grants the parent creator/PIC access without requiring
  // them to be added to every phase. Phase-only participants keep their scope.
  const people: WorkflowPerson[] = [...(phase?.members || []), ...(track?.pics || []), ...(track?.creator ? [track.creator] : [])];
  if (track?.root && actor) people.push({ id: actor.id, name: actor.name, avatar_url: actor.avatar_url || undefined });
  const unique = new Map<string, WorkflowPerson>();
  for (const person of people) if (!unique.has(String(person.id))) unique.set(String(person.id), person);
  return [...unique.values()];
}
export const workflowLink = (kind: 'project' | 'campaign', id: string, phase?: string) => `/workflow?${kind}=${encodeURIComponent(id)}${phase ? '&phase=' + encodeURIComponent(phase) : ''}`;
export const projectsLink = (kind: 'project' | 'campaign', id: string) => `/projects?${kind}=${encodeURIComponent(id)}`;
export function parentTasks<T extends { project_id?: string | null; campaign_id?: string | null }>(tasks: T[], kind: 'project' | 'campaign', id: string): T[] {
  return tasks.filter(task => kind === 'project' ? task.project_id === id : task.campaign_id === id && !task.project_id);
}
export const daysUntil = (date: string | null | undefined, now = new Date()) => date ? Math.round((Date.parse(date.slice(0, 10)) - Date.parse(localDay(now))) / 86400000) : null;
export const isDone = (status?: string | null) => ['done', 'completed', 'complete'].includes((status || '').toLowerCase());
export function taskProgress(tasks: { status: string; workflow_status?: string | null }[]) {
  const active = tasks.filter(t => !['deleted', 'archived', 'canceled', 'cancelled'].includes((t.status || '').toLowerCase()) && t.workflow_status !== 'canceled');
  const done = active.filter(t => isDone(t.status) || t.workflow_status === 'completed').length;
  return { total: active.length, done, percent: active.length ? Math.round(done * 100 / active.length) : null };
}
export const displayDate = (s: string | null | undefined) => s ? s.split('T')[0].split('-').reverse().join('/') : '—';
export const inputDate = (s: string) => s.includes('/') ? s.split('/').reverse().join('-') : s || null;

type MetricTask = { status: string; workflow_status?: string | null; due_date?: string | null; start_date?: string | null; created_at?: string | null; completed_at?: string | null };
export const localDay = (date?: Date | string | null) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
export function gateScore(criteria: GateCriterion[]) {
  const total = criteria.reduce((n, c) => n + c.weight, 0);
  return total ? Math.round(criteria.reduce((n, c) => n + (c.checked ? c.weight : 0), 0) * 100 / total) : null;
}
export function gateReady(tasks: { status: string; workflow_status?: string | null }[], criteria: GateCriterion[]) {
  const progress = taskProgress(tasks);
  const total = criteria.reduce((n, c) => n + c.weight, 0);
  const passed = criteria.reduce((n, c) => n + (c.checked ? c.weight : 0), 0);
  return progress.total > 0 && progress.done === progress.total && total > 0 && passed / total >= .8;
}
export function workflowMetrics(tasks: MetricTask[], now = new Date()) {
  const day = localDay(now), month = day.slice(0, 7);
  const current = tasks.filter(t => !['deleted', 'archived', 'canceled', 'cancelled'].includes((t.status || '').toLowerCase()) && t.workflow_status !== 'canceled');
  // Each task belongs to one slice. Overdue never appears again in Todo/Doing.
  const buckets = [0, 0, 0, 0, 0];
  for (const t of current) {
    const created = t.created_at ? localDay(t.created_at) : (t.start_date ? t.start_date.slice(0, 10) : '');
    const completed = t.completed_at ? localDay(t.completed_at) : null;
    const due = t.due_date ? t.due_date.slice(0, 10) : '';
    const st = (t.status || '').toLowerCase();
    const wf = (t.workflow_status || '').toLowerCase();
    const taskDone = isDone(st) || wf === 'completed';

    const relevant = (created && created.slice(0, 7) === month) ||
      (completed && completed.slice(0, 7) === month) ||
      (due && due.slice(0, 7) === month) ||
      (!taskDone && (!created || created <= day));

    if (!relevant) continue;

    const isOverdue = due && due < day;
    const isReview = ['in_review', 'review', 'pending', 'in_qa', 'feedback'].includes(st) || wf === 'in_qa';
    const isDoing = ['in_progress', 'in-progress', 'doing', 'scoping'].includes(st) || wf === 'in_progress' || wf === 'scoping';

    const index = taskDone ? 0 : isOverdue ? 3 : isReview ? 2 : isDoing ? 1 : 4;
    buckets[index]++;
  }
  const completed = current.filter(t => (isDone(t.status) || t.workflow_status === 'completed') && t.completed_at);
  const cycle = completed.map(t => ({ end: Date.parse(t.completed_at!), start: Date.parse(t.start_date || t.created_at || '') })).filter(t => Number.isFinite(t.start) && t.end >= t.start);
  const dated = completed.filter(t => t.due_date);
  return {
    progress: taskProgress(current).percent,
    velocity: cycle.length ? Math.round(cycle.reduce((n, t) => n + (t.end - t.start) / 86400000, 0) / cycle.length * 10) / 10 : null,
    onTime: dated.length ? Math.round(dated.filter(t => localDay(t.completed_at!) <= t.due_date!.slice(0, 10)).length * 100 / dated.length) : null,
    buckets,
  };
}
