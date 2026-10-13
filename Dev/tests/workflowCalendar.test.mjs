import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowCalendarWindow,workflowDateError,taskContributors} from '../src/lib/workflowCalendar.ts';

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
