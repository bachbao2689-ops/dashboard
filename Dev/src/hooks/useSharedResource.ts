import {useCallback,useSyncExternalStore} from 'react';
import type {createSharedResource,ResourceState} from '../lib/sharedResource';
const empty={error:null,loading:false,updatedAt:0};
export function useSharedResource<T>(resource:ReturnType<typeof createSharedResource<T>>,key:string,enabled=true){
 const subscribe=useCallback((listener:()=>void)=>enabled?resource.subscribe(key,listener):()=>{},[resource,key,enabled]);
 const getSnapshot=useCallback(()=>enabled?resource.getSnapshot(key):empty as ResourceState<T>,[resource,key,enabled]);
 const state=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
 const refetch=useCallback(()=>enabled?resource.refresh(key):Promise.resolve(),[resource,key,enabled]);
 return {...state,refetch};
}
