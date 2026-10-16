# Role scope audit — Develop

## Canonical rank

The client now uses `Dev/src/lib/roleScope.ts`, matching the live `public.workflow2_global(id)` rule. In particular, `role=manager` with `employment_level=Leader` is a department Leader, not a global Manager. Rank alone does not give access to every Workflow phase: `workflow_hub_index` and parent/task RLS remain the source of record for explicit PIC, phase and task access.

## UI and tracking corrected

- Dashboard, Team Workload, Reports and Admin Overview routes check the same profile rank as navigation before mounting page queries.
- Profile PIC/department filters, Team reports and Member list stay in the Leader's department; a stale selected PIC falls back to the actor. Staff cannot open management analytics by direct URL.
- Project/Campaign hide and delete buttons follow `workflow_root` from the hub plus the creator fallback used by `workflow_parent_edit`. Updates require a returned row before showing success.
- Shared task/directory snapshots remain keyed by actor, role, level and department; Profile reuses the shared directory request.

## Shared Supabase security follow-up

Read-only audit of the live database found `public.users` still has RLS disabled, with `SELECT`, `INSERT`, `UPDATE` and `DELETE` granted to `authenticated` and `anon`. A browser client can therefore bypass the UI's rank checks and change `role`, `employment_level` or account status through the API. The same legacy state is recorded in `GUIDELINE/SOURCE_BASELINE_8af7795_2026-10-16.md`.

Do not enable RLS on this shared production table in an unrelated UI release: sign-in links imported staff by email, creates new profiles and records sign-in timestamps; Profile edits name/avatar; Admin/Manager adds and suspends members. A database security migration needs policies/triggers for these exact operations and authenticated rollback tests before it can be applied to the database shared by Develop and Official. No shared database DDL was changed in this audit.
