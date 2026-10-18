import { useMemo } from 'react';
import { useWorkspaceData } from './useWorkspaceData';
import { useRememberedState } from './useRememberedState';
import { reportAnalytics } from '../lib/taskTracking';
import { scopeTeamWorkload } from '../lib/workloadScope';
import { useAuthStore } from '../store/authStore';
export type TimeRange = 'week'|'month'|'quarter'|'all';
export const useReports = () => {
 const [timeRange,setTimeRange]=useRememberedState<TimeRange>('reports.timeRange','month');
 const profile=useAuthStore(state=>state.profile);
 const {tasks:workspaceTasks,users,departments,loading,error,refetch}=useWorkspaceData();
 const tasks=useMemo(()=>scopeTeamWorkload(profile,'all',users,departments,workspaceTasks).tasks,[profile,users,departments,workspaceTasks]);
 const data=useMemo(()=>reportAnalytics(tasks,timeRange),[tasks,timeRange]);
 const exportCSV=()=>{
  const rows=[['Task','Title','PIC','Status','Completed at'],...tasks.map(t=>[t.id,t.title,t.assignee?.name||'',t.status,t.completed_at||''])];
  const csv=rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='reports.csv';a.click();URL.revokeObjectURL(url);
 };
 return {data,isLoading:loading,error,timeRange,setTimeRange,exportCSV,refetch};
};
