import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('.apps-script-target/TaskWorkspace.js','utf8');
function fixture({email='manager@test',status='Pending'}={}){
  const rows=[['ID','PIC','Status'],['DUP','LUNA','Done'],['DUP','BOE',status]],writes=[];
  const sheet={getLastRow:()=>3,getLastColumn:()=>3,getRange:(r,c,n=1,w=1)=>({getDisplayValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w)),setValue:v=>{writes.push([r,c,v]);rows[r-1][c-1]=v;}})};
  const context=vm.createContext({managerApi_:fn=>fn(email),LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},TASK_HUB:{SPREADSHEET_ID:'test',SHEET_NAME:'Tasks',DATA_START:2},CONFIG:{MANAGER_EMAIL:'manager@test'},PropertiesService:{getScriptProperties:()=>({getProperty:()=>''})},managerReadUsers_:()=>[{email:'boe@test',pic:'BOE',role:'Nhân viên'},{email:'luna@test',pic:'LUNA',role:'Nhân viên'}],managerReadTaskOptions_:()=>({statuses:['Pending','Done']}),CacheService:{getScriptCache:()=>({remove(){}})},console});
  vm.runInContext(source,context);
  return {move:context.apiMoveTask,writes,rows};
}
test('Duplicate IDs update the specified row only',()=>{const f=fixture();f.move({id:'DUP',row:3,status:'On going',expectedStatus:'Pending'});assert.deepEqual(f.writes,[[3,3,'On going']]);assert.equal(f.rows[1][2],'Done');});
test('PIC can move own task; another PIC cannot',()=>{const f=fixture({email:'boe@test'});f.move({id:'DUP',row:3,status:'Feedback',expectedStatus:'Pending'});const denied=fixture({email:'luna@test'});assert.throws(()=>denied.move({id:'DUP',row:3,status:'Done',expectedStatus:'Pending'}),/Chỉ quản lý/);assert.equal(denied.writes.length,0);});
test('Concurrent status and moved-row conflicts do not overwrite data',()=>{const f=fixture({status:'Feedback'});assert.throws(()=>f.move({id:'DUP',row:3,status:'Done',expectedStatus:'Pending'}),/người khác/);assert.throws(()=>f.move({id:'CHANGED',row:3,status:'Done',expectedStatus:'Feedback'}),/di chuyển/);assert.equal(f.writes.length,0);});
test('Invalid statuses and rows are rejected before write',()=>{const f=fixture();assert.throws(()=>f.move({id:'DUP',row:3,status:'invalid',expectedStatus:'Pending'}),/không hợp lệ/);assert.throws(()=>f.move({id:'DUP',row:1,status:'Done'}),/thay đổi/);assert.equal(f.writes.length,0);});
