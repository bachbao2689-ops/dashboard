import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowMetrics,taskProgress,gateScore} from '../src/lib/workflowHub.ts';
const now=new Date('2026-10-13T08:00:00+07:00');
test('empty data has no invented performance or pass probability',()=>{
 const m=workflowMetrics([],now);
 assert.equal(m.progress,null);assert.equal(m.velocity,null);assert.equal(m.onTime,null);assert.deepEqual(m.buckets,[0,0,0,0,0]);assert.equal(gateScore([]),null);
});
test('completed ratio excludes cancelled tasks and never forces finished phase percentage',()=>{
 assert.deepEqual(taskProgress([{status:'done'},{status:'todo'},{status:'cancelled'},{status:'archived'}]),{total:2,done:1,percent:50});
});
test('monthly chart is scoped, mutually exclusive and uses Vietnam deadline day',()=>{
 const m=workflowMetrics([
 {status:'done',created_at:'2026-10-01T12:00:00Z',completed_at:'2026-10-12T18:00:00Z',due_date:'2026-10-13'},
 {status:'todo',created_at:'2026-09-01T00:00:00Z',due_date:'2026-10-12'},
 {status:'in_progress',created_at:'2026-10-01T00:00:00Z',due_date:'2026-10-20'},
 {status:'in_review',created_at:'2026-10-01T00:00:00Z',due_date:'2026-10-20'},
 {status:'todo',created_at:'2026-10-01T00:00:00Z',due_date:'2026-10-13'},
 {status:'done',created_at:'2026-08-01T00:00:00Z',completed_at:'2026-08-02T00:00:00Z'},
 {status:'cancelled',created_at:'2026-10-01T00:00:00Z'},
 ],now);
 assert.deepEqual(m.buckets,[1,1,1,1,1]);assert.equal(m.onTime,100);
});
test('cycle time requires a genuine completion timestamp',()=>{
 const m=workflowMetrics([{status:'done',start_date:'2026-10-01',completed_at:'2026-10-03T00:00:00Z'},{status:'completed'}],now);
 assert.equal(m.velocity,2);assert.equal(m.onTime,null);
});
test('gate readiness uses persisted weights and checks',()=>{
 assert.equal(gateScore([{id:'a',label:'Review',weight:80,checked:true},{id:'b',label:'Delivery',weight:20,checked:false}]),80);
});
