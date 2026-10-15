import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../services/supabase';
import {useAuthStore} from '../store/authStore';
import {useWorkspaceData} from './useWorkspaceData';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import {readAllRows} from '../services/readAllRows';
import {isTaskClosed,taskDay} from '../lib/taskTracking';
export interface DashboardData {
  myTasksCount: number;
  dueSoonCount: number;
  borrowedCount: number;
  overdueCount: number;
  upcomingTasks: any[];
  recentRequests: any[];
  tasks: any[];
  assetStatusData: { name: string; value: number; fill: string }[];
}


export function useDashboard(){
 const profileId=useAuthStore(s=>s.profile?.id);
 const workspace=useWorkspaceData();
 const [requests,setRequests]=useState<any[]>([]);
 const [error,setError]=useState<string|null>(null);
 const refreshRequests=async()=>{
  if(!profileId){setRequests([]);return;}
  try{const rows=await readAllRows(supabase.from('borrow_requests').select('id,approval_status,due_date,returned_at,requested_at,asset:asset_id(name),requester:requester_id(name)').eq('requester_id',profileId).order('requested_at').order('id'));if(useAuthStore.getState().profile?.id===profileId){setRequests(rows);setError(null);}}
  catch(e:any){setRequests([]);setError(e.message);}
 };
 useEffect(()=>{setRequests([]);void refreshRequests();},[profileId]);
 useWorkspaceRealtime(['borrow_requests'],refreshRequests,profileId);
 const data=useMemo<DashboardData>(()=>{
  const today=taskDay(new Date().toISOString()), next=new Date(today+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+7);const soon=taskDay(next.toISOString());
  const mine=workspace.tasks.filter(t=>String(t.assignee_id)===String(profileId)),open=mine.filter(t=>!isTaskClosed(t.status));
  const counts=workspace.assets.reduce<Record<string,number>>((a,v)=>{const k=v.status||(v.is_available?'available':'borrowed');a[k]=(a[k]||0)+1;return a;},{});
  return {myTasksCount:open.length,dueSoonCount:open.filter(t=>taskDay(t.due_date)>=today&&taskDay(t.due_date)<=soon).length,overdueCount:open.filter(t=>taskDay(t.due_date)&&taskDay(t.due_date)<today).length,borrowedCount:requests.filter(r=>r.approval_status==='approved'&&!r.returned_at).length,upcomingTasks:open.filter(t=>t.due_date).sort((a,b)=>a.due_date!.localeCompare(b.due_date!)).slice(0,5),recentRequests:requests,tasks:mine,assetStatusData:[{name:'Borrowed',value:counts.borrowed||0,fill:'#38bdf8'},{name:'Pending',value:counts.reserved||0,fill:'#fbbf24'},{name:'Available inventory',value:counts.available||0,fill:'#4eb648'},{name:'Maintenance',value:(counts.maintenance||0)+(counts.broken||0),fill:'#fb7185'}].filter(v=>v.value>0)};
 },[workspace.tasks,workspace.assets,requests,profileId]);
 return {data,loading:workspace.loading,error:error||workspace.error,refetch:async()=>{await Promise.all([workspace.refetch(),refreshRequests()]);}};
}
