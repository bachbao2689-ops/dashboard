import test from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, localDay } from '../src/lib/workflowHub.ts';
import { phaseLinkableTasks } from '../src/lib/taskTracking.ts';
import { checklistTaskKey } from '../src/lib/taskChecklist.ts';

test('unplanned tasks filter: excludes tasks already assigned to a phase and checklist child items', () => {
  const tasks = [
    { id: 'task-1', title: 'Task without phase', workflow_phase_id: null },
    { id: 'task-2', title: 'Task with phase', workflow_phase_id: 'phase-uuid-1' },
    { id: 'ps-subtask-1', title: 'Subtask without phase', workflow_phase_id: null },
    { id: checklistTaskKey('task-1', 'chk-1'), title: 'Checklist item', workflow_phase_id: null },
    { id: 'task-done', title: 'Done task', workflow_phase_id: null, status: 'completed' },
    { id: 'ps-subtask-done', title: 'Done subtask', workflow_phase_id: null, status: 'done' },
    { id: 'task-cancelled', title: 'Cancelled task', workflow_phase_id: null, status: 'cancelled' },
  ];

  const unplanned = phaseLinkableTasks(tasks);
  assert.equal(unplanned.length, 2);
  assert.equal(unplanned[0].id, 'task-1');
  assert.equal(unplanned[1].id, 'ps-subtask-1');
});

test('deadline daysUntil: accurately categorizes late, today, and future remaining days', () => {
  const today = localDay(new Date());
  assert.equal(daysUntil(today), 0);

  const pastDate = '2026-10-20';
  const lateDays = daysUntil(pastDate);
  assert.ok(lateDays !== null && lateDays < 0);

  const futureDate = '2026-12-31';
  const futureDays = daysUntil(futureDate);
  assert.ok(futureDays !== null && futureDays > 0);

  assert.equal(daysUntil(null), null);
  assert.equal(daysUntil(undefined), null);
});
