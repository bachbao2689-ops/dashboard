import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Check,ChevronUp,Trash2,X} from 'lucide-react';
import {useAuthStore} from '../../../store/authStore';
import {markNotificationsRead,type NotificationItem} from '../../../store/notificationStore';
import {useNotificationCenter} from '../../../hooks/useNotificationCenter';
import {entityLink} from '../../../lib/taskTracking';
import {NotificationIcon,TONES,toneOf,toneStyle,PicText} from './notificationVisual';

const VISIBLE=4,EXIT_MS=550,HISTORY=12;
// Per-depth visual targets: scale down, dim and sink with each layer; last layer fades to 0.
const LAYERS=[{y:0,s:1,o:1},{y:11,s:.95,o:.78},{y:21,s:.9,o:.5},{y:30,s:.85,o:.26},{y:36,s:.8,o:0}];
// Local UI preview samples (only used by the dev-only test button).
const DEMO:[string,string,string][]=[
 ['Task mới được giao','Thái Đặng giao bạn công việc: Thiết kế Banner Tết','task'],
 ['Bình luận mới','Bách Bảo đã bình luận trong chiến dịch: Camp 10','campaign'],
 ['Nhắc report','Nga Phạm đã nhắc bạn trong dự án: Create Dashboard Management','project'],
 ['Task completed','ADMIN đã hoàn thành subtask: Key Visual','project_subtask'],
];
let demoCount=0;

export function NotificationPopupStack(){
 const {items}=useNotificationCenter(),actor=useAuthStore(s=>s.profile?.id),navigate=useNavigate();
 const [stack,setStack]=useState<NotificationItem[]>([]),[log,setLog]=useState<NotificationItem[]>([]),[expanded,setExpanded]=useState(false);
 const seen=useRef<Set<string>|null>(null),owner=useRef<number|undefined>(undefined);
 const push=(fresh:NotificationItem[])=>{
  setStack(cur=>[...fresh,...cur].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).slice(0,VISIBLE+1));
  setLog(cur=>[...fresh,...cur].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).slice(0,HISTORY));
 };
 useEffect(()=>{
  if(owner.current!==actor){owner.current=actor;seen.current=new Set();setStack([]);setLog([]);setExpanded(false);}
  if(!actor||!items.length||!seen.current)return;
  // Existing history never pops up; only unread items that arrived in the last 30s do (covers an empty first snapshot).
  const fresh=items.filter(i=>!i.is_read&&!seen.current!.has(i.id)&&Date.now()-new Date(i.created_at).getTime()<30000);
  items.forEach(i=>seen.current!.add(i.id));
  if(fresh.length)push(fresh);
 },[items,actor]);
 // Drop notifications already read elsewhere (bell, another tab).
 useEffect(()=>{const read=new Set(items.filter(i=>i.is_read).map(i=>i.id));const strip=(cur:NotificationItem[])=>cur.some(i=>read.has(i.id))?cur.filter(i=>!read.has(i.id)):cur;setStack(strip);setLog(strip);},[items]);
 // Layer beyond the limit has faded to 0: remove it from the DOM.
 useEffect(()=>{if(stack.length<=VISIBLE)return;const t=setTimeout(()=>setStack(cur=>cur.slice(0,VISIBLE)),EXIT_MS);return()=>clearTimeout(t);},[stack.length]);
 // Visible cards stay until opened, dismissed, cleared, or marked read elsewhere.
 useEffect(()=>{if(!expanded)return;if(!log.length){setExpanded(false);return;}const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[expanded,log.length]);
 const demo=()=>{const n=++demoCount,[title,message,entity_type]=DEMO[n%DEMO.length];push([{id:`demo-${n}`,type:'task_assigned',title,message,entity_type,entity_id:null,is_read:false,created_at:new Date().toISOString()}]);};
 const dismiss=(id:string)=>{setStack(cur=>cur.filter(i=>i.id!==id));setLog(cur=>cur.filter(i=>i.id!==id));};
 // Clear all only hides popups; the bell history and unread badge stay untouched.
 const clearAll=()=>{setStack([]);setLog([]);setExpanded(false);};
 const markAllRead=async()=>{
  const ids=log.filter(i=>!i.id.startsWith('demo-')).map(i=>i.id);
  setStack([]);setLog([]);setExpanded(false);
  if(ids.length){try{await markNotificationsRead(ids);}catch{}}
 };
 const open=async(n:NotificationItem)=>{
  dismiss(n.id);
  if(n.id.startsWith('demo-'))return;
  void markNotificationsRead([n.id]).catch(()=>{});
  const href=entityLink(n.entity_type,n.entity_id,n.metadata);if(href)navigate(href);
 };
 const extra=stack.length>1?Math.min(stack.length,VISIBLE)-1:0;
 return <>
  {import.meta.env.DEV&&<button type="button" onClick={demo} className="fixed bottom-24 right-4 z-[9400] rounded-full bg-[#002e6d] px-4 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-[#001f4d] md:bottom-6">Test popup</button>}
  {expanded&&log.length>0&&<div className="notif-panel notif-glass rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/90" role="dialog" aria-label="Tất cả thông báo mới">
   <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700/80"><b className="text-xs font-semibold text-gray-900 dark:text-gray-100">Thông báo mới · {log.length}</b><span className="flex items-center gap-1.5"><button type="button" onClick={()=>void markAllRead()} title="Đã đọc tất cả" aria-label="Đã đọc tất cả" className="notif-action p-1.5 rounded-lg text-primary hover:bg-primary/10 dark:text-blue-400 dark:hover:bg-slate-700/60 transition-colors"><Check size={15} strokeWidth={2.5}/></button><button type="button" onClick={clearAll} title="Xoá tất cả" aria-label="Xoá tất cả" className="notif-action inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"><Trash2 size={13}/><span>Xoá tất cả</span></button><button type="button" onClick={()=>setExpanded(false)} title="Thu gọn" aria-label="Thu gọn" className="notif-action inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><ChevronUp size={14}/><span>Thu gọn</span></button></span></div>
   <div className="notif-panel-list">{log.map(n=>{const tone=TONES[toneOf(n)];
    return <div key={n.id} role="button" tabIndex={0} onClick={()=>void open(n)} onKeyDown={e=>{if(e.key==='Enter')void open(n);}} style={toneStyle(n)} className="notif-row group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60">
     <NotificationIcon message={n.message} metadata={n.metadata}/>
     <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{n.title}</b><span className="notif-chip rounded-full px-1.5 py-px text-[10px] font-semibold">{tone.label}</span></span><span className="notif-msg mt-0.5 block text-xs leading-4">{<PicText message={n.message} metadata={n.metadata}/>}</span></span>
     <button type="button" aria-label="Bỏ qua" onClick={e=>{e.stopPropagation();dismiss(n.id);}} className="notif-x notif-x-static"><X size={13}/></button>
    </div>;})}</div>
  </div>}
  {!expanded&&stack.length>0&&<div className="notif-stack" role="region" aria-live="polite" aria-label="Thông báo mới">
   {stack.map((n,depth)=>{const l=LAYERS[Math.min(depth,LAYERS.length-1)];
    // With several popups, tapping the stack opens the full readable list instead of jumping to one item.
    const activate=()=>{if(depth===0&&stack.length>1)setExpanded(true);else void open(n);};
    return <div key={n.id} data-depth={depth} role="button" tabIndex={depth===0?0:-1} aria-hidden={depth>0} aria-label={depth===0&&extra?`Xem tất cả ${stack.length} thông báo`:undefined} onClick={activate} onKeyDown={e=>{if(e.key==='Enter')activate();}}
     style={{...toneStyle(n),transform:`translateY(${l.y}px) scale(${l.s})`,opacity:l.o,zIndex:100-depth}}
     className="notif-card notif-glass group flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white/85 p-3.5 backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/85">
     <NotificationIcon message={n.message} metadata={n.metadata}/>
     <span className="min-w-0 flex-1 pr-14"><b className="block truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{n.title}</b><span className="notif-msg mt-0.5 line-clamp-2 text-xs leading-4">{<PicText message={n.message} metadata={n.metadata}/>}</span></span>
     {depth===0&&<>
      {/* Count chip is permanent; on hover the X grows in and pushes it left. */}
      <span className="notif-corner"><span className="notif-count">{extra>0&&<span className="notif-chip rounded-full px-1.5 py-px text-[10px] font-bold">+{extra}</span>}<button type="button" aria-label="Đóng" onClick={e=>{e.stopPropagation();dismiss(n.id);}} className="notif-x"><X size={13}/></button></span></span>
      <button type="button" onClick={e=>{e.stopPropagation();clearAll();}} className="notif-clear"><Trash2 size={11}/>Xoá hết</button>
     </>}
    </div>;})}
  </div>}
 </>;
}
