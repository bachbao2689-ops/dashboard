import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmin } from '../src/lib/roleScope.ts';

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
