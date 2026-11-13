-- INSERT ... RETURNING also applies the SELECT policy. The existing STABLE
-- workflow_task_access(id) looks the row up using the statement's old snapshot,
-- so it cannot find a just-inserted task and rejects an otherwise valid INSERT.
-- Read the new tuple's provenance directly for standalone (non-phase) tasks.
-- This is already an allowed path in workflow_task_access_for; workflow_actor()
-- validates the active account/session and the effective Dev Tools actor.
-- Keep the INSERT/UPDATE policies and every other read-scope path unchanged.
set local lock_timeout = '3s';
set local statement_timeout = '10s';

alter policy workflow_read on public.tasks
  using (
    (
      workflow_phase_id is null
      and created_by = (select public.workflow_actor())
    )
    or public.workflow_task_access(id)
  );
