import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const runtimeFile = process.env.DASHBOARD_LOCAL_RUNTIME;
const migration = new URL('../supabase/migrations/20261113025233_task_creator_returning_visibility.sql', import.meta.url);

test('All Tasks creation: INSERT RETURNING, actor provenance and department read scope', {skip: !runtimeFile}, async () => {
  const {env} = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
  const url = new URL(env.DB_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'LOCAL database only');
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
  const db = new pg.Client({connectionString: env.DB_URL, ssl: false, connectionTimeoutMillis: 5000});
  let checks = 0;
  const eq = (value, expected, label) => {assert.deepEqual(value, expected, label); checks++;};
  const actors = {};
  const as = async (key, fn) => {
    await db.query('reset role');
    await db.query("select set_config('request.jwt.claims', $1, true)", [key ? JSON.stringify({sub: actors[key].auth, role: 'authenticated'}) : '{}']);
    await db.query(key ? 'set local role authenticated' : 'set local role anon');
    let failed = false;
    try {return await fn();}
    catch (error) {failed = true; throw error;}
    finally {try {await db.query('reset role');} catch (error) {if (!failed) throw error;}}
  };
  const denied = async (fn, label) => {
    await db.query('savepoint denied_attempt');
    let error;
    try {await fn();} catch (caught) {error = caught;}
    await db.query('rollback to savepoint denied_attempt');
    eq(error?.code, '42501', label);
  };
  await db.connect();
  try {
    await db.query('begin');
    const {rows: [workspace]} = await db.query('select id from public.workspaces limit 1');
    assert.ok(workspace, 'restore local schema/data before testing');
    const deptA = randomUUID(), deptB = randomUUID();
    await db.query("insert into public.departments(id,workspace_id,name) values($1,$3,'Task fixture A'),($2,$3,'Task fixture B')", [deptA, deptB, workspace.id]);
    let userId = -Math.floor(Date.now() / 10);
    for (const [key, role, level, dept, active] of [
      ['leader', 'leader', 'Leader', deptA, true], ['peer', 'leader', 'Leader', deptA, true],
      ['legacy', 'manager', 'Leader', deptA, true], ['staff', 'member', 'Staff', deptA, true],
      ['foreign', 'leader', 'Leader', deptB, true], ['foreignStaff', 'member', 'Staff', deptB, true],
      ['admin', 'admin', 'ADMIN', null, true], ['manager', 'manager', 'Manager', null, true],
      ['inactive', 'leader', 'Leader', deptA, false],
    ]) {
      const id = userId--, auth = randomUUID();
      await db.query('insert into public.users(id,email,name,role,employment_level,department_id,is_active,auth_id) values($1,$2,$3,$4,$5,$6,$7,$8)', [id, auth + '@task-fixture.invalid', 'Task fixture ' + key, role, level, dept, active, auth]);
      actors[key] = {id, auth};
    }
    const policyState = async () => (await db.query("select policyname,cmd,roles::text[] as roles,qual,with_check from pg_policies where schemaname='public' and tablename='tasks' order by policyname")).rows;
    const before = await policyState();
    const create = async (actor, assignee, dept = deptA, returning = true, creator = actor, phase = null) => {
      const id = randomUUID();
      const result = await as(actor, () => db.query("insert into public.tasks(id,workspace_id,title,created_by,assignee_id,department_id,status,start_date,due_date,workflow_phase_id) values($1,$2,'Synthetic task',$3,$4,$5,'todo','2026-11-13','2026-11-13',$6)" + (returning ? ' returning id,created_by,assignee_id' : ''), [id, workspace.id, actors[creator].id, assignee ? actors[assignee].id : null, dept, phase]));
      eq(result.rowCount, 1, actor + ': one task inserted');
      if (returning) eq(result.rows[0].id, id, actor + ': returned the exact new task');
      return id;
    };
    // Reproduce the actual old policy, independent of the current local version.
    await db.query('alter policy workflow_read on public.tasks using (public.workflow_task_access(id))');
    await create('leader', 'leader', deptA, false);
    await denied(() => create('leader', 'leader'), 'old policy rejects Leader INSERT RETURNING');
    await denied(() => create('legacy', 'staff'), 'old policy rejects legacy Leader INSERT RETURNING');

    await db.query(fs.readFileSync(migration, 'utf8'));
    const after = await policyState();
    eq(after.filter(p => p.cmd !== 'SELECT'), before.filter(p => p.cmd !== 'SELECT'), 'INSERT/UPDATE policies unchanged');
    eq(after.find(p => p.cmd === 'SELECT').roles, ['authenticated'], 'read policy remains authenticated-only');
    const created = [];
    for (const [actor, assignee, dept] of [
      ['leader', 'leader', deptA], ['leader', 'staff', deptA], ['leader', 'peer', deptA],
      ['leader', null, deptA], ['legacy', 'staff', deptA], ['staff', 'staff', deptA],
      ['admin', 'foreignStaff', deptB], ['manager', null, deptB],
    ]) created.push(await create(actor, assignee, dept));
    eq((await as('leader', () => db.query('select id from public.tasks where id=any($1::uuid[])', [created.slice(0, 6)]))).rowCount, 6, 'Leader reads team tasks and peer-created work');
    eq((await as('foreign', () => db.query('select id from public.tasks where id=any($1::uuid[])', [created.slice(0, 6)]))).rowCount, 0, 'foreign Leader cannot read unrelated team tasks');
    eq((await as('foreignStaff', () => db.query('select id from public.tasks where id=any($1::uuid[])', [created.slice(0, 6)]))).rowCount, 0, 'foreign Staff cannot read unrelated team tasks');
    eq((await as('inactive', () => db.query('select id from public.tasks where id=any($1::uuid[])', [created]))).rowCount, 0, 'inactive actor cannot read tasks');
    eq((await as(null, () => db.query('select id from public.tasks where id=any($1::uuid[])', [created]))).rowCount, 0, 'anonymous caller cannot read tasks');
    await denied(() => create('leader', 'staff', deptA, true, 'peer'), 'cannot spoof task creator');
    await denied(() => create('leader', 'foreignStaff', deptB), 'Leader cannot create unrelated foreign-team task');
    await denied(() => create('inactive', 'inactive'), 'inactive actor cannot create task');
    const phase = randomUUID(), parent = randomUUID();
    await db.query("insert into public.projects(id,workspace_id,name,created_by,department_id,status) values($1,$2,'Task fixture parent',$3,$4,'active')", [parent, workspace.id, actors.leader.id, deptA]);
    await db.query("insert into public.workflow_tracks(entity_type,entity_id) values('project',$1) on conflict do nothing", [parent]);
    const {rows: [track]} = await db.query("select id from public.workflow_tracks where entity_type='project' and entity_id=$1", [parent]);
    await db.query("insert into public.workflow_phases(id,workflow_id,position,title,created_by,status) values($1,$2,1,'Task fixture phase',$3,'todo')", [phase, track.id, actors.leader.id]);
    // A phase task is not part of the new provenance fallback.
    const phaseTask = randomUUID();
    await db.query("insert into public.tasks(id,workspace_id,title,created_by,assignee_id,department_id,status,project_id,workflow_phase_id) values($1,$2,'Phase fixture task',$3,$3,$4,'todo',$5,$6)", [phaseTask, workspace.id, actors.foreign.id, deptB, parent, phase]);
    const phaseAccess = await as('foreign', () => db.query('select public.workflow_task_access($1) allowed', [phaseTask]));
    const phaseRead = await as('foreign', () => db.query('select id from public.tasks where id=$1', [phaseTask]));
    eq(phaseRead.rowCount, phaseAccess.rows[0].allowed ? 1 : 0, 'phase reads still follow the existing helper');
    // Neither the SELECT fallback nor the migration grants new write privileges.
    eq((await as('foreign', () => db.query("update public.tasks set title='Denied' where id=$1 returning id", [created[0]]))).rowCount, 0, 'foreign actor cannot edit team task');
    const noAuthId = randomUUID();
    await denied(() => as(null, () => db.query("insert into public.tasks(id,workspace_id,title,created_by,assignee_id,department_id,status) values($1,$2,'Denied',$3,$3,$4,'todo') returning id", [noAuthId, workspace.id, actors.leader.id, deptA])), 'anonymous insert remains denied');
    console.log(`PASS: ${checks} assertions; baseline reproduced, migration verified, fixtures rolled back.`);
  } finally {
    await db.query('rollback');
    await db.end();
  }
});
