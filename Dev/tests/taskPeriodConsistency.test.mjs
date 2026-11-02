import test from 'node:test';
import assert from 'node:assert/strict';
import {completedTaskDateMatch,visibleTaskSelection} from '../src/lib/taskListFilters.ts';
import {taskCompletedInPeriod} from '../src/lib/taskPeriod.ts';
import {reportPeriodTasks,reportTaskTotals} from '../src/lib/reportTaskTracking.ts';

const range={calendar:'custom',customStart:'2026-10-24',customEnd:'2026-10-31'};
const done=(id,due,completed)=>({id,status:'done',workflow_status:'completed',created_at:'2026-10-01T00:00:00Z',start_date:'2026-10-14',due_date:due,completed_at:completed,quantity:1});
const screenshotRows=[
 done('campaign-item-one','2026-10-31','2026-10-31T09:28:07Z'),
 done('campaign-item-two','2026-10-31','2026-10-31T09:28:10Z'),
 done('phase-task','2026-10-29','2026-10-31T12:53:42Z'),
 done('combo-one','2026-10-31','2026-11-02T02:45:26Z'),
 done('combo-two','2026-10-31','2026-11-02T02:45:27Z'),
 done('export-subtask','2026-10-24','2026-11-02T02:50:53Z'),
 done('mockup-subtask','2026-10-15','2026-11-02T02:50:52Z'),
 done('brief-task','2026-10-15','2026-11-02T08:41:17Z'),
];

test('the reported 8-versus-3 case gives exactly the same three Done rows in All Tasks and Reports',()=>{
 const list=screenshotRows.filter(row=>completedTaskDateMatch(row,range));
 const report=reportPeriodTasks(screenshotRows,range.customStart,range.customEnd);
 assert.deepEqual(list.map(row=>row.id),['campaign-item-one','campaign-item-two','phase-task']);
 assert.deepEqual(list.map(row=>row.id),report.map(row=>row.id));
 assert.equal(reportTaskTotals(report).completedTasks,3);
 const november=screenshotRows.filter(row=>completedTaskDateMatch(row,{calendar:'custom',customStart:'2026-11-02',customEnd:'2026-11-02'}));
 assert.equal(november.length,5);
 assert.equal(screenshotRows.filter(row=>completedTaskDateMatch(row,{calendar:'all'})).length,8);
});

test('single day boundaries use Vietnam time, including midnight, regardless of browser timezone',()=>{
 const end=done('end','2026-10-01','2026-10-31T16:59:59.999Z');
 const next=done('next','2026-10-31','2026-10-31T17:00:00.000Z');
 assert.equal(taskCompletedInPeriod(end,'2026-10-31','2026-10-31'),true);
 assert.equal(taskCompletedInPeriod(next,'2026-10-31','2026-10-31'),false);
 assert.equal(taskCompletedInPeriod(next,'2026-11-01','2026-11-01'),true);
});

test('week/month presets use completion dates and the same Monday and month boundaries as Reports',()=>{
 const now=new Date('2026-11-01T18:00:00Z'); // Monday morning in Vietnam.
 const sunday=done('sunday','2026-11-08','2026-11-01T16:59:59Z');
 const monday=done('monday','2026-10-15','2026-11-01T17:00:00Z');
 assert.equal(completedTaskDateMatch(sunday,{calendar:'this_week'},now),false);
 assert.equal(completedTaskDateMatch(monday,{calendar:'this_week'},now),true);
 const october=done('october','2026-11-01','2026-10-31T16:59:59Z');
 assert.equal(completedTaskDateMatch(october,{calendar:'this_month'},now),false);
 assert.equal(completedTaskDateMatch(monday,{calendar:'this_month'},now),true);
});

test('missing completion time never falls back to deadline, edit date or creation date',()=>{
 const unknown={...done('unknown','2026-10-31',null),updated_at:'2026-10-31T00:00:00Z'};
 assert.equal(completedTaskDateMatch(unknown,range),false);
 assert.equal(completedTaskDateMatch(unknown,{calendar:'all'}),true);
 assert.deepEqual(reportPeriodTasks([unknown],range.customStart,range.customEnd),[]);
 const imported={...screenshotRows[0],created_at:'2026-11-02T00:00:00Z'};
 assert.equal(completedTaskDateMatch(imported,range),true);
 assert.deepEqual(reportPeriodTasks([imported],range.customStart,range.customEnd),[imported]);
});

test('one-sided URL ranges and reversed custom ranges follow completion dates as well',()=>{
 const row=screenshotRows[0];
 assert.equal(completedTaskDateMatch(row,{calendar:'all',queryStart:'2026-11-01'}),false);
 assert.equal(completedTaskDateMatch(row,{calendar:'all',queryEnd:'2026-10-31'}),true);
 assert.equal(completedTaskDateMatch(row,{calendar:'custom',customStart:'2026-10-31',customEnd:'2026-10-24'}),true);
 assert.equal(taskCompletedInPeriod(row,'invalid','2026-10-31'),false);
});

test('scheduling-only presets never show completed work; unfinished work retains its schedule filtering',()=>{
 for(const calendar of ['ongoing','overdue','due_soon'])assert.equal(completedTaskDateMatch(screenshotRows[0],{calendar}),false);
 assert.equal(completedTaskDateMatch({...screenshotRows[0],status:'todo',workflow_status:'backlog'},range),null);
 assert.equal(taskCompletedInPeriod({...screenshotRows[0],status:'cancelled'},range.customStart,range.customEnd),false);
});

test('counter and bulk payload retain only current filtered rows and discard deleted selections',()=>{
 const selected=screenshotRows.map(row=>row.id);
 const visible=screenshotRows.filter(row=>completedTaskDateMatch(row,range));
 const operationIds=visibleTaskSelection(selected,visible);
 assert.deepEqual(operationIds,['campaign-item-one','campaign-item-two','phase-task']);
 assert.strictEqual(visibleTaskSelection(operationIds,visible),operationIds);
 assert.deepEqual(visibleTaskSelection(operationIds,visible.slice(1)),['campaign-item-two','phase-task']);
 assert.deepEqual(visibleTaskSelection(operationIds,[]),[]);
});
