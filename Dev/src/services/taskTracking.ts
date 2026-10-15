import { supabase } from './supabase';
import { taskIdentity } from '../lib/taskTracking';

export async function completeTrackedTask(uiId: string) {
  const target=taskIdentity(uiId);
  const {data,error}=await supabase.from(target.table).update({status: target.kind==='task'?'done':'completed',workflow_status:'completed'}).eq('id',target.id).select('id').maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('Bạn không có quyền hoàn thành công việc này.');
  window.dispatchEvent(new Event('tasks:changed'));
}
