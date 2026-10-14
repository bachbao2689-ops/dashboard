import test from 'node:test';
import assert from 'node:assert/strict';
import {taskTarget,taskKey,entityLink,taskActive,taskOpen,taskOverdue,completionMetrics} from '../src/lib/taskTracking.ts';
import {buildReportAnalytics,reportPeriod} from '../src/lib/reportAnalytics.ts';
import {tasksForWeeklyReport} from '../src/lib/weeklyReport.ts';
import {buildDepartmentTracking} from '../src/lib/departmentTracking.ts';
const now=new Date('2026-10-14T12:00:00+07:00');
const base={id:'a',title:'Task',status:'todo',priority:'medium',created_at:'2026-09-01T05:00:00Z'};
test('kind and UUID stay distinct in notification links and writes',()=>{
 const id='same-id';assert.deepEqual(taskTarget(taskKey('project_subtask',id)),{kind:'project_subtask',id,table:'project_subtasks'});
 assert.equal(entityLink('campaign_subtask',id),'/tasks?task=cs-same-id');assert.equal(entityLink('project',id),'/projects?project=same-id');assert.equal(entityLink('weekly_report',null),'/my-tasks?report=1');
});
test('cancelled/hidden work is excluded, completion recognizes Workflow, deadline day is inclusive',()=>{
 assert.equal(taskActive({status:'cancelled'}),false);assert.equal(taskOpen({status:'todo',workflow_status:'completed'}),false);assert.equal(taskOverdue({status:'todo',due_date:'2026-10-14'},'2026-10-14'),false);assert.equal(taskOverdue({status:'todo',due_date:'2026-10-13'},'2026-10-14'),true);
});
test('completion metrics use completion timestamps rather than latest edits',()=>{
 const metric=completionMetrics([{status:'done',start_date:'2026-10-01',completed_at:'2026-10-03T00:00:00Z',due_date:'2026-10-03',updated_at:'2026-10-14T00:00:00Z'},{status:'done',updated_at:'2026-10-14T00:00:00Z'}]);
 assert.equal(metric.averageDays,2);assert.equal(metric.onTime,100);assert.equal(metric.unknownCompletions,1);
});
test('weekly report does not move an old completion when it is edited or count cancelled tasks',()=>{
 const tasks=[{...base,id:'old',status:'done',completed_at:'2026-10-02T00:00:00Z',updated_at:'2026-10-14T00:00:00Z'},{...base,id:'open'},{...base,id:'unknown',status:'done'},{...base,id:'cancelled',status:'cancelled'}];
 assert.deepEqual(tasksForWeeklyReport(tasks,'2026-10-12','2026-10-18').map(t=>t.id),['open','unknown']);
});
test('period filters compare genuine completions and do not manufacture unknown dates',()=>{
 const tasks=[{...base,id:'current',status:'done',completed_at:'2026-10-13T00:00:00Z'},{...base,id:'previous',status:'done',completed_at:'2026-09-13T00:00:00Z'},{...base,id:'unknown',status:'done'},{...base,id:'open',due_date:'2026-10-13'},{...base,id:'cancelled',status:'cancelled'}];
 const data=buildReportAnalytics(tasks,'month',now);assert.equal(data.kpis.tasksCompleted,1);assert.equal(data.kpis.tasksCompletedPrev,1);assert.equal(data.completionTrend.reduce((n,p)=>n+p.completed,0),1);assert.equal(data.kpis.unknownCompletionDates,1);assert.equal(data.statusDistribution.reduce((n,p)=>n+p.value,0),data.scoped.length);
 assert.equal(buildReportAnalytics(tasks,'all',now).kpis.tasksCompleted,3);
});
test('empty analytics does not invent cycle times or previous all-time period',()=>{
 const data=buildReportAnalytics([],'all',now);assert.equal(data.kpis.avgCompletionTimeDays,null);assert.equal(data.kpis.tasksCompletedPrev,null);
 assert.equal(reportPeriod('quarter',now).start,'2026-10-01');assert.equal(reportPeriod('week',now).start,'2026-10-12');
});
test('department tracking includes legacy subtasks and distinguishes equal parent IDs across kinds',()=>{
 const tasks=[{...base,id:'ps-a',project_id:'same',department_id:'d',assignee_id:'1',status:'done',completed_at:'2026-10-13T00:00:00Z'},{...base,id:'cs-a',campaign_id:'same',department_id:'d',assignee_id:'1',due_date:'2026-10-13'}];
 const tracks=['project','campaign'].map(kind=>({id:kind,entity_type:kind,entity_id:'same',name:'Same title',status:'active',department_id:'d',phases:[],pics:[],start_date:null,due_date:'2026-10-20',root:false,asset:null}));
 const data=buildDepartmentTracking(tasks,[{id:'1',name:'Staff',department_id:'d'}],[{id:'d',name:'Design'}],tracks,'month',now);
 assert.equal(data.overall.comparison[0].total,2);assert.equal(data.detail.d.members[0].activeTasks,1);assert.equal(data.overall.projects[0].progress,100);assert.equal(data.overall.projects[1].progress,0);assert.equal(data.detail.d.kpis.budgetActual,null);
});
