import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {workflowDbClient} from './workflowDbClient.mjs';
const db=workflowDbClient();
let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
try{
 await db.connect();await db.query('begin');
 // Validate source migration inside a rollback transaction before applying it.
 await db.query(fs.readFileSync(new URL('../supabase/migrations/20261014105438_workspace_tracking_reports.sql',import.meta.url),'utf8'));
 const [actor,outsider]=(await db.query("select id,auth_id,department_id from users where is_active and auth_id is not null order by (lower(role)='admin') desc,id limit 2")).rows;
 const space=(await db.query('select id from workspaces limit 1')).rows[0];
 await db.query("update users set role='staff',employment_level='Staff',department_id=null where id=$1",[outsider.id]);
 const auth=async user=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user.auth_id]);await db.query('set local role authenticated');};
 const rejected=async(sql,args)=>{await db.query('savepoint denied');let denied=false;try{await db.query(sql,args);}catch{denied=true;}await db.query('rollback to savepoint denied');check(denied,true,'Unauthorized or invalid write rejected');};
 await auth(actor);
 const project=(await db.query("insert into projects(name,workspace_id,created_by,department_id,status) values('[QA rollback] Tracking',$1,$2,$3,'active') returning id",[space.id,actor.id,actor.department_id])).rows[0];
 const campaign=(await db.query("insert into campaigns(name,workspace_id,created_by,lead_id,department_id,status) values('[QA rollback] Tracking',$1,$2,$2,$3,'planning') returning id",[space.id,actor.id,actor.department_id])).rows[0];
 const track=(await db.query("select id from workflow_tracks where entity_type='project' and entity_id=$1",[project.id])).rows[0];
 const phase=(await db.query('select workflow_configure_phase($1,null,$2,0) id',[track.id,JSON.stringify({title:'Phase',status:'todo',pic_ids:[Number(actor.id)]})])).rows[0].id;
 const canonical=(await db.query('select workflow_create_task($1,$2) id',[phase,JSON.stringify({title:'Task',assignee_id:Number(actor.id)})])).rows[0].id;
 const legacy=randomUUID();
 for(const [table,parent]of [['project_subtasks',project.id],['campaign_subtasks',campaign.id]])await db.query(`insert into ${table}(id,${table==='project_subtasks'?'project_id':'campaign_id'},title,assignee_id) values($1,$2,'Legacy',$3)`,[legacy,parent,actor.id]);
 const items=[{kind:'task',id:canonical},{kind:'project_subtask',id:legacy},{kind:'campaign_subtask',id:legacy}].map(t=>({...t,complete:true,metadata:{body:'Done',unchanged:false}}));
 check((await db.query("select save_task_weekly_reports($1,'2026-10-12','2026-10-18') n",[JSON.stringify(items)])).rows[0].n,3,'Three kinds saved atomically');
 for(const [table,id]of [['tasks',canonical],['project_subtasks',legacy],['campaign_subtasks',legacy]]){const row=(await db.query(`select status,completed_at from ${table} where id=$1`,[id])).rows[0];check(row.status,'done','Actual status persisted');check(Boolean(row.completed_at),true,'Completion timestamp persisted');}
 check((await db.query('select workflow_status from tasks where id=$1',[canonical])).rows[0].workflow_status,'completed','Workflow stage bridged');
 const logs=()=>db.query("select entity_type,entity_id,metadata from activity_log where action='weekly_report' and (entity_id=$1 or entity_id=$2)",[canonical,legacy]);
 check((await logs()).rows.length,3,'Distinct kind prevents UUID collision');
 await db.query("select save_task_weekly_reports($1,'2026-10-12','2026-10-18')",[JSON.stringify(items)]);
 check((await logs()).rows.length,3,'Repeat submission edits same week without duplicate rows');
 const before=(await db.query('select completed_at from tasks where id=$1',[canonical])).rows[0].completed_at;
 await db.query("update tasks set title='Edited after completion' where id=$1",[canonical]);
 check((await db.query('select completed_at from tasks where id=$1',[canonical])).rows[0].completed_at,before,'Unrelated edit preserves completion time');
 await db.query("update tasks set status='todo' where id=$1",[canonical]);
 check((await db.query('select completed_at from tasks where id=$1',[canonical])).rows[0].completed_at,null,'Reopen clears completion time');
 await rejected("select save_task_weekly_reports($1,'2026-10-12','2026-10-18')",[JSON.stringify([{...items[0],complete:true},{kind:'task',id:'ffffffff-ffff-ffff-ffff-ffffffffffff',complete:true,metadata:{body:'Invalid'}}])]);
 check((await db.query('select status from tasks where id=$1',[canonical])).rows[0].status,'todo','Failed mixed batch rolls back first completion');
 await rejected("select complete_tracked_tasks($1)",[JSON.stringify([{kind:'task',id:canonical},{kind:'task',id:'ffffffff-ffff-ffff-ffff-ffffffffffff'}])]);
 check((await db.query('select status from tasks where id=$1',[canonical])).rows[0].status,'todo','Bulk completion rolls back on inaccessible task');
 check((await db.query('select complete_tracked_tasks($1) n',[JSON.stringify(items.map(({kind,id})=>({kind,id})))])).rows[0].n,3,'All Tasks bulk persists all three stores');
 await auth(outsider);await rejected("select save_task_weekly_reports($1,'2026-10-12','2026-10-18')",[JSON.stringify(items)]);await rejected('select complete_tracked_tasks($1)',[JSON.stringify(items.map(({kind,id})=>({kind,id})))]);
 await db.query('reset role');
 check((await db.query("select count(*)::int n from pg_proc where proname in ('save_task_weekly_reports','complete_tracked_tasks') and prosecdef")).rows[0].n,0,'RPCs retain caller RLS');
 check((await db.query("select has_function_privilege('anon','save_task_weekly_reports(jsonb,date,date)','execute') allowed")).rows[0].allowed,false,'Anonymous RPC disabled');
 console.log(`${checks} timestamp, reporting, Workflow, identity and transaction checks passed; all fixtures rolled back.`);
}finally{await db.query('rollback').catch(()=>{});await db.end();}
