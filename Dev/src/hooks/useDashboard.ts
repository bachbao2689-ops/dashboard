import {useMemo,useEffect,useState,useCallback,useRef} from 'react';
import {supabase} from '../services/supabase';
import {useAuthStore} from '../store/authStore';
import {useWorkspaceData} from './useWorkspaceData';
import {readAll} from '../services/workspaceTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import {taskActive,taskOpen,taskOverdue} from '../lib/taskTracking';
import {calendarDay} from '../lib/profileCalendar';
export interface DashboardData {myTasksCount:number;dueSoonCount:number;borrowedCount:number;overdueCount:number;upcomingTasks:any[];recentRequests:any[];tasks:any[];assetStatusData:{name:string;value:number;fill:string}[];}
export function useDashboard(){
 const actor=useAuthStore(s=>s.profile?.id);const workspace=useWorkspaceData({includeAssets:true});
 const [requests,setRequests]=useState<{actor?:number;rows:any[];error:string|null}>({rows:[],error:null});const generation=useRef(0);
 const load=useCallback(async()=>{const token=++generation.current;if(!actor)return;try{const rows=await readAll(supabase.from('borrow_requests').select('id,approval_status,due_date,returned_at,requested_at,asset:asset_id(name),requester:requester_id(name)').eq('requester_id',actor).order('requested_at',{ascending:false}).order('id'));if(token===generation.current)setRequests({actor,rows,error:null});}catch(e){if(token===generation.current)setRequests({actor,rows:[],error:e instanceof Error?e.message:'Không thể tải phiếu mượn.'});}},[actor]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);useWorkspaceRealtime(['borrow_requests'],load,actor);
 const data=useMemo<DashboardData>(()=>{
  const tasks=workspace.tasks.filter(t=>String(t.assignee_id)===String(actor)&&taskActive(t)),open=tasks.filter(taskOpen);
  const today=calendarDay(new Date().toISOString())!,end=new Date(`${today}T12:00:00`);end.setDate(end.getDate()+7);
  const rows=requests.actor===actor?requests.rows:[];const counts:Record<string,number>={};workspace.assets.forEach(a=>{const key=a.status||(a.is_available?'available':'borrowed');counts[key]=(counts[key]||0)+1;});
  return {myTasksCount:open.length,dueSoonCount:open.filter(t=>t.due_date&&calendarDay(t.due_date)!>=today&&calendarDay(t.due_date)!<=calendarDay(end.toISOString())!).length,borrowedCount:rows.filter(r=>r.approval_status==='approved'&&!r.returned_at).length,overdueCount:open.filter(t=>taskOverdue(t,today)).length,upcomingTasks:open.filter(t=>t.due_date).sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,5),recentRequests:rows,tasks,assetStatusData:[{name:'Borrowed',value:counts.borrowed||0,fill:'#38bdf8'},{name:'Pending',value:counts.reserved||0,fill:'#fbbf24'},{name:'Available inventory',value:counts.available||0,fill:'#4eb648'},{name:'Maintenance',value:(counts.maintenance||0)+(counts.broken||0),fill:'#fb7185'}].filter(v=>v.value>0)};
 },[workspace.tasks,workspace.assets,actor,requests]);
 return {data,loading:workspace.loading,error:workspace.error||(requests.actor===actor?requests.error:null),refetch:async()=>{await Promise.all([workspace.refetch(),load()]);}};
}
