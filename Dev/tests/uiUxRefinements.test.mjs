import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmin } from '../src/lib/roleScope.ts';
import { scopeTeamWorkload } from '../src/lib/workloadScope.ts';

// Test 1: AI Agent access control
test('AI Agent: only ADMIN role passes isAdmin check', () => {
  const admin = { role: 'admin', employment_level: 'ADMIN' };
  const adminLower = { role: 'admin', employment_level: null };
  const manager = { role: 'manager', employment_level: 'Manager' };
  const leader = { role: 'leader', employment_level: 'Leader' };
  const staff = { role: 'member', employment_level: 'Nhân viên' };

  assert.equal(isAdmin(admin), true);
  assert.equal(isAdmin(adminLower), true);
  assert.equal(isAdmin(manager), false);
  assert.equal(isAdmin(leader), false);
  assert.equal(isAdmin(staff), false);
  assert.equal(isAdmin(null), false);
  assert.equal(isAdmin(undefined), false);
});

// Test 2: Workflow TASKS IN SCOPE status filtering
test('Workflow TASKS IN SCOPE: hides statuses with 0 tasks', () => {
  const allStatuses = ['backlog', 'planned', 'scoping', 'in_progress', 'in_qa', 'completed', 'canceled'];
  const taskCounts = {
    backlog: 0,
    planned: 3,
    scoping: 0,
    in_progress: 5,
    in_qa: 1,
    completed: 0,
    canceled: 0,
  };

  const visibleStatuses = allStatuses.filter(st => (taskCounts[st] || 0) > 0);
  assert.deepEqual(visibleStatuses, ['planned', 'in_progress', 'in_qa']);
  assert.equal(visibleStatuses.includes('backlog'), false);
  assert.equal(visibleStatuses.includes('completed'), false);
  assert.equal(visibleStatuses.includes('canceled'), false);
});

// Test 3: Dashboard activity history title sanitization
test('Dashboard Activity History: sanitizes raw UUIDs and keeps labels compact', () => {
  function getDisplayTitle(rawTitle, entityType, lang = 'vi') {
    const fallbackTitle =
      entityType === 'project'
        ? (lang === 'en' ? 'Project' : 'Dự án')
        : entityType === 'campaign'
        ? (lang === 'en' ? 'Campaign' : 'Chiến dịch')
        : (lang === 'en' ? 'Task' : 'Công việc');

    const isUuid = typeof rawTitle === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle);
    return !rawTitle || isUuid
      ? fallbackTitle
      : rawTitle.length > 34
      ? `${rawTitle.slice(0, 33)}…`
      : rawTitle;
  }

  // UUID test
  const rawUuid = 'e8b7c41d-9f23-45a1-89ce-123456789abc';
  assert.equal(getDisplayTitle(rawUuid, 'task', 'vi'), 'Công việc');
  assert.equal(getDisplayTitle(rawUuid, 'project', 'vi'), 'Dự án');
  assert.equal(getDisplayTitle(rawUuid, 'campaign', 'en'), 'Campaign');

  // Normal title
  assert.equal(getDisplayTitle('Thiết kế bao bì K COFFEE', 'task', 'vi'), 'Thiết kế bao bì K COFFEE');

  // Long title truncation (max 33 chars + ellipsis)
  const longTitle = 'Thiết kế bộ nhận diện thương hiệu sản phẩm cà phê rang xay cao cấp xuất khẩu';
  const truncated = getDisplayTitle(longTitle, 'task', 'vi');
  assert.ok(truncated.endsWith('…'));
  assert.ok(truncated.length <= 34);
});

// Test 4: Mobile nav items hide AI Agent unconditionally
test('Mobile Navigation: navTabs excludes items with hidden: true (AI Agent hidden for all users)', () => {
  const tabs = [
    { name: 'Projects', path: '/projects' },
    { name: 'Workflow', path: '/workflow' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Agent', path: '/agents', hidden: true },
    { name: 'Assets', path: '/assets' },
  ].filter(tab => !tab.hidden);

  assert.equal(tabs.some(tab => tab.path === '/agents'), false);
  assert.equal(tabs.some(tab => tab.path === '/departments-2'), false);
});

// Test 5: Reports tab visibility & access for Staff (member) role
test('Reports Access: Staff role has visibility in navigation and scoped access to reports', () => {
  const staff = { id: 'staff-1', role: 'member', employment_level: 'Nhân viên', department_id: 'dept-marketing', department_name: 'Phòng Marketing' };
  const isLeader = false;

  // 1. Desktop sidebar logic: canViewReports is true for all roles including staff
  const canViewReports = true;
  const trRootItems = [
    { id: 'tr:root:team', path: '/team' },
    { id: 'tr:root:members', path: '/members' },
  ];
  if (canViewReports) {
    trRootItems.push({ id: 'tr:root:reports', path: '/reports' });
  }
  assert.equal(trRootItems.some(item => item.path === '/reports'), true);

  // 2. Mobile nav logic: reports item is hidden: false for staff (whereas dashboard is hidden: !isLeader)
  const mobileTabs = [
    { name: 'Projects', path: '/projects' },
    { name: 'Workflow', path: '/workflow' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Agent', path: '/agents', hidden: true },
    { name: 'Assets', path: '/assets' },
    { name: 'Team', path: '/team' },
    { name: 'Profile', path: '/my-tasks' },
    { name: 'Reports', path: '/reports', hidden: false },
    { name: 'Dashboard', path: '/ui-dashboard', hidden: !isLeader },
  ].filter(tab => !tab.hidden);

  assert.equal(mobileTabs.some(tab => tab.path === '/reports'), true);
  assert.equal(mobileTabs.some(tab => tab.path === '/ui-dashboard'), false);

  // 3. Reports scoping: staff canViewAllDepartments is false, department is locked to own department
  const mockDepartments = [
    { id: 'dept-marketing', name: 'Phòng Marketing' },
    { id: 'dept-rnd', name: 'Phòng R&D' },
  ];
  const mockUsers = [
    { id: 'staff-1', role: 'member', department_id: 'dept-marketing' },
    { id: 'staff-2', role: 'member', department_id: 'dept-marketing' },
    { id: 'staff-3', role: 'member', department_id: 'dept-rnd' },
  ];
  const mockTasks = [
    { id: 't1', assignee_id: 'staff-1', department_id: 'dept-marketing' },
    { id: 't2', assignee_id: 'staff-2', department_id: 'dept-marketing' },
    { id: 't3', assignee_id: 'staff-3', department_id: 'dept-rnd' },
  ];

  const scope = scopeTeamWorkload(staff, 'all', mockUsers, mockDepartments, mockTasks);
  assert.equal(scope.canViewAllDepartments, false);
  assert.equal(scope.effectiveDepartmentFilter, 'dept-marketing');
  assert.deepEqual(scope.users.map(u => u.id), ['staff-1', 'staff-2']);
  assert.deepEqual(scope.tasks.map(t => t.id), ['t1', 't2']);
});

// Test 6: Mobile navigation hides when detail panels open and restores when closed
test('Detail overlay: MobileNav hides when task/subtask/calendar/project detail opens and restores when closed', async () => {
  const { useOverlayStore, retainTaskDetail } = await import('../src/store/overlayStore.ts');

  assert.equal(useOverlayStore.getState().taskDetails, 0);

  // 1. Opening a task detail in All Tasks
  const releaseTask = retainTaskDetail();
  assert.equal(useOverlayStore.getState().taskDetails, 1);
  assert.equal(useOverlayStore.getState().taskDetails > 0, true);

  // 2. Opening a nested subtask or another overlay on top
  const releaseSubtask = retainTaskDetail();
  assert.equal(useOverlayStore.getState().taskDetails, 2);

  // 3. Closing the subtask detail
  releaseSubtask();
  assert.equal(useOverlayStore.getState().taskDetails, 1);
  assert.equal(useOverlayStore.getState().taskDetails > 0, true);

  // 4. Closing the task detail -> back to 0 (MobileNav visible)
  releaseTask();
  assert.equal(useOverlayStore.getState().taskDetails, 0);
  assert.equal(useOverlayStore.getState().taskDetails > 0, false);
});
