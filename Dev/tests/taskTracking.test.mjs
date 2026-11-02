import test from 'node:test';
import assert from 'node:assert/strict';
import {taskTarget,taskKey,entityLink,taskActive,taskOpen,taskDone,taskOverdue,taskDueWithin,taskBucket,reportAnalytics,completionMetrics} from '../src/lib/taskTracking.ts';
import {mapWorkspaceTasks} from '../src/lib/workspaceTaskMapping.ts';
import {taskProgress,parentTasks} from '../src/lib/workflowHub.ts';
import {mapPriority,mapStatus} from '../src/components/features/tasks/list/taskListPresentation.ts';
import {tasksForProfileWeek as tasksForWeeklyReport} from '../src/lib/profileTaskTracking.ts';
import {tasksForWeeklyReport as tasksForEmailReport} from '../src/lib/weeklyReport.ts';
const base={id:'a',title:'Task',status:'todo',priority:'medium',created_at:'2026-09-01T05:00:00Z'};
test('kind and UUID stay distinct in notification links and writes',()=>{
 const id='same-id';assert.deepEqual(taskTarget(taskKey('project_subtask',id)),{kind:'project_subtask',id,table:'project_subtasks'});
 assert.equal(entityLink('campaign_subtask',id),'/tasks?task=cs-same-id');assert.equal(entityLink('project',id),'/projects?project=same-id');assert.equal(entityLink('weekly_report',null),'/my-tasks?report=1');
});
test('cancelled/hidden work is excluded, completion recognizes Workflow, deadline day is inclusive',()=>{
 assert.equal(taskActive({status:'cancelled'}),false);assert.equal(taskOpen({status:'todo',workflow_status:'completed'}),false);assert.equal(taskOverdue({status:'todo',due_date:'2026-10-14'},'2026-10-14'),false);assert.equal(taskOverdue({status:'todo',due_date:'2026-10-13'},'2026-10-14'),true);
});

test('report buckets follow Workflow stages and map legacy active rows to backlog',()=>{
 assert.equal(taskBucket({status:'active'},'2026-11-02'),'todo');
 assert.equal(taskBucket({status:'todo',workflow_status:'in_progress'},'2026-11-02'),'in_progress');
 assert.equal(taskBucket({status:'in_progress',workflow_status:'completed'},'2026-11-02'),'done');
 assert.equal(taskBucket({status:'done',workflow_status:'backlog'},'2026-11-02'),'todo');
 assert.equal(taskBucket({status:'in_progress',workflow_status:'in_qa'},'2026-11-02'),'in_review');
});
test('report analytics count Workflow completion and exclude canceled tasks consistently',()=>{
 const rows=[
  {id:'workflow-done',status:'in_progress',workflow_status:'completed',created_at:'2026-10-31T03:00:00Z',completed_at:'2026-11-01T03:00:00Z',assignee_id:7},
  {id:'legacy-active',status:'active',created_at:'2026-11-01T03:00:00Z',due_date:'2026-11-01',assignee_id:7},
  {id:'canceled-done',status:'done',workflow_status:'canceled',created_at:'2026-10-31T03:00:00Z',completed_at:'2026-11-01T03:00:00Z',assignee_id:8},
 ];
 const result=reportAnalytics(rows,'month',new Date('2026-11-02T12:00:00Z'));
 assert.equal(result.kpis.tasksCompleted,1);
 assert.equal(result.kpis.overdueRate,50);
 assert.deepEqual(result.statusDistribution.map(row=>row.name).sort(),['done','todo']);
 assert.equal(result.topPerformers.length,1);
});

test('completion metrics use completion timestamps rather than latest edits',()=>{
 const metric=completionMetrics([{status:'done',start_date:'2026-10-01',completed_at:'2026-10-03T00:00:00Z',due_date:'2026-10-03',updated_at:'2026-10-14T00:00:00Z'},{status:'done',updated_at:'2026-10-14T00:00:00Z'}]);
 assert.equal(metric.averageDays,2);assert.equal(metric.onTime,100);assert.equal(metric.unknownCompletions,1);
});
test('weekly report does not move an old completion when it is edited or count cancelled tasks',()=>{
 const tasks=[{...base,id:'old',status:'done',completed_at:'2026-10-02T00:00:00Z',updated_at:'2026-10-14T00:00:00Z'},{...base,id:'open'},{...base,id:'unknown',status:'done'},{...base,id:'cancelled',status:'cancelled'}];
 assert.deepEqual(tasksForWeeklyReport(tasks,'2026-10-12','2026-10-18').map(t=>t.id),['open','unknown']);
});
test('weekly staff report follows Workflow completion and excludes Workflow cancellation',()=>{
 const tasks=[
  {...base,id:'workflow-done',status:'in_progress',workflow_status:'completed',completed_at:'2026-11-03T00:00:00Z'},
  {...base,id:'workflow-canceled',status:'todo',workflow_status:'canceled'},
  {...base,id:'open',status:'active'},
 ];
 assert.deepEqual(tasksForEmailReport(tasks,'2026-11-02','2026-11-08').map(t=>t.id),['workflow-done','open']);
});

test('same normalized tasks feed Project, All Tasks and Workload without colliding IDs',()=>{
 const project={id:'parent',name:'Same name',status:'active',priority:'urgent',department_id:'dept'},campaign={...project,priority:'high'};
 const rows=mapWorkspaceTasks([{...base,id:'same',assignee_id:1,project_id:'parent',project}], [{...base,id:'same',assignee_id:1,project_id:'parent',projects:project,status:'done'}],[{...base,id:'same',assignee_id:1,campaign_id:'parent',campaigns:campaign}],new Map([['ps-same',{description:'Project description'}],['cs-same',{description:'Campaign description'}]]));
 assert.deepEqual(rows.map(t=>t.id),['same','ps-same','cs-same']);assert.equal(rows[1].priority,'urgent');assert.equal(rows[2].priority,'high');assert.equal(rows[1].description,'Project description');assert.equal(rows[2].description,'Campaign description');
 assert.deepEqual(taskProgress(parentTasks(rows,'project','parent')),{total:2,done:1,percent:50});assert.equal(parentTasks(rows,'campaign','parent').length,1);assert.equal(rows.filter(t=>String(t.assignee_id)==='1'&&taskOpen(t)).length,2);
});
test('hidden parents and hidden task rows are excluded from all shared views',()=>{
 const hidden={id:'p',status:'archived',name:'Hidden'};
 assert.equal(mapWorkspaceTasks([{...base,project:hidden}], [{...base,projects:hidden}], [{...base,campaigns:{...hidden,status:'deleted'}}]).length,0);
 assert.equal(mapWorkspaceTasks([{...base,status:'deleted'},{...base,status:'cancelled'}],[],[]).length,1);
});
test('All Tasks filters retain real urgent priority and cancelled status',()=>{
 assert.equal(mapPriority('urgent'),'Urgent');assert.equal(mapStatus('canceled'),'cancelled');
});

test('Campaign subtasks do not invent an unset priority',()=>{
 const [row]=mapWorkspaceTasks([],[],[{...base,campaign_id:'c',campaigns:{id:'c',name:'Campaign',status:'active'}}]);
 assert.equal(row.priority,'');assert.equal(mapPriority(row.priority),'—');
});

test('due-soon shortcuts and Dashboard include the last deadline day and exclude completed work',()=>{
 assert.equal(taskDueWithin({status:'todo',due_date:'2026-10-21'},'2026-10-14','2026-10-21'),true);
 assert.equal(taskDueWithin({status:'done',due_date:'2026-10-21'},'2026-10-14','2026-10-21'),false);
 assert.equal(taskDueWithin({status:'todo',due_date:'2026-10-22'},'2026-10-14','2026-10-21'),false);
});

test('completed work is hidden by default and only shown under completed or all filter',()=>{
 const tasks = [
  { ...base, id: '1', status: 'in_progress' },
  { ...base, id: '2', status: 'completed' },
  { ...base, id: '3', status: 'done' },
  { ...base, id: '4', status: 'todo' },
 ];
 const openTasks = tasks.filter(taskOpen);
 assert.deepEqual(openTasks.map(t => t.id), ['1', '4']);
 const doneTasks = tasks.filter(taskDone);
 assert.deepEqual(doneTasks.map(t => t.id), ['2', '3']);
 const allTasks = tasks.filter(taskActive);
 assert.deepEqual(allTasks.map(t => t.id), ['1', '2', '3', '4']);
});

