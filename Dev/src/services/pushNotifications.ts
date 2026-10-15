import {supabase} from './supabase';
const ownerKey='kcoffee_push_owner';
export const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
export const supportsPush=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
let registration:Promise<ServiceWorkerRegistration>|undefined;
export function registerPushWorker(){
 if(!window.isSecureContext||!('serviceWorker' in navigator))return Promise.reject(new Error('Thiết bị chưa hỗ trợ thông báo web.'));
 registration??=navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).catch(error=>{registration=undefined;throw error;});
 return registration;
}
export async function getPushConfiguration(){
 const {data,error}=await supabase.rpc('dashboard_push_public_config');if(error)throw error;return data as {publicKey:string;enabled:boolean;origins:string[]}|null;
}
async function saveSubscription(subscription:PushSubscription){
 const value=subscription.toJSON();
 const {error}=await supabase.rpc('register_dashboard_push',{p_endpoint:value.endpoint,p_p256dh:value.keys?.p256dh,p_auth:value.keys?.auth,p_origin:location.origin});
 if(error)throw error;
}
export async function enablePush(publicKey:string,authId:string){
 // Permission must be requested directly from the tap, before any network await (iOS).
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt thiết bị.');
 const worker=await registerPushWorker();
 const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-publicKey.length%4)%4)),c=>c.charCodeAt(0));
 let subscription=await worker.pushManager.getSubscription();
 let created=false;
 if(!subscription){subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});created=true;}
 try{await saveSubscription(subscription);localStorage.setItem(ownerKey,authId);}
 catch(error){if(created)await subscription.unsubscribe();throw error;}
}
export async function syncPush(authId:string){
 if(!supportsPush())return false;
 const worker=await registerPushWorker(),subscription=await worker.pushManager.getSubscription();
 if(!subscription||Notification.permission!=='granted')return false;
 if(localStorage.getItem(ownerKey)!==authId){await subscription.unsubscribe();localStorage.removeItem(ownerKey);return false;}
 await saveSubscription(subscription);return true;
}
export async function disablePush(){
 if(!supportsPush())return;
 const worker=await registerPushWorker(),subscription=await worker.pushManager.getSubscription();
 if(subscription){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),5000);
  const {error}=await supabase.rpc('unregister_dashboard_push',{p_endpoint:subscription.endpoint}).abortSignal(abort.signal);
  clearTimeout(timer);
  // Unsubscribe locally even if offline. The server prunes 404/410 subscriptions.
  const removed=await subscription.unsubscribe();if(!removed&&error)throw error;
 }
 localStorage.removeItem(ownerKey);
}
export async function testPush(){
 const {data,error}=await supabase.functions.invoke('dashboard-push',{body:{action:'test'}});
 if(error)throw new Error('Chưa gửi được thông báo thử. Vui lòng thử lại sau một phút.');
 if(!data?.queued)throw new Error('Chưa gửi được thông báo thử.');
}
