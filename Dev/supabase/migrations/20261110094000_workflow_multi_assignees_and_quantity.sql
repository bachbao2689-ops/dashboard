-- Support multi-assignees and ensure custom_fields persistence for task deliverables in workflow_create_task

create or replace function public.workflow_create_task(p_phase uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  w workflow_tracks;
  f workflow_phases;
  actor bigint := workflow_actor();
  uid bigint;
  dep uuid;
  space uuid;
  tid uuid;
  qty numeric;
  co_ids jsonb;
begin
  if actor is null or not workflow_phase_access(p_phase, true) then
    raise exception 'Phase access denied' using errcode='42501';
  end if;
  select * into f from workflow_phases where id = p_phase for update;
  if f.status in ('completed', 'cancelled') then
    raise exception 'Phase is closed';
  end if;
  select * into w from workflow_tracks where id = f.workflow_id;
  uid := nullif(p_data->>'assignee_id', '')::bigint;
  select department_id into dep from users where id = uid and is_active;
  if uid is null or not exists(select 1 from users where id = uid and is_active) then
    raise exception 'Assign an active PIC';
  end if;
  if not exists(select 1 from workflow_phase_members where phase_id = p_phase and user_id = uid)
     and not workflow_root(w.entity_type, w.entity_id, uid) then
    raise exception 'Task PIC must be assigned to this phase';
  end if;
  if nullif(p_data->>'start_date', '')::date > nullif(p_data->>'due_date', '')::date then
    raise exception 'Invalid task dates';
  end if;
  if nullif(p_data->>'start_date', '')::date < f.start_date
     or nullif(p_data->>'start_date', '')::date > f.due_date
     or nullif(p_data->>'due_date', '')::date < f.start_date
     or nullif(p_data->>'due_date', '')::date > f.due_date then
    raise exception 'Task dates must fit the phase';
  end if;
  if coalesce(p_data->>'priority', 'medium') not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;
  select workspace_id into space from projects where id = w.entity_id and w.entity_type = 'project';
  if w.entity_type = 'campaign' then
    select workspace_id into space from campaigns where id = w.entity_id;
  end if;
  if nullif(trim(p_data->>'title'), '') is null then
    raise exception 'Task title required';
  end if;

  insert into tasks(workspace_id, project_id, campaign_id, workflow_phase_id, title, description, assignee_id, department_id, priority, status, start_date, due_date, created_by)
  values(
    space,
    case when w.entity_type = 'project' then w.entity_id end,
    case when w.entity_type = 'campaign' then w.entity_id end,
    p_phase,
    trim(p_data->>'title'),
    p_data->>'description',
    uid,
    dep,
    coalesce(p_data->>'priority', 'medium'),
    'todo',
    nullif(p_data->>'start_date', '')::date,
    nullif(p_data->>'due_date', '')::date,
    actor
  ) returning id into tid;

  perform public.dashboard_emit_activity('task', tid, 'task_assigned', 'assignment:task:'||tid::text||':'||txid_current()::text, actor);
  if p_data->>'workflow_status' is not null then
    update tasks set workflow_status = p_data->>'workflow_status' where id = tid;
  end if;

  -- Build custom_fields with quantity, base_quantity, and assignee_ids
  if p_data->>'quantity' is not null and trim(p_data->>'quantity') <> '' then
    qty := (p_data->>'quantity')::numeric;
    update tasks set custom_fields = coalesce(custom_fields, '{}'::jsonb) || jsonb_build_object('quantity', qty, 'base_quantity', qty) where id = tid;
  end if;

  if p_data->'assignee_ids' is not null and jsonb_typeof(p_data->'assignee_ids') = 'array' then
    co_ids := p_data->'assignee_ids';
    update tasks set custom_fields = coalesce(custom_fields, '{}'::jsonb) || jsonb_build_object('assignee_ids', co_ids) where id = tid;
  end if;

  return tid;
end $$;

notify pgrst, 'reload schema';
