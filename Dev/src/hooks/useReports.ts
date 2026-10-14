import {useMemo,useState} from 'react';
import {useTasks} from './useTasks';
import {buildReportAnalytics,type TimeRange} from '../lib/reportAnalytics';
export type {TimeRange} from '../lib/reportAnalytics';
export const useReports=()=>{
 const [timeRange,setTimeRange]=useState<TimeRange>('month');const {tasks,loading,error,refetch}=useTasks();
 const data=useMemo(()=>buildReportAnalytics(tasks,timeRange),[tasks,timeRange]);
 const exportCSV=()=>{const quote=(s:unknown)=>`"${String(s??'').replace(/"/g,'""')}"`;const rows=[['ID','Title','Assignee','Status','Priority','Deadline','Completed at'],...data.scoped.map(t=>[t.id,t.title,t.assignee?.name,t.status,t.priority,t.due_date,t.completed_at])];const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`kcoffee-report-${timeRange}.csv`;a.click();URL.revokeObjectURL(url);};
 return {data,isLoading:loading,error,timeRange,setTimeRange,exportCSV,refetch};
};
