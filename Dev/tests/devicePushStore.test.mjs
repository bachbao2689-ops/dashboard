import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../src/store/devicePushStore.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(overrides={}){
 const counts={config:0,sync:0,enable:0,disable:0,test:0};
 const services={getPushConfiguration:async()=>{counts.config++;return {enabled:true,publicKey:'public',origins:['https://qa.invalid']};},supportsPush:()=>true,syncPush:async()=>{counts.sync++;return true;},enablePush:async()=>{counts.enable++;},disablePush:async()=>{counts.disable++;},testPush:async()=>{counts.test++;},...overrides};
 const exports={};vm.runInNewContext(source,{exports,location:{origin:'https://qa.invalid'},require:name=>name==='zustand'?{create:factory=>{let state=factory();return {getState:()=>state,setState:value=>{state={...state,...value};}};}}:services});return {...exports,counts};
}
test('app and repeated bell opens share device setup without prompting permission',async()=>{
 const f=fixture();await Promise.all(Array.from({length:12},()=>f.initializeDevicePush('account-a')));await f.initializeDevicePush('account-a');
 assert.equal(f.counts.config,1);assert.equal(f.counts.sync,1);assert.equal(f.counts.enable,0);assert.equal(f.useDevicePush.getState().enabled,true);
});
test('late initialization from the previous account cannot change the new device owner',async()=>{
 let finish,reads=0;const f=fixture({getPushConfiguration:()=>++reads===1?new Promise(resolve=>{finish=resolve;}):Promise.resolve({enabled:true,origins:['https://qa.invalid'],publicKey:'new'})});
 const old=f.initializeDevicePush('old');await f.initializeDevicePush('new');finish({enabled:false,origins:[],publicKey:'old'});await old;
 assert.equal(f.useDevicePush.getState().owner,'new');assert.equal(f.useDevicePush.getState().config.publicKey,'new');assert.equal(f.useDevicePush.getState().enabled,true);
});
test('failed subscription save never reports enabled and always releases busy state',async()=>{
 const f=fixture({syncPush:async()=>false,enablePush:async()=>{throw Error('offline');}});await f.initializeDevicePush('account');await assert.rejects(f.changeDevicePush('enable','account'),/offline/);
 assert.equal(f.useDevicePush.getState().enabled,false);assert.equal(f.useDevicePush.getState().busy,false);
});
test('logout clears config, errors and connected device state',async()=>{
 const f=fixture();await f.initializeDevicePush('account');f.resetDevicePush();const state=f.useDevicePush.getState();assert.equal(state.owner,undefined);assert.equal(state.enabled,false);assert.equal(state.ready,false);assert.equal(state.config,null);
});
