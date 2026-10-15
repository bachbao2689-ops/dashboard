import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {workflowDbClient} from './workflowDbClient.mjs';
const db=workflowDbClient();
const migration=fs.readdirSync(new URL('../supabase/migrations/',import.meta.url)).find(file=>file.endsWith('_notification_tracking_performance.sql'));
try{
 await db.connect();await db.query('begin isolation level repeatable read');await db.query("set local statement_timeout='15s'");
 const actors=(await db.query('select id,auth_id,role,employment_level from users where is_active and auth_id is not null order by id')).rows;
 const auth=async actor=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor.auth_id]);await db.query('set local role authenticated');};
 const serverMs=async()=>{const samples=[];for(let i=0;i<3;i++){const plan=(await db.query('explain (analyze,format json,timing off) select workflow_hub_index()')).rows[0]['QUERY PLAN'];samples.push(plan[0]['Execution Time']);}return samples.sort((a,b)=>a-b)[1];};
 const before=new Map(),permissions=new Map(),times=[];
 const matrix=async()=>(await db.query(`select jsonb_build_object(
 'tasks',(select coalesce(jsonb_agg(jsonb_build_array(id,workflow_task_access(id),workflow_task_access(id,true)) order by id),'[]') from public.tasks),
 'phases',(select coalesce(jsonb_agg(jsonb_build_array(id,workflow_phase_access(id),workflow_phase_access(id,true)) order by id),'[]') from public.workflow_phases),
 'projects',(select coalesce(jsonb_agg(jsonb_build_array(id,workflow_parent_access('project',id)) order by id),'[]') from public.projects),
 'campaigns',(select coalesce(jsonb_agg(jsonb_build_array(id,workflow_parent_access('campaign',id)) order by id),'[]') from public.campaigns),
 'project_subtasks',(select coalesce(jsonb_agg(jsonb_build_array(id,workflow_old_task_access('project',id),workflow_old_task_access('project',id,true)) order by id),'[]') from public.project_subtasks),
 'campaign_subtasks',(select coalesce(jsonb_agg(jsonb_build_array(id,workflow_old_task_access('campaign',id),workflow_old_task_access('campaign',id,true)) order by id),'[]') from public.campaign_subtasks)) data`)).rows[0].data;

 for(const actor of actors){await auth(actor);const started=performance.now();before.set(actor.id,(await db.query('select workflow_hub_index() data')).rows[0].data);times.push({role:actor.role,level:actor.employment_level,beforeMs:Math.round(performance.now()-started)});times.at(-1).serverBeforeMs=await serverMs();permissions.set(actor.id,await matrix());}
 await db.query('reset role');const sql=fs.readFileSync(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8');const start=sql.indexOf('CREATE OR REPLACE FUNCTION public.workflow_hub_index()');const end=sql.indexOf('$function$;',start);assert(start>=0&&end>start);const predicates=sql.slice(sql.indexOf('-- BEGIN WORKFLOW_PERMISSION_CACHE'),sql.indexOf('-- END WORKFLOW_PERMISSION_CACHE'));assert(predicates.length>100);await db.query(predicates);await db.query(sql.slice(start,end+'$function$;'.length));
 for(const [i,actor] of actors.entries()){
  await auth(actor);const started=performance.now();const after=(await db.query('select workflow_hub_index() data')).rows[0].data;
  assert.deepEqual(after,before.get(actor.id),'Workflow data and permissions must remain identical for '+actor.role);
  times[i].afterMs=Math.round(performance.now()-started);times[i].serverAfterMs=await serverMs();assert.deepEqual(await matrix(),permissions.get(actor.id),'Every task/phase/parent read/edit permission must remain identical');
 }
 console.log(JSON.stringify({scopesCompared:actors.length,dataIdentical:true,permissionMatrixIdentical:true,times}));
}finally{await db.query('rollback').catch(()=>{});await db.end();}
