import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Workflow Hub View: 2-step flow without auto-redirect on null selectedKey', () => {
  const hookSource = fs.readFileSync('Dev/src/hooks/useWorkflowManagement.ts', 'utf8');
  const pageSource = fs.readFileSync('Dev/src/pages/WorkflowManagement.tsx', 'utf8');
  const headerSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowScopeHeader.tsx', 'utf8');
  const hubViewSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowHubView.tsx', 'utf8');

  // 1. Hook doesn't auto-redirect when selectedKey is null
  assert.equal(hookSource.includes('handleBackToHub'), true);
  assert.equal(hookSource.includes('setParams({})'), true);

  // 2. Page renders WorkflowHubView when !currentEntity
  assert.equal(pageSource.includes('WorkflowHubView'), true);
  assert.equal(pageSource.includes('<WorkflowHubView model={model} />'), true);

  // 3. WorkflowScopeHeader provides back-to-hub button
  assert.equal(headerSource.includes('handleBackToHub'), true);
  assert.equal(headerSource.includes('All (${entities.length})'), true);

  // 4. Hub View includes 3 category tabs (Tất cả, Projects, Campaigns)
  assert.equal(hubViewSource.includes("setHubTab('all')"), true);
  assert.equal(hubViewSource.includes("setHubTab('project')"), true);
  assert.equal(hubViewSource.includes("setHubTab('campaign')"), true);

  // 5. Hub View includes 4 filter icon buttons: Search, Department, PIC, Status
  assert.equal(hubViewSource.includes('<Building2 size={15} />'), true);
  assert.equal(hubViewSource.includes('<Users size={15} />'), true);
  assert.equal(hubViewSource.includes('<CheckCircle2 size={15} />'), true);

  // 6. Hub View uses Zero Flexbox in layout containers (5 cards per row on large display)
  assert.equal(hubViewSource.includes('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6'), true);
  assert.equal(hubViewSource.includes('card-status-done'), true);
  assert.equal(hubViewSource.includes('card-status-overdue'), true);
  assert.equal(hubViewSource.includes('card-status-campaign'), true);
  assert.equal(hubViewSource.includes('card-status-project'), true);

  // 7. Card anatomy details (matching close-up design image)
  assert.equal(hubViewSource.includes('Phases)'), true);
  assert.equal(hubViewSource.includes('opacity-0 group-hover/card:opacity-100'), true);
  assert.equal(hubViewSource.includes('In-Progress'), true);
  assert.equal(hubViewSource.includes('projects.projectsAccordion'), true);
  assert.equal(hubViewSource.includes('projects.campaignsAccordion'), true);
  assert.equal(hubViewSource.includes('Lead'), true);

  // 8. Bottom legend bar and update time
  assert.equal(hubViewSource.includes('Task'), true);
  assert.equal(hubViewSource.includes('Project'), true);
  assert.equal(hubViewSource.includes('Campaign'), true);
  assert.equal(hubViewSource.includes('updateTimeStr'), true);

  // 9. Toolbar segmented pill container & priorityClass standard reuse
  assert.equal(hubViewSource.includes('p-0.5 rounded-[8px] bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs'), true);
  assert.equal(hubViewSource.includes('priorityClass(rawPriority)'), true);
  assert.equal(hubViewSource.includes('getCampaignPriority'), true);

  // 10. Department scope lock and resolvedDeptId fallback
  assert.equal(hubViewSource.includes('resolvedDeptId'), true);
  assert.equal(hubViewSource.includes('userIsRestricted'), true);
  assert.equal(hubViewSource.includes('disabled={userIsRestricted}'), true);

  // 11. Filtering active-only entities with phases
  assert.equal(hubViewSource.includes('totalPhases === 0'), true);
  assert.equal(hubViewSource.includes('isCompleted = entity.isCompletedEntity || isDone(entity.status)'), true);

  // 12. Phase Dots and Knob hover popovers with tasks and members
  assert.equal(hubViewSource.includes('group/dot'), true);
  assert.equal(hubViewSource.includes('group/knob'), true);
  assert.equal(hubViewSource.includes('activePhaseTasks'), true);

  // 13. Dropdown popovers with origin-top-left and glass backdrop (anchored left to prevent cutoff)
  assert.equal(hubViewSource.includes('origin-top-left transition-all duration-200 ease-out animate-in fade-in zoom-in-95'), true);
});

test('Work management tabs: Department scoping for restricted users (Leader/Staff)', () => {
  const taskListSource = fs.readFileSync('Dev/src/pages/TaskList.tsx', 'utf8');
  const projectsControllerSource = fs.readFileSync('Dev/src/hooks/useProjectsController.tsx', 'utf8');
  const campaignPanelSource = fs.readFileSync('Dev/src/components/features/projects/CampaignPanel.tsx', 'utf8');
  const workflowMgmtSource = fs.readFileSync('Dev/src/hooks/useWorkflowManagement.ts', 'utf8');

  // 1. TaskList department lock & filter
  assert.equal(taskListSource.includes('resolvedDeptId'), true);
  assert.equal(taskListSource.includes('userIsRestricted'), true);
  assert.equal(taskListSource.includes('isDepartmentDisabled={userIsRestricted}'), true);
  assert.equal(taskListSource.includes('departments={availableDepartments}'), true);

  // 2. Projects controller department filter
  assert.equal(projectsControllerSource.includes('resolvedDeptId'), true);
  assert.equal(projectsControllerSource.includes('userIsRestricted'), true);
  assert.equal(projectsControllerSource.includes('const inDept = Boolean(resolvedDeptId && p.department_id && String(p.department_id) === String(resolvedDeptId));'), true);

  // 3. CampaignPanel department filter
  assert.equal(campaignPanelSource.includes('resolvedDeptId'), true);
  assert.equal(campaignPanelSource.includes('userIsRestricted'), true);
  assert.equal(campaignPanelSource.includes('const inDept = Boolean(resolvedDeptId && c.department_id && String(c.department_id) === String(resolvedDeptId));'), true);

  // 4. WorkflowManagement department filter & redirect
  assert.equal(workflowMgmtSource.includes('resolvedDeptId'), true);
  assert.equal(workflowMgmtSource.includes('userIsRestricted'), true);
  assert.equal(workflowMgmtSource.includes('handleBackToHub()'), true);
});

test('Workflow Views: 10 UX/UI refinements, Zero Flexbox, and Spotlight Glow', () => {
  const hubSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowHubView.tsx', 'utf8');
  const kpisSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowKpis.tsx', 'utf8');
  const headerSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowScopeHeader.tsx', 'utf8');
  const timelineSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowStageTimeline.tsx', 'utf8');
  const toolbarSource = fs.readFileSync('Dev/src/components/features/workflow/WorkflowTimelineToolbar.tsx', 'utf8');

  // 1. Icon buttons move to row 3 under tab buttons and scaled 10%
  assert.equal(hubSource.includes('<RotateCcw size={14}'), true);

  // 2. Role-based view switching & title cleanup
  assert.equal(hubSource.includes('isAdmin(hub.profile)'), true);
  assert.equal(hubSource.includes('isGlobalManager(hub.profile)'), true);
  assert.equal(hubSource.includes('Hiệu suất cấp Quản lý (Overall)'), false);
  assert.equal(hubSource.includes('Hiệu suất cấp PM / Leader'), false);

  // 3. Neutral background for 6 boxes by default, no bullet dots
  assert.equal(hubSource.includes('bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80'), true);
  assert.equal(kpisSource.includes('bg-slate-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80'), true);

  // 4. Info buttons & marketing explanation popovers
  assert.equal(hubSource.includes('activeInfoBox'), true);
  assert.equal(kpisSource.includes('activeInfoBox'), true);
  assert.equal(hubSource.includes('Cơ chế: Dự án trễ hạn'), true);
  assert.equal(kpisSource.includes('Cơ chế: Công việc bị nghẽn'), true);

  // 5. Magnetic spotlight glow
  assert.equal(hubSource.includes('hover-magnetic-card'), true);
  assert.equal(kpisSource.includes('hover-magnetic-card'), true);
  assert.equal(timelineSource.includes('hover-magnetic-card'), true);
  assert.equal(hubSource.includes('handleMagneticMove'), true);
  assert.equal(kpisSource.includes('handleMagneticMove'), true);
  assert.equal(timelineSource.includes('handleMagneticMove'), true);

  // 6. WorkflowScopeHeader X clear button and auto-close
  assert.equal(headerSource.includes('onClick={() => setSearchEntityQuery(\'\')}'), true);
  assert.equal(headerSource.includes('setIsTitleDropdownOpen(false)'), true);

  // 7. 100% Zero Flexbox in all workflow detail & hub components
  const flexRegex = /className="[^"]*(\bflex\b|\binline-flex\b)/;
  assert.equal(flexRegex.test(hubSource), false);
  assert.equal(flexRegex.test(kpisSource), false);
  assert.equal(flexRegex.test(headerSource), false);
  assert.equal(flexRegex.test(timelineSource), false);
  assert.equal(flexRegex.test(toolbarSource), false);

  // 8. Calendar filter button in row 3 with checkDateMatch & presets
  assert.equal(hubSource.includes('Calendar as CalendarIcon'), true);
  assert.equal(hubSource.includes('checkDateMatch'), true);
  assert.equal(hubSource.includes('activePopup === \'calendar\''), true);

  // 9. Separate Phase N badge framing in Phase Dot and Knob
  assert.equal(hubSource.includes('extractCleanPhaseTitle'), true);
  assert.equal(hubSource.includes('<span>Phase {idx + 1}</span>'), true);
});
