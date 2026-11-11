export const BACKEND_RETRY_MS=15000;
export const AUTH_DEADLINE_MS=25000;
export const BACKEND_BUSY_MESSAGE='Máy chủ dữ liệu đang phản hồi chậm. Vui lòng đợi 15 giây rồi thử lại.';

export type BackendService='auth'|'data'|'storage'|'realtime'|'functions'|'other';
export type BackendFetch=typeof fetch&{resetCooldown:(services?:BackendService[])=>void};

export async function withDeadline<T>(operation:PromiseLike<T>,milliseconds=AUTH_DEADLINE_MS):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve(operation),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(BACKEND_BUSY_MESSAGE)),milliseconds);})]);}
 finally{clearTimeout(timer);}
}

/** Bound requests and cool down after an outage. Never retry a business write. */
export function createBackendFetch(fetcher:typeof fetch=fetch,{timeoutMs=20000,retryMs=BACKEND_RETRY_MS,now=Date.now}={}):BackendFetch{
 const unavailableUntil=new Map<BackendService,number>();
 const cooldownEpoch=new Map<BackendService,number>();
 const tripCooldown=(service:BackendService,requestEpoch:number)=>{
  // A response from a request started before an explicit recovery must not
  // re-arm the cooldown after the user has cleared it.
  if((cooldownEpoch.get(service)||0)!==requestEpoch)return;
  unavailableUntil.set(service,Math.max(unavailableUntil.get(service)||0,now()+retryMs));
 };
 const serviceFor=(url:string):BackendService=>{
  let pathname='';
  try{pathname=new URL(url).pathname;}catch{/* Relative/invalid URLs use the isolated fallback bucket. */}
  if(pathname.startsWith('/auth/v1/'))return 'auth';
  if(pathname.startsWith('/rest/v1/')||pathname.startsWith('/graphql/v1/'))return 'data';
  if(pathname.startsWith('/storage/v1/'))return 'storage';
  if(pathname.startsWith('/realtime/v1/'))return 'realtime';
  if(pathname.startsWith('/functions/v1/'))return 'functions';
  return 'other';
 };
 const request=(async(input,init)=>{
  const started=now();
  const url=String(typeof Request!=='undefined'&&input instanceof Request?input.url:input);
  const service=serviceFor(url);
  if(started<(unavailableUntil.get(service)||0))throw new Error(BACKEND_BUSY_MESSAGE);
  const requestEpoch=cooldownEpoch.get(service)||0;
  const controller=new AbortController();
  const upstream=init?.signal||(typeof Request!=='undefined'&&input instanceof Request?input.signal:undefined);
  const abort=()=>controller.abort(upstream?.reason);
  if(upstream?.aborted)abort();else upstream?.addEventListener('abort',abort,{once:true});
  const budget=url.includes('/storage/v1/')?Math.max(timeoutMs,120000):timeoutMs;
  const timer=setTimeout(()=>controller.abort(new Error(BACKEND_BUSY_MESSAGE)),budget);
  try{
   const response=await fetcher(input,{...init,signal:controller.signal});
   if(response.status>=500||response.status===429)tripCooldown(service,requestEpoch);
   return response;
  }catch(error){
   if(!upstream?.aborted)tripCooldown(service,requestEpoch);
   throw error;
  }finally{clearTimeout(timer);upstream?.removeEventListener('abort',abort);}
 }) as BackendFetch;
 request.resetCooldown=(services)=>{
  const target:BackendService[]=services||['auth','data','storage','realtime','functions','other'];
  for(const service of target){
   unavailableUntil.delete(service);
   cooldownEpoch.set(service,(cooldownEpoch.get(service)||0)+1);
  }
 };
 return request;
}

export function authFailureMessage(error:unknown):string{
 const value=error as {status?:number;code?:string;message?:string;name?:string}|null;
 if(value?.code==='invalid_credentials')return 'Email hoặc mật khẩu không đúng.';
 if(value?.status&&value.status>=500||value?.name==='AbortError'||/timeout|deadline|fetch|network|connection|máy chủ dữ liệu/i.test(value?.message||''))return BACKEND_BUSY_MESSAGE;
 return value?.message||'Chưa xác nhận được tài khoản. Vui lòng thử lại.';
}
