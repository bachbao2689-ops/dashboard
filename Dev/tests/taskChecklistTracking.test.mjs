import test from 'node:test';
import assert from 'node:assert/strict';
import {mapWorkspaceTasks} from '../src/lib/workspaceTaskMapping.ts';
import {computeDeliverableQuantity} from '../src/lib/taskDeliverables.ts';
import {checklistTaskKey,deliverableHistory,patchChecklistItem} from '../src/lib/taskChecklist.ts';
import {reportPeriodTasks,reportTaskTotals} from '../src/lib/reportTaskTracking.ts';
import {taskTarget,taskDone,phaseLinkableTasks,phaseLinkTarget} from '../src/lib/taskTracking.ts';
import {taskProgress,parentTasks} from '../src/lib/workflowHub.ts';

const project={id:'project',name:'Project',department_id:'design',workspace_id:'workspace',status:'active'};
const sub={id:'sub',project_id:'project',assignee_id:7,status:'todo',created_at:'2026-10-01T00:00:00Z',projects:project};
const item=(id,quantity,completed=false)=>({id,title:id,quantity,completed,created_at:'2026-10-20T00:00:00Z',completed_at:completed?'2026-10-21T00:00:00Z':null});

test('phase picker links only persisted task/subtask UUIDs, never checklist item keys',()=>{
 const projectId='6f410d17-cf67-4d93-8f7a-2ca549a63845';
 const campaignId='d36ee113-b126-4ce3-a0cc-ed707efee9b7';
 const taskId='e4859579-c478-4439-bbb3-41737f728aa1';
 const rows=[
  {id:`ps-${projectId}`,workflow_phase_id:null},
  {id:checklistTaskKey(`ps-${projectId}`,'item-1793438610827-wx0s'),workflow_phase_id:null},
  {id:`cs-${campaignId}`,workflow_phase_id:null},
  {id:taskId,workflow_phase_id:null},
  {id:'6de6735c-c1c2-44a4-8732-b4a42661ad1d',workflow_phase_id:'phase'},
 ];
 assert.deepEqual(phaseLinkableTasks(rows).map(row=>row.id),[`ps-${projectId}`,`cs-${campaignId}`,taskId]);
 assert.deepEqual(phaseLinkTarget(rows[0].id),{kind:'project_subtask',id:projectId});
 assert.deepEqual(phaseLinkTarget(rows[2].id),{kind:'campaign_subtask',id:campaignId});
 assert.deepEqual(phaseLinkTarget(rows[3].id),{kind:'task',id:taskId});
 assert.throws(()=>phaseLinkTarget(rows[1].id),/task\/subtask mẹ/);
 assert.throws(()=>phaseLinkTarget(`${projectId}::item:bad`),/task\/subtask mẹ/);
});

test('each completed Workflow phase task is one completed work unit, with no invented file quantity',()=>{
 const rows=mapWorkspaceTasks([{id:'phase-task',workflow_phase_id:'phase',status:'todo',workflow_status:'completed'}],[],[]);
 assert.deepEqual(taskProgress(rows),{total:1,done:1,percent:100});
 assert.deepEqual(reportTaskTotals(rows),{totalTasks:1,completedTasks:1,totalDeliverables:0,completedDeliverables:0,remainingDeliverables:0});
});

test('project subtask base plus child output is counted once; every child appears in the shared All Tasks rows',()=>{
 const meta={quantity:10,base_quantity:2,checklist_items:[item('done',3,true),item('pending',5)]};
 const rows=mapWorkspaceTasks([], [sub], [],new Map([['ps-sub',meta]]));
 assert.equal(rows.length,3);
 assert.equal(rows[0].subtask_total_quantity,10);
 assert.deepEqual(rows.map(row=>row.tracking_quantity),[2,3,5]);
 assert.deepEqual(reportTaskTotals(rows),{totalTasks:3,completedTasks:1,totalDeliverables:10,completedDeliverables:3,remainingDeliverables:7});
 assert.deepEqual(taskProgress(parentTasks(rows,'project','project')),{total:3,done:1,percent:33});
 for(const row of rows){assert.equal(row.assignee_id,7);assert.equal(row.department_id,'design');}
 assert.deepEqual(taskTarget(rows[1].id),{kind:'project_subtask',id:'sub',table:'project_subtasks',checklistItemId:'done'});
 assert.equal(rows[1].checklist_parent.id,'ps-sub');
});

test('completed parent never completes pending child output; explicit empty base is not the aggregate',()=>{
 const rows=mapWorkspaceTasks([],[{...sub,status:'done'}],[],new Map([['ps-sub',{quantity:9,base_quantity:null,checklist_items:[item('one',4,true),item('two',4),item('three',1)]}]]));
 assert.equal(rows[0].subtask_total_quantity,9);
 assert.deepEqual(reportTaskTotals(rows),{totalTasks:4,completedTasks:2,totalDeliverables:9,completedDeliverables:4,remainingDeliverables:5});
});

test('campaign and task checklists use identical identity, quantity, and status rules',()=>{
 const meta={quantity:6,base_quantity:2,checklist_items:[item('same',4,true)]};
 const campaign={id:'sub',campaign_id:'campaign',status:'todo',campaigns:{...project,id:'campaign'}};
 const rows=mapWorkspaceTasks([{id:'real',status:'todo'}],[],[campaign],new Map([['real',meta],['cs-sub',meta]]));
 assert.equal(rows.length,4);
 assert.deepEqual(reportTaskTotals(rows),{totalTasks:4,completedTasks:2,totalDeliverables:12,completedDeliverables:8,remainingDeliverables:4});
 assert.notEqual(rows[1].id,rows[3].id);
 assert.equal(checklistTaskKey('cs-sub','name: with spaces'), 'cs-sub::item:name%3A%20with%20spaces');
 assert.equal(taskTarget(checklistTaskKey('cs-sub','name: with spaces')).checklistItemId,'name: with spaces');
});

test('historical checklist transitions supply completion dates and survive later description edits',()=>{
 const rows=[
  {created_at:'2026-10-24T00:00:00Z',metadata:{description:'edit'}},
  {created_at:'2026-10-23T00:00:00Z',metadata:{checklist_items:[item('child',5,true)]}},
  {created_at:'2026-10-20T00:00:00Z',metadata:{quantity:2,checklist_items:[item('child',5)]}},
 ];
 delete rows[1].metadata.checklist_items[0].completed_at;
 const meta=deliverableHistory(rows);
 assert.equal(meta.checklist_items[0].completed_at,'2026-10-23T00:00:00Z');
 assert.equal(computeDeliverableQuantity(meta).totalQuantity,7);
 const mapped=mapWorkspaceTasks([],[sub],[],new Map([['ps-sub',meta]]));
 assert.equal(reportTaskTotals(reportPeriodTasks(mapped,'2026-10-19','2026-10-25')).completedTasks,1);
 const reopened=deliverableHistory([{created_at:'2026-10-25T00:00:00Z',metadata:{checklist_items:[item('child',5)]}},...rows]);
 assert.equal(reopened.checklist_items[0].completed_at,null);
});

test('reopen and delete target only the selected child, and checkbox false wins over legacy completed status',()=>{
 const children=[item('first',3,true),item('second',2)];
 const reopened=patchChecklistItem(children,'first',{status:'todo'},'2026-10-25T00:00:00Z');
 assert.equal(reopened[0].completed,false);assert.equal(reopened[0].completed_at,null);
 assert.deepEqual(reopened[1],children[1]);
 assert.deepEqual(patchChecklistItem(children,'first',{status:'deleted'}),[children[1]]);
 assert.throws(()=>patchChecklistItem(children,'missing',{status:'done'}));
 const rows=mapWorkspaceTasks([],[sub],[],new Map([['ps-sub',{checklist_items:[{...item('legacy',1),status:'done',workflow_status:'completed'}]}]]));
 assert.equal(taskDone(rows[1]),false);
});

test('archived parents hide children; canceled work and its output do not contribute to performance',()=>{
 const meta=new Map([['ps-sub',{quantity:7,checklist_items:[item('child',5,true)]}]]);
 assert.deepEqual(mapWorkspaceTasks([],[{...sub,projects:{...project,status:'archived'}}],[],meta),[]);
 const canceled=mapWorkspaceTasks([],[{...sub,status:'cancelled'}],[],meta);
 assert.equal(reportTaskTotals(canceled).totalTasks,0);
 assert.equal(reportTaskTotals(canceled).totalDeliverables,0);
});
