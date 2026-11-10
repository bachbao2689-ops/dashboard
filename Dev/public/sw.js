/* No page/data cache: deployment updates cannot retain a stale Dashboard shell. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Receipt cache holds notification IDs only, never page or task content.
const RECEIPTS='dashboard-push-receipts-v1', RECEIPT_TTL=24*60*60*1000;
let pushFlight=Promise.resolve();
async function displayPush(event){
 let payload={};try{payload=event.data?.json()||{};}catch{payload={};}
 if(!payload||typeof payload!=='object')payload={};
 let target;try{target=new URL(typeof payload.url==='string'?payload.url:'/my-tasks',self.location.origin);}catch{target=new URL('/my-tasks',self.location.origin);}
 const url=target.origin===self.location.origin?target.href:self.location.origin+'/my-tasks';
 const id=typeof payload.notificationId==='string'?payload.notificationId:'';
 const tag=id?`notification-${id}`:payload.tag||'dashboard-notification';
 let receipts,key;
 try{
  if(id){
   receipts=await caches.open(RECEIPTS);
   key=new URL('/__push_receipts__/'+encodeURIComponent(id),self.location.origin).href;
   const receipt=await receipts.match(key);
   if(receipt&&Date.now()-Number(await receipt.text())<RECEIPT_TTL)return;
  }
 }catch{receipts=undefined;}
 // Also protects an already displayed notification if receipt storage is unavailable.
 if(id&&(await self.registration.getNotifications({tag})).length)return;
 await self.registration.showNotification('Phuc Sinh Consumers',{
  body:payload.body||'Bạn có thông báo mới.',icon:'/pwa-192.png',badge:'/pwa-192.png',
  tag,renotify:false,data:{url,notificationId:id},
 });
 if(receipts&&key)try{
  await receipts.put(key,new Response(String(Date.now())));
  const keys=await receipts.keys();
  for(const old of keys.slice(0,Math.max(0,keys.length-256)))await receipts.delete(old);
 }catch{/* A successful display must not fail because local storage is full. */}
}
self.addEventListener('push',event=>{
 pushFlight=pushFlight.catch(()=>{}).then(()=>displayPush(event));
 event.waitUntil(pushFlight);
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/my-tasks',self.location.origin);
 if(target.origin!==self.location.origin)return;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(existing){await existing.navigate(target.href);await existing.focus();}
  else await self.clients.openWindow(target.href);
 })());
});
