import { test } from "node:test";
import assert from "node:assert/strict";
import { workflowFiles } from "../src/lib/workflowFiles.ts";
test("Project assets are tracked by parent and inherited by the correct Campaign", () => {
  const f = workflowFiles(
    [
      {
        id: "p1",
        name: "Design",
        campaign_id: "c1",
        assets_url: "https://files.example/brief.pdf",
      },
    ],
    [{ id: "c1" }, { id: "c2" }],
    [],
    [],
    [],
  );
  assert.equal(f.length, 2);
  assert.ok(f.some((x) => x.entity_type === "project" && x.entity_id === "p1"));
  assert.ok(
    f.some((x) => x.entity_type === "campaign" && x.entity_id === "c1"),
  );
  assert.ok(!f.some((x) => x.entity_id === "c2"));
});
test("campaign strategy assets deduplicate per parent", () => {
  const activities = [1, 2].map((id) => ({
    id,
    action: "attachment_added",
    entity_type: "campaign",
    entity_id: "c1",
    metadata: { strategy_asset: "https://files.example/master.pdf" },
    created_at: "2026-10-12",
  }));
  assert.equal(workflowFiles([], [{ id: "c1" }], [], [], activities).length, 1);
});
test("latest subtask details remove old images and do not include deleted tasks", () => {
  const p = [{ id: "p1", name: "Design" }],
    s = [{ id: "s1", project_id: "p1", title: "KV", status: "todo" }];
  const old = {
    action: "details_updated",
    entity_type: "project_subtask",
    entity_id: "s1",
    metadata: { image_url: "https://files.example/kv.png" },
    created_at: "2026-10-11",
  };
  const latest = {
    ...old,
    metadata: { image_url: null },
    created_at: "2026-10-12",
  };
  assert.equal(workflowFiles(p, [], s, [], [old, latest]).length, 0);
  assert.equal(
    workflowFiles(p, [], [{ ...s[0], status: "deleted" }], [], [old]).length,
    0,
  );
  assert.equal(
    workflowFiles(p, [], s, [], [old])[0].taskKey,
    "project_subtask:s1",
  );
});
test("invalid protocols and inaccessible parent entities are excluded", () => {
  assert.equal(
    workflowFiles(
      [{ id: "p1", assets_url: "javascript:alert(1)" }],
      [],
      [],
      [],
      [],
    ).length,
    0,
  );
  assert.equal(
    workflowFiles(
      [],
      [],
      [],
      [],
      [
        {
          action: "attachment_added",
          entity_type: "campaign",
          entity_id: "c1",
          metadata: { strategy_asset: "https://files.example/a.pdf" },
        },
      ],
    ).length,
    0,
  );
});
