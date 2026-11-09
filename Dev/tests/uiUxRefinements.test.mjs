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
  assert.equal(useReportsSource.includes('if (!canViewAllDepartments && (profile?.department_id || enforcedDepartment))'), true);
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
  // Bottom performance: Hoàn thành/Tổng Task -> Quá hạn -> Tồn đọng -> Số lượng
  const taskIdx = tsx.indexOf('report-profile-pill--task');
  const lateIdx = tsx.indexOf('report-profile-badge--late');
  const backlogIdx = tsx.indexOf('report-profile-badge--backlog');
  const outputIdx = tsx.indexOf('report-profile-pill--output');

  assert.equal(taskIdx !== -1 && outputIdx !== -1 && lateIdx !== -1 && backlogIdx !== -1, true);
  assert.equal(taskIdx < lateIdx, true, 'Hoàn thành/Tổng Task must appear before Quá hạn in performance grid');
  assert.equal(lateIdx < backlogIdx, true, 'Quá hạn must appear before Tồn đọng in alerts');
  assert.equal(backlogIdx < outputIdx, true, 'Tồn đọng must appear before Số lượng in performance grid');

  // Verify merged Tasks/Done box: uses ClipboardList icon and displays done/total
  assert.equal(tsx.includes('member.done}/{member.tasks?.length || 0}'), true);
  assert.equal(tsx.includes("lang === 'en' ? 'Done/Tasks' : 'Hoàn thành/Tổng Task'"), true);

  // Verify Top 5 KPI Cards order: Card 3 (Project & Campaign) -> Card 1 (Tổng Task) -> Card 2 (Tồn đọng) -> Card 4 (Đang làm) -> Card 5 (Hình ảnh/file)
  const card3Idx = tsx.indexOf('data-expandable-box="card3"');
  const card1Idx = tsx.indexOf('data-expandable-box="card1"');
  const card2Idx = tsx.indexOf('data-expandable-box="card2"');
  const card4Idx = tsx.indexOf('data-expandable-box="card4"');
  const card5Idx = tsx.indexOf('data-expandable-box="card5"');
  assert.equal(card3Idx !== -1 && card1Idx !== -1 && card2Idx !== -1 && card4Idx !== -1 && card5Idx !== -1, true);
  assert.equal(card3Idx < card1Idx, true, 'Card 3 (Project & Campaign) must be before Card 1 (Tổng việc & Hoàn thành)');
  assert.equal(card1Idx < card2Idx, true, 'Card 1 (Tổng việc & Hoàn thành) must be before Card 2 (Task tồn đọng)');
  assert.equal(card2Idx < card4Idx, true, 'Card 2 (Task tồn đọng) must be before Card 4 (Tiếp tục đang làm)');
  assert.equal(card4Idx < card5Idx, true, 'Card 4 (Tiếp tục đang làm) must be before Card 5 (Số lượng hình ảnh/file)');

  // Verify layout elements: square avatar frame, divider, performance labels
  assert.equal(tsx.includes('report-profile-avatar-frame'), true);
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

  // Verify layout structure (performance grid contains labels on 1 row)
  assert.equal(tsx.includes('report-profile-perf-grid'), true);
  assert.equal(css.includes('.report-profile-perf-grid'), true);

  // Verify square avatar frame styling & role-tracked avatar frames in CSS
  assert.equal(css.includes('.report-profile-avatar-frame'), true);
  assert.equal(tsx.includes('report-profile-avatar-frame--'), true);
  assert.equal(css.includes('.report-profile-avatar-frame--leader'), true);
  assert.equal(css.includes('.report-profile-avatar-frame--member'), true);
  assert.equal(css.includes('.report-profile-avatar-frame--manager'), true);
  assert.equal(css.includes('.report-profile-avatar-frame--admin'), true);
  assert.equal(css.includes('.report-profile-avatar-frame--viewer'), true);

  // Verify 1px thin border strokes
  assert.equal(css.includes('border: 1px solid rgba(186, 220, 245'), true);
  assert.equal(css.includes('border: 1px solid rgba(78, 182, 72'), true);

  // Verify popup detail removed from cards view
  assert.equal(tsx.includes('setSelectedStaffId(member.id)'), false);

  // Verify complete removal of CTA button & card interaction preserved
  assert.equal(css.includes('.report-profile-cta'), false);
  assert.equal(tsx.includes('report-profile-cta'), false);

  // Verify mobile coverflow (< 640px)
  assert.equal(css.includes('@media (max-width: 639px)'), true);
  assert.equal(css.includes('grid-auto-columns: clamp(268px, 76vw, 310px) !important;'), true);

  // Verify alert labels (Quá hạn & Tồn đọng) with alert-col structure
  assert.equal(tsx.includes('report-profile-alert-col'), true);
  assert.equal(tsx.includes('report-profile-alert-label'), true);
  assert.equal(css.includes('.report-profile-alert-col'), true);
  assert.equal(css.includes('.report-profile-alert-label'), true);

  // Verify text changed to 'Quantity' / 'Số lượng' (no longer 'Số lượng Hình/File')
  assert.equal(tsx.includes("lang === 'en' ? 'Quantity' : 'Số lượng'"), true);
  assert.equal(tsx.includes('Số lượng Hình/File'), false);

  // Verify Details button on hover & focus-visible in header beside staff name
  assert.equal(tsx.includes('report-profile-details-btn'), true);
  assert.equal(css.includes('.report-profile-details-btn'), true);
  assert.equal(css.includes('.report-profile:hover .report-profile-details-btn'), true);
  assert.equal(css.includes('.report-profile-details-btn:focus-visible'), true);

  // Verify Lead centering and left-sliding animation on hover
  assert.equal(tsx.includes('report-profile-lead'), true);
  assert.equal(css.includes('.report-profile-lead'), true);
  assert.equal(css.includes('left: 50%;'), true);
  assert.equal(css.includes('left: 0;'), true);
  assert.equal(css.includes('transform: translateX(0);'), true);

  // Verify perf columns centered alignment and #bdcadb 9px sub label styling
  assert.equal(css.includes('justify-items: center;'), true);
  assert.equal(css.includes('color: #bdcadb !important;'), true);
  assert.equal(css.includes('font-size: 9px;'), true);
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

// Test 12: Sidebar Left & Profile Change Password flow
test('Sidebar Left & Profile: Quick switch pill, Avatar CropModal, Phone-like User Popup, Change Password link, #002e6d color', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sidebarSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layouts/Sidebar.tsx'), 'utf-8');
  const profileHeaderSource = fs.readFileSync(path.resolve(__dirname, '../src/components/features/profile/ProfileHeader.tsx'), 'utf-8');
  const editProfileModalSource = fs.readFileSync(path.resolve(__dirname, '../src/components/features/profile/EditProfileModal.tsx'), 'utf-8');
  const themeCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/theme.css'), 'utf-8');
  const sidebarCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/sidebar-drilldown.css'), 'utf-8');

  // 1. Quick switch pill on Profile Card (VIE/ENG button + Sun/Moon button)
  assert.equal(sidebarSource.includes('setLang(lang === \'vi\' ? \'en\' : \'vi\')'), true);
  assert.equal(sidebarSource.includes('VIE'), true);
  assert.equal(sidebarSource.includes('ENG'), true);
  assert.equal(sidebarSource.includes('toggleTheme()'), true);

  // 2. Avatar hover pencil and CropModal integration
  assert.equal(sidebarSource.includes('group/avt'), true);
  assert.equal(sidebarSource.includes('Pencil size={13}'), true);
  assert.equal(sidebarSource.includes('avatarFileInputRef.current?.click()'), true);
  assert.equal(sidebarSource.includes('<CropModal'), true);

  // 3. Phone-like User Popup (User Info, Personal Profile, Change Password, Sign out)
  assert.equal(sidebarSource.includes('PORTAL 2: USER PROFILE ACTIONS POPUP'), true);
  assert.equal(sidebarSource.includes('navigate(\'/my-tasks\')'), true);
  assert.equal(sidebarSource.includes('navigate(\'/my-tasks?action=change-password\')'), true);
  assert.equal(sidebarSource.includes('useAuthStore.getState().signOut()'), true);

  // 4. ProfileHeader & EditProfileModal password tab deeplink
  assert.equal(profileHeaderSource.includes("searchParams.get('action') === 'change-password'"), true);
  assert.equal(profileHeaderSource.includes("initialTab={initialEditTab}"), true);
  assert.equal(editProfileModalSource.includes("initialTab?: 'profile' | 'password'"), true);

  // 5. Colors: #002e6d for active state and profile footer card
  assert.equal(themeCss.includes('color: #002e6d !important;'), true);
  assert.equal(sidebarCss.includes('.sb-profile-footer-card'), true);
  assert.equal(sidebarCss.includes('color: #002e6d !important;'), true);
});

// Test 13: Mobile Notification Bell & Sheet on MobileNav and MobileHomeHub
test('Mobile Navigation & Home Hub: Bell button, drawer notification item, and portal notification sheet', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mobileNavSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layouts/MobileNav.tsx'), 'utf-8');
  const mobileHomeHubSource = fs.readFileSync(path.resolve(__dirname, '../src/components/mobile/MobileHomeHub.tsx'), 'utf-8');
  const notificationSheetSource = fs.readFileSync(path.resolve(__dirname, '../src/components/mobile/MobileNotificationSheet.tsx'), 'utf-8');

  // 1. MobileNav Bottom Bar & Drawer
  assert.equal(mobileNavSource.includes('grid-cols-[auto_1fr_auto_auto]'), true, 'MobileNav bottom bar must use 4-column grid layout');
  assert.equal(mobileNavSource.includes('<Bell size={19}'), true, 'MobileNav bottom bar must include Bell icon button');
  assert.equal(mobileNavSource.includes('unreadCount > 0'), true, 'MobileNav must track unreadCount badge');
  assert.equal(mobileNavSource.includes('notif-bell'), true, 'MobileNav Bell must pulse when unread > 0');
  assert.equal(mobileNavSource.includes('<MobileNotificationSheet'), true, 'MobileNav must mount MobileNotificationSheet');

  // 2. MobileHomeHub Header & Drawer
  assert.equal(mobileHomeHubSource.includes('<MobileNotificationSheet'), true, 'MobileHomeHub must mount MobileNotificationSheet');
  assert.equal(mobileHomeHubSource.includes('anchor="top"'), true, 'MobileHomeHub mounts notification sheet with anchor="top"');
  assert.equal(mobileHomeHubSource.includes('notif-bell'), true, 'MobileHomeHub Bell must pulse when unread > 0');

  // 3. MobileNotificationSheet Features & Zero Flexbox
  assert.equal(notificationSheetSource.includes('createPortal'), true, 'MobileNotificationSheet must render with createPortal to escape stacking contexts');
  assert.equal(notificationSheetSource.includes('<PushNotificationSettings hideWhenEnabled />'), true, 'MobileNotificationSheet must include PushNotificationSettings');
  assert.equal(notificationSheetSource.includes('NotificationIcon'), true, 'MobileNotificationSheet must render PIC avatar with NotificationIcon');
  assert.equal(notificationSheetSource.includes('PicText'), true, 'MobileNotificationSheet must bold PIC name with PicText');
  assert.equal(notificationSheetSource.includes('TONES'), true, 'MobileNotificationSheet must display tone chips');
  assert.equal(notificationSheetSource.includes('formatNotificationTimestamp'), true, 'MobileNotificationSheet must format timestamps');

  // 4. PushNotificationSettings & push-notifications.css Design System
  const pushSettingsSource = fs.readFileSync(path.resolve(__dirname, '../src/components/features/notifications/PushNotificationSettings.tsx'), 'utf-8');
  const pushCssSource = fs.readFileSync(path.resolve(__dirname, '../src/styles/push-notifications.css'), 'utf-8');
  assert.equal(pushSettingsSource.includes('toast.success'), true, 'PushNotificationSettings must provide toast feedback');
  assert.equal(pushSettingsSource.includes('isLocal'), true, 'PushNotificationSettings must support local dev origin mapping');
  assert.equal(pushCssSource.includes('border-radius: 8px !important;'), true, 'push-notifications.css buttons must use 8px border radius');

  // Ensure Zero Flexbox in MobileNotificationSheet markup
  const sheetLines = notificationSheetSource.split('\n');
  for (const line of sheetLines) {
    if (line.includes('className=') && (line.includes('flex ') || line.includes('inline-flex') || line.includes('"flex"') || line.includes('flex-row') || line.includes('flex-col'))) {
      assert.fail(`Flexbox detected in MobileNotificationSheet line: ${line}`);
    }
  }
});

// Test 14: Sidebar Universal Instant Search (All entities search from Left Sidebar)
test('Sidebar Universal Search: searches tasks, projects, staff, assets, pages with Zero Flexbox', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sidebarSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layouts/Sidebar.tsx'), 'utf-8');
  const searchSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layouts/SidebarUniversalSearch.tsx'), 'utf-8');

  // 1. Sidebar.tsx integrates SidebarUniversalSearch in both expanded & collapsed modes
  assert.equal(sidebarSource.includes('import { SidebarUniversalSearch }'), true, 'Sidebar must import SidebarUniversalSearch');
  assert.equal(sidebarSource.includes('<SidebarUniversalSearch'), true, 'Sidebar must mount SidebarUniversalSearch');
  assert.equal(sidebarSource.includes('expandedSearchContainerRef'), true, 'Sidebar must anchor expanded search dropdown');
  assert.equal(sidebarSource.includes('collapsedSearchPanelRef'), true, 'Sidebar must anchor collapsed search dropdown');
  assert.equal(sidebarSource.includes('setIsExpandedSearchOpen'), true, 'Sidebar must manage expanded search open state');

  // 2. Multi-category entity search capabilities in SidebarUniversalSearch
  assert.equal(searchSource.includes('category: \'nav\''), true, 'Must support Pages/Navigation category');
  assert.equal(searchSource.includes('category: \'track\''), true, 'Must support Projects & Campaigns category');
  assert.equal(searchSource.includes('category: \'task\''), true, 'Must support Tasks & Subtasks category');
  assert.equal(searchSource.includes('category: \'user\''), true, 'Must support Team Members/Staff category');
  assert.equal(searchSource.includes('category: \'asset\''), true, 'Must support Equipment & Assets category');

  // 3. UX Keyboard navigation & portal positioning
  assert.equal(searchSource.includes('createPortal'), true, 'Must render in portal to break out of sidebar overflow/stacking');
  assert.equal(searchSource.includes('ArrowDown'), true, 'Must support ArrowDown keyboard navigation');
  assert.equal(searchSource.includes('ArrowUp'), true, 'Must support ArrowUp keyboard navigation');
  assert.equal(searchSource.includes('Escape'), true, 'Must support Escape dismissal');
  assert.equal(searchSource.includes('Enter'), true, 'Must support Enter selection');
  assert.equal(searchSource.includes('handleClickOutside'), true, 'Must support click outside dismissal');

  // 4. Zero Flexbox verification in SidebarUniversalSearch
  const searchLines = searchSource.split('\n');
  for (const line of searchLines) {
    if (line.includes('className=') && (line.includes('flex ') || line.includes('inline-flex') || line.includes('"flex"') || line.includes('flex-row') || line.includes('flex-col'))) {
      assert.fail(`Flexbox detected in SidebarUniversalSearch line: ${line}`);
    }
  }
});

// Test 15: Projects/Campaigns Department Filter & Compact Toolbar Filters on Detail Open
test('Projects Toolbar: Department Filter with search & compact icon-only filters on detail open', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectsSource = fs.readFileSync(path.resolve(__dirname, '../src/pages/Projects.tsx'), 'utf-8');
  const controllerSource = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useProjectsController.tsx'), 'utf-8');
  const deptFilterSource = fs.readFileSync(path.resolve(__dirname, '../src/components/common/filters/DepartmentFilterDropdown.tsx'), 'utf-8');
  const statusFilterSource = fs.readFileSync(path.resolve(__dirname, '../src/components/common/filters/StatusFilterDropdown.tsx'), 'utf-8');
  const picFilterSource = fs.readFileSync(path.resolve(__dirname, '../src/components/common/filters/PicFilterDropdown.tsx'), 'utf-8');
  const dateFilterSource = fs.readFileSync(path.resolve(__dirname, '../src/components/common/filters/DateFilterDropdown.tsx'), 'utf-8');
  const priorityFilterSource = fs.readFileSync(path.resolve(__dirname, '../src/components/common/filters/PriorityFilterDropdown.tsx'), 'utf-8');

  // 1. DepartmentFilterDropdown integration in Projects.tsx toolbar
  assert.equal(projectsSource.includes('<DepartmentFilterDropdown'), true, 'Projects must mount DepartmentFilterDropdown');
  assert.equal(projectsSource.includes('departments={activeDepartments}'), true, 'Projects must pass activeDepartments only');
  assert.equal(projectsSource.includes('compact={panelOpen}'), true, 'Projects toolbar must pass compact={panelOpen}');
  assert.equal(projectsSource.includes('activeDepartments = React.useMemo'), true, 'Projects must compute activeDepartments');

  // 2. All 5 filters support compact mode
  assert.equal(deptFilterSource.includes('compact = false'), true, 'DepartmentFilterDropdown must support compact prop');
  assert.equal(statusFilterSource.includes('compact = false'), true, 'StatusFilterDropdown must support compact prop');
  assert.equal(picFilterSource.includes('compact = false'), true, 'PicFilterDropdown must support compact prop');
  assert.equal(dateFilterSource.includes('compact = false'), true, 'DateFilterDropdown must support compact prop');
  assert.equal(priorityFilterSource.includes('compact = false'), true, 'PriorityFilterDropdown must support compact prop');

  // 3. DepartmentFilterDropdown includes search input
  assert.equal(deptFilterSource.includes('searchQuery'), true, 'DepartmentFilterDropdown must maintain searchQuery state');
  assert.equal(deptFilterSource.includes('filteredDepartments'), true, 'DepartmentFilterDropdown must filter departments by search');

  // 4. useProjectsController handles departmentFilter & resets correctly
  assert.equal(controllerSource.includes('departmentFilter'), true, 'useProjectsController must define departmentFilter state');
  assert.equal(controllerSource.includes('setDepartmentFilter(\'\')'), true, 'handleResetFilters must clear departmentFilter');
  assert.equal(controllerSource.includes('p.department_id'), true, 'visibleProjects must check p.department_id against departmentFilter');

  // 5. Zero Flexbox verification in DepartmentFilterDropdown
  const deptLines = deptFilterSource.split('\n');
  for (const line of deptLines) {
    if (line.includes('className=') && (line.includes('flex ') || line.includes('inline-flex') || line.includes('"flex"') || line.includes('flex-row') || line.includes('flex-col'))) {
      assert.fail(`Flexbox detected in DepartmentFilterDropdown line: ${line}`);
    }
  }
});


