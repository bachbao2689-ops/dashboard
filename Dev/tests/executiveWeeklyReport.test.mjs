import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportEntries, reportPeriodTasks, reportMetrics, normalizeOutputs, safeReportUrl } from '../src/lib/executiveWeeklyReport.ts';
import { scopeTeamWorkload } from '../src/lib/workloadScope.ts';
import { weeklyReportPrintHtml } from '../src/services/printWeeklyReport.ts';

const start = '2026-10-05', end = '2026-10-10';
const task = (id, values = {}) => ({ id, title: id, status: 'todo', assignee_id: '1', created_at: '2026-10-01', workspace_id: 'workspace', ...values });
const users = [{ id: '1', name: 'Designer', department_id: 'design' }, { id: '2', name: 'Marketing', department_id: 'marketing' }];

test('weekly results count actual completions in period and retain WIP without inventing dates', () => {
  const tasks = [task('wip'), task('closed', { status: 'done', completed_at: start }), task('workflow', { workflow_status: 'completed', completed_at: end }),
    task('old', { status: 'done', completed_at: '2026-10-04' }), task('future-completed', { status: 'done', completed_at: '2026-10-11' }),
    task('unknown', { status: 'done', updated_at: start }), task('future-created', { created_at: '2026-10-11' }), task('canceled', { status: 'canceled' }), task('hidden', { status: 'archived' })];
  assert.deepEqual(reportPeriodTasks(tasks, start, end).map(t => t.id), ['wip', 'closed', 'workflow', 'future-completed']);
});

test('work completed next week retains this week’s report and production as WIP', () => {
  const entries = buildReportEntries([task('carried', { status: 'done', workflow_status: 'completed', completed_at: '2026-10-12' })], users,
    [{ task_key: 'carried', user_id: 1, metadata: { body: 'Design delivered for review this week' } }],
    [{ entity_type: 'task', entity_id: 'carried', metadata: { outputs: [{ id: 'a', name: 'Banner', quantity: 4, unit: 'image' }] } }], start, end);
  assert.equal(entries[0].completedAfterPeriod, true);
  const metrics = reportMetrics(entries, end);
  assert.equal(metrics.done, 0); assert.equal(metrics.doing, 1); assert.equal(metrics.reported, 1); assert.equal(metrics.outputTotals.image, 4);
});

test('Leader scope survives a cached foreign department filter and includes the Leader’s own work', () => {
  const scope = scopeTeamWorkload({ id: 1, role: 'leader', department_id: 'design' }, 'marketing', users,
    [{ id: 'design', name: 'Design' }, { id: 'marketing', name: 'Marketing' }], [task('own'), task('foreign', { assignee_id: '2' })]);
  assert.deepEqual(buildReportEntries(scope.tasks, scope.users, [], [], start, end).map(entry => entry.id), ['own']);
});

test('task identities never collide across canonical, project and campaign stores', () => {
  const tasks = [task('shared'), task('ps-shared'), task('cs-shared')];
  const reports = [
    { task_key: 'shared', user_id: 2, metadata: { body: 'Previous assignee' } },
    { task_key: 'shared', user_id: 1, metadata: { body: 'Current assignee' } },
    { task_key: 'ps-shared', user_id: 1, metadata: { body: 'Project report' } },
  ];
  const outputs = [
    { entity_type: 'campaign_subtask', entity_id: 'shared', metadata: { channel: 'ECOM', outputs: [{ id: 'c', name: 'Catalog', quantity: 70, unit: 'page' }] } },
  ];
  const entries = buildReportEntries(tasks, users, reports, outputs, start, end);
  assert.equal(entries[0].body, 'Current assignee');
  assert.equal(entries[1].body, 'Project report');
  assert.equal(entries[2].channel, 'ECOM');
  assert.equal(entries[2].reported, false);
  assert.equal(entries[0].outputs.length, 0);
});

test('production units stay separate and old screenshots do not become output quantities', () => {
  const entries = buildReportEntries([task('1')], users, [{ task_key: '1', user_id: 1, metadata: { image_url: 'https://example.com/proof.png' } }], [{ entity_type: 'task', entity_id: '1', metadata: { outputs: [
    { id: 'a', name: 'Catalog', quantity: 70, unit: 'page' }, { id: 'b', name: 'Labels', quantity: 2, unit: 'sku' },
  ] } }], start, end);
  const metrics = reportMetrics(entries, end);
  assert.deepEqual(metrics.outputTotals, { image: 0, file: 0, page: 70, sku: 2, option: 0 });
  assert.equal(metrics.evidence, 1); assert.equal(metrics.reported, 1); assert.equal(metrics.done, 0);
});

test('latest output declaration can explicitly clear earlier quantities', () => {
  const records = [{ entity_type: 'task', entity_id: '1', metadata: { outputs: [] } }, { entity_type: 'task', entity_id: '1', metadata: { outputs: [{ name: 'Old', quantity: 5, unit: 'file' }] } }];
  assert.equal(buildReportEntries([task('1')], users, [], records, start, end)[0].outputs.length, 0);
});

test('invalid units, fractional counts and executable evidence links cannot enter output totals', () => {
  assert.equal(safeReportUrl('javascript:alert(1)'), ''); assert.equal(safeReportUrl('data:text/html,a'), '');
  const outputs = normalizeOutputs([{ quantity: -1, unit: 'image' }, { quantity: 1.5, unit: 'file' }, { quantity: 10, unit: 'unknown' }, { quantity: 1, unit: 'image', kind: 'image', url: 'javascript:alert(1)' }]);
  assert.equal(outputs.length, 1); assert.equal(outputs[0].url, ''); assert.equal(outputs[0].kind, 'link');
});

test('a submitted snapshot remains unchanged after live task updates and print content escapes text', () => {
  const entries = buildReportEntries([task('1', { title: '<script>alert(1)</script>' })], users, [], [], start, end);
  const snapshot = JSON.parse(JSON.stringify({ schema: 1, weekStart: start, weekEnd: end, departmentId: 'design', departmentName: 'Design', authorName: 'Leader', capturedAt: '2026-10-10T12:00:00Z', notes: { summary: '<img onerror=alert(1)>', decisions: '', nextWeek: '' }, entries }));
  entries[0].status = 'done'; entries[0].title = 'Changed';
  assert.equal(snapshot.entries[0].status, 'todo');
  const html = weeklyReportPrintHtml(snapshot, 'vi', true);
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;img onerror=alert(1)&gt;')); assert.ok(!html.includes('Changed'));
});
