export const BACKEND_RETRY_MS=15000;
export const AUTH_DEADLINE_MS=25000;
export const BACKEND_BUSY_MESSAGE='Máy chủ dữ liệu đang phản hồi chậm. Vui lòng đợi 15 giây rồi thử lại.';

export async function withDeadline<T>(operation:PromiseLike<T>,milliseconds=AUTH_DEADLINE_MS):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve(operation),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(BACKEND_BUSY_MESSAGE)),milliseconds);})]);}
 finally{clearTimeout(timer);}
}

/** Bound requests and cool down after an outage. Never retry a business write. */
export function createBackendFetch(fetcher:typeof fetch=fetch,{timeoutMs=20000,retryMs=BACKEND_RETRY_MS,now=Date.now}={}):typeof fetch{
 let unavailableUntil=0;
 return async(input,init)=>{
  const started=now();
  if(started<unavailableUntil)throw new Error(BACKEND_BUSY_MESSAGE);
  const controller=new AbortController();
  const upstream=init?.signal||(typeof Request!=='undefined'&&input instanceof Request?input.signal:undefined);
  const abort=()=>controller.abort(upstream?.reason);
  if(upstream?.aborted)abort();else upstream?.addEventListener('abort',abort,{once:true});
  const url=String(typeof Request!=='undefined'&&input instanceof Request?input.url:input);
  const budget=url.includes('/storage/v1/')?Math.max(timeoutMs,120000):timeoutMs;
  const timer=setTimeout(()=>controller.abort(new Error(BACKEND_BUSY_MESSAGE)),budget);
  try{
   const response=await fetcher(input,{...init,signal:controller.signal});
   if(response.status>=500||response.status===429)unavailableUntil=Math.max(unavailableUntil,now()+retryMs);
   return response;
  }catch(error){
   if(!upstream?.aborted)unavailableUntil=Math.max(unavailableUntil,now()+retryMs);
   throw error;
  }finally{clearTimeout(timer);upstream?.removeEventListener('abort',abort);}
 };
}

export function authFailureMessage(error:unknown):string{
 const value=error as {status?:number;code?:string;message?:string;name?:string}|null;
 if(value?.code==='invalid_credentials')return 'Email hoặc mật khẩu không đúng.';
 if(value?.status&&value.status>=500||value?.name==='AbortError'||/timeout|deadline|fetch|network|connection|máy chủ dữ liệu/i.test(value?.message||''))return BACKEND_BUSY_MESSAGE;
 return value?.message||'Chưa xác nhận được tài khoản. Vui lòng thử lại.';
}
