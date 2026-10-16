import {createSharedResource} from '../lib/sharedResource';
import {supabase} from './supabase';
import {readAll,readWorkspaceTasks} from './workspaceTasks';
import {useAuthStore} from '../store/authStore';
import {retainWorkspaceRealtime,type WorkspaceChange} from './workspaceRealtime';
import type {HubTrack} from '../lib/workflowHub';
import {workspaceChangeRelevant} from '../lib/workspaceInvalidation';

export const workspaceScope=()=>{const {user,profile}=useAuthStore.getState();return JSON.stringify([user?.id,profile?.id,profile?.role,profile?.employment_level,profile?.department_id]);};
function scopedResource<T>(load:()=>Promise<T>,tables:string[],ttl=15000,filter?:(change:WorkspaceChange)=>boolean){
 const resource=createSharedResource<T>(async key=>{
  if(key!==workspaceScope())throw new Error('Phiên làm việc đã thay đổi.');
  const result=await load();if(key!==workspaceScope())throw new Error('Phiên làm việc đã thay đổi.');return result;
 },ttl);
 const bindings=new Map<string,{count:number;release:()=>void}>();
 return {...resource,subscribe:(key:string,listener:()=>void)=>{
  let binding=bindings.get(key);
  if(!binding){const actor=useAuthStore.getState().profile?.id;binding={count:0,release:actor?retainWorkspaceRealtime(actor,tables,change=>{if(key===workspaceScope())resource.invalidate(key,change.revision);},()=>{},filter):()=>{}};bindings.set(key,binding);}
  binding.count++;const release=resource.subscribe(key,listener);
  return()=>{release();if(binding&&--binding.count===0){binding.release();bindings.delete(key);}};
 }};
}
export const taskResource=scopedResource(readWorkspaceTasks,['tasks','project_subtasks','campaign_subtasks','projects','campaigns','project_members','campaign_members','workflow_phase_members','comments','activity_log'],15000,change=>workspaceChangeRelevant('tasks',change,useAuthStore.getState().profile));
export const directoryResource=scopedResource(async()=>{
 const [users,departments]=await Promise.all([
  readAll(supabase.from('users').select('id,name,avatar_url,role,employment_level,job_title,department_id').eq('is_active',true).order('name').order('id')),
  readAll(supabase.from('departments').select('id,name').order('name').order('id')),
 ]);
 const names=new Map(departments.map(department=>[department.id,department.name]));
 return {users:users.map(user=>({...user,id:String(user.id),department:user.department_id?{name:names.get(user.department_id)}:null})),departments};
},['users','departments'],60000);
export const assetSummaryResource=scopedResource(()=>readAll(supabase.from('assets').select('id,asset_code,name,status,is_available,category:category_id(name)').order('id')),['assets'],30000);
export const workflowResource=scopedResource(async()=>{
 const {data,error}=await supabase.rpc('workflow_hub_index');if(error)throw error;return (data||[]) as HubTrack[];
},['workflow_tracks','workflow_phases','workflow_phase_members','projects','campaigns','project_members','campaign_members','tasks','project_subtasks','campaign_subtasks','comments','activity_log'],15000,change=>workspaceChangeRelevant('workflow',change,useAuthStore.getState().profile));
let scope=workspaceScope();
useAuthStore.subscribe(()=>{const next=workspaceScope();if(next!==scope){scope=next;[taskResource,directoryResource,assetSummaryResource,workflowResource].forEach(resource=>resource.reset());}});
