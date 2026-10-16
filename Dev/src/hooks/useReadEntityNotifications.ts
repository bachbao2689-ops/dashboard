import {useEffect, useMemo} from 'react';
import {useAuthStore} from '../store/authStore';
import {markNotificationsRead, useNotificationStore} from '../store/notificationStore';
import {isSidebarComment, isSidebarMention} from '../lib/sidebarSignals';

/** A notification is read after its exact task or parent detail is visible. */
export function useReadEntityNotifications(kind:string, id:string|number|null|undefined, open=true){
  const profile=useAuthStore(state=>state.profile);
  const actor=useNotificationStore(state=>state.actor);
  const recent=useNotificationStore(state=>state.history);
  const older=useNotificationStore(state=>state.sidebarUnread);
  const unread=useMemo(()=>{
    if(!open||id==null||actor!==profile?.id)return [];
    const ids=new Set<string>();
    for(const item of [...recent,...older]){
      if(!item.is_read&&item.entity_type===kind&&String(item.entity_id)===String(id)
        &&(isSidebarComment(item)||isSidebarMention(item,profile?.name)))ids.add(item.id);
    }
    return [...ids];
  },[open,kind,id,actor,profile?.id,profile?.name,recent,older]);
  useEffect(()=>{if(unread.length)void markNotificationsRead(unread).catch(console.error);},[unread]);
}
