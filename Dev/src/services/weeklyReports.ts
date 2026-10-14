import {supabase} from './supabase';
import {readAll} from './workspaceTasks';
import {taskKey,taskTarget} from '../lib/taskTracking';
export type WeeklyMetadata={body?:string;blocker?:string|null;next_step?:string|null;image_url?:string|null;unchanged?:boolean;week_start?:string;week_end?:string};
export type WeeklyRow={id:string;user_id:number;entity_id:string;entity_type:string;created_at:string;metadata?:WeeklyMetadata|null;task_key:string};
export async function readWeeklyReports(keys:string[],start:string,end:string,userIds?:number[]){
 if(!keys.length)return [];
 const wanted=new Set(keys),ids=[...new Set(keys.map(k=>taskTarget(k).id))],rows:WeeklyRow[]=[];
 for(let i=0;i<ids.length;i+=200){let query=supabase.from('activity_log').select('id,user_id,entity_id,entity_type,created_at,metadata').in('entity_type',['task','project_subtask','campaign_subtask']).eq('action','weekly_report').eq('metadata->>week_start',start).eq('metadata->>week_end',end).in('entity_id',ids.slice(i,i+200)).order('created_at',{ascending:false}).order('id',{ascending:false});if(userIds?.length)query=query.in('user_id',userIds);for(const row of await readAll(query)){const key=taskKey(row.entity_type,row.entity_id);if(wanted.has(key))rows.push({...row,task_key:key});}}
 return rows;
}
export async function saveWeeklyReports(items:{id:string;metadata:WeeklyMetadata;complete?:boolean}[],start:string,end:string){
 const {data,error}=await supabase.rpc('save_task_weekly_reports',{p_items:items.map(item=>{const {kind,id}=taskTarget(item.id);return {...item,id,kind};}),p_week_start:start,p_week_end:end});
 if(error?.code==='PGRST202'){
   if(items.some(item=>item.complete))throw new Error('Chưa thể hoàn thành qua Report. Hãy dùng phần chi tiết công việc.');
   const {data:auth,error:authError}=await supabase.auth.getUser();if(authError)throw authError;
   const {data:actor,error:actorError}=await supabase.from('users').select('id').eq('auth_id',auth.user?.id).single();if(actorError)throw actorError;
   for(const item of items){
    const target=taskTarget(item.id);
    const {data:task,error:taskError}=await supabase.from(target.table).select('*').eq('id',target.id).single();if(taskError)throw taskError;
    if(Number(task.assignee_id)!==Number(actor.id))throw new Error('Chỉ người được giao công việc có thể gửi report.');
    let workspace=task.workspace_id;
    if(target.kind!=='task'){const parent=target.kind==='project_subtask'?'project':'campaign';const {data:p,error:failure}=await supabase.from(`${parent}s`).select('workspace_id,status').eq('id',task[`${parent}_id`]).single();if(failure)throw failure;if(['deleted','archived'].includes(p.status))throw new Error('Project/Campaign đã được ẩn hoặc xóa.');workspace=p.workspace_id;}
    const metadata={...item.metadata,week_start:start,week_end:end,task_kind:target.kind};
    const {error:saveError}=await supabase.from('activity_log').insert({workspace_id:workspace,user_id:actor.id,entity_type:target.kind,entity_id:target.id,action:'weekly_report',metadata});if(saveError)throw saveError;
   }
 }else{if(error)throw error;if(data!==items.length)throw new Error('Chưa lưu đầy đủ báo cáo.');}
 window.dispatchEvent(new Event('workspace:changed'));return items.length;
}
export async function weeklyUserActivity(userId:number,action:'weekly_summary_image'|'weekly_report_submitted',start:string,end:string,metadata:Record<string,unknown>){
 const {data:user,error:failure}=await supabase.from('users').select('auth_id,department_id').eq('id',userId).single();if(failure)throw failure;
 const {data:spaces,error}=await supabase.from('workspaces').select('id').order('id').limit(1);if(error)throw error;
 if(!user.auth_id||!spaces?.length)throw new Error('Chưa xác định được tài khoản báo cáo.');
 const {error:saveError}=await supabase.from('activity_log').insert({workspace_id:spaces[0].id,user_id:userId,entity_type:'user',entity_id:user.auth_id,action,metadata:{...metadata,owner_id:userId,week_start:start,week_end:end}});if(saveError)throw saveError;
 window.dispatchEvent(new Event('workspace:changed'));
}
