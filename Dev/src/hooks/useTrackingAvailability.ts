import {useEffect,useState} from 'react';
import {supabase} from '../services/supabase';
import {useNotificationCenter} from './useNotificationCenter';
import {useAuthStore} from '../store/authStore';
export function useTrackingAvailability(){
 const center=useNotificationCenter();
 const actor=useAuthStore(s=>s.profile?.id);const [state,setState]=useState<{actor?:number;available:boolean}>({available:false});
 useEffect(()=>{let active=true;if(!actor||!center.ready||center.writerVersion>=2)return;void supabase.rpc('complete_tracked_tasks',{p_items:[]}).then(({error})=>{if(active)setState({actor,available:error?.code==='P0001'&&error.message==='Select 1 to 200 tasks'});});return()=>{active=false;};},[actor,center.ready,center.writerVersion]);
 return center.writerVersion>=2?Boolean(center.features.batchCompletion):state.actor===actor&&state.available;
}
