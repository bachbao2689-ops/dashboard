import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationLink} from '../supabase/functions/_shared/notificationLink.ts';
test('all surfaces retain canonical and legacy task identity',()=>{
 for(const [kind,prefix] of [['task',''],['project_subtask','ps-'],['campaign_subtask','cs-']])assert.equal(notificationLink(kind,'shared-id'),`/tasks?task=${prefix}shared-id`);
});
test('stage notification opens its exact parent and phase',()=>{
 for(const kind of ['project','campaign'])assert.equal(notificationLink(kind,'parent',{origin:'dashboard:v2',target:'workflow',phase_id:'stage'}),`/workflow?${kind}=parent&phase=stage`);
 assert.equal(notificationLink('project','parent',{target:'workflow',phase_id:'stage'}),'/projects?project=parent');
});
test('test push and reports work without an entity ID, unknown types remain inert',()=>{
 assert.equal(notificationLink('profile',null),'/my-tasks');assert.equal(notificationLink('weekly_report',null),'/my-tasks?report=1');assert.equal(notificationLink('task',null),null);assert.equal(notificationLink('unknown','id'),null);
});
