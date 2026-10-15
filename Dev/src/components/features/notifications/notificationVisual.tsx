import {useEffect,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {Bell} from 'lucide-react';
import {supabase} from '../../../services/supabase';
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
export function PicText({message}:{message:string}):ReactNode{
 const name=picName(message),{known}=usePic(name);
 if(!name||!known)return <>{message}</>;
 return <><b className="notif-pic">{name}</b>{message.slice(name.length)}</>;
}

// Staff directory (name → avatar) is loaded once and shared by every notification surface.
const key=(s:string)=>s.trim().toLowerCase();
let directory:Map<string,string|null>|null=null,loading:Promise<void>|null=null;
const listeners=new Set<()=>void>();
function loadDirectory(){
 if(directory||loading)return;
 loading=Promise.resolve(supabase.from('users').select('name,avatar_url')).then(({data})=>{
  directory=new Map((data||[]).map((u:{name:string|null;avatar_url:string|null})=>[key(u.name||''),u.avatar_url]));
 }).catch(()=>{directory=new Map();}).finally(()=>{loading=null;listeners.forEach(fn=>fn());});
}
function usePic(name:string|null){
 const [,tick]=useState(0);
 useEffect(()=>{const fn=()=>tick(n=>n+1);listeners.add(fn);loadDirectory();return()=>{listeners.delete(fn);};},[]);
 // Only real staff names count as a PIC ("Điện thoại đã kết nối…" is not a person).
 const known=Boolean(name&&directory?.has(key(name)));
 return {known,src:known&&name?directory!.get(key(name))||null:null};
}

// Left slot: PIC avatar ringed and glowing in the track color, with a small bell badge. Falls back to the bell.
export function NotificationIcon({dim=false,message=''}:{dim?:boolean;message?:string}){
 const name=picName(message),{known,src}=usePic(name);
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
