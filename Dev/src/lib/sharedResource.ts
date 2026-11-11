export type ResourceState<T> = { data?: T; error: string | null; loading: boolean; updatedAt: number };
// Requests and snapshots are shared only within one explicit Auth/permission scope.
export function createSharedResource<T>(load: (key: string) => Promise<T>, ttl = 15000) {
  type Entry = { state:ResourceState<T>; listeners:Set<() => void>; promise?:Promise<void>; dirty:boolean; revision?:number; generation:number; failures:number; retryAt:number; expires?:ReturnType<typeof setTimeout> };
  const entries = new Map<string,Entry>();
  const entry = (key:string) => {
    let value=entries.get(key);
    if(!value){value={state:{error:null,loading:true,updatedAt:0},listeners:new Set(),dirty:false,generation:0,failures:0,retryAt:0};entries.set(key,value);}
    return value;
  };
  const notify = (value:Entry) => value.listeners.forEach(fn=>fn());
  const refresh = (key:string,force=true):Promise<void> => {
    const value=entry(key);if(value.promise)return value.promise;
    if(!force&&Date.now()<value.retryAt)return Promise.resolve();
    const generation=value.generation;
    value.dirty=false;
    value.state={...value.state,loading:value.state.data===undefined,error:null};notify(value);
    value.promise=Promise.resolve().then(()=>load(key)).then(data=>{
      if(generation===value.generation){value.failures=0;value.retryAt=0;value.state={data,error:null,loading:false,updatedAt:Date.now()};notify(value);}
    }).catch(error=>{
      if(generation===value.generation){value.retryAt=Date.now()+Math.min(300000,5000*2**Math.min(6,value.failures++));value.state={...value.state,loading:false,error:error instanceof Error?error.message:String(error?.message||'Chưa tải được dữ liệu.')};notify(value);}
    }).finally(()=>{
      if(generation!==value.generation)return;
      value.promise=undefined;
      if(value.dirty&&value.listeners.size)void refresh(key,false);
    });
    return value.promise;
  };
  return {
    getSnapshot:(key:string)=>entry(key).state,
    subscribe:(key:string,listener:()=>void)=>{
      const value=entry(key);clearTimeout(value.expires);value.listeners.add(listener);
      if(!value.state.updatedAt||Date.now()-value.state.updatedAt>ttl)void refresh(key,false);
      return()=>{value.listeners.delete(listener);if(!value.listeners.size)value.expires=setTimeout(()=>{if(!value.listeners.size){value.generation++;entries.delete(key);}},60000);};
    },
    refresh,
    invalidate:(key:string,revision?:number)=>{
      const value=entry(key);if(revision!==undefined&&value.revision===revision)return;
      value.revision=revision;
      if(value.promise){value.dirty=true;return;}
      void refresh(key,false);
    },
    reset:()=>{for(const value of entries.values()){clearTimeout(value.expires);value.generation++;value.promise=undefined;value.dirty=false;value.failures=0;value.retryAt=0;value.state={error:null,loading:true,updatedAt:0};notify(value);}for(const [key,value] of entries){if(!value.listeners.size)entries.delete(key);}},
  };
}
