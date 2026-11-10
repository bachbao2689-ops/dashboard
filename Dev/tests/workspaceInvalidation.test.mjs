import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceChangeRelevant as relevant} from '../src/lib/workspaceInvalidation.ts';

const actor = {id: 7, name: 'Test PIC'};
for (const resource of ['tasks', 'workflow']) {
  test(`${resource}: ordinary comments and another PIC mention do not reload shared data`, () => {
    assert.equal(relevant(resource, {table: 'activity_log', eventType: 'INSERT', new: {action: 'comment', metadata: {body: 'An update', mentions: [8]}}}, actor), false);
    assert.equal(relevant(resource, {table: 'comments', eventType: 'INSERT', new: {mentions: [8]}}, actor), false);
  });
  test(`${resource}: structured and legacy mentions refresh access, including revoked mentions`, () => {
    assert.equal(relevant(resource, {table: 'activity_log', eventType: 'INSERT', new: {action: 'comment', metadata: {mentions: ['7']}}}, actor), true);
    assert.equal(relevant(resource, {table: 'activity_log', eventType: 'INSERT', new: {action: 'comment', metadata: {body: 'Please check @TestPIC'}}}, actor), true);
    assert.equal(relevant(resource, {table: 'comments', eventType: 'INSERT', new: {mentions: ['7']}}, actor), true);
    assert.equal(relevant(resource, {table: 'activity_log', eventType: 'UPDATE', new: {action: 'comment', metadata: {mentions: []}}}, actor), true);
    assert.equal(relevant(resource, {table: 'activity_log', eventType: 'DELETE'}, actor), true);
    assert.equal(relevant(resource, {}, actor), true);
  });
}
test('task details and Workflow assets invalidate only their corresponding snapshot', () => {
  const change = action => ({table: 'activity_log', eventType: 'INSERT', new: {action}});
  assert.equal(relevant('tasks', change('details_updated'), actor), true);
  assert.equal(relevant('workflow', change('details_updated'), actor), false);
  assert.equal(relevant('workflow', change('attachment_added'), actor), true);
  assert.equal(relevant('tasks', change('attachment_added'), actor), false);
});
test('team ownership and account scope changes invalidate cached reads, while avatar changes do not', () => {
  const before={department_id:'D',role:'leader',employment_level:'Leader',is_active:true,auth_id:'actor-auth',avatar_url:'old'};
  for(const resource of ['tasks','workflow']){
    assert.equal(relevant(resource,{table:'users',eventType:'UPDATE',old:before,new:{...before,avatar_url:'new'}},actor),false);
    for(const [field,value] of [['department_id','M'],['role','member'],['employment_level','Staff'],['is_active',false],['auth_id','new-auth']]){
      assert.equal(relevant(resource,{table:'users',eventType:'UPDATE',old:before,new:{...before,[field]:value}},actor),true,field);
    }
    assert.equal(relevant(resource,{table:'users',eventType:'UPDATE',old:{id:7},new:before},actor),true);
    assert.equal(relevant(resource,{table:'users',eventType:'DELETE'},actor),true);
  }
});
