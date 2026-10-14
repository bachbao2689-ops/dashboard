import {supabase} from './supabase';
import type {Task} from '../hooks/useTasks';
import {taskActive,taskKey,taskTarget} from '../lib/taskTracking';
export async function readAll(query:any):Promise<any[]> {
  const rows:any[]=[];
  for(let offset=0;;offset+=500){const {data,error}=await query.range(offset,offset+499);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<500)return rows;}
}
const visibleParent=(p:any)=>!p||!['deleted','archived'].includes(p.status||'');
export async function readWorkspaceTasks():Promise<Task[]> {
  const [real,projects,campaigns]=await Promise.all([
    readAll(supabase.from('tasks').select('id,workspace_id,task_ref,title,status,priority,due_date,start_date,completed_at,updated_at,created_at,description,assignee_id,project_id,campaign_id,department_id,workflow_phase_id,workflow_status,project:project_id(id,name,status),campaign:campaign_id(id,name,status),assignee:assignee_id(id,name,avatar_url),department:department_id(id,name),column:column_id(name)').order('created_at',{ascending:false}).order('id')),
    readAll(supabase.from('project_subtasks').select('*,projects:project_id(id,name,status,department_id,workspace_id,department:department_id(id,name)),assignee:assignee_id(id,name,avatar_url)').order('created_at',{ascending:false}).order('id')),
    readAll(supabase.from('campaign_subtasks').select('*,campaigns:campaign_id(id,name,status,department_id,workspace_id,department:department_id(id,name)),assignee:assignee_id(id,name,avatar_url)').order('created_at',{ascending:false}).order('id'))
  ]);
  const normalize=(items:any[],kind:'project'|'campaign')=>items.filter(s=>s[`${kind}s`]&&visibleParent(s[`${kind}s`])).map(s=>{
    const parent=s[`${kind}s`];return {...s,id:taskKey(`${kind}_subtask`,s.id),task_ref:'',priority:'medium',status:s.status||'todo',workspace_id:parent.workspace_id,assignee_id:s.assignee_id,[kind]:{id:parent.id,name:parent.name},department_id:parent.department_id,department:parent.department};
  });
  // Archived/deleted parents disappear consistently across the lists and analytics.
  // Cancelled work stays in lists/history; metrics exclude it with taskActive().
  return [...real.filter(t=>visibleParent(t.project)&&visibleParent(t.campaign)),...normalize(projects,'project'),...normalize(campaigns,'campaign')].filter(t=>!['deleted','archived'].includes(t.status||'')) as Task[];
}
export async function updateTrackedTask(key:string,values:Record<string,unknown>) {
  const target=taskTarget(key);
  const {data,error}=await supabase.from(target.table).update(values).eq('id',target.id).select('id').maybeSingle();
  if(error)throw error;if(!data)throw new Error('Không có quyền cập nhật công việc này.');
  window.dispatchEvent(new Event('tasks:changed'));
}
export const activeWorkspaceTasks=(tasks:Task[])=>tasks.filter(taskActive);

export async function completeTrackedTasks(keys:string[]){
 const unique=[...new Set(keys)];const {data,error}=await supabase.rpc('complete_tracked_tasks',{p_items:unique.map(key=>{const {kind,id}=taskTarget(key);return {kind,id};})});
 if(error)throw error;if(data!==unique.length)throw new Error('Chưa lưu đầy đủ trạng thái.');window.dispatchEvent(new Event('tasks:changed'));
}
