# Workflow Management 2 review

## Business analysis

Source: Deepseek idea Workflow Management.docx, sections A–G. The document
contains Python authoring code as text; it was read as a specification, not run.
Existing Workflow Management stays at `/`. The new hub is `/workflow-management-2`.

Each actual Project/Campaign may have one workflow with 2–7 configurable phases.
Each phase has one gate, a manager, dates, weighted milestones and criteria.
All phases initially have no approvals, no earned progress, no probability.
No sample projects or fabricated staff are mixed into real portfolio data.

Progress is weighted accepted milestones. Linked tasks follow their actual status;
independent milestones are manually accepted. A task may contribute only once.
Overall progress uses the previous gate boundary plus current phase earned progress.
Readiness is checklist weight achieved, distinct from forecast probability.
Go requires In Review, earlier gates Go, 100% milestones, at least 80% checklist
and all mandatory criteria. Hold/No-Go need a reason. Final Go finishes the workflow.

Probabilities can be leader estimates or observed Go/(Go+No-Go) for matching
phase names. Unknown values stay unknown. The remaining conditional probability
is the product of pending gate probabilities. Approved gates are observations,
not forecasts. Small samples are displayed and not represented as calibrated models.
The brief's proposed Bayesian recurrence is not a general Bayesian update and
is intentionally not labeled Bayesian. ECV is available with its five explicit inputs.
Expected value = opportunity value × remaining probability; net value subtracts
the configured investment. Budget is not substituted for opportunity value.

RAG is a progress band (80/60 thresholds), not a claim about schedule/financial health.
Portfolio stages map phase position to six funnel columns. Funnel counts actual
reached stages in the filtered cohort; unreached work includes pending work,
so it is labeled “chưa đi tiếp”, separate from observed No-Go loss.

## Plan and architecture

1. Add domain calculations and validation.
2. Add five isolated database tables, two views, RLS and atomic save RPC.
3. Load actual parents, users and tasks; maintain a separate workflow per entity.
4. Build portfolio, detail/configuration, forecast, funnel and audit UI.
5. Test formulas, transitions, permissions, concurrency and responsive rendering.
6. Publish only to codex/develop-dashboard for review.

`workflow2_workflows` stores versioned aggregate documents. `workflow2_phases`,
`workflow2_gates`, `workflow2_milestones` are normalized projections committed
in the same transaction. `workflow2_completion_records` stores immutable decision
snapshots including progress, readiness, probability, actor and reason.
`workflow2_portfolio` and `workflow2_funnel_history` are security-invoker views.

The existing projects/campaigns tables are linked by entity type/id, not rewritten.
Save uses advisory locking and expected version; stale changes are rejected.
Only active managers/admins or department leaders can write; gates can be decided
only by their assigned manager or a global manager. Staff can read department
workflows. Raw table writes are revoked; validation happens in the RPC.
Go/No-Go phases are immutable. New decisions notify the gate manager.
Realtime plus polling refreshes tasks and workflows; unsaved drafts remain local
and conflict on save instead of overwriting remote changes.

## Tester and review

Run `node --experimental-strip-types --test tests/workflow2.test.mjs`.
Run `node --experimental-strip-types scripts/testWorkflow2.mjs` for DB tests in
a rollback transaction. Fixtures and notifications never persist after the test.
Run `npm run build` for TypeScript and production build.

Verification completed: five domain regression tests passed. Database tests
passed for atomic persistence, stale version rejection, phase order, review
prerequisites, actual linked task completion, immutable Go decisions, audit
snapshots, staff writes denied and authenticated RLS/raw-write permissions.
All database fixture records and notifications were rolled back.

The actual page was exercised with an isolated in-memory hook fixture: selecting
a portfolio card, configuration editing, In Review → Go, and versioned save.
No horizontal overflow at 360×800, 1024×768, 1920×1080, 1920×1200 or 2560×1440.
Fixture files were removed before the final build. Production authenticated
user acceptance remains on the develop page; no real project workflow was
pre-created during testing.

The migration is additive and does not backfill the earlier localStorage demo.
Migration runner reads backend DATABASE_URL without logging credentials.
