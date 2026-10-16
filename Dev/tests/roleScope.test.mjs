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
