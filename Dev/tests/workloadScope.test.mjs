import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeTeamWorkload } from '../src/lib/workloadScope.ts';

const departments = [
  { id: 'design', name: 'Design' },
  { id: 'marketing', name: 'Marketing' },
];
const users = [
  { id: 1, department_id: 'design' },
  { id: 2, department_id: 'design' },
  { id: 3, department_id: 'marketing' },
];
const tasks = [
  { id: 'own', assignee_id: 2, department_id: 'design' },
  { id: 'cross-assigned-to-own-team', assignee_id: 2, department_id: 'marketing' },
  { id: 'other', assignee_id: 3, department_id: 'marketing' },
  { id: 'other-member-in-own-project', assignee_id: 3, department_id: 'design' },
  { id: 'unassigned-own', assignee_id: null, department_id: 'design' },
  { id: 'unassigned-other', assignee_id: null, project: { department_id: 'marketing' } },
];
const ids = (rows) => rows.map(row => row.id).sort();

test('department Leader sees only own team even with stale foreign filter and cross-team task access', () => {
  const leader = { id: 1, role: 'manager', employment_level: 'Leader', department_id: 'design' };
  for (const filter of ['all', 'marketing']) {
    const scope = scopeTeamWorkload(leader, filter, users, departments, tasks);
    assert.equal(scope.canViewAllDepartments, false);
    assert.equal(scope.effectiveDepartmentFilter, 'design');
    assert.deepEqual(ids(scope.departments), ['design']);
    assert.deepEqual(ids(scope.users), [1, 2]);
    assert.deepEqual(ids(scope.tasks), ['cross-assigned-to-own-team', 'own', 'unassigned-own']);
  }
});

test('staff with a department sees only own team; unassigned staff sees self', () => {
  const staff = { id: 2, role: 'member', department_id: 'design' };
  assert.deepEqual(ids(scopeTeamWorkload(staff, 'marketing', users, departments, tasks).users), [1, 2]);
  const unassigned = { id: 2, role: 'member', department_id: null };
  const scope = scopeTeamWorkload(unassigned, 'all', users, departments, tasks);
  assert.equal(scope.effectiveDepartmentFilter, 'self');
  assert.deepEqual(scope.departments, []);
  assert.deepEqual(ids(scope.users), [2]);
  assert.deepEqual(ids(scope.tasks), ['cross-assigned-to-own-team', 'own']);
});

test('global Manager can see all teams or one selected team', () => {
  const manager = { id: 1, role: 'manager', employment_level: 'Manager', department_id: 'design' };
  const all = scopeTeamWorkload(manager, 'all', users, departments, tasks);
  assert.equal(all.canViewAllDepartments, true);
  assert.deepEqual(ids(all.users), [1, 2, 3]);
  assert.deepEqual(ids(all.tasks), ids(tasks));
  const marketing = scopeTeamWorkload(manager, 'marketing', users, departments, tasks);
  assert.deepEqual(ids(marketing.users), [3]);
  assert.deepEqual(ids(marketing.tasks), ['other', 'other-member-in-own-project', 'unassigned-other']);
  assert.equal(scopeTeamWorkload(manager, 'missing', users, departments, tasks).effectiveDepartmentFilter, 'all');
});

test('own department stays visible when directory names are temporarily missing', () => {
  const profile = { id: 1, role: 'leader', department_id: 'design', department_name: 'Design' };
  const scope = scopeTeamWorkload(profile, 'marketing', users, [], tasks);
  assert.deepEqual(scope.departments, [{ id: 'design', name: 'Design' }]);
  assert.deepEqual(ids(scope.tasks), ['cross-assigned-to-own-team', 'own', 'unassigned-own']);
});

test('missing profile exposes no Workload data', () => {
  const scope = scopeTeamWorkload(null, 'all', users, departments, tasks);
  assert.deepEqual(scope.users, []);
  assert.deepEqual(scope.tasks, []);
  assert.deepEqual(scope.departments, []);
});
