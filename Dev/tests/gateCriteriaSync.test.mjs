import test from 'node:test';
import assert from 'node:assert/strict';
import {extractKeyGateCriteria, gateScore, gateReady} from '../src/lib/workflowHub.ts';
import {createSharedResource} from '../src/lib/sharedResource.ts';
import {workspaceChangeRelevant} from '../src/lib/workspaceInvalidation.ts';

const track = starred => ({phases: [{
  id: 'phase-completed', title: 'Approved phase', position: 1, status: 'completed',
  gate_criteria: [
    {id: 'review', label: 'Review deliverables', weight: 80, checked: true, starred},
    {id: 'handover', label: 'Handover', weight: 20, checked: true},
  ],
}]});

test('quick view uses persisted phase stars even when an old private preference disagrees', () => {
  const saved = track(true);
  assert.equal(extractKeyGateCriteria(saved, {review: false}).length, 1);
  assert.equal(extractKeyGateCriteria(track(false), {review: true}).length, 0);
  assert.equal(extractKeyGateCriteria(saved)[0].phaseId, 'phase-completed');
  assert.deepEqual(saved, track(true));
});

test('marking an approved criterion never changes score, checked values or readiness', () => {
  const before = track(false).phases[0].gate_criteria;
  const after = track(true).phases[0].gate_criteria;
  assert.equal(gateScore(before), gateScore(after));
  assert.equal(gateReady([{status: 'done'}], before), gateReady([{status: 'done'}], after));
  assert.deepEqual(after.map(({starred, ...criterion}) => criterion), before.map(({starred, ...criterion}) => criterion));
});

test('one phase change refreshes both workflow and project consumers from the shared snapshot', async () => {
  let saved = track(false), reads = 0;
  const resource = createSharedResource(async () => { reads++; return saved; });
  const workflow = [], projects = [];
  const capture = target => () => {
    const snapshot = resource.getSnapshot('staff-session');
    if (snapshot.data) target.push(extractKeyGateCriteria(snapshot.data).length);
  };
  const releaseWorkflow = resource.subscribe('staff-session', capture(workflow));
  const releaseProjects = resource.subscribe('staff-session', capture(projects));
  await resource.refresh('staff-session');
  saved = track(true);
  assert.equal(workspaceChangeRelevant('workflow', {table: 'workflow_phases', eventType: 'UPDATE'}, {id: 1}), true);
  resource.invalidate('staff-session', 42);
  resource.invalidate('staff-session', 42);
  await resource.refresh('staff-session');
  assert.equal(workflow.at(-1), 1);
  assert.equal(projects.at(-1), 1);
  assert.equal(reads, 2);
  releaseWorkflow(); releaseProjects(); resource.reset();
});
