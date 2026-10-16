import test from 'node:test';
import assert from 'node:assert/strict';
import {isSidebarMention, isSidebarComment, opensSidebarNotification} from '../src/lib/sidebarSignals.ts';
const n = (entity_type, entity_id, extra = {}) => ({type:'task_comment',message:'Bình luận mới',entity_type,entity_id,...extra});
test('assignment and another PIC mention do not create a mention dot', () => {
  assert.equal(isSidebarMention(n('task','1',{type:'task_assigned',message:'Giao bạn task'}),'An'),false);
  assert.equal(isSidebarMention(n('task','1',{message:'@Bình xem giúp'}),'An'),false);
  assert.equal(isSidebarMention(n('task','1',{message:'@An xem giúp'}),'An'),true);
  assert.equal(isSidebarMention(n('task','1',{message:'@Anh xem giúp'}),'An'),false);
  assert.equal(isSidebarMention(n('task','1',{message:'@BáchBảo xem giúp'}),'Bách Bảo'),true);
  assert.equal(isSidebarMention(n('task','1',{metadata:{is_mention:true}}),'An'),true);
  assert.equal(isSidebarMention(n('task','1',{metadata:{is_mention:false},message:'@An'}),'An'),false);
  assert.equal(isSidebarComment(n('task','1')),true);
  assert.equal(isSidebarComment(n('task','1',{type:'weekly_report',message:'Weekly report'})),false);
});
test('opening one task cannot read siblings, other legacy kinds or its parent', () => {
  assert.equal(opensSidebarNotification(n('project_subtask','1'),'/tasks','?task=ps-1'),true);
  for (const kind of ['task','campaign_subtask','project']) assert.equal(opensSidebarNotification(n(kind,'1'),'/tasks','?task=ps-1'),false);
  assert.equal(opensSidebarNotification(n('project_subtask','2'),'/tasks','?task=ps-1'),false);
});
test('parent and phase destinations stay distinct, list navigation reads nothing', () => {
  const parent=n('project','p');
  assert.equal(opensSidebarNotification(parent,'/projects',''),false);
  assert.equal(opensSidebarNotification(parent,'/workflow','?project=p'),false);
  assert.equal(opensSidebarNotification(parent,'/workflow','?project=p&phase=a'),false);
  const phase=n('project','p',{metadata:{origin:'dashboard:v2',target:'workflow',phase_id:'a'}});
  assert.equal(opensSidebarNotification(phase,'/workflow','?project=p'),false);
  assert.equal(opensSidebarNotification(phase,'/workflow','?project=p&phase=a'),true);
});
