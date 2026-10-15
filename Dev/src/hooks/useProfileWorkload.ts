import {useMemo,useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {useAuthStore} from '../store/authStore';
import {useTasks,type Task} from './useTasks';
import {readAll} from '../services/workspaceTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import {taskActive,taskDone,taskOpen,taskOverdue} from '../lib/taskTracking';
export type PersonalTask=Task;
export interface PersonalBorrowRequest {id:string;approval_status:string|null;requested_at:string|null;approved_at:string|null;returned_at:string|null;created_at:string;asset?:{name?:string|null}|null;}
export function useProfileWorkload(){
 const actor=useAuthStore(s=>s.profile?.id);const source=useTasks();
 const [snapshot,setSnapshot]=useState<{actor?:number;rows:PersonalBorrowRequest[]}>({rows:[]});const generation=useRef(0);
 const load=useCallback(async()=>{const token=++generation.current;if(!actor)return;try{const rows=await readAll(supabase.from('borrow_requests').select('id,approval_status,requested_at,approved_at,returned_at,created_at,asset:asset_id(name)').eq('requester_id',actor).order('id'));if(token===generation.current)setSnapshot({actor,rows});}catch{if(token===generation.current)setSnapshot({actor,rows:[]});}},[actor]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);useWorkspaceRealtime(['borrow_requests'],load,actor);
 const tasks=useMemo(()=>source.tasks.filter(t=>String(t.assignee_id)===String(actor)&&taskActive(t)),[source.tasks,actor]);
 const borrowRequests=snapshot.actor===actor?snapshot.rows:[];
 const summary=useMemo(()=>{const completed=tasks.filter(taskDone).length;return {total:tasks.length,completed,open:tasks.filter(taskOpen).length,overdue:tasks.filter(t=>taskOverdue(t)).length,completionRate:tasks.length?Math.round(completed*100/tasks.length):0,pendingBorrow:borrowRequests.filter(r=>r.approval_status==='pending').length};},[tasks,borrowRequests]);
 return {tasks,borrowRequests,summary,loading:source.loading,error:source.error};
}
