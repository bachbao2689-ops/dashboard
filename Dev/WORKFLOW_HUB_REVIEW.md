# Real Workflow Management

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

- `node scripts/testWorkflowHub.mjs <backend env path>`: 29 permission/tracking assertions using authenticated role, with all fixtures rolled back.
- `node --experimental-strip-types --test tests/workflowHub.test.mjs tests/workflow2.test.mjs tests/workflowFiles.test.mjs`
- `npm run build`
- Isolated browser UI QA: 360×800, 1024×768, 1920×1080, 2560×1440, 1920×1200; no horizontal overflow; drawer footer visible, above mobile nav. QA fixtures removed before commit.
- Deployment is develop only. Signed-in online end-to-end UI verification still requires the user's authenticated browser session; SQL tests exercise actual shared DB permissions and rollback all writes.
