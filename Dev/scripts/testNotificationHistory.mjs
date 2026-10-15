import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {workflowDbClient} from './workflowDbClient.mjs';

const db=workflowDbClient();let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
try{
 await db.connect();await db.query('begin');
 await db.query(fs.readFileSync(new URL('../supabase/migrations/20261015140000_notification_history.sql',import.meta.url),'utf8'));
 const actors=(await db.query('select id,auth_id from users where is_active and auth_id is not null order by id limit 2')).rows;
 assert(actors.length===2,'Two active staff fixtures are required');
 const [actor,other]=actors;
 const ids=[];
 // pg_net and all fixture/read updates stay inside this rolled-back transaction.
 for(let i=0;i<14;i++){
  const row=(await db.query("insert into notifications(user_id,type,message,entity_type,entity_id,is_read,created_at) values($1,'task_assigned','[QA rollback] history','project_subtask',$2,$3,now()+interval '1 day'+$4*interval '1 second') returning id",[actor.id,randomUUID(),i===13,i])).rows[0];
  ids.unshift(row.id);
 }
 const outsider=(await db.query("insert into notifications(user_id,type,message,entity_type,entity_id,created_at) values($1,'task_assigned','[QA rollback] other user','task',$2,now()+interval '2 days') returning id",[other.id,randomUUID()])).rows[0].id;
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor.auth_id]);
 await db.query('set local role authenticated');
 const summary=async()=>(await db.query('select dashboard_notification_summary() data')).rows[0].data;
 const before=await summary();
 check(before.items.map(item=>item.id),ids.slice(0,12),'History includes read and unread, newest first, capped at 12');
 check(before.items[0].is_read,true,'Already read items remain visible');
 check(before.items.some(item=>item.id===outsider),false,'Other staff notifications excluded');
 check(before.unread>=13,true,'Unread total includes items outside the recent list');
 await db.query('update notifications set is_read=true,read_at=now() where user_id=$1 and id=$2',[actor.id,ids[1]]);
 const single=await summary();
 check(single.items.map(item=>item.id),before.items.map(item=>item.id),'Opening one item preserves the list');
 check(single.unread,before.unread-1,'Opening one item reduces unread count');
 await db.query('update notifications set is_read=true,read_at=now() where user_id=$1 and not is_read',[actor.id]);
 const after=await summary();
 check(after.items.map(item=>item.id),before.items.map(item=>item.id),'Mark all read preserves history after reloading summary');
 check(after.items.every(item=>item.is_read),true,'All recent entries marked read');
 check(after.unread,0,'Bell badge clears');
 check([after.counts.tasksCount,after.counts.workflowCount,after.counts.projectCount,after.counts.profileCount,after.counts.departmentCount],[0,0,0,0,0],'Unread sidebar badges clear independently of history');
 check(after.items[0].entity_type,'project_subtask','Task navigation entity preserved');
 check(after.items[0].entity_id,before.items[0].entity_id,'Task navigation identifier preserved');
 await db.query('reset role');
 check((await db.query('select is_read from notifications where id=$1',[outsider])).rows[0].is_read,false,'Mark all never changes another recipient');
 check((await db.query("select prosecdef from pg_proc where oid='dashboard_notification_summary()'::regprocedure")).rows[0].prosecdef,false,'Summary retains caller RLS');
 check((await db.query("select has_function_privilege('anon','dashboard_notification_summary()','execute') allowed")).rows[0].allowed,false,'Anonymous access denied');
 console.log(`Notification history: ${checks} checks passed; all fixtures/read changes rolled back.`);
}finally{await db.query('rollback').catch(()=>{});await db.end();}
