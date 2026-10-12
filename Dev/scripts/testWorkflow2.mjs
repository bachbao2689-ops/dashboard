import fs from "node:fs";
import pg from "pg";
import assert from "node:assert/strict";
import { makeWorkflow } from "../src/lib/workflow2.ts";
const line = fs
  .readFileSync(
    process.argv[2] || new URL("../../backend/.env", import.meta.url),
    "utf8",
  )
  .split(/\r?\n/)
  .find((x) => x.startsWith("DATABASE_URL="));
const client = new pg.Client({
  connectionString: line.slice(13).replace(/^"|"$/g, ""),
  ssl: { rejectUnauthorized: false },
});
try {
  await client.connect();
  await client.query("begin");
  const {
    rows: [actor],
  } = await client.query(
    "select id,auth_id,department_id from users where auth_id is not null and is_active and lower(role)='admin' limit 1",
  );
  assert.ok(actor, "Need admin fixture");
  const {
    rows: [space],
  } = await client.query("select id from workspaces limit 1");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
    actor.auth_id,
  ]);
  const {
    rows: [parent],
  } = await client.query(
    "insert into projects(name,workspace_id,department_id,created_by) values($1,$2,$3,$4) returning id",
    ["[QA rollback] Workflow 2", space.id, actor.department_id, actor.id],
  );
  let doc = makeWorkflow("project", String(actor.id));
  const save = async (version) =>
    (
      await client.query("select * from workflow2_save($1,$2,$3,$4)", [
        "project",
        parent.id,
        JSON.stringify(doc),
        version,
      ])
    ).rows[0];
  const rejects = async (fn) => {
    await client.query("savepoint expected_error");
    let rejected = false;
    try {
      await fn();
    } catch {
      rejected = true;
    }
    await client.query("rollback to savepoint expected_error");
    assert.ok(rejected);
  };
  let w = await save(0);
  assert.equal(w.version, 1);
  await rejects(() => save(0));
  doc.phases[1].gate.status = "in_review";
  await rejects(() => save(1));
  doc.phases[1].gate.status = "not_started";
  doc.phases[0].gate.status = "go";
  await rejects(() => save(1));
  doc.phases[0].gate.status = "in_review";
  w = await save(1);
  assert.equal(w.version, 2);
  doc.phases[0].gate.status = "go";
  await rejects(() => save(2));
  const {
    rows: [task],
  } = await client.query(
    "insert into tasks(title,workspace_id,project_id,created_by,status) values($1,$2,$3,$4,$5) returning id",
    ["QA linked milestone", space.id, parent.id, actor.id, "in_progress"],
  );
  doc.phases[0].milestones[0].taskKey = `task:${task.id}`;
  doc.phases[0].milestones[0].done = true;
  doc.phases[0].gate.criteria.forEach((c) => (c.checked = true));
  await rejects(() => save(2));
  await client.query("update tasks set status='completed' where id=$1", [
    task.id,
  ]);
  w = await save(2);
  assert.equal(w.version, 3);
  const {
    rows: [audit],
  } = await client.query(
    "select progress_at_decision,readiness_at_decision from workflow2_completion_records where workflow_id=$1 and decision='go'",
    [w.id],
  );
  assert.equal(Number(audit.progress_at_decision), 100);
  assert.equal(Number(audit.readiness_at_decision), 100);
  doc.phases[0].name = "Tamper";
  await rejects(() => save(3));
  doc = structuredClone(w.document);
  await client.query("update tasks set status='deleted' where id=$1", [
    task.id,
  ]);
  doc.phases[1].gate.status = "in_review";
  w = await save(3);
  assert.equal(w.version, 4);
  const {
    rows: [staff],
  } = await client.query(
    "select auth_id from users where auth_id is not null and is_active and lower(role) not in ('admin','manager','leader') and coalesce(lower(employment_level),'') not in ('manager','leader') limit 1",
  );
  if (staff) {
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      staff.auth_id,
    ]);
    await rejects(() => save(3));
  }
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
    actor.auth_id,
  ]);
  await client.query("set local role authenticated");
  assert.equal(
    (
      await client.query(
        "select count(*) from workflow2_workflows where id=$1",
        [w.id],
      )
    ).rows[0].count,
    "1",
  );
  await rejects(() =>
    client.query("update workflow2_workflows set version=99 where id=$1", [
      w.id,
    ]),
  );
  await client.query("reset role");
  console.log(
    "DB checks passed: persistence, stale version, phase order, review state, prerequisites, immutable decision, audit snapshot, staff write denied. All fixture writes rolled back.",
  );
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
