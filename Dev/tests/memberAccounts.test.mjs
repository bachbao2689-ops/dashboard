import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemberProfile,saveMemberAccess,memberPermissionId} from '../src/services/memberAccounts.ts';
function fixture(){
 const writes=[],lookups=[],calls=[];
 const state={existing:null,inserted:{id:42},rpcResult:{data:42,error:null},error:null};
 const client={from:()=>{
  let inserting=false;
  const q={select:()=>q,ilike:(key,value)=>{lookups.push(value);return q;},insert:value=>{writes.push(value);inserting=true;return q;},
   maybeSingle:async()=>({data:state.existing,error:state.error}),single:async()=>({data:inserting?state.inserted:null,error:state.error})};return q;
 },rpc:async(name,args)=>{calls.push({name,args});return state.rpcResult;}};
 return {client,state,writes,lookups,calls};
}
const actor={id:2,role:'admin',employment_level:'ADMIN',is_active:true};
const target={id:42,role:'member'};
const access={role:'leader',department_id:'team',job_title:' Lead '};
test('create returns exactly the inserted member ID for the following permission screen',async()=>{
 const f=fixture();assert.equal(await createMemberProfile(f.client,{name:'  Fixture Staff  ',email:' NEW@Example.invalid '}),42);
 assert.deepEqual(f.writes,[{name:'Fixture Staff',email:'new@example.invalid',initials:'FS',role:'member',employment_level:'Nhân viên',department_id:null,job_title:null,is_active:true}]);
});
test('creation fails without writing on duplicates and never treats email underscores as wildcards',async()=>{
 const f=fixture();f.state.existing={id:8,is_active:true};
 await assert.rejects(createMemberProfile(f.client,{name:'Fixture',email:'a_b@example.invalid'}),/đã có/);
 assert.equal(f.writes.length,0);assert.equal(f.lookups[0],'a\\_b@example.invalid');
 f.state.existing.is_active=false;await assert.rejects(createMemberProfile(f.client,{name:'Fixture',email:'a@example.invalid'}),/khôi phục/);
});
test('creation failures cannot return a guessed permission target',async()=>{
 const f=fixture();f.state.inserted=null;await assert.rejects(createMemberProfile(f.client,{name:'Fixture',email:'a@example.invalid'}),/Không xác nhận/);
 await assert.rejects(createMemberProfile(f.client,{name:'',email:'bad'}),/hợp lệ/);
});
test('permissions call the guarded RPC for that member only, without identity or active-state changes',async()=>{
 const f=fixture();await saveMemberAccess(f.client,actor,target,access,['team']);
 assert.deepEqual(f.calls,[{name:'account_set_member_permissions',args:{p_member_id:42,p_role:'leader',p_department_id:'team',p_job_title:'Lead'}}]);
 assert.equal(f.writes.length,0);
});
test('no permission calls for inactive/staff/self actors, Manager-to-Admin escalation or invalid department',async()=>{
 const f=fixture();
 for(const a of [{...actor,is_active:false},{...actor,role:'member',employment_level:'Staff'},{...actor,id:42},{...actor,role:'manager',employment_level:'Leader'}])
  await assert.rejects(saveMemberAccess(f.client,a,target,access,['team']));
 const manager={...actor,role:'manager',employment_level:'Manager'};
 await assert.rejects(saveMemberAccess(f.client,manager,target,{...access,role:'admin'},['team']),/Chỉ Admin/);
 await assert.rejects(saveMemberAccess(f.client,actor,target,{...access,department_id:'foreign'},['team']),/phòng ban/);
 assert.equal(f.calls.length,0);
});
test('RPC failure and stale response keep permissions unsaved',async()=>{
 const f=fixture();f.state.rpcResult={error:new Error('Permission revoked'),data:null};
 await assert.rejects(saveMemberAccess(f.client,actor,target,access,['team']),/Permission revoked/);
 f.state.rpcResult={error:null,data:null};await assert.rejects(saveMemberAccess(f.client,actor,target,access,['team']),/Không lưu/);
});
test('permission links accept only a positive safe member ID',()=>{
 assert.equal(memberPermissionId('42'),42);
 for(const value of [null,'','0','-1','1e3','42abc','1/2','9007199254740992','javascript:alert(1)'])assert.equal(memberPermissionId(value),null);
});
