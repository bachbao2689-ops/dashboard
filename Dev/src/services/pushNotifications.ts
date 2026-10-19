import {supabase} from './supabase';
function timeout<T>(promise:PromiseLike<T>,message:string,ms=10000):Promise<T>{
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
const ownerKey='kcoffee_push_owner';
export const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
export const supportsPush=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
/** Browser push registration can fail even when the Push API is present (e.g. Brave messaging disabled). */
export function pushErrorMessage(error:unknown,vi=true,brave=Boolean((navigator as Navigator&{brave?:unknown}).brave)){
 const message=error instanceof Error?error.message:String(error||'');
 const name=error instanceof Error?error.name:'';
 if(/push service|registration failed|push registration/i.test(message)||name==='AbortError'){
  if(brave)return vi
   ?'Brave chưa kết nối được dịch vụ thông báo. Vào Cài đặt → Quyền riêng tư và bảo mật → bật “Use Google services for push messaging”. Khởi động lại Brave rồi bấm “Bật thông báo” lần nữa. Nếu đã bật, hãy kiểm tra kết nối mạng.'
   :'Brave could not connect to its push service. Open Settings → Privacy and security → enable “Use Google services for push messaging”. Restart Brave and enable notifications again. If already enabled, check your network connection.';
  return vi?'Chưa kết nối được dịch vụ thông báo của trình duyệt. Kiểm tra mạng, VPN hoặc tiện ích chặn kết nối, rồi bấm “Bật thông báo” để thử lại.':'Could not connect to the browser push service. Check your network, VPN or connection-blocking extensions, then enable notifications again.';
 }
 if(name==='NotAllowedError')return vi?'Thông báo đang bị chặn. Mở quyền của trang web, cho phép Thông báo rồi thử lại.':'Notifications are blocked. Allow notifications in this site’s permissions, then try again.';
 return message||(vi?'Chưa kết nối được thông báo. Vui lòng thử lại.':'Unable to connect notifications. Please try again.');
}
let registration:Promise<ServiceWorkerRegistration>|undefined;
export function registerPushWorker(){
 if(!window.isSecureContext||!('serviceWorker' in navigator))return Promise.reject(new Error('Thiết bị chưa hỗ trợ thông báo web.'));
 registration??=timeout(navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready),'Chưa kết nối được dịch vụ thông báo. Hãy kiểm tra mạng và bấm bật lại.').catch(error=>{registration=undefined;throw error;});
 return registration;
}
export async function getPushConfiguration(){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
 let result;try{result=await supabase.rpc('dashboard_push_public_config').abortSignal(abort.signal);}finally{clearTimeout(timer);}
 const {data,error}=result;if(error)throw new Error(error.message||'Chưa tải được cấu hình thông báo.');return data as {publicKey:string;enabled:boolean;origins:string[]}|null;
}
async function saveSubscription(subscription:PushSubscription){
 const value=subscription.toJSON();
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
 try{const {error}=await supabase.rpc('register_dashboard_push',{p_endpoint:value.endpoint,p_p256dh:value.keys?.p256dh,p_auth:value.keys?.auth,p_origin:location.origin}).abortSignal(abort.signal);if(error)throw new Error(error.message||'Không lưu được đăng ký thông báo.');}finally{clearTimeout(timer);}
}
export async function enablePush(publicKey:string,authId:string){
 if(!supportsPush())throw new Error('Trình duyệt chưa hỗ trợ thông báo thiết bị.');
 // Permission must be requested directly from the tap, before any network await (iOS).
 const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt thiết bị.');
 const {data:session}=await supabase.auth.getSession();if(session.session?.user.id!==authId)throw new Error('Phiên đã thay đổi. Vui lòng bật lại thông báo.');
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
