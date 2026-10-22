-- A subtask can only be moved into a completed state by its assigned PIC.
-- Parent owners and leaders retain their existing edit permissions for all
-- other fields; this guard only applies to the transition into a done state.
create or replace function public.dashboard_require_subtask_assignee_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  actor_id bigint := public.workflow_actor();
begin
  if lower(coalesce(new.status, '')) in ('done', 'complete', 'completed')
     and lower(coalesce(old.status, '')) not in ('done', 'complete', 'completed')
     and (actor_id is null or old.assignee_id is distinct from actor_id) then
    raise exception using
      errcode = '42501',
      message = 'Only the assigned PIC can complete this subtask';
  end if;

  return new;
end;
$$;

drop trigger if exists dashboard_project_subtask_completion_pic
  on public.project_subtasks;
create trigger dashboard_project_subtask_completion_pic
before update of status on public.project_subtasks
for each row execute function public.dashboard_require_subtask_assignee_completion();

drop trigger if exists dashboard_campaign_subtask_completion_pic
  on public.campaign_subtasks;
create trigger dashboard_campaign_subtask_completion_pic
before update of status on public.campaign_subtasks
for each row execute function public.dashboard_require_subtask_assignee_completion();
