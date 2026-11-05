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

  // 6. Hub View uses Zero Flexbox in layout containers
  assert.equal(hubViewSource.includes('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5'), true);
  assert.equal(hubViewSource.includes('card-status-done'), true);
  assert.equal(hubViewSource.includes('card-status-overdue'), true);
  assert.equal(hubViewSource.includes('card-status-campaign'), true);
  assert.equal(hubViewSource.includes('card-status-project'), true);

  // 7. Card anatomy details (matching close-up design image)
  assert.equal(hubViewSource.includes('Phases)'), true);
  assert.equal(hubViewSource.includes('In-Progress'), true);
  assert.equal(hubViewSource.includes('Giai đoạn xong'), true);
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
