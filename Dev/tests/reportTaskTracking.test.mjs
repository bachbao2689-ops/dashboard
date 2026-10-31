import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDeliverableQuantity,reportPeriodTasks,reportTaskTotals} from '../src/lib/reportTaskTracking.ts';
import {mergeDeliverableMetadata,setCachedDeliverable} from '../src/lib/taskDeliverables.ts';
import {mapWorkspaceTasks} from '../src/lib/workspaceTaskMapping.ts';

const start='2026-10-19',end='2026-10-24';
const task=(id,status,quantity)=>({id,status,quantity,created_at:'2026-10-19T03:00:00Z',completed_at:status==='done'?'2026-10-21T10:00:00Z':null});

test('screenshot totals reconcile 27 of 42 tasks with 79 of 635 deliverables without mixing units',()=>{
 const rows=[...Array.from({length:27},(_,i)=>task('done-'+i,'done',i===26?53:1)),...Array.from({length:15},(_,i)=>task('open-'+i,'todo',i===14?542:1))];
 const scoped=reportPeriodTasks(rows,start,end);
 const total=reportTaskTotals(scoped);
 assert.deepEqual(total,{totalTasks:42,completedTasks:27,totalDeliverables:635,completedDeliverables:79,remainingDeliverables:556});
 const byStaff=[rows.slice(0,20),rows.slice(20)].map(reportTaskTotals);
 for(const key of Object.keys(total))assert.equal(byStaff.reduce((sum,row)=>sum+row[key],0),total[key]);
 assert.equal(total.totalDeliverables,total.completedDeliverables+total.remainingDeliverables);
});

test('an empty period stays empty rather than silently displaying all tasks',()=>{
 const rows=[{...task('old','done',99),completed_at:'2026-09-01T00:00:00Z'},
 {...task('future','todo',100),created_at:'2026-11-01T00:00:00Z',due_date:'2026-11-02'}];
 assert.deepEqual(reportPeriodTasks(rows,start,end),[]);
 assert.deepEqual(reportTaskTotals(reportPeriodTasks(rows,start,end)),{totalTasks:0,completedTasks:0,totalDeliverables:0,completedDeliverables:0,remainingDeliverables:0});
});

test('completion uses actual completion time in Vietnam, never deadline or edit time',()=>{
 const unknown={...task('unknown','done',5),completed_at:null,updated_at:'2026-10-21T03:00:00Z',due_date:'2026-10-21'};
 const midnight={...task('midnight','done',3),created_at:'2026-10-01T00:00:00Z',completed_at:'2026-10-18T17:30:00Z'};
 assert.deepEqual(reportPeriodTasks([unknown,midnight],start,end).map(t=>t.id),['midnight']);
 assert.equal(reportPeriodTasks([unknown],start,end,true).length,1);
});

test('workflow completion and removed rows are treated consistently by task and output counters',()=>{
 const rows=[{...task('workflow','in_progress',4),workflow_status:'completed',completed_at:'2026-10-22T00:00:00Z'},task('cancelled','cancelled',50),task('deleted','deleted',50)];
 assert.deepEqual(reportTaskTotals(reportPeriodTasks(rows,start,end)),{totalTasks:1,completedTasks:1,totalDeliverables:4,completedDeliverables:4,remainingDeliverables:0});
});

test('base plus checklist quantity is counted once and ignores a stale precomputed total',()=>{
 assert.equal(reportDeliverableQuantity({quantity:2,checklist_items:[{quantity:3},{quantity:5}],deliverable_quantity:999}),10);
 assert.equal(reportDeliverableQuantity({deliverable_quantity:7}),7);
 assert.equal(reportDeliverableQuantity({quantity:NaN,checklist_items:[{quantity:-20},{quantity:Infinity}]}),1);
});

test('partial metadata edits retain saved quantity and explicit resets retain their meaning',()=>{
 const meta=mergeDeliverableMetadata([{description:'Edited description'},{quantity:5,checklist_items:[{quantity:2}]},{quantity:80}]);
 assert.equal(reportDeliverableQuantity(meta),7);
 const reset=mergeDeliverableMetadata([{quantity:null,checklist_items:[]},meta]);
 assert.equal(reportDeliverableQuantity(reset),1);
 assert.deepEqual(reset.checklist_items,[]);
});

test('fresh server metadata wins over browser cache for task and both subtask types',()=>{
 const storage=new Map();const oldWindow=globalThis.window;
 globalThis.window={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 try{
  setCachedDeliverable('task:real',{quantity:999});
  setCachedDeliverable('project_subtask:legacy',{quantity:999});
  const meta=new Map([['real',{quantity:3}],['ps-legacy',{quantity:4}],['cs-legacy',{quantity:5}]]);
  const rows=mapWorkspaceTasks([{id:'real',status:'done'}],
   [{id:'legacy',status:'done',projects:{id:'parent',name:'Project',status:'active'}}],
   [{id:'legacy',status:'done',campaigns:{id:'parent',name:'Campaign',status:'active'}}],meta);
  assert.deepEqual(rows.map(row=>row.deliverable_quantity),[3,4,5]);
  assert.equal(reportTaskTotals(rows).completedDeliverables,12);
 }finally{globalThis.window=oldWindow;}
});
