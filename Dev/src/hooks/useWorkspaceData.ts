import {useAuthStore} from '../store/authStore';
import {useTasks,type Task} from './useTasks';
import {useSharedResource} from './useSharedResource';
import {directoryResource,assetSummaryResource,workspaceScope} from '../services/workspaceResources';
export type WorkspaceTask=Task;
export type WorkspaceData={tasks:WorkspaceTask[];assets:Array<{id:string;asset_code:string;name:string;status:string;is_available:boolean;category?:{name:string}|null}>;users:Array<{id:string;name:string;avatar_url?:string|null;role?:string|null;employment_level?:string|null;job_title?:string|null;department_id?:string|null;department?:{name:string}|null}>;departments:Array<{id:string;name:string}>;loading:boolean;error:string|null;refetch:()=>Promise<void>};
export function useWorkspaceDirectory(enabled=true){
 const profile=useAuthStore(state=>state.profile);
 return useSharedResource(directoryResource,workspaceScope(),Boolean(profile&&enabled));
}
export function useWorkspaceData({includeAssets=false}:{includeAssets?:boolean}={}):WorkspaceData{
 const profile=useAuthStore(state=>state.profile),source=useTasks(),directory=useWorkspaceDirectory();
 const assets=useSharedResource(assetSummaryResource,workspaceScope(),Boolean(profile&&includeAssets));
 const users=directory.data?.users||[],departments=directory.data?.departments||[];
 const role=(profile?.role||'').toLowerCase(),level=(profile?.employment_level||'').toLowerCase();
 const globalScope=role==='admin'||level==='admin'||level==='manager'||(role==='manager'&&!['leader','staff','member'].includes(level));
 const assigned=new Set(source.tasks.map(task=>String(task.assignee_id)));
 const scopedUsers=users.filter(user=>globalScope||String(user.id)===String(profile?.id)||Boolean(profile?.department_id&&user.department_id===profile.department_id)||assigned.has(String(user.id)));
 return {tasks:source.tasks,assets:assets.data||[],users:scopedUsers,departments,loading:source.loading||directory.loading||assets.loading,error:source.error||directory.error||assets.error,refetch:async()=>{await Promise.all([source.refetch(),directory.refetch(),assets.refetch()]);}};
}
