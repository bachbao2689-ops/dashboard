import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskProgress, workflowLink, projectsLink, parentTasks, daysUntil, inputDate, workflowTaskPeople } from '../src/lib/workflowHub.ts';
test('progress uses actual completion statuses; empty phases have no invented percentage', () => {
  assert.deepEqual(taskProgress([]), { total: 0, done: 0, percent: null });
  assert.deepEqual(taskProgress([{ status:'done' },{ status:'completed' },{ status:'todo' },{ status:'deleted' }]), { total:3,done:2,percent:67 });
});
test('source links address existing Workflow tab and preserve exact parent type/id', () => {
  assert.equal(workflowLink('project','abc'), '/workflow?project=abc');
  assert.equal(workflowLink('campaign','abc'), '/workflow?campaign=abc');
  assert.equal(workflowLink('project','abc', 'phase-1'), '/workflow?project=abc&phase=phase-1');
  assert.equal(projectsLink('campaign','abc'), '/projects?campaign=abc');
  assert.equal(inputDate('12/10/2026'),'2026-10-12');
});
test('parent task scope includes canonical and legacy tasks without mixing nested project and campaign phases', () => {
  const rows = [{id:'p1',project_id:'p'}, {id:'ps-1',project_id:'p'}, {id:'c1',campaign_id:'c'}, {id:'cs-1',campaign_id:'c'}, {id:'nested',project_id:'p',campaign_id:'c'}, {id:'other',project_id:'other'}];
  assert.deepEqual(parentTasks(rows,'project','p').map(t=>t.id), ['p1','ps-1','nested']);
  assert.deepEqual(parentTasks(rows,'campaign','c').map(t=>t.id), ['c1','cs-1']);
});
test('deadline countdown uses Vietnam calendar days, preserves overdue and no deadline', () => {
  const now = new Date('2026-10-13T23:59:00+07:00');
  assert.equal(daysUntil('2026-10-14',now), 1);
  assert.equal(daysUntil('2026-10-13',now), 0);
  assert.equal(daysUntil('2026-10-12',now), -1);
  assert.equal(daysUntil(null,now), null);
});
test('parent creator with server root access can assign themselves without phase membership', () => {
  const creator = {id:17,name:'Creator',avatar_url:null};
  const pic = {id:11,name:'Parent PIC'};
  const member = {id:22,name:'Phase PIC',role:'pic'};
  assert.deepEqual(workflowTaskPeople({root:true,pics:[pic]},{members:[member]},creator).map(person=>person.id), [22,11,17]);
});
test('phase/task-only users do not gain extra assignee eligibility from their session', () => {
  const participant = {id:17,name:'Task participant'};
  assert.deepEqual(workflowTaskPeople({root:false,pics:[{id:11,name:'Parent PIC'}]},{members:[{id:22,name:'Phase PIC'}]},participant).map(person=>person.id), [22,11]);
  assert.deepEqual(workflowTaskPeople(undefined,undefined,participant), []);
});
test('parent PIC remains a single task assignee option when also assigned to phase', () => {
  const pic = {id:11,name:'Parent PIC'};
  assert.deepEqual(workflowTaskPeople({root:true,pics:[pic]},{members:[{...pic,role:'pic'}]},pic), [{...pic,role:'pic'}]);
});
test('server-supplied creator is an eligible assignee for other workflow managers without becoming a parent PIC', () => {
  const creator = {id:17,name:'Creator'};
  const pics = [{id:11,name:'Parent PIC'}];
  const phase = {members:[{id:22,name:'Phase PIC',role:'pic'}]};
  assert.deepEqual(workflowTaskPeople({root:false,pics,creator},phase,{id:22,name:'Phase PIC'}).map(person=>person.id), [22,11,17]);
  assert.deepEqual(pics, [{id:11,name:'Parent PIC'}]);
  assert.deepEqual(phase.members, [{id:22,name:'Phase PIC',role:'pic'}]);
});
