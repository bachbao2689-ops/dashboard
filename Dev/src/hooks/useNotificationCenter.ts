import {useEffect} from 'react';
import {useAuthStore} from '../store/authStore';
import {retainNotifications,useNotificationStore} from '../store/notificationStore';
export function useNotificationCenter(){
 const id=useAuthStore(s=>s.profile?.id);
 useEffect(()=>retainNotifications(id),[id]);
 return useNotificationStore();
}
