-- Keep subtask completion permission checks in the shared RPC. The trigger
-- must run with its owner's privileges so authenticated updates do not fail
-- when the internal Workflow permission helper is not directly executable.
create or replace function public.dashboard_require_subtask_assignee_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_id bigint := public.workflow_actor();
  completion_kind text;
begin
  if lower(coalesce(new.status, '')) in ('done', 'complete', 'completed')
     and lower(coalesce(old.status, '')) not in ('done', 'complete', 'completed') then
    completion_kind := case tg_table_name
      when 'project_subtasks' then 'project_subtask'
      when 'campaign_subtasks' then 'campaign_subtask'
      else null
    end;

    if actor_id is null
       or completion_kind is null
       or not public.can_complete_tracked_task(completion_kind, old.id) then
      raise exception using
        errcode = '42501',
        message = 'Only the task creator, assigned PIC, Project/Campaign PIC, Workflow phase PIC, or Manager/Admin can complete this task';
    end if;
  end if;

  return new;
end;
$function$;

notify pgrst, 'reload schema';
