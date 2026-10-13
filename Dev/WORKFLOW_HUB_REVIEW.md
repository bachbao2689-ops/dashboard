# Real Workflow Management

## Approved UI connected to real data (2026-10-13)

The approved `3161bf0` visual concept is retained: compact core/KPI header, connected stage-gate timeline, expandable gate/task board, status donut, and phase execution chart. All synthetic parents, website phases, PIC names, tasks and KPI fallbacks have been removed from the production component. It reads `workflow_hub_index` plus the same `useTasks` records used by All Tasks. A new `useWorkflowHub` controller handles refresh, scoped data, checked writes and membership pickers. Query-string links open the exact source Project/Campaign. Empty/no-permission/error states never inject sample data.

Apply `workflow-approved-ui.sql` after the foundational `workflow-hub.sql`. It adds persisted description/checklist fields and version-checked configure/gate/approval/empty-phase-removal RPCs. Inserting phases retains stable IDs and existing task/comment links. Populated phases cannot be removed. Task creation commits its seven-stage selection in the same transaction. Only root PIC/Admin configure the whole route; phase PIC/sub-PIC fill their own checklist and create tasks. A task-only assignee/mention has exact-task scope and cannot fill other phases or their gates.

KPI progress is actual done/active task count, excluding cancelled tasks. Cycle time and on-time rate require real completion timestamps; missing data shows `—`. The monthly donut has mutually exclusive buckets and Vietnam deadline-day boundaries. Gate score is a readiness indicator from saved checklist weights and actual task completion, not a statistical probability. A PIC may enter an explicit opportunity estimate with a required rationale. Gate approval needs all active phase tasks complete and at least 80% of the checklist; completion/start of the next phase is atomic. Phase execution compares real completion percentage with elapsed date-based plan, with no fabricated trend points.

Preview and QA fixtures stay local and are excluded from release commits. Release this change to develop for review; the previously approved official source remains unchanged until this flow is approved.

## Source and tracking

- `/projects` is the only parent creation screen. Insert triggers/backfill create one `workflow_tracks` row per real parent; no sample phases/tasks/PICs.
- Detail actions navigate to `/?project=<id>` or `/?campaign=<id>`, the existing Workflow tab. Workflow Management 2 stays removed.
- Parent core fields are read live, not copied: type/title/dates/status/PICs and source assets. Phase data has stable IDs and version-checked writes.
- Root PIC configures phases and explicitly invites phase PIC/sub-PIC. Both can create canonical `tasks` through `workflow_create_task`; exactly one parent FK and one phase FK are validated.
- Existing canonical tasks and project/campaign subtasks can be linked in place by the root PIC. Original IDs, comments, attachments and completion status survive. No copying/double counting.
- All Tasks and Profile use the same source records. Real task status/completed_at feed existing staff performance/report consumers. Request failures do not switch to sample tasks.
- Preserve the latest develop marketing status guide/hexagon picker as a shared component. Its popup is viewport-positioned in a portal, with local frosted blur only (no whole-tab overlay). `workflow_status` retains the seven marketing stages; a DB trigger normalizes `status` for All Tasks/performance and synchronizes Complete actions.

## Visibility

| Scope | Parent core | Phases | Phase tasks | Configure parent phases |
|---|---|---|---|---|
| Parent PIC | Yes | All | All | Yes |
| Phase PIC/sub-PIC (any rank/department) | Yes | Assigned phases | Assigned phases | No |
| Task assignee / explicit @mention | Yes | That task's phase context | Assigned/mentioned tasks only | No |
| Same department, not invited | Yes | None | None (standalone department tasks retain normal visibility) | No |
| Other department, not invited | No | None | None | No |
| Admin | Yes | All | All | Yes |

Being a Leader/Manager does not grant all Workflow phases. Legacy parents without explicit PIC membership temporarily treat their creator as PIC; new forms always choose PICs. Project execution members are `sub_pic`, not silently promoted by editing the PIC list.

- RLS also applies to direct REST reads of phases, members, Tasks, old subtasks, comments and related activity logs.
- The list RPC only returns phases allowed for the current actor. Retired Workflow 2 full documents are restricted to root PIC/Admin.
- @mentions are actual comments, not notification broadcasts. Mention-only users can comment but cannot edit details/complete/reassign/create phase tasks.
- UI refreshes on relevant realtime events/focus and polls visible pages as fallback. New tables are added to Supabase Realtime.

## Progress and decisions

Actual done/total task count gives phase progress. Empty phases show `—`, not an invented percentage. Optional opportunity % is explicitly a PIC estimate with a required rationale, not an inferred probability. Phase completion needs all tasks complete; active/review/completed transitions require previous phases complete or cancelled. Creating planned tasks in future phases is allowed.

## Migration and verification

Run `node scripts/workflowHubDb.mjs ../migrations/workflow-hub.sql <backend env path>` once (atomic and re-applicable). It adds schema/policies and backfills tracks; does not delete parents/tasks. Shared Supabase permissions change for both deployments, even though UI/source publish only to develop.

- `node scripts/testWorkflowHub.mjs <backend env path>`: 45 permission/tracking/persistence assertions using authenticated role, with all fixtures rolled back.
- `node --experimental-strip-types --test tests/workflowMetrics.test.mjs tests/workflowHub.test.mjs tests/workflow2.test.mjs tests/workflowFiles.test.mjs`
- `npm run build`
- Isolated browser UI QA: 360×800, 1024×768, 1920×1080, 2560×1440, 1920×1200; no horizontal overflow; drawer footer visible, above mobile nav. QA fixtures removed before commit.
- Deployment is develop only. Signed-in online end-to-end UI verification still requires the user's authenticated browser session; SQL tests exercise actual shared DB permissions and rollback all writes.
