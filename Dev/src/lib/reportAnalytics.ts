import {calendarDay} from './profileCalendar.ts';
import {taskActive,taskDone,taskOverdue,taskBucket,completionMetrics,type TrackedTask} from './taskTracking.ts';
export type TimeRange='week'|'month'|'quarter'|'all';
export function reportPeriod(range:TimeRange,now=new Date()){
 const today=calendarDay(now.toISOString())!;const anchor=new Date(`${today}T12:00:00`);
 let start=new Date(anchor),previousStart=new Date(anchor),previousEnd=new Date(anchor);
 if(range==='all')return {start:null,end:today,previousStart:null,previousEnd:null};
 if(range==='week'){start.setDate(start.getDate()-((start.getDay()+6)%7));previousStart=new Date(start);previousStart.setDate(start.getDate()-7);}
 else {start.setDate(1);if(range==='quarter')start.setMonth(Math.floor(start.getMonth()/3)*3);previousStart=new Date(start);previousStart.setMonth(start.getMonth()-(range==='quarter'?3:1));}
 previousEnd=new Date(start);previousEnd.setDate(start.getDate()-1);
 return {start:calendarDay(start.toISOString()),end:today,previousStart:calendarDay(previousStart.toISOString()),previousEnd:calendarDay(previousEnd.toISOString())};
}
export function buildReportAnalytics<T extends TrackedTask & {assignee_id?:string;assignee?:{name:string};priority?:string;id:string;title:string}>(tasks:T[],range:TimeRange,now=new Date()){
 const period=reportPeriod(range,now),active=tasks.filter(taskActive);
 const inRange=(value?:string|null,start=period.start,end=period.end)=>{const day=calendarDay(value);return Boolean(day&&(!start||day>=start)&&day<=end);};
 // Scope current work by creation, schedule, deadline or genuine completion. Undated open work stays visible.
 const scoped=active.filter(t=>!period.start||inRange(t.created_at)||inRange(t.start_date)||inRange(t.due_date)||inRange(t.completed_at)||(!taskDone(t)&&(!t.created_at||calendarDay(t.created_at)!<=period.end)));
 const completed=active.filter(t=>taskDone(t)&&(range==='all'||inRange(t.completed_at)));
 const previous=period.previousStart?active.filter(t=>taskDone(t)&&inRange(t.completed_at,period.previousStart,period.previousEnd!)):[];
 const completionTrend: {name:string;completed:number}[]=[];
 let trendStart=period.start||active.map(t=>calendarDay(t.completed_at)).filter(Boolean).sort()[0]||period.end;
 const cursor=new Date(`${trendStart}T12:00:00`),end=new Date(`${period.end}T12:00:00`);
 const span=Math.round((end.getTime()-cursor.getTime())/86400000),step=span>400?'month':span>45?'week':'day';
 while(cursor<=end&&completionTrend.length<1000){const a=calendarDay(cursor.toISOString())!;const next=new Date(cursor);if(step==='month')next.setMonth(next.getMonth()+1);else next.setDate(next.getDate()+(step==='week'?7:1));const b=new Date(next);b.setDate(b.getDate()-1);completionTrend.push({name:a.split('-').reverse().slice(0,2).join('/'),completed:completed.filter(t=>inRange(t.completed_at,a,calendarDay(b.toISOString())!)).length});cursor.setTime(next.getTime());}
 const status=new Map<string,number>(),priority=new Map<string,number>(),people=new Map<string,{name:string;completed:number}>();
 scoped.forEach(t=>{const key=taskBucket(t,period.end);status.set(key,(status.get(key)||0)+1);const p=t.priority||'medium';priority.set(p,(priority.get(p)||0)+1);});
 completed.forEach(t=>{if(t.assignee_id){const id=String(t.assignee_id),row=people.get(id)||{name:t.assignee?.name||'Chưa cập nhật tên',completed:0};row.completed++;people.set(id,row);}});
 return {period,scoped,kpis:{tasksCompleted:completed.length,tasksCompletedPrev:range==='all'?null:previous.length,overdueRate:scoped.length?Math.round(scoped.filter(t=>taskOverdue(t,period.end)).length*100/scoped.length):0,avgCompletionTimeDays:completionMetrics(completed).averageDays,unknownCompletionDates:completionMetrics(active).unknownCompletions},completionTrend,statusDistribution:[...status].map(([name,value])=>({name,value})),priorityBreakdown:[...priority].map(([name,count])=>({name,count})),topPerformers:[...people.values()].sort((a,b)=>b.completed-a.completed).slice(0,5)};
}
