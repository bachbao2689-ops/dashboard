import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedResource} from '../src/lib/sharedResource.ts';
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
test('twenty mounted consumers share one request and a stable snapshot',async()=>{
 let calls=0;const resource=createSharedResource(async()=>{calls++;return ['same'];});
 const releases=Array.from({length:20},()=>resource.subscribe('actor-a',()=>{}));
 await resource.refresh('actor-a');assert.equal(calls,1);assert.strictEqual(resource.getSnapshot('actor-a'),resource.getSnapshot('actor-a'));
 releases.forEach(release=>release());const stop=resource.subscribe('actor-a',()=>{});await flush();assert.equal(calls,1);stop();resource.reset();
});
test('separate Auth/role scopes never reuse task data',async()=>{
 const resource=createSharedResource(async key=>[key]);await resource.refresh('actor-a:member');await resource.refresh('actor-a:leader');
 assert.deepEqual(resource.getSnapshot('actor-a:member').data,['actor-a:member']);assert.deepEqual(resource.getSnapshot('actor-a:leader').data,['actor-a:leader']);resource.reset();
});
test('duplicate invalidation revisions coalesce and a real change during load is reread once',async()=>{
 let calls=0,release;let value=1;
 const resource=createSharedResource(async()=>{calls++;const snapshot=value;if(calls===1)await new Promise(resolve=>{release=resolve;});return snapshot;});
 const stop=resource.subscribe('actor',()=>{});await Promise.resolve();value=2;
 for(let i=0;i<20;i++)resource.invalidate('actor',42);
 release();await flush();await flush();assert.equal(calls,2);assert.equal(resource.getSnapshot('actor').data,2);stop();resource.reset();
});
test('logout reset discards a response from a previous session',async()=>{
 let release;const resource=createSharedResource(()=>new Promise(resolve=>{release=resolve;}));
 const pending=resource.refresh('old-session');await Promise.resolve();resource.reset();release(['private']);await pending;
 assert.equal(resource.getSnapshot('old-session').data,undefined);resource.reset();
});
test('an unsuccessful request keeps visible data with an error, never fake rows',async()=>{
 let fail=false;const resource=createSharedResource(async()=>{if(fail)throw new Error('offline');return ['real'];});
 await resource.refresh('actor');fail=true;await resource.refresh('actor');assert.deepEqual(resource.getSnapshot('actor').data,['real']);assert.equal(resource.getSnapshot('actor').error,'offline');resource.reset();
});
