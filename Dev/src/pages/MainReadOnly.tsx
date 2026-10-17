import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {Eye,RefreshCw,Search,ShieldCheck,LogOut} from 'lucide-react';
import {useAuthStore} from '../store/authStore';
import {officialReadClient} from '../services/officialReadOnly';

type Kind='projects'|'campaigns'|'tasks';
type Entry={id:string;name?:string;title?:string;description?:string|null;status?:string|null;start_date?:string|null;due_date?:string|null;end_date?:string|null;created_at?:string;updated_at?:string};
type Collection={rows:Entry[];total:number};
const empty:Record<Kind,Collection>={projects:{rows:[],total:0},campaigns:{rows:[],total:0},tasks:{rows:[],total:0}};
const sections:[Kind,string][]=[['projects','Dự án'],['campaigns','Chiến dịch'],['tasks','Công việc']];
const fields:Record<Kind,string>={
  projects:'id,name,description,status,start_date,due_date,created_at',
  campaigns:'id,name,status,start_date,end_date,created_at',
  tasks:'id,title,description,status,start_date,due_date,created_at,updated_at',
};
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('vi-VN'):'—';

export default function MainReadOnly(){
  const client=officialReadClient;
  const devAuthId=useAuthStore(state=>state.user?.id);
  const [connected,setConnected]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [collections,setCollections]=useState<Record<Kind,Collection>>(empty);
  const [limits,setLimits]=useState<Record<Kind,number>>({projects:100,campaigns:100,tasks:100});
  const [refreshedAt,setRefreshedAt]=useState<Date|null>(null);

  const load=useCallback(async()=>{
    if(!client||!devAuthId)return;
    setBusy(true);
    try{
      const {data:stored}=await client.auth.getSession();
      if(!stored.session){setConnected(false);setCollections(empty);setError('');return;}
      const {data:identity,error:authError}=await client.auth.getUser();
      if(authError||identity.user?.id!==devAuthId){
        setConnected(false);
        setCollections(empty);
        throw new Error('Tài khoản Main và Develop phải là cùng một người. Hãy đăng nhập tài khoản Main của bro.');
      }
      const results=await Promise.all(sections.map(async([kind])=>{
        const result=await client.from(kind).select(fields[kind],{count:'exact'})
          .order(kind==='tasks'?'updated_at':'created_at',{ascending:false}).limit(limits[kind]);
        if(result.error)throw result.error;
        return [kind,{rows:(result.data||[]) as unknown as Entry[],total:result.count||0}] as const;
      }));
      setCollections(Object.fromEntries(results) as Record<Kind,Collection>);
      setConnected(true);
      setRefreshedAt(new Date());
      setError('');
    }catch(cause){setError(cause instanceof Error?cause.message:'Không tải được dữ liệu Main.');}
    finally{setBusy(false);setChecking(false);}
  },[client,devAuthId,limits]);

  useEffect(()=>{
    if(!client){setChecking(false);return;}
    void load();
  },[load]);

  useEffect(()=>{
    if(!connected)return;
    const refresh=()=>{if(document.visibilityState==='visible')void load();};
    const interval=window.setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',refresh);};
  },[connected,load]);

  const visible=useMemo(()=>Object.fromEntries(sections.map(([kind])=>[kind,collections[kind].rows.filter(row=>
    `${row.name||row.title||''} ${row.description||''} ${row.status||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  )])) as Record<Kind,Entry[]>,[collections,query]);

  const signIn=async(event:FormEvent)=>{
    event.preventDefault();if(!client||!devAuthId)return;
    setBusy(true);setError('');
    try{
      const {data,error:authError}=await client.auth.signInWithPassword({email:email.trim(),password});
      setPassword('');
      if(authError)throw authError;
      if(data.user?.id!==devAuthId){await client.auth.signOut();throw new Error('Tài khoản Main không trùng với tài khoản Develop đang dùng.');}
      await load();
    }catch(cause){setError(cause instanceof Error?cause.message:'Đăng nhập Main thất bại.');}
    finally{setBusy(false);}
  };

  if(!client)return <section className="card-hub rounded-2xl p-6 text-sm text-gray-600 dark:text-slate-300">Chế độ xem Main chỉ có trên Develop/Local khi đã cấu hình biến môi trường riêng.</section>;
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="card-hub rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"><Eye size={21}/> Theo dõi Main</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Dữ liệu Official trực tiếp, chỉ đọc. Tạo, sửa, thông báo và cache của Develop vẫn ở Supabase Dev.</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"><ShieldCheck size={14}/> Main · Chỉ đọc</span>
      </div>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
    {checking?<p className="p-5 text-sm text-gray-500">Đang kiểm tra phiên Main…</p>:!connected?
      <form onSubmit={event=>void signIn(event)} className="card-hub mx-auto max-w-md space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white">Đăng nhập tài khoản Official</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Phiên Main được giữ riêng và chỉ dùng để đọc những mục tài khoản của bro được phép xem.</p>
        <label className="block text-sm text-gray-600 dark:text-slate-300">Email<input required type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label>
        <label className="block text-sm text-gray-600 dark:text-slate-300">Mật khẩu<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label>
        <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#002e6d] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Đang kết nối…':'Xem dữ liệu Main'}</button>
      </form>:
      <>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500 dark:text-slate-400">{refreshedAt?`Cập nhật ${refreshedAt.toLocaleTimeString('vi-VN')}`:'Đang cập nhật'} · tự làm mới mỗi phút khi đang mở</p><div className="flex gap-2"><button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:text-slate-200"><RefreshCw size={15} className={busy?'animate-spin':''}/> Làm mới</button><button type="button" onClick={async()=>{await client.auth.signOut();setConnected(false);setCollections(empty);}} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:text-slate-200"><LogOut size={15}/> Ngắt Main</button></div></div>
        <label className="relative block"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Tìm trong dữ liệu đang hiển thị…" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label>
        {sections.map(([kind,label])=><section key={kind} className="card-hub overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-gray-200/70 px-4 py-3 dark:border-slate-700/70"><h2 className="font-semibold text-gray-900 dark:text-white">{label}</h2><span className="text-xs text-gray-500 dark:text-slate-400">{collections[kind].total} mục{collections[kind].total>limits[kind]?` · hiển thị ${limits[kind]} mới nhất`:''}</span></div>
          {visible[kind].length===0?<p className="p-4 text-sm text-gray-500 dark:text-slate-400">Không có mục phù hợp.</p>:<ul className="divide-y divide-gray-200/70 dark:divide-slate-700/70">{visible[kind].map(row=><li key={row.id}><button type="button" onClick={()=>setSelected(selected===`${kind}:${row.id}`?null:`${kind}:${row.id}`)} className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/10"><span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{row.name||row.title||'Không có tiêu đề'}</span><span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{row.status||'—'}</span></button>{selected===`${kind}:${row.id}`&&<div className="space-y-1 bg-gray-50/70 px-4 pb-4 pt-2 text-xs text-gray-600 dark:bg-slate-900/40 dark:text-slate-300"><p>{row.description||'Chưa có mô tả.'}</p><p>Bắt đầu: {date(row.start_date)} · Hạn: {date(row.due_date||row.end_date)}</p><p className="break-all text-gray-400">ID: {row.id}</p></div>}</li>)}</ul>}{collections[kind].total>collections[kind].rows.length&&<button type="button" onClick={()=>setLimits(current=>({...current,[kind]:current[kind]+100}))} className="w-full border-t border-gray-200/70 px-4 py-3 text-center text-xs font-semibold text-blue-700 dark:border-slate-700/70 dark:text-blue-300">Tải thêm {label.toLocaleLowerCase()}</button>}</section>)}
      </>}
  </div>;
}
