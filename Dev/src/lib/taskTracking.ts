import {calendarDay} from './profileCalendar.ts';
import {localDay} from './workflowHub.ts';
import {checklistTarget} from './taskChecklist.ts';
import {isTaskActive as taskActive, isTaskDone as taskDone, isTaskDoneStatus as isTaskDone, isTaskOpen as taskOpen, normalizeTaskStatus as normalizeStatus, taskState} from './taskStatus.ts';
export {taskActive, taskDone, taskOpen, taskState, isTaskDone, normalizeStatus};
export type TaskKind = 'task' | 'project_subtask' | 'campaign_subtask';
export type TrackedTask = {id?:string; assignee_id?:string|number|null; assignee?:{name?:string}|null; priority?:string|null;status?:string|null; workflow_status?:string|null; due_date?:string|null; created_at?:string|null; start_date?:string|null; completed_at?:string|null};
export const taskTarget = (key:string): {kind:TaskKind;id:string;table:string;checklistItemId?:string} => {
  const {parentKey, checklistItemId} = checklistTarget(key);
  const target = parentKey.startsWith('ps-') ? {kind:'project_subtask' as const,id:parentKey.slice(3),table:'project_subtasks'} : parentKey.startsWith('cs-') ? {kind:'campaign_subtask' as const,id:parentKey.slice(3),table:'campaign_subtasks'} : {kind:'task' as const,id:parentKey,table:'tasks'};
  return checklistItemId ? {...target, checklistItemId} : target;
};
export const taskKey = (kind:string,id:string) => kind==='project_subtask'?`ps-${id}`:kind==='campaign_subtask'?`cs-${id}`:id;
export const taskIdentity = taskTarget;
export const taskUIId = taskKey;
export const isTaskClosed = (status?: string | null) => isTaskDone(status) || ['cancelled','canceled','deleted','archived'].includes(normalizeStatus(status));
export const taskDay = (value?: string | null) => !value ? '' : /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : Number.isNaN(new Date(value).getTime()) ? '' : localDay(new Date(value));
export function weeklyActivity<T extends TrackedTask>(tasks: T[], start: string, end: string) {
  const during = (value?: string | null) => { const day = taskDay(value); return !!day && day >= start && day <= end; };
  const active = tasks.filter(taskActive);
  return {
    created: active.filter(t => during(t.created_at)).length,
    done: active.filter(t => taskDone(t) && during(t.completed_at)).length,
    doing: active.filter(t => ['in_progress', 'in_review'].includes(taskState(t)) && (!taskDay(t.created_at) || taskDay(t.created_at) <= end)).length,
  };
}
export function reportAnalytics(tasks: TrackedTask[], range: 'week'|'month'|'quarter'|'year'|'all', now = new Date()) {
  const today = taskDay(now.toISOString());
  const end = new Date(today + 'T12:00:00Z');
  const startDate = new Date(end);
  if (range === 'week') startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay()+6)%7));
  if (range === 'month') startDate.setUTCDate(1);
  if (range === 'quarter') startDate.setUTCMonth(Math.floor(startDate.getUTCMonth()/3)*3, 1);
  if (range === 'year') startDate.setUTCMonth(0, 1);
  const start = range === 'all' ? tasks.map(t=>taskDay(t.created_at)).filter(Boolean).sort()[0] || today : taskDay(startDate.toISOString());
  const periodDays = Math.max(1, Math.round((end.getTime()-new Date(start + 'T12:00:00Z').getTime())/86400000)+1);
  const previousEnd = new Date(start + 'T12:00:00Z'); previousEnd.setUTCDate(previousEnd.getUTCDate()-1);
  const previousStart = new Date(start + 'T12:00:00Z');
  if(range==='week')previousStart.setUTCDate(previousStart.getUTCDate()-7);
  else if(range==='month')previousStart.setUTCMonth(previousStart.getUTCMonth()-1,1);
  else if(range==='quarter')previousStart.setUTCMonth(previousStart.getUTCMonth()-3,1);
  else if(range==='year')previousStart.setUTCFullYear(previousStart.getUTCFullYear()-1,0,1);
  const elapsedEnd=new Date(previousStart);elapsedEnd.setUTCDate(elapsedEnd.getUTCDate()+periodDays-1);
  if(elapsedEnd<previousEnd)previousEnd.setTime(elapsedEnd.getTime());
  const inRange = (date: string, a=start,b=today) => !!date && date>=a && date<=b;
  const activeTasks = tasks.filter(taskActive);
  const completed = activeTasks.filter(t=>taskDone(t) && (range==='all' || inRange(taskDay(t.completed_at))));
  const relevant = activeTasks.filter(t=>(!taskDay(t.created_at) || taskDay(t.created_at)<=today) && (range==='all' || !taskDone(t) || inRange(taskDay(t.completed_at)) || inRange(taskDay(t.created_at))));
  const overdue = relevant.filter(t=>taskOverdue(t,today));
  const cycles = completed.flatMap(t=>{const a=t.created_at && new Date(t.created_at).getTime(), b=t.completed_at && new Date(t.completed_at).getTime();return typeof a==='number' && typeof b==='number' && b>=a ? [(b-a)/86400000] : [];});
  const counts = (key:(t:TrackedTask)=>string) => Object.entries(relevant.reduce<Record<string,number>>((a,t)=>{const k=key(t);a[k]=(a[k]||0)+1;return a;},{}));
  const performers = new Map<string,{name:string;completed:number}>();
  completed.forEach(t=>{if(t.assignee_id==null)return;const id=String(t.assignee_id), p=performers.get(id)||{name:t.assignee?.name||'Chưa xác định',completed:0};p.completed++;performers.set(id,p);});
  return {
    kpis: { tasksCompleted:completed.length, tasksCompletedPrev:range==='all'?null:activeTasks.filter(t=>taskDone(t)&&inRange(taskDay(t.completed_at),taskDay(previousStart.toISOString()),taskDay(previousEnd.toISOString()))).length, overdueRate:relevant.length?Math.round(overdue.length/relevant.length*100):0, avgCompletionTimeDays:cycles.length?Number((cycles.reduce((a,b)=>a+b,0)/cycles.length).toFixed(1)):null },
    completionTrend: Array.from({length:4},(_,i)=>{const a=new Date(start + 'T12:00:00Z');a.setUTCDate(a.getUTCDate()+Math.floor(i*periodDays/4));const b=new Date(start + 'T12:00:00Z');b.setUTCDate(b.getUTCDate()+Math.floor((i+1)*periodDays/4)-1);return {name:taskDay(a.toISOString()),completed:completed.filter(t=>inRange(taskDay(t.completed_at),taskDay(a.toISOString()),taskDay(b.toISOString()))).length};}),
    statusDistribution:counts(t=>taskState(t)).map(([name,value])=>({name,value})),
    priorityBreakdown:counts(t=>(t.priority||'medium').toLowerCase()).map(([name,count])=>({name,count})),
    topPerformers:[...performers.values()].sort((a,b)=>b.completed-a.completed).slice(0,5),
  };
}
export const taskLink = (key:string) => `/tasks?task=${encodeURIComponent(key)}`;
export {notificationLink as entityLink} from '../../supabase/functions/_shared/notificationLink.ts';

export const taskOverdue = (t:TrackedTask,today=calendarDay(new Date().toISOString())!) => taskOpen(t)&&Boolean(t.due_date&&calendarDay(t.due_date)!<today);
export function taskDueWithin(t:TrackedTask,start:string,end:string) {
  const due=calendarDay(t.due_date);return taskOpen(t)&&Boolean(due&&due>=start&&due<=end);
}
export function taskBucket(t:TrackedTask,today:string): 'done'|'in_review'|'in_progress'|'todo'|'overdue' {
  if(taskDone(t))return 'done';
  if(taskOverdue(t,today))return 'overdue';
  return taskState(t);
}
export function completionMetrics(tasks:TrackedTask[]) {
  const completed=tasks.filter(t=>taskActive(t)&&taskDone(t)&&t.completed_at);
  const cycles=completed.map(t=>({start:Date.parse(t.start_date||t.created_at||''),end:Date.parse(t.completed_at!)})).filter(t=>Number.isFinite(t.start)&&Number.isFinite(t.end)&&t.end>=t.start);
  const dated=completed.filter(t=>t.due_date);
  return {averageDays:cycles.length?Math.round(cycles.reduce((n,t)=>n+(t.end-t.start)/86400000,0)/cycles.length*10)/10:null,
    onTime:dated.length?Math.round(dated.filter(t=>calendarDay(t.completed_at)!<=calendarDay(t.due_date)!).length*100/dated.length):null,
    unknownCompletions:tasks.filter(t=>taskActive(t)&&taskDone(t)&&!t.completed_at).length};
}
