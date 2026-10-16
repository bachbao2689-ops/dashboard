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
