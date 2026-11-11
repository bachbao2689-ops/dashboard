import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const runtimeFile=process.env.DASHBOARD_LOCAL_RUNTIME;
const migration=new URL('../supabase/migrations/20261110115545_leader_team_read_scope_consistency.sql',import.meta.url);
const subtaskCreateMigration=new URL('../supabase/migrations/20261111103000_staff_pic_subtask_create.sql',import.meta.url);

test('Leader scope: real local RLS, workflow RPC, all task sources, invite and revoke', {skip:!runtimeFile}, async () => {
  const runtime=JSON.parse(fs.readFileSync(runtimeFile,'utf8')).env;
  const url=new URL(runtime.DB_URL);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'integration test is LOCAL only');
  assert.equal(url.search,'');
  assert.equal(url.hash,'');
  const db=new pg.Client({connectionString:runtime.DB_URL,ssl:false,connectionTimeoutMillis:5000});
  const actors={};
  const parents=[];
  const taskRows=[];
  let checks=0;
  const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
  const rejects=async(fn,label)=>{
    await db.query('savepoint denied_insert');
    let error;
    try{await fn();}catch(caught){error=caught;}
    await db.query('rollback to savepoint denied_insert');
    assert.ok(error,label);
    eq(error.code,'42501',label);
  };
  const ids=rows=>rows.map(row=>String(row.id)).sort();
  const asActor=async (actor,fn) => {
    await db.query('reset role');
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(actor?{sub:actor.auth,role:'authenticated'}:{})]);
    await db.query('set local role authenticated');
    try{return await fn();}finally{await db.query('reset role');}
  };
  const snapshot=async actor=>asActor(actor,async()=>{
    const result={};
    for(const kind of ['project','campaign']){
      const subset=parents.filter(parent=>parent.kind===kind);
      result[kind]=ids((await db.query('select id from public.'+kind+'s where id=any($1::uuid[])',[subset.map(parent=>parent.id)])).rows);
    }
    for(const table of ['tasks','project_subtasks','campaign_subtasks']){
      result[table]=ids((await db.query('select id from public.'+table+' where id=any($1::uuid[])',[taskRows.filter(row=>row.table===table).map(row=>row.id)])).rows);
    }
    const {rows:[{data}]}=await db.query('select public.workflow_hub_index() as data');
    result.tracks=data.filter(track=>parents.some(parent=>parent.id===track.entity_id));
    return result;
  });
  await db.connect();
  try{
    await db.query('begin');
    await db.query(fs.readFileSync(migration,'utf8'));
    await db.query(fs.readFileSync(subtaskCreateMigration,'utf8'));
    const {rows:[workspace]}=await db.query('select id from public.workspaces limit 1');
    assert.ok(workspace,'local schema/data must be restored before running this test');
    const deptA=randomUUID(),deptB=randomUUID();
    await db.query('insert into public.departments(id,workspace_id,name) values($1,$3,$4),($2,$3,$5)',[deptA,deptB,workspace.id,'Scope fixture A','Scope fixture B']);
    let userId=-Math.floor(Date.now()/100);
    for(const [key,role,level,department,active] of [
      ['admin','admin','ADMIN',null,true],['manager','manager','Manager',null,true],
      ['a1','leader','Leader',deptA,true],['a2','leader','Leader',deptA,true],
      ['staffA','member','Staff',deptA,true],['staffPeerA','member','Staff',deptA,true],['formerA','member','Staff',deptA,false],
      ['b1','leader','Leader',deptB,true],['b2','leader','Leader',deptB,true],
      ['legacyB','manager','Leader',deptB,true],['staffB','member','Staff',deptB,true],
      ['noDept','leader','Leader',null,true],['inactive','leader','Leader',deptA,false],
    ]){
      const auth=randomUUID(),id=userId--;
      await db.query('insert into public.users(id,email,name,role,employment_level,department_id,is_active,auth_id) values($1,$2,$3,$4,$5,$6,$7,$8)',[id,auth+'@scope-fixture.invalid','Scope fixture '+key,role,level,department,active,auth]);
      actors[key]={id,auth};
    }
    const parent=async(kind,key,creator,label,lead)=>{
      const id=randomUUID();
      const values=[id,workspace.id,'Scope fixture '+key,actors[creator].id,label];
      if(kind==='project')await db.query("insert into public.projects(id,workspace_id,name,created_by,department_id,status) values($1,$2,$3,$4,$5,'active')",values);
      else await db.query("insert into public.campaigns(id,workspace_id,name,created_by,department_id,lead_id,status) values($1,$2,$3,$4,$5,$6,'active')",[...values,lead?actors[lead].id:null]);
      await db.query('insert into public.workflow_tracks(entity_type,entity_id) values($1,$2) on conflict(entity_type,entity_id) do nothing',[kind,id]);
      const {rows:[track]}=await db.query('select id from public.workflow_tracks where entity_type=$1 and entity_id=$2',[kind,id]);
      const phase=randomUUID();
      await db.query("insert into public.workflow_phases(id,workflow_id,position,title,created_by,status) values($1,$2,1,'Scope fixture phase',$3,'todo')",[phase,track.id,actors[creator].id]);
      const row={kind,key,id,phase,track:track.id};
      parents.push(row);return row;
    };
    const aPeer=await parent('project','A peer','a2',deptB);
    const aStaff=await parent('project','A staff','staffA',deptB);
    const aAdmin=await parent('project','Admin with A PIC','admin',deptB);
    const aFormer=await parent('project','Former A owner','formerA',deptB);
    const bPeer=await parent('project','B peer','b1',deptA);
    const bAdmin=await parent('project','Admin with B PIC','admin',deptA);
    const aCampaign=await parent('campaign','A campaign','a2',deptB,'staffA');
    const bCampaign=await parent('campaign','B campaign','b1',deptA,'staffB');
    for(const [p,key] of [[aAdmin,'staffA'],[bAdmin,'b1']]){
      await db.query('insert into public.project_members(project_id,user_id,workflow_role) values($1,$2,\'pic\')',[p.id,actors[key].id]);
      await db.query("insert into public.activity_log(workspace_id,user_id,entity_type,entity_id,action,metadata) values($1,$2,'project',$3,'creation_details',$4)",[workspace.id,actors.admin.id,p.id,{primary_owner_id:actors[key].id}]);
    }
    const task=async(table,p,owner,custom={},unphased=false)=>{
      const id=randomUUID(),assignee=owner?actors[owner].id:null;
      if(table==='tasks')await db.query("insert into public.tasks(id,workspace_id,title,created_by,assignee_id,project_id,campaign_id,department_id,workflow_phase_id,status,workflow_status,custom_fields) values($1,$2,'Scope fixture task',$3,$4,$5,$6,$7,$8,'todo','planned',$9)",[id,workspace.id,actors[[bPeer,bAdmin,bCampaign].includes(p)?'staffB':'staffA'].id,assignee,p.kind==='project'?p.id:null,p.kind==='campaign'?p.id:null,[bPeer,bAdmin,bCampaign].includes(p)?deptA:deptB,unphased?null:p.phase,custom]);
      else await db.query('insert into public.'+table+'(id,'+p.kind+"_id,title,assignee_id,workflow_phase_id,status,custom_fields) values($1,$2,'Scope fixture subtask',$3,$4,'todo',$5)",[id,p.id,assignee,unphased?null:p.phase,custom]);
      const row={id,table,parent:p.id};taskRows.push(row);return row;
    };
    for(const p of parents){
      const owner=[bPeer,bAdmin,bCampaign].includes(p)?'staffB':'staffA';
      await task('tasks',p,owner);
      await task(p.kind+'_subtasks',p,owner);
      await task(p.kind+'_subtasks',p,null);
      await task('tasks',p,owner,{},true);
      await task(p.kind+'_subtasks',p,null,{},true);
    }
    const aParents=[aPeer,aStaff,aAdmin,aFormer,aCampaign],bParents=[bPeer,bAdmin,bCampaign];
    const expected=(rows,table)=>taskRows.filter(row=>row.table===table&&rows.some(p=>p.id===row.parent)).map(row=>row.id).sort();
    for(const actor of [actors.a1,actors.a2]){
      const snap=await snapshot(actor);
      eq(snap.project,aParents.filter(p=>p.kind==='project').map(p=>p.id).sort(),'Leader reads every peer/staff Project regardless requesting-department label');
      eq(snap.campaign,[aCampaign.id],'Leader reads own team Campaign');
      eq(snap.tracks.map(t=>t.entity_id).sort(),aParents.map(p=>p.id).sort(),'Workflow RPC and direct parent reads agree');
      eq(snap.tracks.flatMap(t=>t.phases.map(p=>p.id)).sort(),aParents.map(p=>p.phase).sort(),'Leader reads all team phases without phase membership');
      for(const table of ['tasks','project_subtasks','campaign_subtasks'])eq(snap[table],expected(aParents,table),'Leader task source scope: '+table);
    }
    for(const actor of [actors.b1,actors.b2,actors.legacyB]){
      const snap=await snapshot(actor);
      eq(snap.project,bParents.filter(p=>p.kind==='project').map(p=>p.id).sort(),'Foreign Leader cannot gain A Projects from department label');
      eq(snap.campaign,[bCampaign.id],'Foreign Campaign is isolated');
      eq(snap.tracks.map(t=>t.entity_id).sort(),bParents.map(p=>p.id).sort(),'Foreign Workflow is isolated');
      for(const table of ['tasks','project_subtasks','campaign_subtasks'])eq(snap[table],expected(bParents,table),'Foreign task source isolation: '+table);
    }
    const aRead=await snapshot(actors.a1);
    eq(aRead.tracks.find(t=>t.entity_id===aPeer.id).root,false,'Peer visibility is not parent root');
    eq(aRead.tracks.find(t=>t.entity_id===aPeer.id).phases[0].can_edit_tasks,false,'Peer visibility does not gain phase editing');
    const peerTask=taskRows.find(row=>row.table==='tasks'&&row.parent===aPeer.id);
    await asActor(actors.a1,async()=>{
      eq((await db.query("update public.tasks set title='Unauthorized edit' where id=$1",[peerTask.id])).rowCount,0,'Read-only peer Leader cannot edit phase task');
    });
    for(const role of ['sub_pic','pic']){
      await db.query('insert into public.project_members(project_id,user_id,workflow_role) values($1,$2,$3) on conflict(project_id,user_id) do update set workflow_role=excluded.workflow_role',[aPeer.id,actors.b1.id,role]);
      await db.query('insert into public.campaign_members(campaign_id,user_id,workflow_role) values($1,$2,$3) on conflict(campaign_id,user_id) do update set workflow_role=excluded.workflow_role',[aCampaign.id,actors.b1.id,role]);
      const invited=await snapshot(actors.b1),peer=await snapshot(actors.b2);
      const allowed=[...bParents,aPeer,aCampaign];
      eq(invited.tracks.map(t=>t.entity_id).sort(),allowed.map(p=>p.id).sort(),'Invited '+role+' reads full invited Workflow');
      for(const table of ['tasks','project_subtasks','campaign_subtasks'])eq(invited[table],expected(allowed,table),'Invited '+role+' sees all child work: '+table);
      eq(peer.tracks.map(t=>t.entity_id).sort(),bParents.map(p=>p.id).sort(),'A personal '+role+' invitation does not spread to peer Leader');
      eq(invited.tracks.find(t=>t.entity_id===aPeer.id).root,role==='pic','Only a PIC invitation grants root; Sub-PIC is read scope');
    }
    await db.query('delete from public.project_members where project_id=$1 and user_id=$2',[aPeer.id,actors.b1.id]);
    await db.query('delete from public.campaign_members where campaign_id=$1 and user_id=$2',[aCampaign.id,actors.b1.id]);
    const revoked=await snapshot(actors.b1);
    eq(revoked.tracks.map(t=>t.entity_id).sort(),bParents.map(p=>p.id).sort(),'Revoking invitations revokes parent and Workflow access');
    for(const table of ['tasks','project_subtasks','campaign_subtasks'])eq(revoked[table],expected(bParents,table),'Revoking invitations revokes child work: '+table);
    await db.query("insert into public.project_members(project_id,user_id,workflow_role) values($1,$2,'pic')",[aAdmin.id,actors.b1.id]);
    eq((await snapshot(actors.a1)).project.includes(aAdmin.id),true,'Primary A PIC preserves Admin-created project ownership after inviting a foreign PIC');
    eq((await snapshot(actors.b2)).project.includes(aAdmin.id),false,'A foreign secondary PIC does not open an Admin-created project to their peers');
    await db.query('delete from public.project_members where project_id=$1 and user_id=$2',[aAdmin.id,actors.b1.id]);
    // A Staff account explicitly assigned as a parent PIC must be able to
    // create legacy Project/Campaign subtasks and receive INSERT ... RETURNING.
    await db.query("insert into public.campaign_members(campaign_id,user_id,workflow_role) values($1,$2,'pic') on conflict(campaign_id,user_id) do update set workflow_role='pic'",[aCampaign.id,actors.staffA.id]);
    const picCreated=[];
    await asActor(actors.staffA,async()=>{
      const {rows:[projectSubtask]}=await db.query("insert into public.project_subtasks(project_id,title,assignee_id,due_date,priority) values($1,'PIC create regression',$2,current_date,'medium') returning id",[aAdmin.id,actors.staffA.id]);
      assert.ok(projectSubtask.id,'Staff Project PIC can insert and return the new subtask');checks++;
      picCreated.push({id:projectSubtask.id,table:'project_subtasks',parent:aAdmin.id});
      const {rows:[campaignSubtask]}=await db.query("insert into public.campaign_subtasks(campaign_id,title,assignee_id,due_date,priority,status) values($1,'PIC create regression',$2,current_date,'medium','planning') returning id",[aCampaign.id,actors.staffA.id]);
      assert.ok(campaignSubtask.id,'Staff Campaign PIC can insert and return the new subtask');checks++;
      picCreated.push({id:campaignSubtask.id,table:'campaign_subtasks',parent:aCampaign.id});
    });
    taskRows.push(...picCreated);
    await asActor(actors.staffPeerA,async()=>{
      await rejects(()=>db.query("insert into public.project_subtasks(project_id,title,priority) values($1,'Out of scope regression','medium') returning id",[aAdmin.id]),'Unassigned Staff outside the parent department cannot create Project subtask');
      await rejects(()=>db.query("insert into public.campaign_subtasks(campaign_id,title,priority,status) values($1,'Out of scope regression','medium','planning') returning id",[aCampaign.id]),'Unassigned Staff outside the parent department cannot create Campaign subtask');
    });
    await asActor(actors.b1,async()=>{
      await rejects(()=>db.query("insert into public.project_subtasks(project_id,title,priority) values($1,'Foreign Leader create regression','medium') returning id",[aPeer.id]),'Foreign Leader cannot create by matching a department label alone');
      await rejects(()=>db.query("insert into public.campaign_subtasks(campaign_id,title,priority,status) values($1,'Foreign Leader create regression','medium','planning') returning id",[aCampaign.id]),'Foreign Leader cannot create Campaign subtask by matching department label alone');
    });
    const coTask=await task('tasks',bPeer,'staffB',{assignee_ids:[actors.staffA.id,'invalid-user-id']});
    const coSub=await task('project_subtasks',bPeer,'staffB',{assignee_ids:[String(actors.staffA.id)]});
    for(const actor of [actors.a1,actors.a2,actors.staffA]){
      const snap=await snapshot(actor);
      eq(snap.tasks.includes(coTask.id),true,'Primary or co-assigned team task is readable');
      eq(snap.project_subtasks.includes(coSub.id),true,'Co-assigned subtask is readable');
      if(actor!==actors.staffA)eq(snap.project.includes(bPeer.id),false,'A child assignment does not give the team Leader foreign parent access');
    }
    for(const actor of [actors.admin,actors.manager]){
      const snap=await snapshot(actor);
      eq(snap.project,parents.filter(p=>p.kind==='project').map(p=>p.id).sort(),'Global manager reads every fixture Project');
      eq(snap.campaign,parents.filter(p=>p.kind==='campaign').map(p=>p.id).sort(),'Global manager reads every fixture Campaign');
    }
    const queueId=randomUUID(),foreignLooseId=randomUUID();
    await db.query("insert into public.tasks(id,workspace_id,title,created_by,assignee_id,department_id,status) values($1,$3,'Scope queue',$4,null,$6,'todo'),($2,$3,'Scope foreign label',$5,$5,$6,'todo')",[queueId,foreignLooseId,workspace.id,actors.admin.id,actors.staffB.id,deptA]);
    taskRows.push({id:queueId,table:'tasks',parent:null},{id:foreignLooseId,table:'tasks',parent:null});
    const loose=await snapshot(actors.a1);
    eq(loose.tasks.includes(queueId),true,'An Admin-created unassigned queue belongs to its target department');
    eq(loose.tasks.includes(foreignLooseId),false,'A standalone task label does not expose another team\'s assigned work');
    for(const actor of [actors.inactive,actors.noDept,null]){
      const snap=await snapshot(actor);
      for(const table of ['project','campaign','tasks','project_subtasks','campaign_subtasks'])eq(snap[table],[],'Unassigned/inactive/anonymous actor is denied: '+table);
      eq(snap.tracks,[],'Unassigned/inactive/anonymous actor has no workflow data');
    }
    const {rows:[acl]}=await db.query("select has_function_privilege('authenticated','dashboard_private.work_parent_owner_department(text,uuid)','execute') as owner_helper,has_function_privilege('authenticated','public.workflow_task_access_for(uuid,boolean,bigint)','execute') as arbitrary_actor");
    eq(acl,{owner_helper:false,arbitrary_actor:false},'Authenticated clients cannot call internal arbitrary-actor helpers');
    console.log('PASS: '+checks+' real local RLS/RPC assertions; synthetic fixtures and migration rolled back.');
  }finally{
    await db.query('rollback');
    await db.end();
  }
});
