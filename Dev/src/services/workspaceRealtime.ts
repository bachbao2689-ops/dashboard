import {supabase} from './supabase';
export type WorkspaceChange={revision:number;table?:string;new?:Record<string,any>;old?:Record<string,any>;eventType?:string};
type Listener={tables:Set<string>;refresh:(change:WorkspaceChange)=>unknown;status:(connected:boolean)=>void;filter?:(change:WorkspaceChange)=>boolean;timer?:ReturnType<typeof setTimeout>;pending?:WorkspaceChange};
type Group={listeners:Set<Listener>;channel?:ReturnType<typeof supabase.channel>;key:string;connected:boolean;connectedOnce:boolean;revision:number;rebuild?:ReturnType<typeof setTimeout>;stop?:ReturnType<typeof setTimeout>;dispose:()=>void};
const groups=new Map<number,Group>();
let revision=0,socket=0;
const eventTables:Record<string,string[]|undefined>={
 'tasks:changed':['tasks','project_subtasks','campaign_subtasks'],
 'projects:changed':['projects','project_members','project_subtasks'],
 'campaigns:changed':['campaigns','campaign_members','campaign_subtasks'],
};
function schedule(group:Group,tables?:string[],payload:Partial<WorkspaceChange>={}){
 const change={...payload,revision:++revision};group.revision=change.revision;
 for(const listener of group.listeners){
  if(tables&&!tables.some(table=>listener.tables.has(table)))continue;
  if(listener.filter&&!listener.filter(change))continue;
  listener.pending=change;clearTimeout(listener.timer);
  if(document.visibilityState==='hidden')continue;
  listener.timer=setTimeout(()=>{if(group.listeners.has(listener)&&listener.pending){const latest=listener.pending;listener.pending=undefined;void listener.refresh(latest);}},300);
 }
}
function rebuild(group:Group,actor:number){
 clearTimeout(group.rebuild);
 group.rebuild=setTimeout(()=>{
  const key=[...new Set([...group.listeners].flatMap(listener=>[...listener.tables]))].sort().join(',');
  if(!key||key===group.key)return;
  const reconnect=Boolean(group.channel);if(group.channel)void supabase.removeChannel(group.channel);
  group.key=key;group.connected=false;
  let channel=supabase.channel(`workspace-shared-${actor}-${++socket}`);
  for(const table of key.split(','))channel=channel.on('postgres_changes',{event:'*',schema:'public',table},payload=>schedule(group,[table],{...payload,table}));
  group.channel=channel;
  channel.subscribe(status=>{
   if(group.channel!==channel)return;
   group.connected=status==='SUBSCRIBED';group.listeners.forEach(listener=>listener.status(group.connected));
   if(group.connected){if(group.connectedOnce||reconnect)schedule(group);group.connectedOnce=true;}
  });
 },0);
}
export function retainWorkspaceRealtime(actor:number,tables:readonly string[],refresh:Listener['refresh'],status:Listener['status']=()=>{},filter?:Listener['filter']){
 let group=groups.get(actor);
 if(!group){
  group={listeners:new Set(),key:'',connected:false,connectedOnce:false,revision:0,dispose:()=>{}};groups.set(actor,group);
  const target=group;
  const local=(event:Event)=>{const detail=(event as CustomEvent<{tables?:string[]}>).detail;schedule(target,detail?.tables||eventTables[event.type]);};
  const visible=()=>{if(document.visibilityState==='visible')schedule(target);};
  const events=['tasks:changed','projects:changed','campaigns:changed','workspace:changed'];
  events.forEach(event=>window.addEventListener(event,local));window.addEventListener('focus',visible);window.addEventListener('online',visible);document.addEventListener('visibilitychange',visible);
  const interval=setInterval(visible,60000);
  target.dispose=()=>{clearTimeout(target.rebuild);clearInterval(interval);events.forEach(event=>window.removeEventListener(event,local));window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible);if(target.channel)void supabase.removeChannel(target.channel);};
 }
 clearTimeout(group.stop);
 const listener:Listener={tables:new Set(tables),refresh,status,filter};group.listeners.add(listener);status(group.connected);rebuild(group,actor);
 const current=group;
 return()=>{clearTimeout(listener.timer);current.listeners.delete(listener);if(!current.listeners.size)current.stop=setTimeout(()=>{if(!current.listeners.size){current.dispose();groups.delete(actor);}},0);else rebuild(current,actor);};
}
