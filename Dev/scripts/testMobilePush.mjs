import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createECDH} from 'node:crypto';
import {workflowDbClient} from './workflowDbClient.mjs';
const db=workflowDbClient();let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
try{
 await db.connect();await db.query('begin');
 await db.query(fs.readFileSync(new URL('../supabase/migrations/20261015090000_mobile_push.sql',import.meta.url),'utf8'));
 await db.query(fs.readFileSync(new URL('../supabase/migrations/20261015140000_notification_history.sql',import.meta.url),'utf8'));
 const actors=(await db.query('select distinct on (u.id) u.id,u.auth_id,s.id session_id from users u join auth.sessions s on s.user_id=u.auth_id where u.is_active order by u.id,s.created_at desc limit 2')).rows;
 assert(actors.length>=2,'Two signed-in staff fixtures are required');
 const [a,b]=actors,origin='https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app';
 const ecdh=createECDH('prime256v1');ecdh.generateKeys();
 // Use an unreachable loopback worker in this transaction; net work is rolled back.
 await db.query('insert into dashboard_push_config(id,public_key,private_key,webhook_secret,worker_url,subject,allowed_origins,enabled) values(true,$1,$2,$3,$4,$5,$6,true) on conflict(id) do update set enabled=true,allowed_origins=excluded.allowed_origins,worker_url=excluded.worker_url',
 [ecdh.getPublicKey().toString('base64url'),ecdh.getPrivateKey().toString('base64url'),'qa-rollback','https://example.invalid/push','https://example.invalid',[origin]]);
 const auth=async person=>{await db.query('reset role');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:person.auth_id,role:'authenticated',session_id:person.session_id})]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[person.auth_id]);await db.query('set local role authenticated');};
 const rejected=async(sql,args=[])=>{await db.query('savepoint denied');let denied=false;try{await db.query(sql,args);}catch{denied=true;}await db.query('rollback to savepoint denied');check(denied,true,'Unauthorized/invalid action rejected');};
 await auth(a);
 await rejected('select private_key from dashboard_push_config');
 await rejected('select * from push_subscriptions');
 await rejected('select claim_dashboard_push()');
 await rejected("select register_dashboard_push('https://evil.invalid/push','x','y',$1)",[origin]);
 const endpoint='https://web.push.apple.com/qa-'+randomUUID();
 const sub=(await db.query('select register_dashboard_push($1,$2,$3,$4) id',[endpoint,ecdh.getPublicKey().toString('base64url'),'a'.repeat(22),origin])).rows[0].id;
 check(Boolean(sub),true,'Authenticated device registered');
 await auth(b);await db.query('select unregister_dashboard_push($1)',[endpoint]);
 await db.query('reset role');check((await db.query('select count(*)::int n from push_subscriptions where id=$1',[sub])).rows[0].n,1,'Other staff cannot revoke device');
 const notice=(await db.query("insert into notifications(user_id,type,message,entity_type,entity_id) values($1,'task_assigned','[QA rollback] push','task',$2) returning id",[a.id,randomUUID()])).rows[0].id;
 check((await db.query('select count(*)::int n from push_deliveries where notification_id=$1',[notice])).rows[0].n,1,'Notification queues exactly one device delivery');
 const rows=(await db.query('select claim_dashboard_push() data')).rows[0].data;
 const delivery=rows.find(row=>row.notification.id===notice);
 check(Boolean(delivery),true,'Active recipient claimed');
 check((await db.query('select claim_dashboard_push() data')).rows[0].data.some(row=>row.id===delivery.id),false,'Concurrent drain cannot claim leased item');
 await db.query('select finish_dashboard_push($1,503)',[delivery.id]);
 check((await db.query('select state from push_deliveries where id=$1',[delivery.id])).rows[0].state,'pending','Temporary failure retries');
 await db.query('update push_deliveries set next_attempt=now() where id=$1',[delivery.id]);
 await db.query('update notifications set is_read=true where id=$1',[notice]);await db.query('select claim_dashboard_push()');
 check((await db.query('select state from push_deliveries where id=$1',[delivery.id])).rows[0].state,'skipped','Read notifications suppressed');
 await auth(a);const summary=(await db.query('select dashboard_notification_summary() data')).rows[0].data;
 check(summary.items.some(item=>item.id===notice&&item.is_read),true,'Read item retained in recent notification history');
 await db.query('select unregister_dashboard_push($1)',[endpoint]);await db.query('reset role');
 check((await db.query('select count(*)::int n from push_subscriptions where id=$1',[sub])).rows[0].n,0,'Owner revokes device');
 console.log(`Mobile push: ${checks} checks passed; all data rolled back.`);
}finally{await db.query('rollback').catch(()=>{});await db.end();}
