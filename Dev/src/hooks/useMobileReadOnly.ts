import {useSyncExternalStore} from 'react';
const media=()=>window.matchMedia('(max-width: 767px) and (pointer: coarse)');
const subscribe=(callback:()=>void)=>{const query=media();query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);};
// Keep mobile review-only by default; task detail can explicitly enable editing.
export function useMobileReadOnly(enabled = true){return useSyncExternalStore(subscribe,()=>enabled && media().matches,()=>false);}
