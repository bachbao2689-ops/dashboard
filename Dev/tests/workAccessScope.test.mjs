import test from 'node:test';
import assert from 'node:assert/strict';
import {workAssignmentPeople,leaderParentVisible,leaderTaskVisible,trackLeaderVisible} from '../src/lib/workAccessScope.ts';
const leader={id:1,role:'leader',department_id:'D'},peer={id:2,role:'leader',department_id:'D'},staff={id:3,role:'member',department_id:'D'},foreignLeader={id:4,role:'leader',department_id:'M'},foreignStaff={id:5,role:'member',department_id:'M'},admin={id:6,role:'admin'},manager={id:7,role:'manager',employment_level:'Manager'},legacy={id:8,role:'manager',employment_level:'Leader',department_id:'M'};
const people=[leader,peer,staff,foreignLeader,foreignStaff,admin,manager,legacy,{id:9,role:'leader',is_active:false}];
test('Leader picker contains own staff, own peer leaders and foreign departmental Leaders only',()=>{
 assert.deepEqual(workAssignmentPeople(leader,people).map(p=>p.id),[1,2,3,4,8]);
 assert.equal(workAssignmentPeople(null,people).length,0);
 assert.equal(workAssignmentPeople(admin,people).length,8);
});
test('Parent scope allows active Leader to view all Projects and Campaigns across departments',()=>{
 assert.equal(leaderParentVisible(leader,'D'),true);
 assert.equal(leaderParentVisible(leader,'M'),true);
 assert.equal(leaderParentVisible(leader,'M',[1]),true);
 assert.equal(leaderParentVisible(leader,'M',[2,4]),true);
 assert.equal(leaderParentVisible({...leader,is_active:false},'D',[1]),false);
 assert.equal(leaderParentVisible(null,'D'),false);
 assert.equal(leaderParentVisible(admin,'M'),true);
 assert.equal(trackLeaderVisible(leader,{department_id:'M',pics:[],sub_pics:[{id:'1'}]}),true);
 assert.equal(trackLeaderVisible(leader,{department_id:'M',pics:[foreignLeader]}),true);
 assert.equal(trackLeaderVisible({...leader,is_active:false},{department_id:'M',pics:[]}),false);
});
test('Task scope includes own team work and explicit parent invites but excludes foreign unrelated work',()=>{
 for(const p of [leader,peer,staff])assert.equal(leaderTaskVisible(leader,{assignee_id:p.id},people),true);
 assert.equal(leaderTaskVisible(leader,{assignee_id:5,department_id:'M'},people),false);
 assert.equal(leaderTaskVisible(leader,{assignee_id:5,department_id:'M',parent_pic_ids:[1]},people),true);
 assert.equal(leaderTaskVisible(leader,{created_by:4,assignee_id:5},people),false);
 assert.equal(leaderTaskVisible(leader,{department_id:'D'},people),true);
});
