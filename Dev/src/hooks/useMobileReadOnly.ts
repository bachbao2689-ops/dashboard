import {useSyncExternalStore} from 'react';
const media=()=>window.matchMedia('(max-width: 767px)');
const subscribe=(callback:()=>void)=>{const query=media();query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);};
// Mobile task details are for progress review; work is performed on desktop.
export function useMobileReadOnly(){return useSyncExternalStore(subscribe,()=>media().matches,()=>false);}
