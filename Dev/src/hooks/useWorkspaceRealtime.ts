import {useEffect,useRef,useState} from 'react';
import {retainWorkspaceRealtime,type WorkspaceChange} from '../services/workspaceRealtime';
export function useWorkspaceRealtime(tables:readonly string[],refresh:(change?:WorkspaceChange)=>unknown,actor?:number,filter?:(change:WorkspaceChange)=>boolean){
 const refreshRef=useRef(refresh),filterRef=useRef(filter);
 useEffect(()=>{refreshRef.current=refresh;filterRef.current=filter;});
 const [connected,setConnected]=useState(false),key=[...tables].sort().join(',');
 useEffect(()=>{
  setConnected(false);if(!actor)return;
  return retainWorkspaceRealtime(actor,key?key.split(','):[],change=>refreshRef.current(change),setConnected,change=>!filterRef.current||filterRef.current(change));
 },[key,actor]);
 return Boolean(actor&&connected);
}
