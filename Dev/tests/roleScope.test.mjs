import test from 'node:test';
import assert from 'node:assert/strict';
import {isAdmin,isGlobalManager,isDepartmentLeader,canViewTeamManagement,canViewPersonInTeam} from '../src/lib/roleScope.ts';

test('rank matrix matches workflow2_global for active role/level combinations', () => {
  const cases = [
    [{role:'admin', employment_level:'ADMIN'}, true, false],
    [{role:'manager', employment_level:'Manager'}, true, false],
    [{role:'manager', employment_level:'Leader'}, false, true],
    [{role:'leader', employment_level:'Leader'}, false, true],
    [{role:'member', employment_level:'Nhân viên'}, false, false],
    [{role:'manager', employment_level:null}, true, false],
    [{role:'member', employment_level:'manager'}, true, false],
  ];
  for (const [profile, global, leader] of cases) {
    assert.equal(isGlobalManager(profile),global);
    assert.equal(isDepartmentLeader(profile),leader);
    assert.equal(canViewTeamManagement(profile),global||leader);
  }
  assert.equal(isAdmin({role:'ADMIN'}),true);
  assert.equal(isAdmin({role:'member',employment_level:'admin'}),false);
});

test('department Leader can filter only own team, global Manager can filter all', () => {
  const leader={role:'manager',employment_level:'Leader',department_id:'design'};
  const global={role:'manager',employment_level:'Manager',department_id:'design'};
  assert.equal(canViewPersonInTeam(leader,{id:1,department_id:'design'}),true);
  assert.equal(canViewPersonInTeam(leader,{id:2,department_id:'marketing'}),false);
  assert.equal(canViewPersonInTeam(global,{id:2,department_id:'marketing'}),true);
  assert.equal(canViewPersonInTeam({role:'leader',employment_level:'Leader'}, {id:1,department_id:'design'}),false);
});

test('canMentionPerson enforces staff department bounds and leader cross-department privileges', async () => {
  const { canMentionPerson } = await import('../src/lib/roleScope.ts');

  const staffDesign = { id: 11, role: 'member', employment_level: 'Nhân viên', department_id: 'dept-design' };
  const colleagueDesign = { id: 10, name: 'Thương Phạm', role: 'member', employment_level: 'Nhân viên', department_id: 'dept-design' };
  const leaderDesign = { id: 9, name: 'Nga Phạm', role: 'leader', employment_level: 'Leader', department_id: 'dept-design' };

  const staffMarketing = { id: 16, name: 'Marketing Test Bảo Ngọc', role: 'member', employment_level: 'Nhân viên', department_id: 'dept-marketing' };
  const leaderMarketing = { id: 13, name: 'Lead Marketing', role: 'manager', employment_level: 'Leader', department_id: 'dept-marketing' };
  const adminUser = { id: 1, name: 'Admin', role: 'admin', employment_level: null, department_id: null };

  // Rule 1: Staff can always tag self and same-department colleagues
  assert.equal(canMentionPerson(staffDesign, staffDesign), true, 'Staff can tag self');
  assert.equal(canMentionPerson(staffDesign, colleagueDesign), true, 'Staff can tag member in same dept');
  assert.equal(canMentionPerson(staffDesign, leaderDesign), true, 'Staff can tag leader in same dept');

  // Rule 1: Staff CANNOT tag staff or leader from other dept without shared subtask
  assert.equal(canMentionPerson(staffDesign, staffMarketing), false, 'Staff cannot tag other dept staff');
  assert.equal(canMentionPerson(staffDesign, leaderMarketing), false, 'Staff cannot tag other dept leader without shared subtask');
  assert.equal(canMentionPerson(staffDesign, adminUser), false, 'Staff cannot tag admin without shared subtask');

  // Rule 1: Staff CAN tag other dept staff IF they share a subtask (collaborator)
  assert.equal(canMentionPerson(staffDesign, staffMarketing, [16]), true, 'Staff can tag collaborator from other dept');
  assert.equal(canMentionPerson(staffDesign, staffMarketing, ['16']), true, 'Staff can tag collaborator with string ID');

  // Rule 2: Leader can tag own dept members
  assert.equal(canMentionPerson(leaderDesign, colleagueDesign), true, 'Leader can tag own dept staff');
  assert.equal(canMentionPerson(leaderDesign, leaderDesign), true, 'Leader can tag self');

  // Rule 2: Leader CAN tag Leaders and Managers in other departments
  assert.equal(canMentionPerson(leaderDesign, leaderMarketing), true, 'Leader can tag other dept Leader');
  assert.equal(canMentionPerson(leaderDesign, adminUser), true, 'Leader can tag Admin');

  // Rule 2: Leader CANNOT tag regular staff from other dept without shared subtask
  assert.equal(canMentionPerson(leaderDesign, staffMarketing), false, 'Leader cannot tag other dept staff without collaboration');
  assert.equal(canMentionPerson(leaderDesign, staffMarketing, [16]), true, 'Leader can tag other dept staff when collaborating');

  // Rule 3: Admin / Global Manager can tag anyone
  assert.equal(canMentionPerson(adminUser, staffMarketing), true, 'Admin can tag anyone');
  assert.equal(canMentionPerson(adminUser, colleagueDesign), true, 'Admin can tag anyone in design');
  const globalManager = { id: 99, role: 'manager', employment_level: 'Manager', department_id: 'dept-corp' };
  assert.equal(canMentionPerson(globalManager, staffMarketing), true, 'Global manager can tag anyone');
});

