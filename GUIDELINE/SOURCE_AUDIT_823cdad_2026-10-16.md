# Develop audit — 823cdad — 16 October 2026

## Verified baseline

- Branch: `codex/develop-dashboard`; baseline `823cdad87c84e2818fa232e2fd612f17451db899`.
- GitHub reports successful Vercel Preview deployment for this commit. Develop alias served entry `index-u6qNF-D0.js`; Official served the separate `index-DlARq_zA.js` entry when checked.
- Reviewed the updates from `1100e01` through `823cdad`: sidebar signals/layout, rank checks, Workflow permissions and department-scoped analytics. The role-scope change in `823cdad` is retained. This review found no evidence that those changes had been overwritten.

## Changes in this audit

- `useWorkspaceData` only refreshes asset summaries when `includeAssets` is true. Task/Report refreshes no longer issue an unrelated asset query or inherit its loading/error state.
- Shared Task/Workflow snapshots ignore new ordinary comments and mentions of other people. Mentions of the current actor still refresh visibility, including legacy `@name` comments. Comment updates/deletes still refresh so removed mentions can revoke access. Dedicated comment/notification subscribers continue receiving their events.
- Removed seven unreachable frontend files after checking source imports, routes, scripts and tests: old Workflow Management 2 page/hook, unused Projects Kanban page/hook, `departmentData.ts`, `mockData.ts` and `mock_generated_backup.json`. `/workflow-management-2` continues redirecting to the current Workflow page. Live tables, migrations, legacy regression tests and the actively used offline asset fixture are retained.
- Removed source is recoverable from Git history. No shared database rows, functions, policies or publication settings were modified.

## Live database observations (read-only)

- Approximate data volume: 157 tasks, 64 projects, 11 campaigns, 15 project subtasks, 11 campaign subtasks, 75 workflow tracks, 215 notifications and 94 activity rows. These volumes do not justify deleting business history or merging relational tables.
- Tested authenticated database visibility for all seven active linked accounts. Scopes differ between Admin, department Leaders and Staff. A `role=manager` account with `employment_level=Leader` remains department scoped. These checks exercise database reads; they do not replace an interactive login walkthrough for each account.
- `workflow_hub_index` is a frequently used RPC. Historical `pg_stat_statements` mean was about 286 ms across 3,398 calls; that cumulative value is not a before/after performance measurement. Current single server-side samples across seven actors were 6.9–130.7 ms. A combined RPC/count request over the remote connection took 309–411 ms. No claim of an end-user speedup percentage is made.
- Realtime publishes 14 application tables, including tasks, parent entities, phase data, comments and notifications. It does **not** publish `users`, `departments`, `assets` or `borrow_requests`, despite client subscriptions to some of these. Shared resources have focus/online/60-second reconciliation; `useAssets` and `useBorrowRequests` still use their own fetch/subscription paths. Cross-device asset/borrow updates therefore need a separate database publication/policy rollout.
- `public.users` RLS is disabled; `anon` and `authenticated` have broad table grants. `public.borrow_requests` also has RLS disabled and no policies. UI rank checks do not secure direct API access to these tables. Enabling their Realtime publication before defining access policies could expose changes broadly.

## Follow-up database work

Create and test policies for registration/profile reads and updates, team management, cross-department PIC lookup and borrow approval before enabling RLS on the shared tables. Validate joins and access with the existing role matrix, then publish only the required tables. This affects the database used by both Develop and Official and is not silently bundled into this frontend release.

## Validation

- Production TypeScript/Vite build: passed.
- Node regression suite: 61/61 passed, including five new invalidation/mention checks.
- `git diff --check`: passed.
- Existing visual structure and active route components are unchanged; authenticated browser walkthrough and device/network latency measurements remain separate from this source/database audit.
