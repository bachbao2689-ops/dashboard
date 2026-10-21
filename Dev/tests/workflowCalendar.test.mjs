import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowCalendarWindow,workflowDateError,taskContributors,workflowPhaseContributors} from '../src/lib/workflowCalendar.ts';

test('calendar inherits Project/Campaign dates and narrows them to phase bounds',()=>{
 const parent={start_date:'2026-11-01',due_date:'2026-12-31'};
 assert.deepEqual(workflowCalendarWindow(parent),{start:'2026-11-01',due:'2026-12-31'});
 assert.deepEqual(workflowCalendarWindow(parent,{start_date:'2026-11-05',due_date:'2026-11-20'}),{start:'2026-11-05',due:'2026-11-20'});
 assert.deepEqual(workflowCalendarWindow(parent,{start_date:'2026-10-01',due_date:null}),{start:'2026-11-01',due:'2026-12-31'});
 assert.deepEqual(workflowCalendarWindow(),{start:'',due:''});
});
test('calendar accepts inclusive boundaries and rejects reversed or out-of-parent dates',()=>{
 const bounds={start:'2026-11-01',due:'2026-11-20'};
 assert.equal(workflowDateError(bounds.start,bounds.due,bounds),null);
 assert.equal(workflowDateError('2026-10-31','2026-11-10',bounds),'before');
 assert.equal(workflowDateError('2026-11-02','2026-11-21',bounds),'after');
 assert.equal(workflowDateError('2026-11-10','2026-11-09',bounds),'order');
});
test('task avatars use actual assignee identity and keep distinct people with identical names',()=>{
 assert.deepEqual(taskContributors([
 {assignee_id:'1',assignee:{name:'Staff',avatar_url:'a'}},
 {assignee_id:'1',assignee:{name:'Staff',avatar_url:'a'}},
 {assignee_id:'2',assignee:{name:'Staff',avatar_url:'b'}},
 {assignee_id:null,assignee:null}
 ]),[{id:1,name:'Staff',avatar_url:'a'},{id:2,name:'Staff',avatar_url:'b'}]);
});
test('phase contributor avatars include explicit Sub-PICs and assigned task staff without duplicates',()=>{
 const people=[{id:7,name:'Bach Bao',avatar_url:'staff.png'},{id:9,name:'Thao',avatar_url:'thao.png'}];
 assert.deepEqual(workflowPhaseContributors(
  [{...people[0],role:'sub_pic'}],
  [{assignee_id:7},{assignee_id:'9',assignee:null}],
  people,
 ),[
  {...people[0],role:'sub_pic'},
  people[1],
 ]);
});
