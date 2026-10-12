import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskProgress, workflowLink, inputDate } from '../src/lib/workflowHub.ts';
test('progress uses actual completion statuses; empty phases have no invented percentage', () => {
  assert.deepEqual(taskProgress([]), { total: 0, done: 0, percent: null });
  assert.deepEqual(taskProgress([{ status:'done' },{ status:'completed' },{ status:'todo' },{ status:'deleted' }]), { total:3,done:2,percent:67 });
});
test('source links address existing Workflow tab and preserve exact parent type/id', () => {
  assert.equal(workflowLink('project','abc'), '/?project=abc');
  assert.equal(workflowLink('campaign','abc'), '/?campaign=abc');
  assert.equal(inputDate('12/10/2026'),'2026-10-12');
});
