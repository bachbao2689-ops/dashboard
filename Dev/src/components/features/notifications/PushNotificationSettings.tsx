import {useEffect,useState} from 'react';
import {BellRing} from 'lucide-react';
import {useAuthStore} from '../../../store/authStore';
import {useUiStore} from '../../../store/uiStore';
import {disablePush,enablePush,getPushConfiguration,isIOS,isStandalone,supportsPush,syncPush,testPush} from '../../../services/pushNotifications';
import '../../../styles/push-notifications.css';

export function PushNotificationSettings({hideWhenEnabled=false}:{hideWhenEnabled?:boolean}){
 const user=useAuthStore(s=>s.user),lang=useUiStore(s=>s.lang);
 const [config,setConfig]=useState<Awaited<ReturnType<typeof getPushConfiguration>>>(null);
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [ready,setReady]=useState(false);
 const vi=lang!=='en',needsInstall=isIOS()&&!isStandalone(),supported=supportsPush();
 useEffect(()=>{
  let active=true;setEnabled(false);setReady(false);setMessage('');
  if(user&&user.id!=='dev-admin-id')void getPushConfiguration().then(async cfg=>{
   if(!active)return;setConfig(cfg);
   if(supported&&cfg?.enabled&&cfg.origins.includes(location.origin)){
    try{const on=await syncPush(user.id);if(active)setEnabled(on);}catch{if(active)setMessage(vi?'Chưa kết nối được thông báo. Bấm bật để thử lại.':'Unable to connect. Enable to retry.');}
   }
  }).catch(()=>{if(active)setConfig(null);}).finally(()=>{if(active)setReady(true);});
  return()=>{active=false;};
 },[user?.id,supported,vi]);
 const run=async(action:'enable'|'disable'|'test')=>{
  if(busy||!user)return;setBusy(true);setMessage('');
  try{
   if(action==='enable'&&config){await enablePush(config.publicKey,user.id);setEnabled(true);setMessage(vi?'Đã bật thông báo cho thiết bị này.':'Notifications enabled on this device.');}
   if(action==='disable'){await disablePush();setEnabled(false);}
   if(action==='test'){await testPush();setMessage(vi?'Đã gửi thông báo thử đến các thiết bị đã bật.':'Test notification queued for your enabled devices.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Chưa kết nối được thông báo.');}
  finally{setBusy(false);}
 };
 const available=Boolean(ready&&config?.enabled&&config.origins.includes(location.origin));
 // Avoid flashing the setup card while checking an already registered device.
 if(hideWhenEnabled&&(!ready||enabled))return null;
 return <section className="push-settings" aria-label={vi?'Thông báo trên thiết bị':'Device notifications'}>
  <div className="push-settings-title"><BellRing size={16}/><strong>{vi?'Thông báo trên thiết bị':'Device notifications'}</strong></div>
  <p className="push-settings-note">{needsInstall?(vi?'iPhone: Chia sẻ → Thêm vào Màn hình chính. Mở từ icon rồi bật thông báo.':'iPhone: Share → Add to Home Screen. Open the app icon, then enable notifications.'):!supported?(vi?'Trình duyệt này chưa hỗ trợ push. Hãy dùng Safari trên iPhone hoặc Chrome/Edge trên Desktop.':'Push is unavailable in this browser. Use the installed app on iPhone or Chrome/Edge on desktop.'):!ready?(vi?'Đang kiểm tra kết nối…':'Checking connection…'):!available?(vi?'Thông báo thiết bị chưa được mở cho môi trường này.':'Device notifications are not enabled for this environment.'):(vi?'Nhận task được giao, @ nhắc tên và nhắc report khi đã đóng Dashboard.':'Receive assignments, mentions and report reminders while Dashboard is closed.')}</p>
  {supported&&!needsInstall&&available&&<div className="push-settings-actions">
   <button type="button" className="push-settings-primary" disabled={busy} onClick={()=>void run(enabled?'test':'enable')}>{busy?(vi?'Đang xử lý…':'Working…'):enabled?(vi?'Gửi thử':'Send test'):(vi?'Bật thông báo':'Enable notifications')}</button>
   {enabled&&<button type="button" className="push-settings-secondary" disabled={busy} onClick={()=>void run('disable')}>{vi?'Tắt trên thiết bị này':'Disable on this device'}</button>}
  </div>}
  {message&&<p className="push-settings-note" role="status">{message}</p>}
 </section>;
}
