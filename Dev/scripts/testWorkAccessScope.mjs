import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
const runtime=JSON.parse(fs.readFileSync(new URL('../../.local-supabase/runtime.json',import.meta.url),'utf8'));
const url=new URL(runtime.env.DB_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Local database required');
const db=new pg.Client({connectionString:url.href,ssl:false});await db.connect();let checks=0;
const eq=(got,want,label)=>{assert.equal(got,want,label);checks++;};
try{
 await db.query('begin');
 const {rows:depts}=await db.query('select id from departments order by id limit 2');assert.equal(depts.length,2);
 const {rows:[space]}=await db.query('select id from workspaces limit 1');
 const person=async(role,d)=>{const auth=randomUUID();const {rows:[p]}=await db.query("insert into users(name,email,auth_id,role,employment_level,department_id,is_active) values('QA scope rollback',$1,$2,$3,$4,$5,true) returning id,auth_id",[auth+'@example.invalid',auth,role,role==='leader'?'Leader':role==='admin'?'ADMIN':'Nhân viên',d]);return p;};
 const admin=await person('admin',null),a=await person('leader',depts[0].id),peer=await person('leader',depts[0].id),staff=await person('member',depts[0].id),b=await person('leader',depts[1].id),other=await person('member',depts[1].id);
 const as=async p=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[p.auth_id]);await db.query('set local role authenticated');};
 const rejects=async(fn,label)=>{await db.query('savepoint deny');let err;try{await fn();}catch(e){err=e;}await db.query('rollback to savepoint deny');assert.ok(err,label);eq(err.code,'42501',label);};
 const parent=async(kind,d,creator)=>{await db.query('reset role');const {rows:[row]}=await db.query(`insert into ${kind==='project'?'projects':'campaigns'}(name,workspace_id,department_id,created_by) values('QA scope rollback',$1,$2,$3) returning id`,[space.id,d,creator.id]);return row;};
 const p=await parent('project',depts[0].id,a),q=await parent('project',depts[1].id,b),c=await parent('campaign',depts[0].id,a);
 // Exercise the actual authenticated INSERT ... RETURNING path used by PostgREST.
 await as(a);
 for(const kind of ['project','campaign']){
  const table=kind==='project'?'projects':'campaigns';
  const {rows:[created]}=await db.query(`insert into ${table}(name,workspace_id,department_id,created_by) values('QA Leader create rollback',$1,$2,$3) returning id,name`,[space.id,depts[0].id,a.id]);
  assert.ok(created.id,kind+' authenticated creation must return row');checks++;
  const memberTable=kind==='project'?'project_members':'campaign_members',parentColumn=kind+'_id';
  await db.query(`insert into ${memberTable}(${parentColumn},user_id,workflow_role) values($1,$2,'pic'),($1,$3,'sub_pic')`,[created.id,staff.id,b.id]);
  eq((await db.query(`select count(*) from ${memberTable} where ${parentColumn}=$1`,[created.id])).rows[0].count,'2',kind+' creator can assign own Staff and foreign Leader');
  await rejects(()=>db.query(`insert into ${memberTable}(${parentColumn},user_id,workflow_role) values($1,$2,'pic')`,[created.id,admin.id]),kind+' rejects out-of-scope Admin PIC');

 }
 const visible=async(kind,id)=>Number((await db.query(`select count(*) from ${kind==='project'?'projects':'campaigns'} where id=$1`,[id])).rows[0].count);
 // Task RLS follows same-team assignees and parent invitations, not peer rank.
 await db.query('reset role');
 const {rows:[ownTask]}=await db.query("insert into tasks(title,workspace_id,created_by,assignee_id,department_id) values('QA scope rollback',$1,$2,$3,$4) returning id",[space.id,a.id,staff.id,depts[0].id]);
 const {rows:[foreignTask]}=await db.query("insert into tasks(title,workspace_id,project_id,created_by,assignee_id,department_id) values('QA scope rollback',$1,$2,$3,$4,$5) returning id",[space.id,q.id,b.id,other.id,depts[1].id]);
 const taskVisible=async id=>Number((await db.query('select count(*) from tasks where id=$1',[id])).rows[0].count);
 await as(peer);eq(await taskVisible(ownTask.id),1,'Own staff task visible to peer Leader');
 await as(a);eq(await taskVisible(foreignTask.id),0,'Foreign task denied');
 await as(a);eq(await visible('project',p.id),1,'Own department parent');eq(await visible('project',q.id),0,'Foreign parent denied');eq((await db.query('select workflow2_global($1) v',[a.id])).rows[0].v,false,'Leader not global');
 // A same-team peer sees parent even when not assigned; a foreign peer does not.
 await as(peer);eq(await visible('project',p.id),1,'Same-team peer');await as(b);eq(await visible('project',p.id),0,'Other Leader denied');
 await as(a);
 await db.query("insert into project_members(project_id,user_id,workflow_role) values($1,$2,'pic')",[p.id,a.id]);
 await db.query("insert into campaign_members(campaign_id,user_id,workflow_role) values($1,$2,'pic')",[c.id,a.id]);
 await db.query("insert into project_members(project_id,user_id,workflow_role) values($1,$2,'sub_pic')",[p.id,b.id]);
 await db.query("insert into campaign_members(campaign_id,user_id,workflow_role) values($1,$2,'sub_pic')",[c.id,b.id]);
 await rejects(()=>db.query("insert into project_members(project_id,user_id,workflow_role) values($1,$2,'sub_pic')",[p.id,other.id]),'Foreign Staff forged invite denied');
 await rejects(()=>db.query("insert into projects(name,workspace_id,department_id,created_by) values('QA forbidden',$1,$2,$3)",[space.id,depts[1].id,a.id]),'Foreign department create denied');
 await db.query('reset role');
 const {rows:[w]}=await db.query("select id from workflow_tracks where entity_type='project' and entity_id=$1",[p.id]);
 await as(a);
 const phaseData={title:'QA phase rollback',pic_ids:[a.id],sub_pic_ids:[b.id],status:'todo'};
 const {rows:[phase]}=await db.query('select workflow_save_phase($1,null,$2,0) id',[w.id,phaseData]);
 await rejects(()=>db.query('select workflow_save_phase($1,null,$2,0)',[w.id,{...phaseData,sub_pic_ids:[other.id]}]),'Direct phase save foreign Staff denied');
 await as(b);eq(await visible('project',p.id),1,'Sub-PIC cross department visible');eq(await visible('campaign',c.id),1,'Campaign Sub-PIC visible');eq((await db.query("select workflow_root('project',$1) v",[p.id])).rows[0].v,false,'Sub-PIC has no parent edit escalation');eq((await db.query('select workflow_phase_access($1,false) v',[phase.id])).rows[0].v,true,'Invited phase read');
 const hub=await db.query('select workflow_hub_index() v');eq(hub.rows[0].v.some(t=>t.entity_id===p.id),true,'Hub invitation visible');
 await as(other);eq(await visible('project',p.id),0,'Invitation not inherited by foreign Staff');
 await as(a);await db.query('delete from project_members where project_id=$1 and user_id=$2',[p.id,b.id]);await db.query('delete from campaign_members where campaign_id=$1 and user_id=$2',[c.id,b.id]);
 await as(b);eq(await visible('project',p.id),0,'Revoked parent access');eq(await visible('campaign',c.id),0,'Revoked campaign access');eq((await db.query('select workflow_phase_access($1,false) v',[phase.id])).rows[0].v,false,'Phase PIC alone cannot leak a foreign parent');
 await as(admin);eq(await visible('project',p.id),1,'Admin global preserved');eq(await visible('project',q.id),1,'Admin foreign preserved');
 await as(peer);eq(await taskVisible(ownTask.id),1,'Peer own team remains visible after revocation');
 console.log('PASS '+checks+' local role/RLS checks; synthetic fixtures rolled back.');
}finally{await db.query('rollback').catch(()=>{});await db.end();}
