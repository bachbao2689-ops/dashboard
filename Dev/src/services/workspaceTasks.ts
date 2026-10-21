import {mapWorkspaceTasks} from '../lib/workspaceTaskMapping';
import {supabase} from './supabase';
import type {Task} from '../hooks/useTasks';
import {taskActive,taskKey,taskTarget} from '../lib/taskTracking';
export async function readAll(query:any):Promise<any[]> {
  const rows:any[]=[];
  for(let offset=0;;offset+=500){const {data,error}=await query.range(offset,offset+499);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<500)return rows;}
}
export async function readWorkspaceTasks():Promise<Task[]> {
  const [real,projects,campaigns]=await Promise.all([
    readAll(supabase.from('tasks').select('id,workspace_id,task_ref,title,status,priority,due_date,start_date,completed_at,updated_at,created_at,created_by,description,assignee_id,project_id,campaign_id,department_id,workflow_phase_id,workflow_status,project:project_id(id,name,status,department_id,department:department_id(name)),campaign:campaign_id(id,name,status,department_id,department:department_id(name)),assignee:assignee_id(id,name,avatar_url),department:department_id(id,name),column:column_id(name)').order('created_at',{ascending:false}).order('id')),
    readAll(supabase.from('project_subtasks').select('*,projects:project_id(id,name,status,priority,department_id,workspace_id,department:department_id(id,name)),assignee:assignee_id(id,name,avatar_url)').order('created_at',{ascending:false}).order('id')),
    readAll(supabase.from('campaign_subtasks').select('*,campaigns:campaign_id(id,name,status,department_id,workspace_id,department:department_id(id,name)),assignee:assignee_id(id,name,avatar_url)').order('created_at',{ascending:false}).order('id'))
  ]);
  const details=new Map<string,{description?:string}>();
  const ids=[...new Set([...projects,...campaigns].map(row=>row.id))];
  for(let i=0;i<ids.length;i+=200){
    const rows=await readAll(supabase.from('activity_log').select('entity_type,entity_id,metadata,created_at').eq('action','details_updated').in('entity_type',['project_subtask','campaign_subtask']).in('entity_id',ids.slice(i,i+200)).order('created_at',{ascending:false}).order('id',{ascending:false}));
    rows.forEach(row=>{const key=taskKey(row.entity_type,row.entity_id);if(!details.has(key))details.set(key,row.metadata||{});});
  }
  // Archived/deleted parents disappear consistently across the lists and analytics.
  // Cancelled work stays in lists/history; metrics exclude it with taskActive().
  return mapWorkspaceTasks(real,projects,campaigns,details);
}
export async function updateTrackedTask(key:string,values:Record<string,unknown>) {
  const target=taskTarget(key);
  const {data,error}=await supabase.from(target.table).update(values).eq('id',target.id).select('id').maybeSingle();
  if(error)throw error;if(!data)throw new Error('Không có quyền cập nhật công việc này.');
  window.dispatchEvent(new Event('tasks:changed'));
}
export async function canCompleteTrackedTask(key:string) {
 const target=taskTarget(key);
 const {data,error}=await supabase.rpc('can_complete_tracked_task',{p_kind:target.kind,p_id:target.id});
 if(error)throw error;
 return data===true;
}
export async function completeTrackedTask(key:string) {
 const target=taskTarget(key);
 const {data,error}=await supabase.rpc('complete_tracked_task',{p_kind:target.kind,p_id:target.id});
 if(error)throw error;
 if(data!==true)throw new Error('Bạn không có quyền hoàn thành công việc này.');
 window.dispatchEvent(new Event('tasks:changed'));
}
export const activeWorkspaceTasks=(tasks:Task[])=>tasks.filter(taskActive);

export async function completeTrackedTasks(keys:string[]){
 const unique=[...new Set(keys)];const {data,error}=await supabase.rpc('complete_tracked_tasks',{p_items:unique.map(key=>{const {kind,id}=taskTarget(key);return {kind,id};})});
 if(error)throw error;if(data!==unique.length)throw new Error('Chưa lưu đầy đủ trạng thái.');window.dispatchEvent(new Event('tasks:changed'));
}
