import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackendFetch,withDeadline,authFailureMessage,BACKEND_BUSY_MESSAGE} from '../src/lib/backendRequest.ts';

test('failed backend enters a cooldown without repeating requests or writes',async()=>{
 let calls=0,now=100;
 const request=createBackendFetch(async()=>{calls++;return new Response('{}',{status:calls===1?503:200});},{now:()=>now,retryMs:500});
 assert.equal((await request('https://backend.invalid/rest/v1/tasks',{method:'POST',body:'{}'})).status,503);
 await assert.rejects(request('https://backend.invalid/auth/v1/token'),/Máy chủ/);assert.equal(calls,1);
 now=601;assert.equal((await request('https://backend.invalid/auth/v1/token')).status,200);assert.equal(calls,2);
});
test('a stalled request is physically aborted and cannot occupy a connection forever',async()=>{
 let aborted=false;
 const request=createBackendFetch(async(_input,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>{aborted=true;reject(init.signal.reason);})),{timeoutMs:5});
 await assert.rejects(request('https://backend.invalid/rest/v1/users'),/Máy chủ/);assert.equal(aborted,true);
});
test('navigation cancellation does not mark a healthy backend as unavailable',async()=>{
 const abort=new AbortController();abort.abort();let calls=0;
 const request=createBackendFetch(async(_input,init)=>{calls++;if(init.signal.aborted)throw new DOMException('Aborted','AbortError');return new Response('{}');});
 await assert.rejects(request('https://backend.invalid/rest/v1/tasks',{signal:abort.signal}));
 assert.equal((await request('https://backend.invalid/rest/v1/tasks')).status,200);assert.equal(calls,2);
});
test('auth waits are bounded; infrastructure errors differ from invalid credentials',async()=>{
 await assert.rejects(withDeadline(new Promise(()=>{}),5),/Máy chủ/);
 assert.equal(authFailureMessage({status:504,message:'context deadline exceeded'}),BACKEND_BUSY_MESSAGE);
 assert.equal(authFailureMessage({code:'invalid_credentials'}),'Email hoặc mật khẩu không đúng.');
});
