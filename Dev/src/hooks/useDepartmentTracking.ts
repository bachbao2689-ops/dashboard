import {useMemo} from 'react';
import {useWorkspaceData} from './useWorkspaceData';
import {isTaskClosed,isTaskDone,taskDay,reportAnalytics} from '../lib/taskTracking';
import {workflowMetrics} from '../lib/workflowHub';
import {computeBurndownSeries,computeWorkloadHeatmap} from './useTeamWorkload';
import type {DepartmentDetailData,OverallDashboardData,DepartmentKpis,PeriodFilter} from '../types/department';
export function useDepartmentTracking(period:PeriodFilter){
 const source=useWorkspaceData();
 const data=useMemo(()=>{
  const today=taskDay(new Date().toISOString());
  const tasks=source.tasks.filter(t=>!['cancelled','canceled'].includes(t.status.toLowerCase()));
  const names=new Map<string,string>();
  tasks.forEach(t=>{if(t.department?.id)names.set(t.department.id,t.department.name);});
  source.users.forEach(u=>{if(u.department_id&&u.department?.name)names.set(u.department_id,u.department.name);});
  const kpis=(list:typeof tasks):DepartmentKpis=>{
   const analytics=reportAnalytics(list,period),metrics=workflowMetrics(list as any);
   const parents=new Set(list.map(t=>t.project?.id||t.campaign?.id).filter(Boolean));
   return {completionRate:list.length?Math.round(list.filter(t=>isTaskDone(t.status)).length/list.length*100):0,completionDelta:'Theo công việc thực tế',overdueTasks:list.filter(t=>!isTaskClosed(t.status)&&taskDay(t.due_date)&&taskDay(t.due_date)<today).length,overdueDelta:'',inProgressTasks:list.filter(t=>!isTaskClosed(t.status)&&!['todo','backlog','planned'].includes(t.status)).length,inProgressSub:`${list.length} công việc`,onTimeRate:metrics.onTime??0,onTimeDelta:metrics.onTime==null?'Chưa có ngày hoàn thành':'Theo timestamp hoàn thành',projectsAtRiskOrCount:parents.size,projectsSub:'Project/Campaign có công việc',budgetActual:0,budgetTotal:0,avgTaskDuration:analytics.kpis.avgCompletionTimeDays??0,avgTaskDurationTarget:0,satisfactionScore:0,unavailable:['budgetActual','budgetTotal','avgTaskDurationTarget','satisfactionScore',...(metrics.onTime==null?['onTimeRate']:[]),...(analytics.kpis.avgCompletionTimeDays==null?['avgTaskDuration']:[])]};
  };
  const details:Record<string,DepartmentDetailData>={};
  for(const[id,name] of names){
   const list=tasks.filter(t=>t.department?.id===id);
   const parents=new Map<string,typeof list>();
   list.forEach(t=>{const key=t.project?.id||t.campaign?.id;if(key)parents.set(key,[...(parents.get(key)||[]),t]);});
   details[id]={id,name,kpis:kpis(list),projects:[...parents].map(([key,rows])=>({id:key,name:rows[0].project?.name||rows[0].campaign?.name||'',completedTasks:rows.filter(t=>isTaskDone(t.status)).length,totalTasks:rows.length,status:rows.some(t=>!isTaskClosed(t.status)&&taskDay(t.due_date)&&taskDay(t.due_date)<today)?'late':'ok',deadline:rows.map(t=>t.due_date).filter(Boolean).sort().at(-1)||'—',manager:'—',overdueCount:rows.filter(t=>!isTaskClosed(t.status)&&taskDay(t.due_date)&&taskDay(t.due_date)<today).length})),tasks:list.filter(t=>!isTaskClosed(t.status)).map(t=>({id:t.id,name:t.title,projectTag:t.project?.name||t.campaign?.name||'Task lẻ',assignee:t.assignee?.name||'Chưa giao PIC',status:taskDay(t.due_date)&&taskDay(t.due_date)<today?'late':['todo','backlog','planned'].includes(t.status)?'todo':'doing',dueDate:t.due_date||'—',priority:t.priority==='high'?'Cao':t.priority==='low'?'Thấp':'TB'})),burndown:computeBurndownSeries(list),members:source.users.filter(u=>u.department_id===id).map(u=>{const active=list.filter(t=>String(t.assignee_id)===String(u.id)&&!isTaskClosed(t.status)).length;return{id:String(u.id),name:u.name,initial:u.name.slice(0,2),capacityPct:active*20,activeTasks:active};}),activities:[]};
  }
  const overall:OverallDashboardData={kpis:kpis(tasks),warningBanner:'Dữ liệu thật trong phạm vi được phép xem. Capacity ước tính 8h/task, 40h/tuần; chỉ số chưa có nguồn hiển thị —.',comparison:Object.values(details).map(d=>{const rows=tasks.filter(t=>t.department?.id===d.id),done=rows.filter(t=>isTaskDone(t.status)).length,late=d.tasks.filter(t=>t.status==='late').length,todo=d.tasks.filter(t=>t.status==='todo').length,doing=d.tasks.filter(t=>t.status==='doing').length;return{id:d.id,name:d.name,done,doing,todo,late,total:rows.length,completionPct:rows.length?Math.round(done/rows.length*100):0};}),weeklyTrends:reportAnalytics(tasks,period).completionTrend.map(t=>({week:t.name,actual:t.completed,target:null})),heatmap:computeWorkloadHeatmap(Object.values(details).map(d=>({id:d.id,name:d.name,tasks:tasks.filter(t=>t.department?.id===d.id),memberCount:Math.max(1,d.members.length)}))),projects:Object.values(details).flatMap(d=>d.projects.map(p=>({id:p.id,name:p.name,department:d.name,departmentId:d.id,progress:p.totalTasks?Math.round(p.completedTasks/p.totalTasks*100):0,status:p.status})))};
  return {overall,details,departments:[...names].map(([id,name])=>({id,name}))};
 },[source.tasks,source.users,period]);
 return {...data,loading:source.loading,error:source.error,refresh:source.refetch};
}

