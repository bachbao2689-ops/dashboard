import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('app.js','utf8');
const validTask={startDate:'2026-10-01',deadline:'2026-10-03'};
function setup(response){
  const button={textContent:'Gửi',disabled:false},form={dataset:{},querySelector:()=>button},messages=[];
  let closed=0,loaded=0;
  const runner={withSuccessHandler(fn){this.success=fn;return this;},withFailureHandler(fn){return this;},apiCreateTask(){this.success(response);}};
  const ctx=vm.createContext({window:{},document:{querySelector:()=>form},FormData,google:{script:{run:runner}},toast:m=>messages.push(m),closeModal:()=>closed++,load:async()=>loaded++});
  vm.runInContext(source.slice(source.indexOf('window.runMutation ='),source.indexOf('window.showBorrowForm =')),ctx);
  return {ctx,button,form,messages,get closed(){return closed;},get loaded(){return loaded;}};
}
test('API business errors preserve form and restore submit button',async()=>{const f=setup({ok:false,error:'Không có quyền'});await f.ctx.window.runMutation('apiCreateTask',validTask);assert.equal(f.closed,0);assert.equal(f.loaded,0);assert.equal(f.messages[0],'Không có quyền');assert.equal(f.button.textContent,'Gửi');assert.equal(f.button.disabled,false);});
test('Successful save closes form and refreshes once',async()=>{const f=setup({ok:true});await f.ctx.window.runMutation('apiCreateTask',validTask);assert.equal(f.closed,1);assert.equal(f.loaded,1);});
test('Missing or reversed task dates cannot submit',async()=>{for(const task of [{},{startDate:'2026-10-03',deadline:'2026-10-01'}]){const f=setup({ok:true});await f.ctx.window.runMutation('apiCreateTask',task);assert.equal(f.closed,0);assert.equal(f.loaded,0);assert.match(f.messages[0],/thời gian/);}});
test('In-flight form cannot submit twice',async()=>{const f=setup({ok:true});f.form.dataset.saving='1';await f.ctx.window.runMutation('apiCreateTask',{});assert.equal(f.closed,0);});
