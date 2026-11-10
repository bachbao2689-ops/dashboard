import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {notificationPayload} from '../supabase/functions/_shared/notificationPayload.ts';
const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(receipts=new Map(),fail=false){
 const listeners={},shown=[];
 const cache={async match(k){return receipts.has(k)?new Response(receipts.get(k)):undefined;},async put(k,r){receipts.set(k,await r.text());},async keys(){return [...receipts.keys()];},async delete(k){receipts.delete(k);}};
 vm.runInNewContext(sw,{self:{location:{origin:'https://dashboard.test'},addEventListener:(e,cb)=>listeners[e]=cb,skipWaiting(){},clients:{claim(){}},registration:{async getNotifications(){return [];},async showNotification(title,options){if(fail){fail=false;throw Error('transient display failure');}shown.push({title,...options});}}},URL,Response,Date,caches:{async open(){return cache;}}});
 return {shown,receipts,async push(payload){let promise;listeners.push({data:{json:()=>payload},waitUntil(p){promise=p;}});return promise;}};
}
test('push presents brand, actual task title, actor and exact subtask link',()=>{
 const p=notificationPayload({id:'1',type:'task_assigned',message:'ADMIN đã giao bạn công việc: Test',entity_type:'project_subtask',entity_id:'abc',metadata:{task_title:'Test',actor_name:'ADMIN'}});
 assert.equal(p.title,'Phuc Sinh Consumers');assert.equal(p.body,'Test\nADMIN đã giao bạn công việc');assert.equal(p.url,'/tasks?task=ps-abc');assert.doesNotMatch(JSON.stringify(p),/K COFFEE/);
});
test('legacy messages and phase deep links remain usable',()=>{
 assert.equal(notificationPayload({id:'2',message:'Nội dung cũ'}).body,'Nội dung cũ');
 assert.equal(notificationPayload({id:'3',entity_type:'project',entity_id:'p',metadata:{origin:'dashboard:v2',target:'workflow',phase_id:'f'}}).url,'/workflow?project=p&phase=f');
});
test('concurrent retry displays the same event once; separate tasks are retained',async()=>{
 const w=worker();await Promise.all([w.push({notificationId:'a',body:'A'}),w.push({notificationId:'a',body:'A'})]);await w.push({notificationId:'b',body:'B'});assert.equal(w.shown.length,2);assert.deepEqual(w.shown.map(n=>n.body),['A','B']);
});
test('receipt survives worker restart even when the notification was dismissed',async()=>{
 const w=worker();await w.push({notificationId:'a'});const restarted=worker(w.receipts);await restarted.push({notificationId:'a'});assert.equal(restarted.shown.length,0);
});
test('display failure is retryable and never marked delivered',async()=>{
 const w=worker(new Map(),true);await assert.rejects(w.push({notificationId:'a'}));assert.equal(w.receipts.size,0);await w.push({notificationId:'a'});assert.equal(w.shown.length,1);
});
test('worker normalizes legacy brand and rejects invalid or cross-origin navigation',async()=>{
 const w=worker();await w.push({notificationId:'a',title:'K COFFEE',url:'https://outside.test/'});await w.push({notificationId:'b',url:'http://['});for(const n of w.shown){assert.equal(n.title,'Phuc Sinh Consumers');assert.equal(n.data.url,'https://dashboard.test/my-tasks');assert.equal(n.renotify,false);}
});
test('receipt expiry permits later delivery and storage remains bounded',async()=>{
 const receipts=new Map([['https://dashboard.test/__push_receipts__/a',String(Date.now()-86400001)]]);for(let i=0;i<256;i++)receipts.set('https://dashboard.test/__push_receipts__/old'+i,'0');const w=worker(receipts);await w.push({notificationId:'a'});assert.equal(w.shown.length,1);assert.ok(receipts.size<=256);
});
