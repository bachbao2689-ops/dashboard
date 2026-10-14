import type {Task} from '../hooks/useTasks';
import type {WorkspaceData} from '../hooks/useWorkspaceData';
import type {HubTrack} from './workflowHub.ts';
import {parentTasks,taskProgress,displayDate} from './workflowHub.ts';
import {calendarDay} from './profileCalendar.ts';
import {taskActive,taskOpen,taskDone,taskOverdue,taskBucket,completionMetrics} from './taskTracking.ts';
import {buildReportAnalytics,type TimeRange} from './reportAnalytics.ts';
import type {DepartmentKpis,OverallDashboardData,DepartmentDetailData,PeriodFilter} from '../types/department';
export function buildDepartmentTracking(tasks:Task[],users:WorkspaceData['users'],departments:WorkspaceData['departments'],tracks:HubTrack[],period:PeriodFilter,now=new Date()){
 const today=calendarDay(now.toISOString())!,active=tasks.filter(taskActive);
 const projectRows=(id?:string)=>tracks.filter(t=>!id||t.department_id===id).map(t=>{
   const work=parentTasks(active,t.entity_type,t.entity_id),progress=taskProgress(work),late=work.filter(w=>taskOverdue(w,today)).length;
   const status=late||(!['done','completed','complete'].includes(t.status)&&t.due_date&&t.due_date<today)?'late':work.some(w=>taskOpen(w)&&w.due_date&&w.due_date>=today&&Date.parse(w.due_date)-Date.parse(today)<=3*86400000)?'risk':'ok';
   return {id:t.entity_id,kind:t.entity_type,name:t.name,department:departments.find(d=>d.id===t.department_id)?.name||'Chưa phân phòng',departmentId:t.department_id||'',progress:progress.percent,completedTasks:progress.done,totalTasks:progress.total,status:status as 'late'|'risk'|'ok',deadline:displayDate(t.due_date),manager:t.pics.map(p=>p.name).join(', ')||'Chưa có PIC',overdueCount:late};
 });
 const kpis=(work:Task[],id?:string):DepartmentKpis=>{
  const scoped=buildReportAnalytics(work,period as TimeRange,now).scoped,metrics=completionMetrics(scoped),progress=taskProgress(scoped),projects=projectRows(id);
  return {completionRate:progress.percent,completionDelta:`${progress.done}/${progress.total} công việc`,overdueTasks:scoped.filter(t=>taskOverdue(t,today)).length,overdueDelta:'Task + Subtask đang mở',inProgressTasks:scoped.filter(t=>taskOpen(t)&&taskBucket(t,today)==='in_progress').length,inProgressSub:`Trong ${scoped.length} công việc`,onTimeRate:metrics.onTime,onTimeDelta:'Theo ngày hoàn thành đã lưu',projectsAtRiskOrCount:id?projects.length:projects.filter(p=>p.status!=='ok').length,projectsSub:`${projects.length} Project/Campaign`,budgetActual:null,budgetTotal:tracks.filter(t=>!id||t.department_id===id).some(t=>t.budget!=null)?tracks.filter(t=>!id||t.department_id===id).reduce((n,t)=>n+(t.budget||0),0):null,avgTaskDuration:metrics.averageDays,avgTaskDurationTarget:null,satisfactionScore:null};
 };
 const trend=buildReportAnalytics(active,period as TimeRange,now).completionTrend.map(p=>({week:p.name,actual:p.completed,target:null}));
 const detail:Record<string,DepartmentDetailData>={};
 for(const d of departments){
   const work=active.filter(t=>t.department_id===d.id),members=users.filter(u=>u.department_id===d.id),projects=projectRows(d.id);
   detail[d.id]={id:d.id,name:d.name,kpis:kpis(work,d.id),projects,tasks:work.filter(taskOpen).map(t=>({id:t.id,name:t.title,projectTag:t.project?.name||t.campaign?.name||'Task lẻ',assignee:t.assignee?.name||'Chưa giao',status:taskOverdue(t,today)?'late':taskBucket(t,today)==='todo'?'todo':'doing',dueDate:displayDate(t.due_date),priority:/high|urgent/i.test(t.priority)?'Cao':t.priority==='low'?'Thấp':'TB'})),burndown:buildReportAnalytics(work,period as TimeRange,now).completionTrend.map(p=>({week:p.name,actual:p.completed,planned:null})),members:members.map(u=>{const count=work.filter(t=>String(t.assignee_id)===String(u.id)&&taskOpen(t)).length;return {id:u.id,name:u.name,initial:u.name.slice(0,2).toUpperCase(),activeTasks:count,capacityPct:count*20};}),activities:work.filter(t=>taskDone(t)&&t.completed_at).sort((a,b)=>b.completed_at!.localeCompare(a.completed_at!)).slice(0,8).map(t=>({id:t.id,icon:'check',title:`Hoàn thành: ${t.title}`,time:new Date(t.completed_at!).toLocaleString('vi-VN')}))};
 }
 const comparison=departments.map(d=>{const work=active.filter(t=>t.department_id===d.id),bucket=(b:string)=>work.filter(t=>taskBucket(t,today)===b).length;return {id:d.id,name:d.name,done:bucket('done'),doing:bucket('in_progress')+bucket('in_review'),todo:bucket('todo'),late:bucket('overdue'),total:work.length,completionPct:taskProgress(work).percent||0};});
 const heatmap=departments.map(d=>{const work=active.filter(t=>t.department_id===d.id&&taskOpen(t)),members=users.filter(u=>u.department_id===d.id).length;return {id:d.id,name:d.name,weeks:Array.from({length:4},(_,i)=>{const start=new Date(`${today}T12:00:00`);start.setDate(start.getDate()+i*7);const end=new Date(start);end.setDate(end.getDate()+6);const a=calendarDay(start.toISOString())!,b=calendarDay(end.toISOString())!;const count=work.filter(t=>t.due_date?t.due_date>=a&&t.due_date<=b||(i===0&&t.due_date<today):i===0).length;return members?Math.round(count*20/members):null;}) as [number|null,number|null,number|null,number|null]};});
 const overdue=active.filter(t=>taskOverdue(t,today)).length;
 const overall:OverallDashboardData={kpis:kpis(active),warningBanner:overdue?`${overdue} công việc đang quá hạn. Bấm công việc để xem và xử lý.`:'Không có công việc quá hạn trong phạm vi truy cập.',comparison,weeklyTrends:trend,heatmap,projects:projectRows()};
 return {overall,detail};
}
