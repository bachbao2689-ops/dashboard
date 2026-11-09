import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePreviewAccount,previewProfile,reconcileAccountPreview} from '../src/lib/accountPreview.ts';
const departments=[{id:'marketing',name:'MARKETING'},{id:'design',name:'Design'}];
const users=[
  {id:2,name:'Admin',role:'admin',is_active:true},
  {id:13,name:'Test leader',role:'leader',employment_level:'Leader',department_id:'marketing',is_active:false},
  {id:20,name:'Real leader',role:'leader',employment_level:'Leader',department_id:'marketing',is_active:true},
  {id:21,name:'Staff',role:'member',employment_level:'Staff',department_id:'marketing',is_active:true},
];
test('leader preset follows active database accounts rather than former test ID',()=>{
  assert.equal(resolvePreviewAccount(users,'leader','marketing').id,20);
  assert.equal(resolvePreviewAccount(users.filter(u=>u.id!==13),'leader','marketing').id,20);
  assert.equal(resolvePreviewAccount(users,'staff','marketing').id,21);
  assert.equal(resolvePreviewAccount(users,'manager'),undefined);
  assert.equal(resolvePreviewAccount(users,'leader',null),undefined);
});
test('legacy manager/Leader remains a department leader; absent staff is not fabricated',()=>{
  const legacy={id:25,name:'Legacy leader',role:'manager',employment_level:'Leader',department_id:'design'};
  assert.equal(resolvePreviewAccount([legacy],'leader','design'),legacy);
  assert.equal(resolvePreviewAccount([legacy],'manager'),undefined);
  assert.equal(resolvePreviewAccount([legacy],'staff','design'),undefined);
});
test('new/deleted/restored users immediately change available presets',()=>{
  const created={id:26,name:'New',role:'member',department_id:'design'};
  assert.equal(resolvePreviewAccount(users,'staff','design'),undefined);
  assert.equal(resolvePreviewAccount([...users,created],'staff','design'),created);
  assert.equal(resolvePreviewAccount([...users,{...created,is_active:false}],'staff','design'),undefined);
});
test('selection tracks edits and deletion/deactivation returns to actual Admin',()=>{
  const admin=previewProfile(users[0],departments),current=previewProfile(users[2],departments);
  assert.equal(reconcileAccountPreview(current,admin,users,departments),current);
  const changed=users.map(u=>u.id===20?{...u,name:'Renamed',role:'member',employment_level:'Staff',department_id:'design'}:u);
  const next=reconcileAccountPreview(current,admin,changed,departments);
  assert.equal(next.name,'Renamed');assert.equal(next.role,'member');assert.equal(next.department_name,'Design');
  assert.equal(reconcileAccountPreview(current,admin,users.filter(u=>u.id!==20),departments),admin);
  assert.equal(reconcileAccountPreview(current,admin,users.map(u=>u.id===20?{...u,is_active:false}:u),departments),admin);
});
test('preview never carries another account Auth identity or changes real account',()=>{
  const real=previewProfile(users[0],departments);
  const profile=previewProfile({...users[2],auth_id:'someone-elses-auth'},departments);
  assert.equal(profile.auth_id,null);
  assert.equal(reconcileAccountPreview(real,real,users,departments),real);
  assert.equal(real.role,'admin');
});
