export interface WorkflowPerson { id: number; name: string; avatar_url?: string; role?: 'pic' | 'sub_pic' }
export interface HubPhase {
  id: string; title: string; position: number; start_date: string | null; due_date: string | null;
  status: string; version: number; opportunity: number | null; opportunity_note: string | null;
  can_edit_tasks: boolean; members: WorkflowPerson[];
}
export interface HubTrack {
  id: string; entity_type: 'project' | 'campaign'; entity_id: string; name: string; status: string;
  start_date: string | null; due_date: string | null; root: boolean; asset: string | null;
  pics: WorkflowPerson[]; phases: HubPhase[];
}
export const workflowLink = (kind: 'project' | 'campaign', id: string) => `/?${kind}=${encodeURIComponent(id)}`;
export const isDone = (status: string) => ['done', 'completed', 'complete'].includes(status.toLowerCase());
export function taskProgress(tasks: { status: string }[]) {
  const active = tasks.filter(t => !['deleted', 'archived'].includes(t.status));
  const done = active.filter(t => isDone(t.status)).length;
  return { total: active.length, done, percent: active.length ? Math.round(done * 100 / active.length) : null };
}
export const displayDate = (s: string | null | undefined) => s ? s.split('T')[0].split('-').reverse().join('/') : '—';
export const inputDate = (s: string) => s.includes('/') ? s.split('/').reverse().join('-') : s || null;
