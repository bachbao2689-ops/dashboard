import {calendarDay} from './profileCalendar.ts';
export type TaskKind = 'task' | 'project_subtask' | 'campaign_subtask';
export type TrackedTask = {status?:string|null; workflow_status?:string|null; due_date?:string|null; created_at?:string|null; start_date?:string|null; completed_at?:string|null};
export const taskTarget = (key:string): {kind:TaskKind;id:string;table:string} => key.startsWith('ps-') ? {kind:'project_subtask',id:key.slice(3),table:'project_subtasks'} : key.startsWith('cs-') ? {kind:'campaign_subtask',id:key.slice(3),table:'campaign_subtasks'} : {kind:'task',id:key,table:'tasks'};
export const taskKey = (kind:string,id:string) => kind==='project_subtask'?`ps-${id}`:kind==='campaign_subtask'?`cs-${id}`:id;
export const taskLink = (key:string) => `/tasks?task=${encodeURIComponent(key)}`;
export function entityLink(kind?:string|null,id?:string|null):string|null {
  if (kind==='weekly_report') return '/my-tasks?report=1';
  if (!id) return null;
  if (['task','project_subtask','campaign_subtask'].includes(kind||'')) return taskLink(taskKey(kind!,id));
  if (kind==='project'||kind==='campaign') return `/projects?${kind}=${encodeURIComponent(id)}`;
  if (kind==='workflow2'||kind==='workflow_track') return '/workflow';
  if (kind==='asset') return `/assets?asset=${encodeURIComponent(id)}`;
  if (kind==='borrow_request') return `/borrow-requests?request=${encodeURIComponent(id)}`;
  return null;
}
export const taskDone = (t:TrackedTask) => ['done','completed','complete'].includes((t.status||'').toLowerCase()) || t.workflow_status==='completed';
export const taskActive = (t:TrackedTask) => !['deleted','archived','cancelled','canceled'].includes((t.status||'').toLowerCase()) && t.workflow_status!=='canceled';
export const taskOpen = (t:TrackedTask) => taskActive(t)&&!taskDone(t);
export const taskOverdue = (t:TrackedTask,today=calendarDay(new Date().toISOString())!) => taskOpen(t)&&Boolean(t.due_date&&calendarDay(t.due_date)!<today);
export function taskDueWithin(t:TrackedTask,start:string,end:string) {
  const due=calendarDay(t.due_date);return taskOpen(t)&&Boolean(due&&due>=start&&due<=end);
}
export function taskBucket(t:TrackedTask,today:string) {
  if(taskDone(t))return 'done';
  if(taskOverdue(t,today))return 'overdue';
  if(['in_review','review','in_qa','feedback','pending'].includes(t.status||'')||t.workflow_status==='in_qa')return 'in_review';
  if(['in_progress','in-progress','doing','scoping'].includes(t.status||'')||['in_progress','scoping'].includes(t.workflow_status||''))return 'in_progress';
  return 'todo';
}
export function completionMetrics(tasks:TrackedTask[]) {
  const completed=tasks.filter(t=>taskActive(t)&&taskDone(t)&&t.completed_at);
  const cycles=completed.map(t=>({start:Date.parse(t.start_date||t.created_at||''),end:Date.parse(t.completed_at!)})).filter(t=>Number.isFinite(t.start)&&Number.isFinite(t.end)&&t.end>=t.start);
  const dated=completed.filter(t=>t.due_date);
  return {averageDays:cycles.length?Math.round(cycles.reduce((n,t)=>n+(t.end-t.start)/86400000,0)/cycles.length*10)/10:null,
    onTime:dated.length?Math.round(dated.filter(t=>calendarDay(t.completed_at)!<=calendarDay(t.due_date)!).length*100/dated.length):null,
    unknownCompletions:tasks.filter(t=>taskActive(t)&&taskDone(t)&&!t.completed_at).length};
}
