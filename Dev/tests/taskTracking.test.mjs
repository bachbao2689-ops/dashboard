import test from 'node:test';
import assert from 'node:assert/strict';
import {entityHref,taskIdentity,taskUIId,reportAnalytics,weeklyActivity,isTaskClosed} from '../src/lib/taskTracking.ts';
import {tasksForWeeklyReport} from '../src/lib/weeklyReport.ts';
test('links preserve parent kind and legacy task identity including equal UUIDs',()=>{
 assert.equal(entityHref('campaign','abc'),'/projects?campaign=abc');
 assert.equal(entityHref('project_subtask','same'),'/tasks?task=ps-same');
 assert.equal(entityHref('campaign_subtask','same'),'/tasks?task=cs-same');
 assert.equal(entityHref('weekly_report',null),'/my-tasks');
 assert.equal(taskIdentity('cs-same').table,'campaign_subtasks');
 assert.equal(taskUIId('project_subtask','same'),'ps-same');
});
test('completed aliases, canceled tasks, real timestamps and date ranges agree across tabs',()=>{
 const tasks=[
  {id:'task',status:'done',created_at:'2026-10-05T00:00:00Z',completed_at:'2026-10-13T00:00:00Z',assignee_id:'1',assignee:{name:'PIC'},due_date:'2026-10-14'},
  {id:'ps-one',status:'completed',created_at:'2026-10-12T00:00:00Z',completed_at:'2026-10-14T00:00:00Z',assignee_id:'1'},
  {id:'cs-one',status:'todo',created_at:'2026-10-12T00:00:00Z',due_date:'2026-10-14'},
  {id:'old',status:'done',created_at:'2026-09-01T00:00:00Z',completed_at:'2026-09-10T00:00:00Z'},
  {id:'cancel',status:'cancelled',created_at:'2026-10-12T00:00:00Z'},
 ];
 const current=reportAnalytics(tasks,'week',new Date('2026-10-14T08:00:00Z'));
 assert.equal(current.kpis.tasksCompleted,2);
 assert.equal(current.kpis.overdueRate,0,'Today is not overdue');
 assert.equal(current.topPerformers[0].completed,2);
 assert.equal(current.completionTrend.reduce((a,b)=>a+b.completed,0),2);
 assert.equal(reportAnalytics(tasks,'month',new Date('2026-10-14T08:00:00Z')).kpis.tasksCompleted,2);
 assert.deepEqual(weeklyActivity(tasks,'2026-10-12','2026-10-18'),{created:3,done:2,doing:1});
 assert.deepEqual(tasksForWeeklyReport(tasks,'2026-10-12','2026-10-18').map(t=>t.id),['task','ps-one','cs-one']);
 assert.equal(isTaskClosed('complete'),true);
});
test('missing completion dates never turn description edits into completed work',()=>{
 const task={id:'legacy',status:'completed',created_at:'2026-09-01',updated_at:'2026-10-14'};
 assert.equal(reportAnalytics([task],'week',new Date('2026-10-14')).kpis.tasksCompleted,0);
 assert.equal(reportAnalytics([task],'all',new Date('2026-10-14')).kpis.avgCompletionTimeDays,null);
 assert.equal(tasksForWeeklyReport([task],'2026-10-12','2026-10-18').length,0);
});
