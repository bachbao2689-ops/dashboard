import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../src/store/authStore.ts',import.meta.url),'utf8').replaceAll('import.meta.env','__env'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){
 const admin={id:2,auth_id:'auth-admin',email:'admin@example.invalid',name:'Admin',role:'admin',is_active:true,employment_level:'ADMIN',department_id:null};
 const staff={id:20,auth_id:'auth-staff',email:'staff@example.invalid',name:'Staff',role:'member',is_active:true,employment_level:'Staff',department_id:'marketing'};
 const users=[admin,staff],bindings=[],counts={signOut:0},listeners=new Set();
 let state,authHandler;
 const sessionFor=row=>({access_token:'fixture-token',user:{id:row.auth_id,email:row.email,user_metadata:{}}});
 const session=sessionFor(admin);
 const db={from:table=>{let filters=[],updates;const q={
  select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},ilike:(key,value)=>{filters.push([key,value]);return q;},
  update:value=>{updates=value;return q;},
  maybeSingle:async()=>{if(table==='departments')return {data:{name:'MARKETING'}};const row=users.find(u=>filters.every(([k,v])=>u[k]===v));if(row&&updates)Object.assign(row,updates);return {data:row?{...row}:null,error:null};},
  single:()=>q.maybeSingle(),then:(resolve,reject)=>q.maybeSingle().then(resolve,reject),
 };return q;},auth:{getSession:async()=>({data:{session}}),onAuthStateChange:handler=>{authHandler=handler;},signOut:async()=>{counts.signOut++;}}};
 const create=factory=>{const set=next=>{state={...state,...(typeof next==='function'?next(state):next)};listeners.forEach(fn=>fn());};state=factory(set,()=>state);return {getState:()=>state,setState:set,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};};
 const realtime={retainWorkspaceRealtime:(actor,tables,refresh,status,filter)=>{const b={actor,tables,refresh,filter,released:false};bindings.push(b);return()=>{b.released=true;};}};
 const exports={};
 vm.runInNewContext(source,{exports,__env:{DEV:false},console,document:{visibilityState:'visible'},window:{},localStorage:{removeItem(){}},sessionStorage:{removeItem(){}},setTimeout,
  require:name=>name==='zustand'?{create}:name.includes('workspaceRealtime')?realtime:name.includes('pushNotifications')?{disablePush:async()=>{}}:{supabase:db},
 });
 return {store:exports.useAuthStore,admin,staff,bindings,counts,emitAuth:(kind,row)=>authHandler(kind,sessionFor(row))};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
test('real account refresh uses shared realtime, preserves preview and updates reset identity',async()=>{
 const f=fixture();await f.store.getState().initialize();
 assert.equal(f.bindings.length,1);assert.equal(f.bindings[0].actor,2);
 f.store.setState({profile:{...f.staff,auth_id:null,email:null}});
 f.admin.name='Renamed Admin';
 await f.bindings[0].refresh();
 assert.equal(f.store.getState().profile.id,20);
 assert.equal(f.store.getState().originalProfile.name,'Renamed Admin');
 assert.equal(f.store.getState().user.user_metadata.role,'admin');
 assert.equal(f.bindings.length,1);
});
test('revoking real Admin access exits an active preview immediately',async()=>{
 const f=fixture();await f.store.getState().initialize();f.store.setState({profile:{...f.staff,auth_id:null}});
 f.admin.role='leader';f.admin.employment_level='Leader';f.admin.department_id='marketing';
 await f.bindings[0].refresh();
 assert.equal(f.store.getState().profile.id,2);
 assert.equal(f.store.getState().profile.role,'leader');
 assert.equal(f.store.getState().originalProfile.role,'leader');
});
test('deactivating Admin during preview signs out and releases realtime listener',async()=>{
 const f=fixture();await f.store.getState().initialize();f.store.setState({profile:{...f.staff,auth_id:null}});
 f.admin.is_active=false;await f.bindings[0].refresh();
 assert.equal(f.counts.signOut,1);
 assert.equal(f.store.getState().profile,null);
 assert.equal(f.store.getState().originalProfile,null);
 assert.equal(f.bindings[0].released,true);
});
test('switching login replaces original identity and never restores previous Admin',async()=>{
 const f=fixture();await f.store.getState().initialize();f.store.setState({profile:{...f.staff,auth_id:null}});
 f.emitAuth('SIGNED_IN',f.staff);await settle();
 assert.equal(f.store.getState().profile.id,20);
 assert.equal(f.store.getState().originalProfile.auth_id,'auth-staff');
 assert.equal(f.bindings[0].released,true);
 assert.equal(f.bindings.at(-1).actor,20);
});
test('token refresh during preview keeps real actor metadata; profile editing requires reset',async()=>{
 const f=fixture();await f.store.getState().initialize();f.store.setState({profile:{...f.staff,auth_id:null}});
 f.emitAuth('TOKEN_REFRESHED',f.admin);await settle();
 assert.equal(f.store.getState().user.user_metadata.role,'admin');
 assert.equal(f.store.getState().profile.id,20);
 await assert.rejects(f.store.getState().updateUserMetadata({full_name:'Changed'}),/tài khoản gốc/);
});
