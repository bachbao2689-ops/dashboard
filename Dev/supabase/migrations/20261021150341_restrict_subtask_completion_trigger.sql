-- Trigger functions are invoked by the existing table triggers, not via RPC.
revoke all on function public.dashboard_require_subtask_assignee_completion()
  from public, anon, authenticated;
