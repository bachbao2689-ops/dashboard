import { useMemo } from 'react';
import { useWorkspaceData } from './useWorkspaceData';
import { isTaskClosed, weeklyActivity } from '../lib/taskTracking';
import { weeklyReportRange } from '../lib/weeklyReport';
export interface TeamMemberWorkload { id:string; name:string; avatar_url?:string; activeTasksCount:number; capacityPercentage:number; status:'good'|'warning'|'high'|'overloaded'; tasks:any[]; created:number; doing:number; done:number }
export const useTeamWorkload=()=>{
 const {tasks,users,loading,error,refetch}=useWorkspaceData();
 const workloads=useMemo<TeamMemberWorkload[]>(()=>{
  const {start,end}=weeklyReportRange('current');
  return users.map(user=>{
   const assigned=tasks.filter(t=>String(t.assignee_id)===String(user.id));
   const open=assigned.filter(t=>!isTaskClosed(t.status));
   const capacityPercentage=open.length*20;
   return {id:String(user.id),name:user.name,avatar_url:user.avatar_url||undefined,activeTasksCount:open.length,capacityPercentage,status:capacityPercentage>100?'overloaded':capacityPercentage>=80?'high':capacityPercentage>=60?'warning':'good',tasks:open,...weeklyActivity(assigned,start,end)};
  });
 },[tasks,users]);
 return {workloads,isLoading:loading,error,refetch};
};
