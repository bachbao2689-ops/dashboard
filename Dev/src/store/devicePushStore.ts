import {create} from 'zustand';
import {disablePush,enablePush,getPushConfiguration,supportsPush,syncPush,testPush} from '../services/pushNotifications';
type Config=Awaited<ReturnType<typeof getPushConfiguration>>;
export const useDevicePush=create<{owner?:string;config:Config;enabled:boolean;ready:boolean;busy:boolean;message:string}>(()=>({config:null,enabled:false,ready:false,busy:false,message:''}));
let generation=0,flight:Promise<void>|undefined,lastCheck=0;
export function resetDevicePush(){generation++;flight=undefined;lastCheck=0;useDevicePush.setState({owner:undefined,config:null,enabled:false,ready:false,busy:false,message:''});}
export function initializeDevicePush(owner:string,force=false):Promise<void>{
 if(useDevicePush.getState().owner!==owner){resetDevicePush();useDevicePush.setState({owner});}
 if(flight)return flight;
 if(!force&&useDevicePush.getState().ready&&Date.now()-lastCheck<300000)return Promise.resolve();
 const token=generation;
 flight=(async()=>{
  try{
   const config=await getPushConfiguration();
   if(token!==generation)return;
   const allowed=Boolean(config?.enabled&&config.origins.includes(location.origin));
   useDevicePush.setState({config});
   const enabled=allowed&&supportsPush()?await syncPush(owner):false;
   if(token===generation)useDevicePush.setState({enabled,message:''});
  }catch(error){if(token===generation)useDevicePush.setState({message:error instanceof Error?error.message:'Chưa đồng bộ được đăng ký thông báo. Bấm bật để thử lại.'});}
  finally{if(token===generation){lastCheck=Date.now();flight=undefined;useDevicePush.setState({ready:true});}}
 })();return flight;
}
export async function changeDevicePush(action:'enable'|'disable'|'test',owner:string){
 const state=useDevicePush.getState();if(state.busy||state.owner!==owner)return;
 const token=generation;useDevicePush.setState({busy:true,message:''});
 try{
  if(action==='enable'&&state.config){await enablePush(state.config.publicKey,owner);if(token===generation)useDevicePush.setState({enabled:true});}
  if(action==='disable'){await disablePush();if(token===generation)useDevicePush.setState({enabled:false});}
  if(action==='test')await testPush();
 }finally{if(token===generation)useDevicePush.setState({busy:false});}
}
