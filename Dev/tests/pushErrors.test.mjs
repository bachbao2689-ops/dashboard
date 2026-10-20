import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../src/services/pushNotifications.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(source,{exports,require:()=>({supabase:{}}),navigator:{},Error});
test('Brave push service failure gives browser settings and retry instructions',()=>{
 const text=exports.pushErrorMessage(new Error('Registration failed - push service error'),true,true);
 assert.match(text,/Use Google services for push messaging/);assert.match(text,/Khởi động lại Brave/);assert.doesNotMatch(text,/Registration failed/);
});
test('Other browsers do not get Brave instructions',()=>{
 const text=exports.pushErrorMessage(new Error('Registration failed - push service error'),false,false);
 assert.match(text,/network/);assert.doesNotMatch(text,/Brave/);
});
test('Permission denial is distinct from connection failure; unrelated API errors remain visible',()=>{
 const error=new Error('Permission denied');error.name='NotAllowedError';
 assert.match(exports.pushErrorMessage(error,true,true),/quyền của trang web/);
 assert.equal(exports.pushErrorMessage(new Error('Session expired'),false,true),'Session expired');
});
