import { localDay } from './workflowHub.ts';

export type TrackedTask = { id: string; status?: string | null; priority?: string | null; created_at?: string | null; updated_at?: string | null; completed_at?: string | null; due_date?: string | null; start_date?: string | null; assignee_id?: string | number | null; assignee?: { name?: string } | null };
export const isTaskDone = (status?: string | null) => ['done', 'complete', 'completed'].includes((status || '').toLowerCase());
export const isTaskClosed = (status?: string | null) => isTaskDone(status) || ['cancelled','canceled','deleted','archived'].includes((status || '').toLowerCase());
export const taskDay = (value?: string | null) => !value ? '' : /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : Number.isNaN(new Date(value).getTime()) ? '' : localDay(new Date(value));
export function taskIdentity(id: string) {
  return id.startsWith('ps-') ? { kind: 'project_subtask' as const, table: 'project_subtasks', id: id.slice(3) } : id.startsWith('cs-') ? { kind: 'campaign_subtask' as const, table: 'campaign_subtasks', id: id.slice(3) } : {kind: 'task' as const, table: 'tasks', id};
}
export const taskUIId = (kind: string, id: string) => kind === 'project_subtask' ? `ps-${id}` : kind === 'campaign_subtask' ? `cs-${id}` : id;
export function entityHref(kind?: string | null, id?: string | null) {
  if (kind === 'weekly_report') return '/my-tasks';
  if (!id) return null;
  const key = encodeURIComponent(id);
  if (['task','project_subtask','campaign_subtask'].includes(kind || '')) return `/tasks?task=${encodeURIComponent(taskUIId(kind!,id))}`;
  if (kind === 'project' || kind === 'campaign') return `/projects?${kind}=${key}`;
  if (kind === 'weekly_report' || kind === 'user') return '/my-tasks';
  if (kind === 'workflow' || kind === 'workflow2') return '/workflow';
  if (kind === 'borrow_request') return '/borrow-requests';
  if (kind === 'asset') return '/assets';
  return null;
}
export function weeklyActivity<T extends TrackedTask>(tasks: T[], start: string, end: string) {
  const during = (value?: string | null) => { const day = taskDay(value); return !!day && day >= start && day <= end; };
  return {
    created: tasks.filter(t => during(t.created_at)).length,
    done: tasks.filter(t => isTaskDone(t.status) && during(t.completed_at)).length,
    doing: tasks.filter(t => !isTaskClosed(t.status) && (!taskDay(t.created_at) || taskDay(t.created_at) <= end)).length,
  };
}
export function reportAnalytics(tasks: TrackedTask[], range: 'week'|'month'|'quarter'|'all', now = new Date()) {
  const today = taskDay(now.toISOString());
  const end = new Date(`${today}T12:00:00Z`);
  const startDate = new Date(end);
  if (range === 'week') startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay()+6)%7));
  if (range === 'month') startDate.setUTCDate(1);
  if (range === 'quarter') { startDate.setUTCMonth(Math.floor(startDate.getUTCMonth()/3)*3,1); }
  const start = range === 'all' ? tasks.map(t=>taskDay(t.created_at)).filter(Boolean).sort()[0] || today : taskDay(startDate.toISOString());
  const periodDays = Math.max(1, Math.round((end.getTime()-new Date(`${start}T12:00:00Z`).getTime())/86400000)+1);
  const previousEnd = new Date(`${start}T12:00:00Z`); previousEnd.setUTCDate(previousEnd.getUTCDate()-1);
  const previousStart = new Date(`${start}T12:00:00Z`);
  if(range==='week')previousStart.setUTCDate(previousStart.getUTCDate()-7);
  else if(range==='month')previousStart.setUTCMonth(previousStart.getUTCMonth()-1,1);
  else if(range==='quarter')previousStart.setUTCMonth(previousStart.getUTCMonth()-3,1);
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
