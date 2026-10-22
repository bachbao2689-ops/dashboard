import {create} from 'zustand';
import {supabase} from '../services/supabase';

export type NotificationItem={id:string;type:string;message:string;entity_type:string|null;entity_id:string|null;is_read:boolean;created_at:string;title:string;user_id?:number;metadata?:Record<string,any>};
export type SidebarBadgeCounts={borrowCount:number;workflowCount:number;tasksCount:number;projectCount:number;profileCount:number;departmentCount:number};
const empty:SidebarBadgeCounts={borrowCount:0,workflowCount:0,tasksCount:0,projectCount:0,profileCount:0,departmentCount:0};
const title=(type:string)=>({task_created:'Task mới được tạo',task_updated:'Cập nhật task',task_completed:'Task completed',task_comment:'Bình luận mới',weekly_report:'Weekly Report mới',report_reminder:'Nhắc report',task_assigned:'Task mới được giao',project_assigned:'Dự án được giao',campaign_assigned:'Chiến dịch được giao',project_comment:'Bình luận dự án',campaign_comment:'Bình luận chiến dịch',phase_assigned:'Chặng được giao',phase_updated:'Cập nhật chặng',phase_completed:'Hoàn thành chặng',phase_ready:'Chặng tiếp theo',project_updated:'Cập nhật dự án',campaign_updated:'Cập nhật chiến dịch'}[type]||'Thông báo');
export const useNotificationStore=create<{actor?:number;counts:SidebarBadgeCounts;unread:number;items:NotificationItem[];history:NotificationItem[];sidebarUnread:NotificationItem[];writerVersion:number;ready:boolean;features:{batchCompletion?:boolean;batchReport?:boolean};error:string|null}>(()=>({counts:empty,unread:0,items:[],history:[],sidebarUnread:[],writerVersion:0,ready:false,features:{},error:null}));
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
  const history:NotificationItem[]=(data.history||data.items||[]).map((item:Omit<NotificationItem,'title'>)=>({...item,user_id:item.user_id||current,title:title(item.type)}));
  const needsOlderUnread=Number(data.unread||0)>history.filter(item=>!item.is_read).length;
  useNotificationStore.setState({actor:current,counts:{...empty,...data.counts},unread:data.unread||0,writerVersion:data.writerVersion||0,ready:true,features:data.features||{},history,items:(data.items||[]).map((item:Omit<NotificationItem,'title'>)=>({...item,title:title(item.type)})),sidebarUnread:needsOlderUnread?useNotificationStore.getState().sidebarUnread:[],error:null});
  // Summary deliberately caps history at 50. Load older unread only when that cap omits them.
  if(needsOlderUnread){
    const rows:NotificationItem[]=[];
    for(let offset=0;offset<Number(data.unread||0);offset+=500){
      const {data:page,error:pageError}=await supabase.from('notifications')
        .select('id,user_id,type,message,entity_type,entity_id,is_read,created_at,metadata')
        .eq('user_id',current).eq('is_read',false).order('created_at',{ascending:false}).range(offset,offset+499);
      if(token!==generation)return;
      if(pageError)throw pageError;
      rows.push(...(page||[]).map(item=>({...item,title:title(item.type)})));
      if((page||[]).length<500)break;
    }
    if(token===generation)useNotificationStore.setState({sidebarUnread:rows});
  }
 }catch(e){if(token===generation)useNotificationStore.setState({ready:true,error:e instanceof Error?e.message:'Chưa tải được thông báo.'});}
 finally{if(token===generation){inflight=false;if(pending){pending=false;void refreshNotifications();}}}
}
export function retainNotifications(id?:number){
 if(!id)return()=>{};
 if(actor!==id){
  cleanup();generation++;actor=id;users=0;inflight=false;pending=false;
  useNotificationStore.setState({actor:id,counts:empty,items:[],history:[],sidebarUnread:[],writerVersion:0,ready:false,features:{},unread:0,error:null});
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
 return()=>{if(actor!==id)return;if(--users===0){cleanup();generation++;actor=undefined;inflight=false;pending=false;useNotificationStore.setState({actor:undefined,counts:empty,items:[],history:[],sidebarUnread:[],writerVersion:0,ready:false,features:{},unread:0,error:null});}};
}
export async function markNotificationsRead(ids?:string[]){
 if(!actor)return;
 const current=actor,token=generation;
 let query=supabase.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('user_id',actor).eq('is_read',false);
 if(ids)query=query.in('id',ids);
 const {error}=await query;if(error)throw error;
 if(token!==generation||actor!==current)return;
 const state=useNotificationStore.getState(),selected=new Set(ids||state.history.map(item=>item.id));
 const changed=Array.from(new Map([...state.history,...state.sidebarUnread].filter(item=>!item.is_read&&selected.has(item.id)).map(item=>[item.id,item])).values());
 const read=(items:NotificationItem[])=>items.map(item=>(!ids||selected.has(item.id))?{...item,is_read:true}:item);
 const counts={...state.counts};
 for(const [key,kinds] of Object.entries({tasksCount:['task','project_subtask','campaign_subtask'],workflowCount:['task','project_subtask','campaign_subtask','workflow','workflow_track','workflow2'],projectCount:['project','campaign','project_subtask','campaign_subtask'],profileCount:['profile','task','project','campaign','project_subtask','campaign_subtask','weekly_report'],departmentCount:['department']}))counts[key as keyof SidebarBadgeCounts]=ids?Math.max(0,counts[key as keyof SidebarBadgeCounts]-changed.filter(item=>(kinds.includes(item.entity_type||'')||(key==='workflowCount'&&item.type.startsWith('phase_')))).length):0;
 useNotificationStore.setState({items:read(state.items),history:read(state.history),sidebarUnread:read(state.sidebarUnread),unread:ids?Math.max(0,state.unread-changed.length):0,counts});
 window.dispatchEvent(new Event('notifications:changed'));
}

export const hasCanonicalNotifications=()=>useNotificationStore.getState().writerVersion>=2;
