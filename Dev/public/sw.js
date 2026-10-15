/* No page/data cache: deployment updates cannot retain a stale Dashboard shell. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{payload={body:'Bạn có thông báo mới.'};}
 const raw=typeof payload.url==='string'?payload.url:'/my-tasks';
 const target=new URL(raw,self.location.origin);
 const url=target.origin===self.location.origin?target.href:self.location.origin+'/my-tasks';
 event.waitUntil(self.registration.showNotification(payload.title||'K COFFEE',{
  body:payload.body||'Bạn có thông báo mới.',icon:'/pwa-192.png',badge:'/pwa-192.png',
  tag:payload.tag||'dashboard-notification',data:{url,notificationId:payload.notificationId},
 }));
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
