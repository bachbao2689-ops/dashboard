import {useSyncExternalStore} from 'react';
const media=()=>window.matchMedia('(max-width: 767px) and (pointer: coarse)');
const subscribe=(callback:()=>void)=>{const query=media();query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);};
// Touch phones keep their review-only flow; a narrow desktop app remains editable.
export function useMobileReadOnly(){return useSyncExternalStore(subscribe,()=>media().matches,()=>false);}
