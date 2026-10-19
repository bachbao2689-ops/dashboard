import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/hooks/useProjectsController.tsx',import.meta.url),'utf8');
function fixture(kind,{denied=false,root=true}={}){
 const project={id:'p1',name:'Project',status:'completed'},campaign={id:'c1',name:'Campaign',status:'completed'};
 const before=kind==='project'?'  const saveInlineEdit = async () => {':'  const saveCampaignEdit = async () => {';
 const after=kind==='project'?'  const executeHideProject = async () => {':'\n return {';
 const start=source.indexOf(before),end=source.indexOf(after,start);
 assert.ok(start>=0&&end>start);
 const updates=[],saved=[],errors=[];
 const ctx=vm.createContext({selected:project,selectedCampaign:campaign,selectedRoot:root,title:'Updated',description:'',start:'',due:'',priority:'medium',editStatus:'active',ownerIds:[],picMembers:{},campaignObjective:'',campaignBudget:'',primaryOwnerId:'',parseYMD:x=>x,
  supabase:{from:table=>({update:payload=>{updates.push({table,payload});return {eq:()=>({select:()=>({single:async()=>denied?{error:{message:'Denied'}}:{data:{...(kind==='project'?project:campaign),...payload}}})})};}}),rpc:async()=>({error:null})},
  setSelected:data=>saved.push(data),setSelectedCampaign:data=>saved.push(data),setProjects:fn=>fn([project]),setCampaigns:fn=>fn([campaign]),setEditMode(){},setCampaignEditMode(){},load:async()=>{},window:{dispatchEvent(){}},Event:class{},toast:{error:m=>errors.push(m),success(){}},notifyStakeholders:async()=>{}});
 vm.runInContext(source.slice(start,end)+`;globalThis.save=${kind==='project'?'saveInlineEdit':'saveCampaignEdit'};`,ctx);
 return {ctx,updates,saved,errors};
}
for(const kind of ['project','campaign']){
 test(`${kind}: completed item can be reopened and UI receives saved status`,async()=>{
  const f=fixture(kind);await f.ctx.save();assert.equal(f.updates[0].payload.status,'active');assert.equal(f.saved[0].status,'active');
 });
 test(`${kind}: denied save never reports a local reopen`,async()=>{
  const f=fixture(kind,{denied:true});await f.ctx.save();assert.equal(f.saved.length,0);assert.equal(f.errors.length,1);
 });
 test(`${kind}: non-manager cannot invoke the edit save`,async()=>{
  const f=fixture(kind,{root:false});await f.ctx.save();assert.equal(f.updates.length,0);
 });
}
