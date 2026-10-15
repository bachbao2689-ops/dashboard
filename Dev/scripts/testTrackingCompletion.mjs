import assert from 'node:assert/strict';
import {workflowDbClient} from './workflowDbClient.mjs';
const db=workflowDbClient();let checks=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
try{
 await db.connect();await db.query('begin');
 const actor=(await db.query("select id,auth_id,department_id from users where is_active and auth_id is not null order by (lower(role)='admin') desc,id limit 1")).rows[0];
 const space=(await db.query('select id from workspaces limit 1')).rows[0];
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor.auth_id]);await db.query('set local role authenticated');
 const project=(await db.query("insert into projects(name,workspace_id,created_by,department_id,status) values('[QA rollback] tracking',$1,$2,$3,'active') returning id",[space.id,actor.id,actor.department_id])).rows[0];
 const campaign=(await db.query("insert into campaigns(name,workspace_id,created_by,lead_id,department_id,status) values('[QA rollback] tracking',$1,$2,$2,$3,'planning') returning id",[space.id,actor.id,actor.department_id])).rows[0];
 const track=(await db.query("select id from workflow_tracks where entity_type='project' and entity_id=$1",[project.id])).rows[0];
 const phase=(await db.query('select workflow_configure_phase($1,null,$2,0) id',[track.id,JSON.stringify({title:'Tracking phase',status:'todo',pic_ids:[Number(actor.id)]})])).rows[0].id;
 const task=(await db.query('select workflow_create_task($1,$2) id',[phase,JSON.stringify({title:'Tracking canonical',assignee_id:Number(actor.id)})])).rows[0].id;
 for(const[table,kind,parentKey,parentId]of [['tasks','task',null,null],['project_subtasks','project_subtask','project_id',project.id],['campaign_subtasks','campaign_subtask','campaign_id',campaign.id]]){
  const id=table==='tasks'?task:(await db.query(`insert into ${table}(${parentKey},title,assignee_id,status) values($1,'Tracking legacy',$2,'todo') returning id`,[parentId,actor.id])).rows[0].id;
  const completed=(await db.query(`update ${table} set status='completed' where id=$1 returning status,workflow_status,completed_at,updated_at`,[id])).rows[0];
  check(completed.workflow_status,table==='tasks'?'completed':null,'Native and workflow status agree within phase scope');check(Boolean(completed.completed_at),true,'Genuine completion timestamp');
  const edited=(await db.query(`update ${table} set title=title||' edited' where id=$1 returning completed_at`,[id])).rows[0];
  check(edited.completed_at.toISOString(),completed.completed_at.toISOString(),'Description/title edits do not rewrite completion');
  const reopened=(await db.query(`update ${table} set status='todo' where id=$1 returning completed_at,workflow_status`,[id])).rows[0];
  check(reopened.completed_at,null,'Reopened work clears completion');check(reopened.workflow_status,table==='tasks'?'backlog':null,'Reopened work is not shown completed');
  const row=(await db.query("insert into activity_log(workspace_id,user_id,action,entity_type,entity_id,metadata) values($1,$2,'weekly_report',$3,$4,$5) returning entity_type,entity_id",[space.id,actor.id,kind,id,JSON.stringify({body:'QA report',week_start:'2026-10-12',week_end:'2026-10-18'})])).rows[0];
  check(row.entity_type,kind,'Weekly report keeps correct task store');check(String(row.entity_id),String(id),'Weekly report persists actual UUID');
 }
 console.log(`${checks} tracking persistence checks passed; rolled back all fixtures.`);
}finally{try{await db.query('rollback');}finally{await db.end();}}
