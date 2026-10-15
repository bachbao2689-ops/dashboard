import {create} from 'zustand';
import {supabase} from '../services/supabase';

export type NotificationItem={id:string;type:string;message:string;entity_type:string|null;entity_id:string|null;is_read:boolean;created_at:string;title:string};
export type SidebarBadgeCounts={borrowCount:number;workflowCount:number;tasksCount:number;projectCount:number;profileCount:number;departmentCount:number};
const empty:SidebarBadgeCounts={borrowCount:0,workflowCount:0,tasksCount:0,projectCount:0,profileCount:0,departmentCount:0};
const title=(type:string)=>({task_completed:'Task completed',task_comment:'Bình luận mới',weekly_report:'Weekly Report mới',report_reminder:'Nhắc report',task_assigned:'Task mới được giao'}[type]||'Thông báo');
export const useNotificationStore=create<{actor?:number;counts:SidebarBadgeCounts;unread:number;items:NotificationItem[];error:string|null}>(()=>({counts:empty,unread:0,items:[],error:null}));
let actor:number|undefined,users=0,generation=0,inflight=false,pending=false;
let cleanup=()=>{};
export async function refreshNotifications(){
 if(!actor)return;
 if(inflight){pending=true;return;}
 const current=actor,token=generation;inflight=true;
 try{
  const {data,error}=await supabase.rpc('dashboard_notification_summary');
  if(token!==generation)return;
  if(error)throw error;
  useNotificationStore.setState({actor:current,counts:{...empty,...data.counts},unread:data.unread||0,items:(data.items||[]).map((item:Omit<NotificationItem,'title'>)=>({...item,title:title(item.type)})),error:null});
 }catch(e){if(token===generation)useNotificationStore.setState({error:e instanceof Error?e.message:'Chưa tải được thông báo.'});}
 finally{if(token===generation){inflight=false;if(pending){pending=false;void refreshNotifications();}}}
}
export function retainNotifications(id?:number){
 if(!id)return()=>{};
 if(actor!==id){
  cleanup();generation++;actor=id;users=0;inflight=false;pending=false;
  useNotificationStore.setState({actor:id,counts:empty,items:[],unread:0,error:null});
  let timer:ReturnType<typeof setTimeout>;let connected=false;
  const schedule=()=>{clearTimeout(timer);if(document.visibilityState==='visible')timer=setTimeout(()=>void refreshNotifications(),250);};
  const channel=supabase.channel(`notification-center-${id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${id}`},schedule)
   .on('postgres_changes',{event:'*',schema:'public',table:'borrow_requests'},schedule)
   .subscribe(status=>{if(status==='SUBSCRIBED'){if(connected)schedule();connected=true;}});
  window.addEventListener('focus',schedule);window.addEventListener('notifications:changed',schedule);document.addEventListener('visibilitychange',schedule);
  const poll=setInterval(schedule,60000);
  cleanup=()=>{clearTimeout(timer);clearInterval(poll);window.removeEventListener('focus',schedule);window.removeEventListener('notifications:changed',schedule);document.removeEventListener('visibilitychange',schedule);void supabase.removeChannel(channel);};
  void refreshNotifications();
 }
 users++;
 return()=>{if(actor!==id)return;if(--users===0){cleanup();generation++;actor=undefined;inflight=false;pending=false;useNotificationStore.setState({actor:undefined,counts:empty,items:[],unread:0,error:null});}};
}
export async function markNotificationsRead(ids?:string[]){
 if(!actor)return;
 let query=supabase.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('user_id',actor).eq('is_read',false);
 if(ids)query=query.in('id',ids);
 const {error}=await query;if(error)throw error;
 await refreshNotifications();window.dispatchEvent(new Event('notifications:changed'));
}
