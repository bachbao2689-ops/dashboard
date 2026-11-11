import test from 'node:test';import assert from 'node:assert/strict';
import {startAdminPreview,stopAdminPreview,readAdminPreview,authSessionIdentity} from '../src/services/adminPreview.ts';
const actor={id:8,role:'leader',department_id:'D'};const good={active:true,actor,expires_at:new Date(Date.now()+1800000).toISOString()};
const fake=(results)=>{const calls=[];return {calls,rpc:async(name,args)=>{calls.push({name,args});return results.shift()||{data:null,error:null};}};};
test('switch uses server-authenticated effective actor and expiry, never only local profile',async()=>{
 const db=fake([{data:good,error:null}]);assert.deepEqual(await startAdminPreview(db,8),good);assert.deepEqual(db.calls,[{name:'admin_preview_start',args:{p_actor:8}}]);
});
test('untrusted role ids, rejected switch and mismatched response cannot become a preview',async()=>{
 await assert.rejects(startAdminPreview(fake([]),NaN),/tài khoản/);
 await assert.rejects(startAdminPreview(fake([{error:{code:'42501'}}]),8),/Admin đăng nhập thật/);
 await assert.rejects(startAdminPreview(fake([{data:{...good,actor:{id:9}}}]),8),/backend/);
});
test('restore failure remains an error and expiration requires server reset before restoring Admin',async()=>{
 await assert.rejects(stopAdminPreview(fake([{error:new Error('Offline')}])));
 const db=fake([{data:{requires_reset:true}},{data:null,error:null}]);assert.deepEqual(await readAdminPreview(db),{active:false});assert.deepEqual(db.calls.map(c=>c.name),['admin_preview_status','admin_preview_stop']);
 const failed=fake([{data:{requires_reset:true}},{error:new Error('Offline')}]);await assert.rejects(readAdminPreview(failed));
});
test('missing schema, malformed responses and transport errors fail closed',async()=>{
 await assert.rejects(readAdminPreview(fake([{error:{code:'PGRST202'}}])));
 await assert.rejects(readAdminPreview(fake([{data:null,error:null}])),/scope/);
 await assert.rejects(readAdminPreview(fake([{data:{...good,expires_at:'bad'}}])),/phiên/);
 await assert.rejects(startAdminPreview(fake([{data:{...good,expires_at:'2000-01-01'}}]),8),/backend/);
 await assert.rejects(readAdminPreview(fake([{error:new Error('Offline')}])))
});
test('token rotation preserves a session; a new login for the same Admin changes scope',()=>{
 const session=(sid,exp)=>({user:{id:'admin'},access_token:'header.'+btoa(JSON.stringify({session_id:sid,exp}))+'.signature'});
 assert.equal(authSessionIdentity(session('one',1)),authSessionIdentity(session('one',2)));
 assert.notEqual(authSessionIdentity(session('one',1)),authSessionIdentity(session('two',1)));
 assert.equal(authSessionIdentity(null),null);
});
