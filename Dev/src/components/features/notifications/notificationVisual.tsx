import type {CSSProperties,ReactNode} from 'react';
import {Bell} from 'lucide-react';
import {useWorkspaceDirectory} from '../../../hooks/useWorkspaceData';
import type {NotificationItem} from '../../../store/notificationStore';
import '../../../styles/notification-popup.css';

// Track colors match the Profile calendar filters: Task blue, Project violet, Campaign amber.
export const TONES={task:{label:'Task',rgb:'37,99,235'},project:{label:'Project',rgb:'124,58,237'},campaign:{label:'Campaign',rgb:'217,119,6'},other:{label:'Thông báo',rgb:'100,116,139'}};
export type Tone=keyof typeof TONES;
export const toneOf=(n:Pick<NotificationItem,'entity_type'>):Tone=>{
 const k=n.entity_type||'';
 if(k==='task')return 'task';
 if(k==='project'||k==='project_subtask')return 'project';
 if(k==='campaign'||k==='campaign_subtask')return 'campaign';
 return 'other';
};
export const toneStyle=(n:Pick<NotificationItem,'entity_type'>):CSSProperties=>({['--tone' as string]:TONES[toneOf(n)].rgb});

// PIC = leading person name of "<Name> đã/giao/nhắc …". "đã" is non-ASCII so \b cannot be used.
const PIC=/^(.+?)(?=\s(?:đã|giao|nhắc)(?:\s|$))/;
export const picName=(message:string)=>message.match(PIC)?.[1]||null;
// Bold the PIC (real staff only) with strong contrast.
export function PicText({message,metadata}:{message:string;metadata?:NotificationItem['metadata']}):ReactNode{
 const name=picName(message),{known}=usePic(name,metadata);
 if(!name||!known)return <>{message}</>;
 return <><b className="notif-pic">{name}</b>{message.slice(name.length)}</>;
}

// Prefer the server event's stable actor identity; legacy messages use the shared directory.
function usePic(name:string|null,metadata?:NotificationItem['metadata']){
 const actor=metadata?.origin==='dashboard:v2'?metadata:null;
 const directory=useWorkspaceDirectory(Boolean(name&&!actor));
 const matches=name?(directory.data?.users||[]).filter(user=>user.name.trim().toLowerCase()===name.trim().toLowerCase()):[];
 const known=Boolean(name&&(actor?.actor_name===name||matches.length===1));
 return {known,src:known?(actor?.actor_avatar_url||matches[0]?.avatar_url||null):null};
}

// Left slot: PIC avatar ringed and glowing in the track color, with a small bell badge. Falls back to the bell.
export function NotificationIcon({dim=false,message='',metadata}:{dim?:boolean;message?:string;metadata?:NotificationItem['metadata']}){
 const name=picName(message),{known,src}=usePic(name,metadata);
 const isReadCls=dim?' is-read':'';
 if(!name||!known){
  return (
   <span className={`notif-icon notif-icon-standalone flex h-10 w-10 shrink-0 items-center justify-center rounded-full${isReadCls}`}>
    <Bell size={18}/>
   </span>
  );
 }
 return (
  <span className="notif-avatar-wrap">
   <span className={`notif-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full${isReadCls}`}>
    {src ? (
     <img src={src} alt={name} className="h-full w-full rounded-full object-cover"/>
    ) : (
     <span className="notif-avatar-initial">{name.charAt(0).toUpperCase()}</span>
    )}
   </span>
   <span className="notif-badge"><Bell size={9}/></span>
  </span>
 );
}
