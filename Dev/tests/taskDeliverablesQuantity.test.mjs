import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDeliverableQuantity } from '../src/lib/taskDeliverables.ts';

test('deliverable quantity sums base quantity and checklist quantity (Slide 5 REQ-TOT-07)', () => {
  // Case: Mockup chăn gối with base quantity 2 (or 4) and 2 checklist items with 2 each
  const caseWithChecklist = {
    quantity: 2,
    checklist_items: [
      { id: '1', title: 'Mockup Chăn', quantity: 2, completed: false },
      { id: '2', title: 'Mockup Gối', quantity: 2, completed: true },
    ],
  };

  const result = computeDeliverableQuantity(caseWithChecklist);
  assert.equal(result.baseQuantity, 2);
  assert.equal(result.checklistQuantity, 4);
  assert.equal(result.totalQuantity, 6, 'Total quantity must be base (2) + checklist (4) = 6');
});

test('deliverable quantity falls back to base quantity when checklist items have no quantity', () => {
  const caseChecklistWithoutQty = {
    quantity: 5,
    checklist_items: [
      { id: '1', title: 'Check 1', completed: false },
      { id: '2', title: 'Check 2', quantity: null, completed: true },
      { id: '3', title: 'Check 3', quantity: 0, completed: false },
    ],
  };

  const result = computeDeliverableQuantity(caseChecklistWithoutQty);
  assert.equal(result.baseQuantity, 5);
  assert.equal(result.checklistQuantity, 0);
  assert.equal(result.totalQuantity, 5, 'When checklist has no quantity, fall back to base quantity 5');
});

test('deliverable quantity falls back to base quantity when no checklist items exist', () => {
  const caseNoChecklist = {
    quantity: 3,
    checklist_items: [],
  };

  const result = computeDeliverableQuantity(caseNoChecklist);
  assert.equal(result.baseQuantity, 3);
  assert.equal(result.checklistQuantity, 0);
  assert.equal(result.totalQuantity, 3);
});

test('deliverable quantity is zero when neither checklist nor base quantity is provided', () => {
  const caseEmpty = {
    quantity: null,
    checklist_items: [],
  };

  const result = computeDeliverableQuantity(caseEmpty);
  assert.equal(result.baseQuantity, 0);
  assert.equal(result.checklistQuantity, 0);
  assert.equal(result.totalQuantity, 0, 'Unspecified output must not invent an image/file');
});

test('checklist deadline extension correctly identifies when task deadline must extend', () => {
  const currentTaskDue = '2026-11-05';
  const parentProjectDue = '2026-11-20';

  const validateAndCheckExtension = (itemDue, taskDue, parentDue) => {
    const itemDueNorm = (itemDue || '').slice(0, 10);
    const taskDueNorm = (taskDue || '').slice(0, 10);
    const parentDueNorm = (parentDue || '').slice(0, 10);

    if (itemDueNorm && parentDueNorm && itemDueNorm > parentDueNorm) {
      throw new Error('Checklist item deadline cannot exceed project deadline.');
    }
    return Boolean(itemDueNorm && (!taskDueNorm || itemDueNorm > taskDueNorm));
  };

  // Case 1: item due is before task due -> no extension, no error
  assert.equal(validateAndCheckExtension('2026-11-03', currentTaskDue, parentProjectDue), false);

  // Case 2: item due is after task due, but within parent project due -> extends deadline
  assert.equal(validateAndCheckExtension('2026-11-10', currentTaskDue, parentProjectDue), true);

  // Case 3: item due exceeds parent project due -> throws error
  assert.throws(
    () => validateAndCheckExtension('2026-11-25', currentTaskDue, parentProjectDue),
    /Checklist item deadline cannot exceed project deadline/
  );

  // Case 4: task has no due date -> always extends
  assert.equal(validateAndCheckExtension('2026-11-10', null, parentProjectDue), true);
});
