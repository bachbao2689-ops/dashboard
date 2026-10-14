import {useRef,useState} from 'react';
import toast from 'react-hot-toast';
import {completeTrackedTasks,updateTrackedTask} from '../services/workspaceTasks';
import {recordTaskDeletion} from '../services/taskDeletionLog';
import {taskTarget} from '../lib/taskTracking';
import type {Task} from './useTasks';
export function useTaskListActions(tasks:Task[],actor:number|undefined,refetch:()=>Promise<void>){
 const lock=useRef(false);const [busy,setBusy]=useState(false),[deletingIds,setDeletingIds]=useState<string[]>([]);
 const complete=async(ids:string[])=>{
  if(lock.current||!ids.length)return false;lock.current=true;setBusy(true);
  try{await completeTrackedTasks(ids);toast.success(`Đã hoàn thành ${ids.length} công việc`);await refetch();return true;}catch(e){toast.error(e instanceof Error?e.message:'Không thể hoàn thành công việc');return false;}finally{lock.current=false;setBusy(false);}
 };
 const remove=async(ids:string[])=>{
  if(lock.current||!ids.length)return [];lock.current=true;setBusy(true);setDeletingIds(ids);const removed:string[]=[];
  try{
   for(const key of ids){try{await updateTrackedTask(key,{status:'deleted'});removed.push(key);const task=tasks.find(t=>t.id===key);if(actor&&task){const target=taskTarget(key);const {error}=await recordTaskDeletion({userId:actor,taskId:target.id,entityType:target.kind,title:task.title,parentName:task.project?.name||task.campaign?.name,parentType:target.kind==='project_subtask'?'project':target.kind==='campaign_subtask'?'campaign':null});if(error)toast.error(`Đã xóa ${task.title} nhưng chưa ghi được Log`);}}catch(e){toast.error(e instanceof Error?e.message:'Không thể xóa công việc');}}
   if(removed.length)toast.success(`Đã chuyển ${removed.length} công việc vào thùng rác`);await refetch();return removed;
  }finally{lock.current=false;setBusy(false);setDeletingIds([]);}
 };
 return {complete,remove,busy,deletingIds};
}
