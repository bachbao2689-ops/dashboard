import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeWorkflow,
  phaseProgress,
  overallProgress,
  readiness,
  cumulativeProbability,
  canGo,
  validateDocument,
} from "../src/lib/workflow2.ts";
test("initial workflow has zero earned progress and no invented forecast", () => {
  const d = makeWorkflow("project", "1");
  assert.equal(overallProgress(d, []), 0);
  assert.equal(readiness(d.phases[0]), 0);
  assert.equal(cumulativeProbability(d), null);
  assert.equal(validateDocument(d), null);
});
test("weighted milestones differ from simple task count and follow actual task status", () => {
  const d = makeWorkflow("project", "1");
  const p = d.phases[0];
  p.milestones = [
    {
      id: "a",
      title: "Key Visual",
      weight: 70,
      done: false,
      taskKey: "task:1",
      evidence: "",
    },
    {
      id: "b",
      title: "Resize",
      weight: 30,
      done: true,
      taskKey: "",
      evidence: "",
    },
  ];
  assert.equal(phaseProgress(p, [{ key: "task:1", status: "doing" }]), 30);
  assert.equal(phaseProgress(p, [{ key: "task:1", status: "completed" }]), 100);
  assert.equal(overallProgress(d, [{ key: "task:1", status: "doing" }]), 6);
});
test("Go needs review, prior gates, progress and mandatory criteria", () => {
  const d = makeWorkflow("project", "1");
  const p = d.phases[0];
  p.gate.status = "in_review";
  p.milestones[0].done = true;
  assert.equal(canGo(d, 0, []), false);
  p.gate.criteria.forEach((c) => (c.checked = true));
  assert.equal(canGo(d, 0, []), true);
  d.phases[1].gate.status = "in_review";
  d.phases[1].milestones[0].done = true;
  d.phases[1].gate.criteria.forEach((c) => (c.checked = true));
  assert.equal(canGo(d, 1, []), false);
  p.gate.status = "go";
  assert.equal(canGo(d, 1, []), true);
});
test("remaining probability is conditional product and confirmed gates are excluded", () => {
  const d = makeWorkflow("project", "1");
  d.phases.forEach((p) => (p.probability = 80));
  assert.equal(cumulativeProbability(d), 32.8);
  d.phases[0].gate.status = "go";
  assert.equal(cumulativeProbability(d), 41);
  d.phases[1].gate.status = "no_go";
  assert.equal(cumulativeProbability(d), 0);
});
test("invalid weights, duplicated task links and boundaries rejected", () => {
  const d = makeWorkflow("project", "1");
  d.phases[0].milestones[0].weight = 50;
  assert.ok(validateDocument(d));
  d.phases[0].milestones[0].weight = 100;
  d.phases[0].milestones[0].taskKey = "task:x";
  d.phases[1].milestones[0].taskKey = "task:x";
  assert.ok(validateDocument(d));
});
