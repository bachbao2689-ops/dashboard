import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('app.js','utf8');
const code=source.slice(source.indexOf('function autoTheme('),source.indexOf('function calClear('));
function calendar(start){const ctx=vm.createContext({Date,_calState:{start,month:start.getMonth(),year:start.getFullYear()},calRender(){}});vm.runInContext(code,ctx);return ctx;}
test('Calendar shortcuts include exactly 3, 7 and 14 dates across months',()=>{
  for(const [preset,count] of [['3days',3],['1week',7],['2weeks',14]]){
    const c=calendar(new Date(2026,8,30));c.calPreset(preset);
    assert.equal(Math.round((c._calState.end-c._calState.start)/86400000)+1,count);
    assert.equal(c.autoTheme(c._calState.start,c._calState.end),preset);
  }
});
test('Today resets an old selection to the current date',()=>{
  const c=calendar(new Date(2020,0,1));c.calPreset('today');
  assert.equal(c._calState.start.toDateString(),new Date().toDateString());
  assert.equal(+c._calState.start,+c._calState.end);
});
