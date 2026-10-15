import {supabase} from './supabase';
import {taskTarget} from '../lib/taskTracking';
type TaskActivity='task_completed'|'task_comment'|'task_updated'|'weekly_report';
export async function notifyTaskParticipants(task:any,actor:{id?:number;name?:string;department_id?:string|null},type:TaskActivity,mentions:number[]=[]){
 if(!task?.id||!actor.id)return;const {kind,id,table}=taskTarget(task.id);
 const select=kind==='task'?'assignee_id,task_ref,title,department_id,project:project_id(name),campaign:campaign_id(name)':kind==='project_subtask'?'assignee_id,title,project:project_id(name,department_id)':'assignee_id,title,campaign:campaign_id(name,department_id)';
 const {data,error}=await supabase.from(table).select(select).eq('id',id).maybeSingle();if(error)throw error;if(!data)return;
 const row=data as any,parent=row.project||row.campaign,department=row.department_id||parent?.department_id;
 const {data:leaders,error:failure}=department?await supabase.from('users').select('id').eq('department_id',department).eq('is_active',true).or('role.eq.leader,employment_level.eq.Leader'):{data:[],error:null};if(failure)throw failure;
 const recipients=[...new Set([row.assignee_id,...mentions,...(leaders||[]).map(u=>u.id)].filter(uid=>uid&&Number(uid)!==Number(actor.id)))];if(!recipients.length)return;
 const verb=type==='task_completed'?'đã hoàn thành':type==='task_comment'?'đã bình luận tại':type==='weekly_report'?'đã cập nhật báo cáo cho':'đã cập nhật';
 const {error:saveError}=await supabase.from('notifications').insert(recipients.map(user_id=>({user_id,type,entity_type:kind,entity_id:id,message:`${actor.name||'Một thành viên'} ${verb} ${row.task_ref||'Task'} · ${row.title}${parent?.name?` · ${parent.name}`:''}`,metadata:{task_ref:row.task_ref,task_title:row.title,project:row.project?.name,campaign:row.campaign?.name}})));if(saveError)throw saveError;
}
