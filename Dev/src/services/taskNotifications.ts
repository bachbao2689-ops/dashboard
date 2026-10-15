import {supabase} from './supabase';
import {taskIdentity} from '../lib/taskTracking';
type TaskActivity='task_completed'|'task_comment'|'task_updated'|'weekly_report';
export async function notifyTaskParticipants(task:any,actor:{id?:number;name?:string;department_id?:string|null},type:TaskActivity,mentions:number[]=[]){
 if(!task?.id||!actor.id)return;
 const target=taskIdentity(task.id);
 const fields=target.kind==='campaign_subtask'?'campaign_id':target.kind==='project_subtask'?'project_id':'project_id,campaign_id';
 const {data:row,error}=await supabase.from(target.table).select('title,assignee_id,'+fields).eq('id',target.id).maybeSingle();
 if(error||!row)return;
 const record=row as Record<string,any>, kind=target.kind==='campaign_subtask'?'campaign':record.project_id?'project':'campaign',parentId=record.project_id||record.campaign_id;
 const {data:members}=parentId?await supabase.from(kind==='project'?'project_members':'campaign_members').select('user_id').eq(kind+'_id',parentId).eq('role','pic'):{data:[]};
 const {data:leaders}=actor.department_id?await supabase.from('users').select('id').eq('is_active',true).eq('department_id',actor.department_id).or('role.eq.leader,employment_level.ilike.leader'):{data:[]};
 const recipients=[...new Set([record.assignee_id,...(members||[]).map(m=>m.user_id),...(leaders||[]).map(m=>m.id),...mentions].map(Number).filter(id=>id&&id!==actor.id))];
 if(!recipients.length)return;
 const action=type==='task_completed'?'đã hoàn thành':type==='task_comment'?'đã bình luận tại':type==='weekly_report'?'đã cập nhật Weekly Report cho':'đã cập nhật';
 const {error:failure}=await supabase.from('notifications').insert(recipients.map(user_id=>({user_id,type,entity_type:target.kind,entity_id:target.id,message:(actor.name||'Một thành viên')+' '+action+' '+(task.task_ref||'Task')+' · '+(record.title||task.title||''),metadata:{task_title:record.title||task.title}})));
 if(failure)console.warn('Activity saved; notifications unavailable:',failure.message);
}
