import { supabase } from './supabase';
import { taskIdentity } from '../lib/taskTracking';

export async function completeTrackedTask(uiId: string) {
  const target=taskIdentity(uiId);
  const {data,error}=await supabase.rpc('complete_tracked_task',{p_kind:target.kind,p_id:target.id});
  if(error)throw error;
  if(data!==true)throw new Error('Bạn không có quyền hoàn thành công việc này.');
  window.dispatchEvent(new Event('tasks:changed'));
}
