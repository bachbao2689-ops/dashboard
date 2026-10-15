import {create} from 'zustand';
export const useOverlayStore=create<{taskDetails:number}>(()=>({taskDetails:0}));
export function retainTaskDetail(){
 useOverlayStore.setState(state=>({taskDetails:state.taskDetails+1}));
 let retained=true;
 return()=>{if(!retained)return;retained=false;useOverlayStore.setState(state=>({taskDetails:Math.max(0,state.taskDetails-1)}));};
}
