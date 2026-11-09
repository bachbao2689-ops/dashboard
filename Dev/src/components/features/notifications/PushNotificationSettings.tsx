import {useEffect} from 'react';
import {BellRing} from 'lucide-react';
import {useAuthStore} from '../../../store/authStore';
import {useUiStore} from '../../../store/uiStore';
import {isIOS,isStandalone,supportsPush,pushErrorMessage} from '../../../services/pushNotifications';
import '../../../styles/push-notifications.css';
import {useDevicePush,initializeDevicePush,changeDevicePush} from '../../../store/devicePushStore';
import toast from 'react-hot-toast';

export function PushNotificationSettings({hideWhenEnabled=false}:{hideWhenEnabled?:boolean}){
 const user=useAuthStore(s=>s.user),lang=useUiStore(s=>s.lang);
 const {config,enabled,busy,ready,message}=useDevicePush();
 const vi=lang!=='en',needsInstall=isIOS()&&!isStandalone(),supported=supportsPush();

 useEffect(()=>{if(user?.id)void initializeDevicePush(user.id);},[user?.id]);

 const run=async(action:'enable'|'disable'|'test')=>{
  if(!user)return;
  try{
   await changeDevicePush(action,user.id);
   if(action==='enable'){
     toast.success(vi?'Đã bật thông báo trên thiết bị này':'Notifications enabled on this device');
   }else if(action==='disable'){
     toast.success(vi?'Đã tắt thông báo trên thiết bị này':'Notifications disabled on this device');
   }else if(action==='test'){
     toast.success(vi?'Đã gửi thông báo thử đến thiết bị':'Test notification sent');
     useDevicePush.setState({message:vi?'Đã gửi thông báo thử đến các thiết bị đã bật.':'Test notification queued for your enabled devices.'});
   }
  }catch(error){
    const errText = pushErrorMessage(error,vi);
    useDevicePush.setState({message:errText});
    toast.error(errText);
  }
 };

 const isLocal = typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || user?.id === 'dev-admin-id');
 const originMatches = Boolean(
   config?.origins && (
     config.origins.includes(location.origin) ||
     (isLocal && (config.origins.includes('http://localhost:5173') || config.origins.includes('http://127.0.0.1:5173') || isLocal))
   )
 );
 const available=Boolean(ready&&(config?.enabled || isLocal)&&(originMatches || isLocal));

 // Avoid flashing the setup card while checking an already registered device, and hide if unavailable or unsupported in popover.
 if(hideWhenEnabled&&(!ready||enabled||!available||!supported))return null;

 return <section className="push-settings" aria-label={vi?'Thông báo trên thiết bị':'Device notifications'}>
  <div className="push-settings-title"><BellRing size={16}/><strong>{vi?'Thông báo trên thiết bị':'Device notifications'}</strong></div>
  <p className="push-settings-note">{needsInstall?(vi?'iPhone: Chia sẻ → Thêm vào Màn hình chính. Mở từ icon rồi bật thông báo.':'iPhone: Share → Add to Home Screen. Open the app icon, then enable notifications.'):!supported?(vi?'Trình duyệt này chưa hỗ trợ push. Hãy dùng Safari trên iPhone hoặc Chrome/Edge trên Desktop.':'Push is unavailable in this browser. Use the installed app on iPhone or Chrome/Edge on desktop.'):!ready?(vi?'Đang kiểm tra kết nối…':'Checking connection…'):!available?(vi?'Thông báo thiết bị chưa được mở cho môi trường này.':'Device notifications are not enabled for this environment.'):(vi?'Nhận task được giao, @ nhắc tên và nhắc report khi đã đóng Dashboard.':'Receive assignments, mentions and report reminders while Dashboard is closed.')}</p>
  {supported&&!needsInstall&&available&&<div className="push-settings-actions">
   <button type="button" className="push-settings-primary" disabled={busy} onClick={()=>void run(enabled?'test':'enable')}>{busy?(vi?'Đang xử lý…':'Working…'):enabled?(vi?'Gửi thử':'Send test'):(vi?'Bật thông báo':'Enable notifications')}</button>
   {enabled&&<button type="button" className="push-settings-secondary" disabled={busy} onClick={()=>void run('disable')}>{vi?'Tắt trên thiết bị này':'Disable on this device'}</button>}
  </div>}
  {message&&<p className="push-settings-note" role="status">{pushErrorMessage(new Error(message),vi)}</p>}
 </section>;
}

