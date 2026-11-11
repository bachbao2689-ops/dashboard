import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const runtimeFile=process.env.DASHBOARD_LOCAL_RUNTIME;
test('Admin Dev Tools matches actual account RLS/RPC and never inherits Admin writes',{skip:!runtimeFile},async()=>{
 const url=new URL(JSON.parse(fs.readFileSync(runtimeFile)).env.DB_URL);
 assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname));assert.equal(url.search,'');
 const db=new pg.Client({connectionString:url.href,ssl:false,connectionTimeoutMillis:5000});await db.connect();
 let checks=0;
 const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
 const as=async(p,fn,sid=p?.sid)=>{
  await db.query('reset role');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(p?{sub:p.auth,role:'authenticated',session_id:sid}:{})]);
  await db.query(p?'set local role authenticated':'set local role anon');
  try{return await fn();}finally{await db.query('reset role');}
 };
 const denied=async(fn,code='42501')=>{
  await db.query('savepoint denied');let error;try{await fn();}catch(e){error=e;}await db.query('rollback to savepoint denied');assert.ok(error,'expected permission denial');eq(error.code,code,'permission error');
 };
 const actor=async()=>(await db.query('select public.workflow_actor() id')).rows[0].id;
 const start=async(p)=>(await db.query('select public.admin_preview_start($1) v',[p.id])).rows[0].v;
 const stop=()=>db.query('select public.admin_preview_stop()');
 try{
  await db.query('begin');
  await db.query(fs.readFileSync(new URL('../supabase/migrations/20261111010921_admin_devtools_scope_sessions.sql',import.meta.url),'utf8'));
  const {rows:[space]}=await db.query('select id from public.workspaces limit 1');assert.ok(space);
  const deptA=randomUUID(),deptB=randomUUID();
  await db.query("insert into public.departments(id,workspace_id,name) values($1,$3,'Dev Tools fixture A'),($2,$3,'Dev Tools fixture B')",[deptA,deptB,space.id]);
  const people={};let id=-Math.floor(Date.now()/100);
  for(const [key,role,level,dept] of [['admin','admin','ADMIN',null],['a1','leader','Leader',deptA],['a2','leader','Leader',deptA],['staffA','member','Staff',deptA],['b1','leader','Leader',deptB],['b2','manager','Leader',deptB],['staffB','member','Staff',deptB],['manager','manager','Manager',null]]){
   const auth=randomUUID(),sid=randomUUID();
   await db.query("insert into auth.users(id,email,role,aud) values($1,$2,'authenticated','authenticated')",[auth,auth+'@devtools-fixture.invalid']);
   await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,auth]);
   await db.query('insert into public.users(id,auth_id,email,name,role,employment_level,department_id,is_active) values($1,$2,$3,$4,$5,$6,$7,true)',[id,auth,auth+'@devtools-fixture.invalid','Dev Tools fixture '+key,role,level,dept]);
   people[key]={id:id--,auth,sid};
  }
  const {admin,a1,a2,staffA,b1,b2,staffB,manager}=people;
  const parents=[],tasks=[],subs=[],phases=[],notifications=[];
  for(const p of [admin,a1,a2,staffA,b1,b2,staffB,manager]){
   const n=randomUUID();notifications.push(n);
   await db.query("insert into public.notifications(id,user_id,type,message,entity_type,entity_id,is_read,metadata) values($1,$2,'task_assigned','Dev Tools fixture notification','task',$3,false,'{}')",[n,p.id,randomUUID()]);
  }
  for(const [kind,owner,assignee,label] of [['project',a2,staffA,deptB],['campaign',a2,staffA,deptB],['project',b1,staffB,deptA],['campaign',b1,staffB,deptA]]){
   const parent=randomUUID();
   const fields=kind==='campaign'?',lead_id':'';
   await db.query(`insert into public.${kind}s(id,workspace_id,name,created_by,department_id,status${fields}) values($1,$2,'Dev Tools fixture parent',$3,$4,'active'${kind==='campaign'?',$5':''})`,[parent,space.id,owner.id,label,...(kind==='campaign'?[assignee.id]:[])]);
   await db.query('insert into public.workflow_tracks(entity_type,entity_id) values($1,$2) on conflict(entity_type,entity_id) do nothing',[kind,parent]);
   const {rows:[track]}=await db.query('select id from public.workflow_tracks where entity_type=$1 and entity_id=$2',[kind,parent]);
   const phase=randomUUID(),task=randomUUID(),sub=randomUUID();
   await db.query("insert into public.workflow_phases(id,workflow_id,position,title,created_by,status) values($1,$2,1,'Dev Tools fixture phase',$3,'todo')",[phase,track.id,owner.id]);
   await db.query('insert into public.tasks(id,workspace_id,title,created_by,assignee_id,department_id,project_id,campaign_id,workflow_phase_id) values($1,$2,\'Dev Tools fixture task\',$3,$4,$5,$6,$7,$8)',[task,space.id,owner.id,assignee.id,label,kind==='project'?parent:null,kind==='campaign'?parent:null,phase]);
   await db.query(`insert into public.${kind}_subtasks(id,${kind}_id,title,assignee_id,workflow_phase_id,status) values($1,$2,'Dev Tools fixture subtask',$3,$4,'todo')`,[sub,parent,assignee.id,phase]);
   parents.push({kind,id:parent,owner});tasks.push(task);subs.push({kind,id:sub});phases.push(phase);
  }
  const snapshot=async()=>{
   const out={};
   for(const [table,ids] of [['projects',parents.filter(p=>p.kind==='project').map(p=>p.id)],['campaigns',parents.filter(p=>p.kind==='campaign').map(p=>p.id)],['tasks',tasks],['project_subtasks',subs.filter(p=>p.kind==='project').map(p=>p.id)],['campaign_subtasks',subs.filter(p=>p.kind==='campaign').map(p=>p.id)]]){
    out[table]=(await db.query(`select id from public.${table} where id=any($1::uuid[]) order by id`,[ids])).rows.map(r=>r.id);
   }
   const {rows:[{v}]}=await db.query('select public.workflow_hub_index() v');
   out.workflow=v.filter(t=>parents.some(p=>p.id===t.entity_id)).map(t=>({id:t.entity_id,phases:t.phases.map(p=>p.id).sort()})).sort((x,y)=>x.id.localeCompare(y.id));
   out.notifications=(await db.query('select id from public.notifications where id=any($1::uuid[]) order by id',[notifications])).rows.map(r=>r.id);
   const {rows:[summary]}=await db.query('select public.dashboard_notification_summary() v');
   out.summaryItems=(summary.v.items||[]).filter(n=>notifications.includes(n.id)).map(n=>({id:n.id,user_id:n.user_id}));
   return out;
  };
  for(const p of [a1,a2,staffA,b1,b2,staffB,manager]){
   const real=await as(p,snapshot);
   await as(admin,async()=>{
    eq((await start(p)).actor.id,p.id,'server confirms selected identity');eq(Number(await actor()),p.id,'RLS effective actor');
    eq(await snapshot(),real,'Dev Tools exactly matches actual role across parents/tasks/subtasks/phases');await stop();eq(Number(await actor()),admin.id,'restore real Admin');
   });
  }
  const aProject=parents[0],aCampaign=parents[1];
  eq((await as(a1,snapshot)).projects,[aProject.id],'peer Leader sees entire own team despite foreign requester label');
  eq((await as(b2,snapshot)).projects,[parents[2].id],'foreign legacy Leader remains isolated');
  for(const p of [aProject,aCampaign])await db.query(`insert into public.${p.kind}_members(${p.kind}_id,user_id,workflow_role) values($1,$2,'sub_pic')`,[p.id,b1.id]);
  const invited=await as(b1,snapshot);
  await as(admin,async()=>{await start(b1);eq(await snapshot(),invited,'personal PIC/Sub-PIC invitation works in Dev Tools');await stop();await start(b2);eq((await snapshot()).projects,[parents[2].id],'personal invite never spreads to foreign peer');await stop();});
  for(const p of [aProject,aCampaign])await db.query(`delete from public.${p.kind}_members where ${p.kind}_id=$1 and user_id=$2`,[p.id,b1.id]);
  const revoked=await as(b1,snapshot);
  await as(admin,async()=>{await start(b1);eq(await snapshot(),revoked,'revoked invite has same scope as real account');});
  await as(admin,stop);
  for(const p of [a1,staffA,manager])await as(p,()=>denied(()=>start(admin)));
  await as(null,()=>denied(()=>start(admin)));
  await as(admin,()=>denied(()=>start(a1)),randomUUID());
  await as(admin,async()=>{
   await start(a1);await denied(()=>db.query('select * from dashboard_private.admin_preview_sessions'));
   await denied(()=>db.query('select dashboard_private.preview_require_admin()'));
   const {rows:[created]}=await db.query("insert into public.projects(workspace_id,name,created_by,department_id) values($1,'Dev Tools created fixture',$2,$3) returning id,created_by",[space.id,a1.id,deptA]);
   eq(Number(created.created_by),a1.id,'Leader create writes effective provenance');
   await start(staffA);
   await denied(()=>db.query("insert into public.projects(workspace_id,name,created_by,department_id) values($1,'Denied Staff fixture',$2,$3)",[space.id,staffA.id,deptA]));
   await denied(()=>db.query("update public.users set role='admin' where id=$1",[staffA.id]));
   const done=await db.query("update public.tasks set status='completed' where id=$1 returning id",[tasks[0]]);eq(done.rowCount,1,'selected Staff can complete assigned task');
   await denied(()=>db.query("select register_dashboard_push('https://fcm.googleapis.com/no-device','bad','bad','https://fixture.invalid')"));
  });
  const sid2=randomUUID();await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid2,admin.auth]);
  await as(admin,async()=>eq(Number(await actor()),admin.id,'another real Admin session is unaffected'),sid2);
  await as(admin,async()=>eq(Number(await actor()),staffA.id,'original Auth session keeps selected Staff'));
  await db.query("update dashboard_private.admin_preview_sessions set expires_at=now()-interval '1 second' where session_id=$1",[admin.sid]);
  await as(admin,async()=>{eq(await actor(),null,'expiry fails closed');eq((await snapshot()).projects,[],'expired preview cannot fall back to Admin reads');eq((await db.query('select admin_preview_status() v')).rows[0].v.requires_reset,true,'status requires reset');await stop();eq(Number(await actor()),admin.id,'explicit restore after expiry');});
  await as(admin,()=>start(staffA));await db.query('update public.users set is_active=false where id=$1',[staffA.id]);
  await as(admin,async()=>{eq(await actor(),null,'inactive target fails closed');await stop();eq(Number(await actor()),admin.id,'original Admin recovers from deactivated target');});
  await as(admin,()=>start(a1));await db.query("update public.users set role='leader',employment_level='Leader',department_id=$2 where id=$1",[admin.id,deptB]);
  await as(admin,async()=>{eq(await actor(),null,'real Admin demotion revokes test context');await denied(()=>start(manager));await stop();eq(Number(await actor()),admin.id,'stop restores only real current Leader identity');eq((await snapshot()).projects,[parents[2].id],'restored demoted Admin has no global read bypass');});
  await db.query("update public.users set role='admin',employment_level='ADMIN',department_id=null where id=$1",[admin.id]);
  await as(admin,()=>start(a1));await db.query('delete from auth.sessions where id=$1',[admin.sid]);
  await as(admin,async()=>{eq(await actor(),null,'revoked Auth session never regains Admin via context cascade');await denied(stop);});
  const {rows:[audit]}=await db.query('select count(*)::int n from dashboard_private.admin_preview_audit where admin_id=$1',[admin.id]);assert.ok(audit.n>10);checks++;
  console.log(`PASS ${checks} real local Dev Tools scope assertions; all fixtures and migration rolled back.`);
 }finally{await db.query('rollback').catch(()=>{});await db.end();}
});
