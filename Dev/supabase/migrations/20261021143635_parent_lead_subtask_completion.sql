-- Allow a Project/Campaign lead or creator to complete subtasks in their own entity.
-- The assigned PIC keeps the ability to complete their own subtask.
create or replace function public.dashboard_require_subtask_assignee_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  actor_id bigint := public.workflow_actor();
  parent_kind text;
  parent_id uuid;
begin
  if lower(coalesce(new.status, '')) in ('done', 'complete', 'completed')
     and lower(coalesce(old.status, '')) not in ('done', 'complete', 'completed') then
    if tg_table_name = 'project_subtasks' then
      parent_kind := 'project';
      parent_id := old.project_id;
    else
      parent_kind := 'campaign';
      parent_id := old.campaign_id;
    end if;

    if actor_id is null
       or (old.assignee_id is distinct from actor_id
           and not public.workflow_root(parent_kind, parent_id, actor_id)) then
      raise exception using
        errcode = '42501',
        message = 'Only the assigned PIC or Project/Campaign lead can complete this subtask';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
