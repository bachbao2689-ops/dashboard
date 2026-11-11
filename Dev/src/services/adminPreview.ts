import type {StaffProfile} from '../store/authStore';
const changed=()=>{if(typeof window!=='undefined')try{localStorage.setItem('kcoffee_admin_test_changed',String(Date.now())+Math.random());}catch{/* Context stays protected server-side. */}};
type Client={rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
// Decoding only identifies Auth session changes; authorization always uses RPC.
export function authSessionIdentity(session:{access_token:string;user:{id:string}}|null):string|null{
 if(!session)return null;
 try{const payload=JSON.parse(atob(session.access_token.split('.')[1].replaceAll('-','+').replaceAll('_','/')));return `${session.user.id}:${payload.session_id||''}`;}catch{return session.user.id;}
}
const PREVIEW_HINT='kcoffee_admin_test_session';
export function hasAdminPreviewHint(session:Parameters<typeof authSessionIdentity>[0]):boolean{
 try{return Boolean(session&&typeof localStorage!=='undefined'&&localStorage.getItem(PREVIEW_HINT)===authSessionIdentity(session));}catch{return false;}
}
export function rememberAdminPreview(session:Parameters<typeof authSessionIdentity>[0],active:boolean){
 try{if(active&&session)localStorage.setItem(PREVIEW_HINT,authSessionIdentity(session)!);else if(hasAdminPreviewHint(session))localStorage.removeItem(PREVIEW_HINT);}catch{/* Only a hint to request server verification; never grants scope. */}
}
export type AdminPreview={active:boolean;actor?:StaffProfile;expires_at?:string;started_at?:string;requires_reset?:boolean};
export async function readAdminPreview(client:Client):Promise<AdminPreview>{
 const {data,error}=await client.rpc('admin_preview_status');
 if(error)throw error;
 if(data?.requires_reset){await stopAdminPreview(client);return {active:false};}
 if(data?.active&&(!data.actor?.id||data.actor.is_active===false||!Number.isFinite(Date.parse(data.expires_at))||Date.parse(data.expires_at)<=Date.now()))throw new Error('Không xác nhận được phiên thử cấp bậc.');
 if(typeof data?.active!=='boolean')throw new Error('Không xác nhận được scope từ backend.');
 return data;
}
export async function startAdminPreview(client:Client,actorId:number):Promise<AdminPreview>{
 if(!Number.isSafeInteger(actorId)||actorId<=0)throw new Error('Chọn tài khoản đang hoạt động.');
 try{
 const {data,error}=await client.rpc('admin_preview_start',{p_actor:actorId});
 if(error)throw new Error(error.code==='42501'?'Chỉ Admin đăng nhập thật được bật chế độ thử cấp bậc.':error.message||'Không bật được phiên thử.');
 if(!data?.active||data.actor?.id!==actorId||data.actor.is_active===false||!Number.isFinite(Date.parse(data.expires_at))||Date.parse(data.expires_at)<=Date.now())throw new Error('Không xác nhận được tài khoản thử từ backend.');
 return data;
 }finally{changed();}
}
export async function stopAdminPreview(client:Client){try{const {error}=await client.rpc('admin_preview_stop');if(error)throw error;}finally{changed();}}
