import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDeliverableQuantity } from '../src/lib/taskDeliverables.ts';

test('deliverable quantity avoids double-counting checklist items with base quantity', () => {
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
  assert.equal(result.totalQuantity, 4, 'Total quantity must be 4, NOT 6 (no double counting)');
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

test('deliverable quantity falls back to 1 when neither checklist nor base quantity is provided', () => {
  const caseEmpty = {
    quantity: null,
    checklist_items: [],
  };

  const result = computeDeliverableQuantity(caseEmpty);
  assert.equal(result.baseQuantity, 0);
  assert.equal(result.checklistQuantity, 0);
  assert.equal(result.totalQuantity, 1, 'Default fallback is 1 deliverable unit');
});

test('controller mapping computes total quantity without double counting', () => {
  // Logic from useProjectsController.tsx
  const subtasks = [
    { id: 'sub-1', quantity: 2 },
    { id: 'sub-2', quantity: 3 },
    { id: 'sub-3', quantity: null },
  ];

  const metadataRows = {
    'sub-1': {
      quantity: 2,
      checklist_items: [
        { id: 'c1', quantity: 2 },
        { id: 'c2', quantity: 2 },
      ],
    },
    'sub-2': {
      quantity: 3,
      checklist_items: [
        { id: 'c3', quantity: null },
      ],
    },
    'sub-3': {
      checklist_items: [
        { id: 'c4', quantity: 5 },
      ],
    },
  };

  const quantities = {};
  Object.entries(metadataRows).forEach(([entityId, meta]) => {
    const items = Array.isArray(meta.checklist_items) ? meta.checklist_items : [];
    const checklistQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const rowQty = Number(meta.quantity) || 0;
    const subtaskRow = subtasks.find(item => item.id === entityId);
    const baseQty = Number(subtaskRow?.quantity) || rowQty || 0;
    const total = checklistQty > 0 ? checklistQty : baseQty;
    if (total > 0) {
      quantities[entityId] = total;
    }
  });

  assert.equal(quantities['sub-1'], 4, 'sub-1 should have quantity 4 from checklist items, not 2 + 4 = 6');
  assert.equal(quantities['sub-2'], 3, 'sub-2 has no item quantities, should preserve base quantity 3');
  assert.equal(quantities['sub-3'], 5, 'sub-3 has item quantity 5, total should be 5');
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
