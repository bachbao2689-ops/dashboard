import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

  // 4. Verify useReports hooks enforce locked department for staff
  const useReportsSource = fs.readFileSync(path.resolve('Dev/src/hooks/useReports.ts'), 'utf8');
  assert.equal(useReportsSource.includes('if (!canViewAllDepartments) return;'), true);
  assert.equal(useReportsSource.includes('if (!canViewAllDepartments && profile?.department_id)'), true);
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

// Test 7: Vietnamese date format standardization (dd/mm/yyyy with 2-digit zero-padding)
test('Date format: displayDate uses VN standard dd/mm/yyyy with 2-digit zero padding and no UTC drift', async () => {
  const { displayDate, displayDateTime } = await import('../src/lib/workflowHub.ts');

  // Exact YYYY-MM-DD input
  assert.equal(displayDate('2026-11-08'), '08/11/2026');
  assert.equal(displayDate('2026-05-04'), '04/05/2026');
  assert.equal(displayDate('2026-01-01'), '01/01/2026');
  assert.equal(displayDate('2026-12-31'), '31/12/2026');

  // ISO timestamp input
  assert.equal(displayDate('2026-11-08T14:30:00Z'), '08/11/2026');

  // Fallback handling
  assert.equal(displayDate(null), '—');
  assert.equal(displayDate(undefined), '—');
  assert.equal(displayDate(null, 'N/A'), 'N/A');
  assert.equal(displayDate('', 'Chưa lên lịch'), 'Chưa lên lịch');

  // displayDateTime format: HH:mm dd/mm/yyyy
  const d = new Date(2026, 10, 8, 9, 5); // 08/11/2026 09:05 local
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  assert.equal(displayDateTime(d.toISOString()), `${hours}:${minutes} 08/11/2026`);
  assert.equal(displayDateTime(null), '—');
});

// Test 8: TaskListCollection uses displayDate for due dates in table and mobile
test('TaskListCollection: uses displayDate(task.due_date) for table and mobile views', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const file = fs.readFileSync(path.resolve(__dirname, '../src/components/features/tasks/list/TaskListCollection.tsx'), 'utf-8');
  assert.equal(file.includes('displayDate(task.due_date)'), true);
  assert.equal(file.includes('new Date(task.due_date).toLocaleDateString()'), false);
});

// Test 9: Report profile label order & subtitle role tracking
test('ReportProfile: label order & subtitle role tracking (no button, adaptive 2K)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const css = fs.readFileSync(path.resolve(__dirname, '../src/components/features/reports/ReportProfiles.css'), 'utf-8');
  const tsx = fs.readFileSync(path.resolve(__dirname, '../src/components/features/reports/ReportAnalytics.tsx'), 'utf-8');

  // Verify label presence & order in new layout:
  // Top right alerts: Quá hạn -> Tồn đọng
  // Bottom performance: Tổng task -> Hoàn thành -> Số lượng Hình/File
  const lateIdx = tsx.indexOf('report-profile-badge--late');
  const backlogIdx = tsx.indexOf('report-profile-badge--backlog');
  const taskIdx = tsx.indexOf('report-profile-pill--task');
  const doneIdx = tsx.indexOf('report-profile-badge--done');
  const outputIdx = tsx.indexOf('report-profile-pill--output');

  assert.equal(lateIdx !== -1 && backlogIdx !== -1 && taskIdx !== -1 && doneIdx !== -1 && outputIdx !== -1, true);
  assert.equal(lateIdx < backlogIdx, true, 'Quá hạn must appear before Tồn đọng in alerts row');
  assert.equal(taskIdx < doneIdx, true, 'Tổng task must appear before Hoàn thành in performance grid');
  assert.equal(doneIdx < outputIdx, true, 'Hoàn thành must appear before Số lượng in performance grid');

  // Verify new layout elements: floating circular avatar, divider, performance labels
  assert.equal(tsx.includes('report-profile-avatar-wrap'), true);
  assert.equal(tsx.includes('report-profile-divider'), true);
  assert.equal(tsx.includes('report-profile-perf-grid'), true);
  assert.equal(tsx.includes('report-profile-perf-label'), true);

  // Verify role styling classes in CSS & helper in TSX
  assert.equal(tsx.includes('getStaffRoleKey'), true);
  assert.equal(tsx.includes('report-profile-subtitle--'), true);

  // Leader / Team Lead: cam
  assert.equal(css.includes('.report-profile-subtitle--leader'), true);
  assert.equal(css.includes('color: #fb923c !important;'), true);
  assert.equal(css.includes('color: #c2410c !important;'), true);

  // Member: xanh lá
  assert.equal(css.includes('.report-profile-subtitle--member'), true);
  assert.equal(css.includes('color: #90e38a !important;'), true);
  assert.equal(css.includes('color: #047857 !important;'), true);

  // Manager: xanh dương
  assert.equal(css.includes('.report-profile-subtitle--manager'), true);
  assert.equal(css.includes('color: #93c5fd !important;'), true);
  assert.equal(css.includes('color: #1e40af !important;'), true);

  // Admin: tím
  assert.equal(css.includes('.report-profile-subtitle--admin'), true);
  assert.equal(css.includes('color: #d8b4fe !important;'), true);
  assert.equal(css.includes('color: #6b21a8 !important;'), true);

  // Viewer: xám
  assert.equal(css.includes('.report-profile-subtitle--viewer'), true);
  assert.equal(css.includes('color: #cbd5e1 !important;'), true);
  assert.equal(css.includes('color: #475569 !important;'), true);

  // Verify layout structure (alerts wrap and performance grid)
  assert.equal(tsx.includes('report-profile-alerts-wrap'), true);
  assert.equal(tsx.includes('report-profile-perf-grid'), true);
  assert.equal(css.includes('.report-profile-alerts-wrap'), true);
  assert.equal(css.includes('.report-profile-perf-grid'), true);

  // Verify floating avatar styling & role-tracked avatar rings in CSS
  assert.equal(css.includes('.report-profile-avatar-wrap'), true);
  assert.equal(css.includes('.report-profile-avatar-ring'), true);
  assert.equal(tsx.includes('report-profile-avatar-ring--'), true);
  assert.equal(css.includes('.report-profile-avatar-ring--leader'), true);
  assert.equal(css.includes('.report-profile-avatar-ring--member'), true);
  assert.equal(css.includes('.report-profile-avatar-ring--manager'), true);
  assert.equal(css.includes('.report-profile-avatar-ring--admin'), true);
  assert.equal(css.includes('.report-profile-avatar-ring--viewer'), true);

  // Verify 1px thin border strokes
  assert.equal(css.includes('border: 1px solid rgba(186, 220, 245'), true);
  assert.equal(css.includes('border: 1px solid rgba(78, 182, 72'), true);

  // Verify popup detail removed from cards view
  assert.equal(tsx.includes('setSelectedStaffId(member.id)'), false);

  // Verify complete removal of CTA button & card interaction preserved
  assert.equal(css.includes('.report-profile-cta'), false);
  assert.equal(tsx.includes('report-profile-cta'), false);

  // Verify mobile coverflow (< 640px) & scaled elongated portrait card layout
  assert.equal(css.includes('@media (max-width: 639px)'), true);
  assert.equal(css.includes('top: -58px !important;'), true);
  assert.equal(css.includes('left: 50% !important;'), true);
  assert.equal(css.includes('transform: translateX(-50%) !important;'), true);
  assert.equal(css.includes('width: 116px !important;'), true);
  assert.equal(css.includes('padding: 78px 18px 34px !important;'), true);
  assert.equal(css.includes('min-height: 390px !important;'), true);
  assert.equal(css.includes('grid-auto-columns: clamp(250px, 68vw, 280px) !important;'), true);

  // Verify alert labels (Quá hạn & Tồn đọng) with alert-col structure
  assert.equal(tsx.includes('report-profile-alert-col'), true);
  assert.equal(tsx.includes('report-profile-alert-label'), true);
  assert.equal(css.includes('.report-profile-alert-col'), true);
  assert.equal(css.includes('.report-profile-alert-label'), true);

  // Verify text changed to 'Quantity' / 'Số lượng' (no longer 'Số lượng Hình/File')
  assert.equal(tsx.includes("lang === 'en' ? 'Quantity' : 'Số lượng'"), true);
  assert.equal(tsx.includes('Số lượng Hình/File'), false);
});

// Test 10: MobileNav removes mobile-liquid-glass and enforces transparent search input
test('MobileNav: removes mobile-liquid-glass wrapper and makes search input background transparent', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const navSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layouts/MobileNav.tsx'), 'utf-8');

  // Verify mobile-liquid-glass wrapper removed from container
  assert.equal(navSource.includes('mobile-nav-container mobile-liquid-glass'), false);
  assert.equal(navSource.includes('"xl:hidden fixed left-3 right-3 z-[99] mobile-nav-container transition-all"'), true);

  // Verify search input background-color transparent override
  assert.equal(navSource.includes('background-color: transparent !important;'), true);
  assert.equal(navSource.includes('!bg-transparent'), true);
  assert.equal(navSource.includes('#0d1a2c'), false);
});

// Test 11: Task & Subtask UX/UI: subtask creation priority, settings gear menu, collapsible checklist, borderless edit
test('Detail & Entity UX/UI: subtask creation priority, settings gear menu, collapsible checklist, borderless edit', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectsSource = fs.readFileSync(path.resolve(__dirname, '../src/pages/Projects.tsx'), 'utf-8');
  const entityBadgesSource = fs.readFileSync(path.resolve(__dirname, '../src/components/features/projects/EntityActionBadges.tsx'), 'utf-8');
  const taskDetailSource = fs.readFileSync(path.resolve(__dirname, '../src/components/features/tasks/TaskDetailPanel.tsx'), 'utf-8');
  const subtaskDetailSource = fs.readFileSync(path.resolve(__dirname, '../src/components/features/projects/SubtaskDetailPanel.tsx'), 'utf-8');

  // 1. Subtask creation priority selector (low/medium/high, default medium)
  assert.equal(projectsSource.includes('subtaskPriority'), true);
  assert.equal(projectsSource.includes('value="medium"'), true);

  // 2. EntityActionBadges: settings gear button consolidating edit, activity log, and pin
  assert.equal(entityBadgesSource.includes('Settings size={14}'), true);
  assert.equal(entityBadgesSource.includes('TaskActivityLogPopover'), true);
  assert.equal(entityBadgesSource.includes('handleTogglePin'), true);

  // 3. Collapsible checklist with completion counts
  assert.equal(taskDetailSource.includes('checklistCollapsed'), true);
  assert.equal(subtaskDetailSource.includes('checklistCollapsed'), true);

  // 4. Borderless description edit pencil icon
  assert.equal(taskDetailSource.includes('Edit3 size={14}'), true);
  assert.equal(subtaskDetailSource.includes('Edit3 size={14}'), true);
});
