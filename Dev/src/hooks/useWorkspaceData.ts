import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../services/supabase';
import {useAuthStore} from '../store/authStore';
import {useTasks,type Task} from './useTasks';
import {readAll} from '../services/workspaceTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
export type WorkspaceTask=Task;
export type WorkspaceData={tasks:WorkspaceTask[];assets:Array<{id:string;asset_code:string;name:string;status:string;is_available:boolean;category?:{name:string}|null}>;users:Array<{id:string;name:string;avatar_url?:string|null;role?:string|null;employment_level?:string|null;job_title?:string|null;department_id?:string|null;department?:{name:string}|null}>;departments:Array<{id:string;name:string}>;loading:boolean;error:string|null;refetch:()=>Promise<void>};
export function useWorkspaceData():WorkspaceData {
  const profile=useAuthStore(s=>s.profile);
  const source=useTasks();
  const [extra,setExtra]=useState<{actor?:number;assets:WorkspaceData['assets'];users:WorkspaceData['users'];departments:WorkspaceData['departments'];error:string|null}>({assets:[],users:[],departments:[],error:null});
  const generation=useRef(0);
  const reload=useCallback(async()=>{
    const token=++generation.current;if(!profile)return;
    try {
      const [assets,users,departments]=await Promise.all([
        readAll(supabase.from('assets').select('id,asset_code,name,status,is_available,category:category_id(name)').order('id')),
        readAll(supabase.from('users').select('id,name,avatar_url,role,employment_level,job_title,department_id').eq('is_active',true).order('name').order('id')),
        readAll(supabase.from('departments').select('id,name').order('name').order('id'))
      ]);
      const names=new Map(departments.map(d=>[d.id,d.name]));
      if(token===generation.current)setExtra({actor:profile.id,assets,departments,users:users.map(u=>({...u,id:String(u.id),department:u.department_id?{name:names.get(u.department_id)}:null})),error:null});
    }catch(e){if(token===generation.current)setExtra({actor:profile.id,assets:[],users:[],departments:[],error:e instanceof Error?e.message:'Không thể tải dữ liệu phòng ban.'});}
  },[profile?.id,profile?.department_id,profile?.role]);
  useEffect(()=>{void reload();return()=>{generation.current++;};},[reload]);
  useWorkspaceRealtime(['assets','users','departments'],reload,profile?.id);
  const visible=extra.actor===profile?.id;
  return {tasks:source.tasks,assets:visible?extra.assets:[],users:visible?extra.users:[],departments:visible?extra.departments:[],loading:source.loading,error:source.error||(visible?extra.error:null),refetch:async()=>{await Promise.all([source.refetch(),reload()]);}};
}
