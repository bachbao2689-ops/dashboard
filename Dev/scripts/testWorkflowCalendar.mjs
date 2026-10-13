import assert from 'node:assert/strict';
import {workflowDbClient} from './workflowDbClient.mjs';
const db=workflowDbClient(process.argv[2]);
let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
async function rejects(sql,args) {
 await db.query('savepoint invalid_calendar');let failed=false;
 try{await db.query(sql,args);}catch{failed=true;}
 await db.query('rollback to savepoint invalid_calendar');check(failed,true,'Calendar rejects invalid write');
}
try {
 await db.connect();await db.query('begin');
 const actor=(await db.query("select id,auth_id,department_id from users where lower(role)='admin' and is_active and auth_id is not null limit 1")).rows[0];
 assert.ok(actor,'An authenticated Admin fixture is required');
 const space=(await db.query('select id from workspaces limit 1')).rows[0];
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor.auth_id]);await db.query('set local role authenticated');
 const parent=(await db.query("insert into projects(name,description,workspace_id,department_id,created_by,start_date,due_date,status) values('[QA rollback] calendar','calendar',$1,$2,$3,'2026-11-01','2026-12-31','active') returning id",[space.id,actor.department_id,actor.id])).rows[0];
 const track=(await db.query("select id from workflow_tracks where entity_type='project' and entity_id=$1",[parent.id])).rows[0];
 const phaseData={title:'Inherited phase',status:'todo',pic_ids:[Number(actor.id)],gate_criteria:[]};
 const phase=(await db.query('select workflow_configure_phase($1,null,$2,0) id',[track.id,JSON.stringify(phaseData)])).rows[0].id;
 check((await db.query('select start_date::text,due_date::text from workflow_phases where id=$1',[phase])).rows[0],{start_date:'2026-11-01',due_date:'2026-12-31'},'Phase inherits source range');
 await db.query('select workflow_configure_phase($1,$2,$3,1)',[track.id,phase,JSON.stringify({...phaseData,start_date:'2026-11-02',due_date:'2026-11-15'})]);
 await rejects('select workflow_configure_phase($1,null,$2,0)',[track.id,JSON.stringify({...phaseData,start_date:'2026-10-31'})]);
 await rejects('select workflow_configure_phase($1,null,$2,0)',[track.id,JSON.stringify({...phaseData,due_date:'2027-01-01'})]);
 const task=(await db.query('select workflow_create_task($1,$2) id',[phase,JSON.stringify({title:'Inherited task',assignee_id:Number(actor.id)})])).rows[0].id;
 check((await db.query('select start_date::text,due_date::text,project_id from tasks where id=$1',[task])).rows[0],{start_date:'2026-11-02',due_date:'2026-11-15',project_id:parent.id},'Task inherits phase range and retains parent identity');
 await rejects('select workflow_create_task($1,$2)',[phase,JSON.stringify({title:'Outside phase',assignee_id:Number(actor.id),due_date:'2026-11-16'})]);
 await rejects("update tasks set start_date='2026-11-01' where id=$1",[task]);
 const legacy=(await db.query("insert into project_subtasks(project_id,title,assignee_id,start_date,due_date) values($1,'Legacy identity retained',$2,'2026-11-02','2026-11-14') returning id",[parent.id,actor.id])).rows[0];
 await db.query("select workflow_link_task($1,$2,'project_subtask')",[phase,legacy.id]);
 check((await db.query('select id,workflow_phase_id,start_date::text from project_subtasks where id=$1',[legacy.id])).rows[0],{id:legacy.id,workflow_phase_id:phase,start_date:'2026-11-02'},'Linking Subtask keeps original ID and start date');
 await rejects("update project_subtasks set due_date='2026-11-16' where id=$1",[legacy.id]);
 const weights=[{id:'custom-a',label:'Review',weight:25.5,checked:false},{id:'custom-b',label:'Delivery',weight:74.5,checked:false}];
 await db.query('select workflow_update_gate($1,$2,2)',[phase,JSON.stringify(weights)]);
 check((await db.query('select gate_criteria from workflow_phases where id=$1',[phase])).rows[0].gate_criteria,weights,'Custom percentage weights persist exactly');
 for(const weight of [0,101])await rejects('select workflow_update_gate($1,$2,3)',[phase,JSON.stringify([{id:'bad',label:'Bad',weight,checked:false}])]);
 const campaign=(await db.query("insert into campaigns(name,workspace_id,department_id,created_by,lead_id,start_date,end_date,status) values('[QA rollback] campaign calendar',$1,$2,$3,$3,'2026-12-01','2026-12-20','planning') returning id",[space.id,actor.department_id,actor.id])).rows[0];
 const campaignTrack=(await db.query("select id from workflow_tracks where entity_type='campaign' and entity_id=$1",[campaign.id])).rows[0];
 const campaignPhase=(await db.query('select workflow_configure_phase($1,null,$2,0) id',[campaignTrack.id,JSON.stringify(phaseData)])).rows[0].id;
 const campaignTask=(await db.query('select workflow_create_task($1,$2) id',[campaignPhase,JSON.stringify({title:'Campaign task',assignee_id:Number(actor.id)})])).rows[0].id;
 check((await db.query('select start_date::text,due_date::text,campaign_id from tasks where id=$1',[campaignTask])).rows[0],{start_date:'2026-12-01',due_date:'2026-12-20',campaign_id:campaign.id},'Campaign end_date propagates to phase/task due_date');
 console.log(`${checks} calendar and weight checks passed; all fixtures rolled back.`);
} finally {await db.query('rollback').catch(()=>{});await db.end();}
