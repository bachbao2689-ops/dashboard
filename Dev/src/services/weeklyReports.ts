import {supabase} from './supabase';
import {readAll} from './workspaceTasks';
import {taskKey,taskTarget,taskActive} from '../lib/taskTracking';
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
   const {data:actor,error:actorError}=await supabase.rpc('account_get_current_profile',{p_mark_signed_in:false});if(actorError)throw actorError;if(!actor?.id)throw new Error('Không tìm thấy hồ sơ nhân sự đang hoạt động.');
   for(const item of items){
    const target=taskTarget(item.id);
    const {data:task,error:taskError}=await supabase.from(target.table).select('*').eq('id',target.id).single();if(taskError)throw taskError;
    if(!taskActive(task))throw new Error('Công việc đã được ẩn, xóa hoặc hủy.');
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
 const {error:saveError}=await supabase.rpc('account_weekly_user_activity',{
  p_user_id:userId,p_action:action,p_start:start,p_end:end,p_metadata:metadata,
 });if(saveError)throw saveError;
 window.dispatchEvent(new Event('workspace:changed'));
}
