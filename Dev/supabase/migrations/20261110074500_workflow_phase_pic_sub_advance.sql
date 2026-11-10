-- Allow Phase PIC and Phase Sub to advance phase, and allow advance when either all tasks are done OR checklist criteria >= 80%
-- Also support quantity in workflow_create_task

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
  if p_data->>'quantity' is not null and trim(p_data->>'quantity') <> '' then
    qty := (p_data->>'quantity')::numeric;
    update tasks set custom_fields = coalesce(custom_fields, '{}'::jsonb) || jsonb_build_object('quantity', qty, 'base_quantity', qty) where id = tid;
  end if;
  return tid;
end $$;

create or replace function public.workflow_advance_phase(p_phase uuid, p_expected integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  w workflow_tracks;
  f workflow_phases;
  nextphase workflow_phases;
  totalweight numeric;
  passedweight numeric;
  totaltasks integer := 0;
  donetasks integer := 0;
  actor bigint := workflow_actor();
  can_advance boolean := false;
  gate_passed boolean := false;
begin
  select * into f from workflow_phases where id = p_phase;
  if f.id is null then
    raise exception 'Phase not found' using errcode='44000';
  end if;
  select * into w from workflow_tracks where id = f.workflow_id;
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  -- Phase PIC, Phase Sub, workflow_root, or workflow2_global can approve advance
  can_advance := workflow_root(w.entity_type, w.entity_id, actor)
    or workflow2_global(actor)
    or exists(select 1 from workflow_phase_members m where m.phase_id = f.id and m.user_id = actor);

  if not can_advance then
    raise exception 'Only phase PIC, phase sub-PIC, or parent managers can approve a gate' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(w.id::text));
  select * into f from workflow_phases where id = p_phase for update;
  if f.version <> p_expected then
    raise exception 'Phase changed. Refresh before approving.' using errcode='40001';
  end if;

  -- Condition A: Gate checklist score >= 80%
  select sum((v->>'weight')::numeric),
         sum(case when (v->>'checked')::boolean then (v->>'weight')::numeric else 0 end)
    into totalweight, passedweight
    from jsonb_array_elements(f.gate_criteria) v;

  if totalweight is not null and totalweight > 0 and (passedweight / totalweight) >= 0.8 then
    gate_passed := true;
  end if;

  -- Condition B: All active phase tasks completed (total > 0 and done = total)
  if not gate_passed then
    select count(*),
           count(*) filter (where lower(status) in ('done','completed','complete') or workflow_status='completed')
      into totaltasks, donetasks
      from tasks
     where workflow_phase_id = f.id
       and lower(status) not in ('deleted','archived','cancelled','canceled')
       and coalesce(workflow_status,'') <> 'canceled';

    if totaltasks > 0 and donetasks = totaltasks then
      gate_passed := true;
    end if;
  end if;

  -- Also check project_subtasks / campaign_subtasks if linked
  if not gate_passed then
    select totaltasks + count(*),
           donetasks + count(*) filter (where lower(status) in ('done','completed','complete') or workflow_status='completed')
      into totaltasks, donetasks
      from project_subtasks
     where workflow_phase_id = f.id
       and lower(status) not in ('deleted','archived','cancelled','canceled')
       and coalesce(workflow_status,'') <> 'canceled';

    if totaltasks > 0 and donetasks = totaltasks then
      gate_passed := true;
    end if;
  end if;

  if not gate_passed then
    raise exception 'Complete all tasks or at least 80%% of the gate checklist' using errcode='40000';
  end if;

  perform workflow_save_phase(w.id, f.id, jsonb_build_object(
    'title', f.title,
    'start_date', f.start_date,
    'due_date', f.due_date,
    'status', 'completed',
    'opportunity', f.opportunity,
    'opportunity_note', f.opportunity_note,
    'pic_ids', (select jsonb_agg(user_id) from workflow_phase_members where phase_id = f.id and role = 'pic'),
    'sub_pic_ids', (select coalesce(jsonb_agg(user_id),'[]') from workflow_phase_members where phase_id = f.id and role = 'sub_pic')
  ), f.version);

  select * into nextphase
    from workflow_phases
   where workflow_id = w.id
     and position > f.position
     and status not in ('completed','cancelled')
   order by position
   limit 1
   for update;

  if nextphase.id is not null then
    perform workflow_save_phase(w.id, nextphase.id, jsonb_build_object(
      'title', nextphase.title,
      'start_date', nextphase.start_date,
      'due_date', nextphase.due_date,
      'status', 'in_progress',
      'opportunity', nextphase.opportunity,
      'opportunity_note', nextphase.opportunity_note,
      'pic_ids', (select jsonb_agg(user_id) from workflow_phase_members where phase_id = nextphase.id and role = 'pic'),
      'sub_pic_ids', (select coalesce(jsonb_agg(user_id),'[]') from workflow_phase_members where phase_id = nextphase.id and role = 'sub_pic')
    ), nextphase.version);
  end if;

  return nextphase.id;
end $$;

grant execute on function public.workflow_advance_phase(uuid,integer) to authenticated;
grant execute on function public.workflow_create_task(uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
