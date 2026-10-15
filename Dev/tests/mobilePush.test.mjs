import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(){
 const events={},shown=[],opened=[],navigated=[];
 const client={url:'https://dashboard.example/my-tasks',navigate:async url=>navigated.push(url),focus:async()=>{}};
 const self={location:{origin:'https://dashboard.example'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:()=>{},registration:{showNotification:async(...args)=>shown.push(args)},clients:{claim:async()=>{},matchAll:async()=>[client],openWindow:async url=>opened.push(url)}};
 vm.runInNewContext(script,{self,URL});return {events,shown,opened,navigated};
}
test('push shows a system notification with same-origin task target and stable dedup tag',async()=>{
 const w=worker();let done;
 w.events.push({data:{json:()=>({body:'Task mới',url:'/tasks?task=ps-123',tag:'notification-abc'})},waitUntil:p=>done=p});await done;
 assert.equal(w.shown[0][0],'K COFFEE');assert.equal(w.shown[0][1].data.url,'https://dashboard.example/tasks?task=ps-123');assert.equal(w.shown[0][1].tag,'notification-abc');
});
test('notification payload cannot redirect a device to another origin',async()=>{
 const w=worker();let done;
 w.events.push({data:{json:()=>({url:'https://evil.example/task'})},waitUntil:p=>done=p});await done;
 assert.equal(w.shown[0][1].data.url,'https://dashboard.example/my-tasks');
});
test('notification click opens the exact deep link in the installed app window',async()=>{
 const w=worker();let done,closed=false;
 w.events.notificationclick({notification:{data:{url:'https://dashboard.example/projects?campaign=abc'},close:()=>closed=true},waitUntil:p=>done=p});await done;
 assert.equal(closed,true);assert.deepEqual(w.navigated,['https://dashboard.example/projects?campaign=abc']);assert.equal(w.opened.length,0);
});
