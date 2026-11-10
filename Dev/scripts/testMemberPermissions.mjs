import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {workflowDbClient} from './workflowDbClient.mjs';
const db=workflowDbClient();await db.connect();let checks=0;
try{
 await db.query('begin');
 const {rows:[department]}=await db.query('select id from public.departments order by id limit 1');
 assert.ok(department,'Local department fixture required');
 const person=async(role,level)=>{
  const auth=randomUUID();
  const {rows:[p]}=await db.query('insert into public.users(name,email,auth_id,role,employment_level,is_active) values($1,$2,$3,$4,$5,true) returning id,auth_id',
   ['[QA rollback] '+role,auth+'@example.invalid',auth,role,level]);return p;
 };
 const admin=await person('admin','ADMIN'),staff=await person('member','Nhân viên'),manager=await person('manager','Manager');
 const as=async p=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[p.auth_id]);await db.query('set local role authenticated');};
 const rejects=async(fn,code)=>{await db.query('savepoint permission_failure');let error;try{await fn();}catch(e){error=e;}await db.query('rollback to savepoint permission_failure');assert.ok(error,'Must reject unauthorized request');if(code)assert.equal(error.code,code);checks++;};
 await as(admin);
 const {rows:[member]}=await db.query("insert into public.users(name,email,role,employment_level,is_active) values($1,$2,'member','Nhân viên',true) returning id,auth_id,department_id,role",['[QA rollback] Created account',randomUUID()+'@example.invalid']);
 assert.equal(member.role,'member');assert.equal(member.department_id,null);assert.equal(member.auth_id,null);checks++;
 const save=(who,role,dept=department.id)=>db.query('select public.account_set_member_permissions($1,$2,$3,$4) id',[who.id,role,dept,'QA role']);
 assert.equal((await save(member,'leader')).rows[0].id,member.id);checks++;
 const {rows:[saved]}=await db.query('select role,employment_level,department_id,auth_id,is_active from public.users where id=$1',[member.id]);
 assert.equal(saved.role,'leader');assert.equal(saved.employment_level,'Leader');assert.equal(saved.department_id,department.id);assert.equal(saved.auth_id,null);assert.equal(saved.is_active,true);checks++;
 await rejects(()=>save(member,'leader',randomUUID()),'22023');
 await rejects(()=>save(member,'member',null),'22023');
 await rejects(()=>save(admin,'member'),'42501');
 await rejects(()=>db.query("update public.users set role='admin' where id=$1",[member.id]),'42501');
 await as(staff);
 await rejects(()=>save(member,'admin'),'42501');
 await rejects(()=>save(staff,'admin'),'42501');
 await as(manager);
 await rejects(()=>save(member,'admin'),'42501');
 await rejects(()=>save(admin,'member'),'42501');
 assert.equal((await save(member,'member')).rows[0].id,member.id);checks++;
 await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub','',true)");await db.query('set local role anon');
 await rejects(()=>save(member,'admin'),'42501');
 console.log('PASS: '+checks+' local DB checks: create -> assign, exact identity, valid department, Staff/Manager/Admin/anon boundaries and direct-write denial. All fixtures rolled back.');
}finally{await db.query('rollback').catch(()=>{});await db.end();}
