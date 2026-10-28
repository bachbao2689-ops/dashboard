import {calendarDay} from './profileCalendar.ts';
import {localDay} from './workflowHub.ts';
export type TaskKind = 'task' | 'project_subtask' | 'campaign_subtask';
export type TrackedTask = {id?:string; assignee_id?:string|number|null; assignee?:{name?:string}|null; priority?:string|null;status?:string|null; workflow_status?:string|null; due_date?:string|null; created_at?:string|null; start_date?:string|null; completed_at?:string|null};
export const taskTarget = (key:string): {kind:TaskKind;id:string;table:string} => key.startsWith('ps-') ? {kind:'project_subtask',id:key.slice(3),table:'project_subtasks'} : key.startsWith('cs-') ? {kind:'campaign_subtask',id:key.slice(3),table:'campaign_subtasks'} : {kind:'task',id:key,table:'tasks'};
export const taskKey = (kind:string,id:string) => kind==='project_subtask'?`ps-${id}`:kind==='campaign_subtask'?`cs-${id}`:id;
export const taskIdentity = taskTarget;
export const taskUIId = taskKey;
export const isTaskDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
export const isTaskClosed = (status?: string | null) => isTaskDone(status) || ['cancelled','canceled','deleted','archived'].includes((status || '').toLowerCase());
export const taskDay = (value?: string | null) => !value ? '' : /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : Number.isNaN(new Date(value).getTime()) ? '' : localDay(new Date(value));
export function weeklyActivity<T extends TrackedTask>(tasks: T[], start: string, end: string) {
  const during = (value?: string | null) => { const day = taskDay(value); return !!day && day >= start && day <= end; };
  return {
    created: tasks.filter(t => during(t.created_at)).length,
    done: tasks.filter(t => isTaskDone(t.status) && during(t.completed_at)).length,
    doing: tasks.filter(t => !isTaskClosed(t.status) && (!taskDay(t.created_at) || taskDay(t.created_at) <= end)).length,
  };
}
export function reportAnalytics(tasks: TrackedTask[], range: 'week'|'month'|'quarter'|'year'|'all', now = new Date()) {
  const today = taskDay(now.toISOString());
  const end = new Date(`${today}T12:00:00Z`);
  const startDate = new Date(end);
  if (range === 'week') startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay()+6)%7));
  if (range === 'month') startDate.setUTCDate(1);
  if (range === 'quarter') { startDate.setUTCMonth(Math.floor(startDate.getUTCMonth()/3)*3,1); }
  if (range === 'year') { startDate.setUTCMonth(0, 1); }
  const start = range === 'all' ? tasks.map(t=>taskDay(t.created_at)).filter(Boolean).sort()[0] || today : taskDay(startDate.toISOString());
  const periodDays = Math.max(1, Math.round((end.getTime()-new Date(`${start}T12:00:00Z`).getTime())/86400000)+1);
  const previousEnd = new Date(`${start}T12:00:00Z`); previousEnd.setUTCDate(previousEnd.getUTCDate()-1);
  const previousStart = new Date(`${start}T12:00:00Z`);
  if(range==='week')previousStart.setUTCDate(previousStart.getUTCDate()-7);
  else if(range==='month')previousStart.setUTCMonth(previousStart.getUTCMonth()-1,1);
  else if(range==='quarter')previousStart.setUTCMonth(previousStart.getUTCMonth()-3,1);
  else if(range==='year')previousStart.setUTCFullYear(previousStart.getUTCFullYear()-1,0,1);
  const elapsedEnd=new Date(previousStart);elapsedEnd.setUTCDate(elapsedEnd.getUTCDate()+periodDays-1);
  if(elapsedEnd<previousEnd)previousEnd.setTime(elapsedEnd.getTime());
  const inRange = (date: string, a=start,b=today) => !!date && date>=a && date<=b;
  const completed = tasks.filter(t=>isTaskDone(t.status) && (range==='all' || inRange(taskDay(t.completed_at))));
  const relevant = tasks.filter(t=>(!taskDay(t.created_at) || taskDay(t.created_at)<=today) && (range==='all' || !isTaskClosed(t.status) || inRange(taskDay(t.completed_at)) || inRange(taskDay(t.created_at))));
  const overdue = relevant.filter(t=>!isTaskClosed(t.status) && taskDay(t.due_date) && taskDay(t.due_date)<today);
  const cycles = completed.flatMap(t=>{const a=t.created_at && new Date(t.created_at).getTime(), b=t.completed_at && new Date(t.completed_at).getTime();return typeof a==='number' && typeof b==='number' && b>=a ? [(b-a)/86400000] : [];});
  const counts = (key:(t:TrackedTask)=>string) => Object.entries(relevant.reduce<Record<string,number>>((a,t)=>{const k=key(t);a[k]=(a[k]||0)+1;return a;},{}));
  const performers = new Map<string,{name:string;completed:number}>();
  completed.forEach(t=>{if(t.assignee_id==null)return;const id=String(t.assignee_id), p=performers.get(id)||{name:t.assignee?.name||'Chưa xác định',completed:0};p.completed++;performers.set(id,p);});
  return {
    kpis: { tasksCompleted:completed.length, tasksCompletedPrev:range==='all'?null:tasks.filter(t=>isTaskDone(t.status)&&inRange(taskDay(t.completed_at),taskDay(previousStart.toISOString()),taskDay(previousEnd.toISOString()))).length, overdueRate:relevant.length?Math.round(overdue.length/relevant.length*100):0, avgCompletionTimeDays:cycles.length?Number((cycles.reduce((a,b)=>a+b,0)/cycles.length).toFixed(1)):null },
    completionTrend: Array.from({length:4},(_,i)=>{const a=new Date(`${start}T12:00:00Z`);a.setUTCDate(a.getUTCDate()+Math.floor(i*periodDays/4));const b=new Date(`${start}T12:00:00Z`);b.setUTCDate(b.getUTCDate()+Math.floor((i+1)*periodDays/4)-1);return {name:taskDay(a.toISOString()),completed:completed.filter(t=>inRange(taskDay(t.completed_at),taskDay(a.toISOString()),taskDay(b.toISOString()))).length};}),
    statusDistribution:counts(t=>isTaskDone(t.status)?'done':(t.status||'todo')).map(([name,value])=>({name,value})),
    priorityBreakdown:counts(t=>(t.priority||'medium').toLowerCase()).map(([name,count])=>({name,count})),
    topPerformers:[...performers.values()].sort((a,b)=>b.completed-a.completed).slice(0,5),
  };
}
export const taskLink = (key:string) => `/tasks?task=${encodeURIComponent(key)}`;
export {notificationLink as entityLink} from '../../supabase/functions/_shared/notificationLink.ts';

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
