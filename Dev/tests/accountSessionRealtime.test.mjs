import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as previewApi from '../src/services/adminPreview.ts';
import * as backendRequest from '../src/lib/backendRequest.ts';
const source=ts.transpileModule(fs.readFileSync(new URL('../src/store/authStore.ts',import.meta.url),'utf8').replaceAll('import.meta.env','__env'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(options={}){
 const admin={id:2,auth_id:'auth-admin',email:'admin@example.invalid',name:'Admin',role:'admin',is_active:true,employment_level:'ADMIN',department_id:null};
 const staff={id:20,auth_id:'auth-staff',email:'staff@example.invalid',name:'Staff',role:'member',is_active:true,employment_level:'Staff',department_id:'marketing'};
 const peer={...staff,id:21,auth_id:'auth-peer',name:'Peer'};
 const users=[admin,staff,peer],bindings=[],counts={signOut:0,starts:0,profileReads:0,statusReads:0},listeners=new Set(),events=new Map();
 let state,authHandler,selected=null,statusFailure=false,pendingStart,failStart=false;
 const sessionFor=(row,sid='session-'+row.id)=>({access_token:'h.'+btoa(JSON.stringify({session_id:sid}))+'.sig',user:{id:row.auth_id,email:row.email,user_metadata:{}}});
 const session=sessionFor(options.staff?staff:admin);
 const preview=()=>selected?{active:true,actor:{...selected},expires_at:new Date(Date.now()+1800000).toISOString()}:{active:false};
 const db={rpc:async(name,args)=>{
  if(name==='admin_preview_status'){counts.statusReads++;return statusFailure?{error:new Error('Offline')}:{data:preview(),error:null};}
  if(name==='admin_preview_start'){counts.starts++;selected=users.find(u=>u.id===args.p_actor);if(pendingStart)await pendingStart;return failStart?{error:new Error('Response lost')}:{data:preview(),error:null};}
  if(name==='admin_preview_stop'){selected=null;return {data:null,error:null};}
  throw Error(name);
 },from:table=>{let filters=[],updates;const q={
  select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},ilike:(key,value)=>{filters.push([key,value]);return q;},update:value=>{updates=value;return q;},
  maybeSingle:async()=>{if(table==='departments')return {data:{name:'MARKETING'}};counts.profileReads++;if(options.profileFailure)return {data:null,error:new Error('database timeout')};const row=users.find(u=>filters.every(([k,v])=>u[k]===v));if(row&&updates)Object.assign(row,updates);return {data:row?{...row}:null,error:null};},
  single:()=>q.maybeSingle(),then:(resolve,reject)=>q.maybeSingle().then(resolve,reject),
 };return q;},auth:{getSession:async()=>{if(options.sessionFailure)throw new Error('refresh timeout');if(options.sessionPromise)await options.sessionPromise;return {data:{session}};},onAuthStateChange:handler=>{authHandler=handler;},signOut:async()=>{counts.signOut++;}}};
 const create=factory=>{const set=next=>{state={...state,...(typeof next==='function'?next(state):next)};listeners.forEach(fn=>fn());};state=factory(set,()=>state);return {getState:()=>state,setState:set,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};};
 const realtime={retainWorkspaceRealtime:(actor,tables,refresh,status,filter)=>{const b={actor,tables,refresh,filter,released:false};bindings.push(b);return()=>{b.released=true;};}};
 const exports={};
 vm.runInNewContext(source,{exports,__env:{DEV:false},console:{error(){},warn(){}},document:{visibilityState:'visible'},window:{addEventListener:(key,fn)=>events.set(key,fn)},localStorage:{removeItem(){}},sessionStorage:{removeItem(){}},setTimeout:(fn,ms)=>{const timer=setTimeout(fn,ms);timer.unref();return timer;},clearTimeout,
  require:name=>name==='zustand'?{create}:name.includes('workspaceRealtime')?realtime:name.includes('pushNotifications')?{disablePush:async()=>{}}:name.includes('adminPreview')?previewApi:name.includes('backendRequest')?backendRequest:{supabase:db},
 });
 return {store:exports.useAuthStore,admin,staff,peer,bindings,counts,sessionFor,emitAuth:(kind,row,sid)=>authHandler(kind,sessionFor(row,sid)),select:p=>{selected=p;},failStatus:()=>{statusFailure=true;},loseStartResponse:()=>{failStart=true;},pauseStart:()=>{let resolve;pendingStart=new Promise(r=>{resolve=r;});return resolve;},storage:()=>events.get('storage')({key:'kcoffee_admin_test_changed'})};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
test('switch waits for backend; drops prior data and rejects overlapping switches',async()=>{
 const f=fixture();await f.store.getState().initialize();const resume=f.pauseStart();const change=f.store.getState().setTestActor(20);
 assert.equal(f.store.getState().profile,null);assert.equal(f.store.getState().previewBusy,true);
 await f.store.getState().setTestActor(21);assert.equal(f.counts.starts,1);resume();await change;
 assert.equal(f.store.getState().profile.id,20);assert.equal(f.store.getState().originalProfile.id,2);assert.equal(f.store.getState().user.id,'auth-admin');assert.equal(f.store.getState().user.user_metadata.role,'member');assert.equal(f.store.getState().scopeRevision,1);
});
test('realtime watches real and selected accounts; edits and restore use server identity',async()=>{
 const f=fixture();await f.store.getState().initialize();await f.store.getState().setTestActor(20);const binding=f.bindings.at(-1);
 assert.equal(binding.filter({table:'users',new:{id:20}}),true);assert.equal(binding.filter({table:'users',new:{id:2}}),true);
 f.staff.role='leader';f.staff.employment_level='Leader';f.admin.name='Renamed Admin';await binding.refresh();
 assert.equal(f.store.getState().profile.role,'leader');assert.equal(f.store.getState().originalProfile.name,'Renamed Admin');
 await f.store.getState().restoreAdmin();assert.equal(f.store.getState().profile.name,'Renamed Admin');assert.equal(f.store.getState().previewExpiresAt,null);
});
test('lost response fails closed; explicit server restore recovers',async()=>{
 const f=fixture();await f.store.getState().initialize();f.loseStartResponse();await assert.rejects(f.store.getState().setTestActor(20));
 assert.equal(f.store.getState().profile,null);assert.equal(f.store.getState().originalProfile.id,2);await f.store.getState().restoreAdmin();assert.equal(f.store.getState().profile.id,2);
});
test('reload restores selected actor; failed status never exposes Admin data',async()=>{
 const f=fixture();f.select(f.staff);await f.store.getState().initialize();assert.equal(f.store.getState().profile.id,20);
 f.failStatus();await f.bindings.at(-1).refresh();assert.equal(f.store.getState().profile,null);assert.equal(f.store.getState().originalProfile.id,2);
});
test('cross-tab change drops prior data immediately and fetches new scope',async()=>{
 const f=fixture();await f.store.getState().initialize();f.select(f.staff);f.storage();assert.equal(f.store.getState().profile,null);await settle();assert.equal(f.store.getState().profile.id,20);
});
test('inactive real Admin signs out and releases realtime',async()=>{
 const f=fixture();await f.store.getState().initialize();await f.store.getState().setTestActor(20);f.admin.is_active=false;await f.bindings.at(-1).refresh();
 assert.equal(f.counts.signOut,1);assert.equal(f.store.getState().profile,null);assert.equal(f.store.getState().originalProfile,null);assert.equal(f.bindings.at(-1).released,true);
});
test('new login, even the same Admin with another session, replaces old test scope',async()=>{
 const f=fixture();await f.store.getState().initialize();await f.store.getState().setTestActor(20);f.select(null);
 f.emitAuth('SIGNED_IN',f.admin,'another-session');await settle();assert.equal(f.store.getState().profile.id,2);
 f.emitAuth('SIGNED_IN',f.staff);await settle();assert.equal(f.store.getState().profile.id,20);assert.equal(f.store.getState().originalProfile.auth_id,'auth-staff');await assert.rejects(f.store.getState().setTestActor(2),/Admin thật/);
});
test('token rotation preserves effective metadata; Auth/profile changes need original account',async()=>{
 const f=fixture();await f.store.getState().initialize();await f.store.getState().setTestActor(20);f.emitAuth('TOKEN_REFRESHED',f.admin);await settle();
 assert.equal(f.store.getState().user.user_metadata.role,'member');assert.equal(f.store.getState().profile.id,20);await assert.rejects(f.store.getState().updateUserMetadata({full_name:'Changed'}),/tài khoản gốc/);
});
test('ordinary Staff login does not call Dev Tools and shares profile work with SIGNED_IN',async()=>{
 const f=fixture({staff:true});await f.store.getState().initialize();assert.equal(f.counts.statusReads,0);assert.equal(f.store.getState().profile.id,20);
 const before=f.counts.profileReads;
 await Promise.all([f.store.getState().acceptSession(f.sessionFor(f.staff)),f.store.getState().acceptSession(f.sessionFor(f.staff))]);
 assert.equal(f.counts.profileReads-before,2);assert.equal(f.counts.statusReads,0);
});
test('a failed profile query is not repeated and always leaves a recoverable error',async()=>{
 const f=fixture({profileFailure:true});await f.store.getState().initialize();assert.equal(f.counts.profileReads,1);assert.equal(f.store.getState().loading,false);assert.match(f.store.getState().authError,/Máy chủ/);assert.equal(f.store.getState().profile,null);
});
test('token-refresh failure does not prevent a later SIGNED_IN from being received',async()=>{
 const f=fixture({sessionFailure:true});await f.store.getState().initialize();assert.equal(f.store.getState().loading,false);assert.ok(f.store.getState().authError);
 f.emitAuth('SIGNED_IN',f.staff);await settle();assert.equal(f.store.getState().profile.id,20);assert.equal(f.store.getState().authError,null);
 assert.equal(f.bindings.at(-1).actor,20);assert.equal(f.bindings.at(-1).released,false);
});
test('a late initial session cannot overwrite a newer successful sign-in',async()=>{
 let resume;const sessionPromise=new Promise(r=>{resume=r;});const f=fixture({sessionPromise});const init=f.store.getState().initialize();
 f.emitAuth('SIGNED_IN',f.staff);await settle();resume();await init;
 assert.equal(f.store.getState().profile.id,20);assert.equal(f.store.getState().user.id,'auth-staff');
});
test('sign-out from recovery clears the error even when Auth emits no event',async()=>{
 const f=fixture({profileFailure:true});await f.store.getState().initialize();assert.ok(f.store.getState().authError);
 await f.store.getState().signOut();assert.equal(f.store.getState().authError,null);assert.equal(f.store.getState().user,null);assert.equal(f.store.getState().loading,false);
});
