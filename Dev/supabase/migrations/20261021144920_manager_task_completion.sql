-- Managers/Admin, task creators, assigned PICs, parent Project/Campaign PICs,
-- and Workflow phase PICs may complete tasks without gaining general edit rights.
create or replace function public.can_complete_tracked_task(p_kind text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users actor
    where actor.id = public.workflow_actor()
      and actor.is_active
      and (
        public.workflow2_global(actor.id)
        or case p_kind
          when 'task' then exists (
            select 1 from public.tasks task
            where task.id = p_id
              and (
                task.created_by = actor.id
                or task.assignee_id = actor.id
                or (task.workflow_phase_id is not null and public.workflow_phase_access_for(task.workflow_phase_id, true, actor.id))
                or public.workflow_root('project', task.project_id, actor.id)
                or public.workflow_root('campaign', task.campaign_id, actor.id)
              )
          )
          when 'project_subtask' then exists (
            select 1 from public.project_subtasks subtask
            where subtask.id = p_id
              and (
                subtask.assignee_id = actor.id
                or public.workflow_root('project', subtask.project_id, actor.id)
                or (subtask.workflow_phase_id is not null and public.workflow_phase_access_for(subtask.workflow_phase_id, true, actor.id))
              )
          )
          when 'campaign_subtask' then exists (
            select 1 from public.campaign_subtasks subtask
            where subtask.id = p_id
              and (
                subtask.assignee_id = actor.id
                or public.workflow_root('campaign', subtask.campaign_id, actor.id)
                or (subtask.workflow_phase_id is not null and public.workflow_phase_access_for(subtask.workflow_phase_id, true, actor.id))
              )
          )
          else false
        end
      )
  );
$$;

revoke all on function public.can_complete_tracked_task(text, uuid) from public, anon;
grant execute on function public.can_complete_tracked_task(text, uuid) to authenticated;

create or replace function public.complete_tracked_task(p_kind text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_table text;
  completed_status text;
  changed integer;
begin
  if p_kind not in ('task', 'project_subtask', 'campaign_subtask')
     or not public.can_complete_tracked_task(p_kind, p_id) then
    raise exception using errcode = '42501', message = 'You do not have permission to complete this task';
  end if;

  target_table := case p_kind
    when 'task' then 'tasks'
    when 'project_subtask' then 'project_subtasks'
    else 'campaign_subtasks'
  end;
  completed_status := case when p_kind = 'task' then 'done' else 'completed' end;

  execute format(
    'update public.%I set status = $1, completed_at = now(), updated_at = now() where id = $2 and lower(coalesce(status, '''')) not in (''done'', ''complete'', ''completed'', ''deleted'', ''archived'', ''canceled'', ''cancelled'')',
    target_table
  ) using completed_status, p_id;
  get diagnostics changed = row_count;

  if changed <> 1 then
    raise exception using errcode = 'P0002', message = 'Task is already completed or unavailable';
  end if;
  return true;
end;
$$;

revoke all on function public.complete_tracked_task(text, uuid) from public, anon;
grant execute on function public.complete_tracked_task(text, uuid) to authenticated;

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
       or not (
         public.workflow2_global(actor_id)
         or old.assignee_id = actor_id
         or public.workflow_root(parent_kind, parent_id, actor_id)
         or (old.workflow_phase_id is not null and public.workflow_phase_access_for(old.workflow_phase_id, true, actor_id))
       ) then
      raise exception using
        errcode = '42501',
        message = 'Only a Manager/Admin, assigned PIC, task creator, Project/Campaign PIC, or Workflow phase PIC can complete this task';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
