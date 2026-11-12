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

test('phase and task contributors include multi-assignees from custom_fields.assignee_ids', () => {
  const people = [
    { id: 10, name: 'Lead', avatar_url: 'lead.png' },
    { id: 11, name: 'Staff A', avatar_url: 'staffA.png' },
    { id: 12, name: 'Staff B', avatar_url: 'staffB.png' },
  ];
  const tasks = [{
    assignee_id: 11,
    assignee: { id: 11, name: 'Staff A', avatar_url: 'staffA.png' },
    custom_fields: { assignee_ids: [11, 12] }
  }];
  const tc = taskContributors(tasks, people);
  assert.equal(tc.length, 2);
  assert.deepEqual(tc.map(p => p.id).sort(), [11, 12]);

  const pc = workflowPhaseContributors([{ ...people[0], role: 'pic' }], tasks, people);
  assert.equal(pc.length, 2); // Staff A and Staff B (Lead is role 'pic' not 'sub_pic')
  assert.deepEqual(pc.map(p => p.id).sort(), [11, 12]);
});
