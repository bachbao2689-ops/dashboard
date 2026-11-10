import test from 'node:test';
import assert from 'node:assert/strict';
import {workAssignmentPeople} from '../src/lib/workAccessScope.ts';
const leader={id:1,role:'leader',department_id:'D'},peer={id:2,role:'leader',department_id:'D'},staff={id:3,role:'member',department_id:'D'},foreignLeader={id:4,role:'leader',department_id:'M'},foreignStaff={id:5,role:'member',department_id:'M'},admin={id:6,role:'admin'},manager={id:7,role:'manager',employment_level:'Manager'},legacy={id:8,role:'manager',employment_level:'Leader',department_id:'M'};
const people=[leader,peer,staff,foreignLeader,foreignStaff,admin,manager,legacy,{id:9,role:'leader',is_active:false}];
test('Leader picker contains own staff, own peer leaders and foreign departmental Leaders only',()=>{
 assert.deepEqual(workAssignmentPeople(leader,people).map(p=>p.id),[1,2,3,4,8]);
 assert.equal(workAssignmentPeople(null,people).length,0);
 assert.equal(workAssignmentPeople(admin,people).length,8);
});
test('Inactive actors get no picker; inactive and foreign staff cannot be selected by a Leader',()=>{
 assert.deepEqual(workAssignmentPeople({...leader,is_active:false},people),[]);
 assert.equal(workAssignmentPeople(leader,people).some(person=>person.id===foreignStaff.id||person.id===9),false);
 assert.equal(workAssignmentPeople(legacy,people).some(person=>person.id===staff.id),false);
});
test('Global Manager picker can use every active account',()=>{
 assert.deepEqual(workAssignmentPeople(manager,people),people.filter(person=>person.is_active!==false));
});
