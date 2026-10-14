import {useMemo} from 'react';
import {useWorkspaceData} from './useWorkspaceData';
import {taskOpen} from '../lib/taskTracking';
export interface TeamMemberWorkload {id:string;name:string;avatar_url?:string|null;activeTasksCount:number;capacityPercentage:number;status:'good'|'warning'|'high'|'overloaded';tasks:any[];}
// Explicit planning estimate: 5 active tasks = 100%; no stored hours exist yet.
export const useTeamWorkload=()=>{
  const {tasks,users,loading,error,refetch}=useWorkspaceData();
  const workloads=useMemo(()=>users.map(u=>{
    const list=tasks.filter(t=>String(t.assignee_id)===String(u.id)&&taskOpen(t));
    const capacityPercentage=list.length*20;
    return {id:String(u.id),name:u.name,avatar_url:u.avatar_url,tasks:list,activeTasksCount:list.length,capacityPercentage,status:(capacityPercentage>100?'overloaded':capacityPercentage>=80?'high':capacityPercentage>=60?'warning':'good') as TeamMemberWorkload['status']};
  }),[tasks,users]);return {workloads,isLoading:loading,error,refetch};
};
