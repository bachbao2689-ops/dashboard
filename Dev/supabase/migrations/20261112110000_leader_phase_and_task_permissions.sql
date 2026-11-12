-- 20261112110000_leader_phase_and_task_permissions.sql
-- 1. Allow Leaders to edit phases and create tasks for their team members
-- 2. Allow Leaders to configure, save, insert, and remove phases
-- 3. Auto-enroll task assignees into workflow_phase_members when assigned by Leader or Root

create or replace function public.workflow_phase_access_for(p uuid, editing boolean, _actor bigint)
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
 select exists(
  select 1 from public.workflow_phases f join public.workflow_tracks w on w.id=f.workflow_id
  where f.id=p and exists(select 1 from public.users where id=_actor and is_active)
   and (not dashboard_private.work_leader(_actor) or dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,_actor))
   and (
    (dashboard_private.work_leader(_actor)
     and dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,_actor))
    or public.workflow_root(w.entity_type,w.entity_id,_actor)
    or (not editing and dashboard_private.work_invited(w.entity_type,w.entity_id,_actor))
    or exists(select 1 from public.workflow_phase_members m where m.phase_id=p and m.user_id=_actor and (not editing or m.role='pic'))
    or (not editing and (
     exists(select 1 from public.tasks t where t.workflow_phase_id=p and (
      dashboard_private.work_task_person_allowed(_actor,t.assignee_id,t.custom_fields,false)
      or exists(select 1 from public.comments c where c.task_id=t.id and _actor=any(c.mentions))))
     or exists(select 1 from public.project_subtasks s where s.workflow_phase_id=p and (
      dashboard_private.work_task_person_allowed(_actor,s.assignee_id,s.custom_fields,false)
      or exists(select 1 from public.activity_log l join public.users u on u.id=_actor
       where l.entity_id=s.id and l.entity_type='project_subtask' and l.action='comment'
        and (coalesce(l.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id])
         or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(l.metadata->>'body',''))) > 0))))
     or exists(select 1 from public.campaign_subtasks s where s.workflow_phase_id=p and (
      dashboard_private.work_task_person_allowed(_actor,s.assignee_id,s.custom_fields,false)
      or exists(select 1 from public.activity_log l join public.users u on u.id=_actor
       where l.entity_id=s.id and l.entity_type='campaign_subtask' and l.action='comment'
        and (coalesce(l.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id])
         or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(l.metadata->>'body',''))) > 0))))
    ))
   )
 )
$$;

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

  -- Leader can assign their team members or other leaders even if not yet in workflow_phase_members
  if not exists(select 1 from workflow_phase_members where phase_id = p_phase and user_id = uid)
     and not workflow_root(w.entity_type, w.entity_id, uid) then
    if (dashboard_private.work_leader(actor) and (
          dashboard_private.work_team_person(actor, uid) or dashboard_private.work_leader(uid)
       )) or workflow_root(w.entity_type, w.entity_id, actor) then
      insert into workflow_phase_members(phase_id, user_id, role)
      values (p_phase, uid, 'sub_pic')
      on conflict (phase_id, user_id) do nothing;
    else
      raise exception 'Task PIC must be assigned to this phase';
    end if;
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

    -- Also auto-enroll any allowed co-assignees into phase members
    insert into workflow_phase_members(phase_id, user_id, role)
    select p_phase, (val)::bigint, 'sub_pic'
    from jsonb_array_elements_text(co_ids) as val
    where (val)::bigint <> uid
      and exists(select 1 from users where id = (val)::bigint and is_active)
      and (
        (dashboard_private.work_leader(actor) and (
          dashboard_private.work_team_person(actor, (val)::bigint) or dashboard_private.work_leader((val)::bigint)
        )) or workflow_root(w.entity_type, w.entity_id, actor)
      )
    on conflict (phase_id, user_id) do nothing;
  end if;

  return tid;
end $$;

CREATE OR REPLACE FUNCTION public.workflow_save_phase(p_workflow uuid, p_phase uuid, p_data jsonb, p_expected integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 declare w workflow_tracks; f workflow_phases; actor bigint:=workflow_actor(); ids bigint[]; uid bigint; startd date; endd date; nextstatus text; begin
 select * into w from workflow_tracks where id=p_workflow;
 if actor is null or (
   not workflow_root(w.entity_type,w.entity_id)
   and not (dashboard_private.work_leader(actor) and dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,actor))
 ) then
   raise exception 'Only parent PIC or department Leader can configure phases' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtext(p_workflow::text));
 select * into f from workflow_phases where id=p_phase and workflow_id=p_workflow for update;
 if p_phase is not null and f.id is null then raise exception 'Phase not found';end if;
 if coalesce(f.version,0)<>p_expected then raise exception 'Phase changed. Refresh before saving.' using errcode='40001';end if;
 startd:=nullif(p_data->>'start_date','')::date; endd:=nullif(p_data->>'due_date','')::date;
 if startd>endd then raise exception 'Invalid dates';end if;
 nextstatus:=coalesce(p_data->>'status','todo');
 if nextstatus='completed' and (f.id is null or not exists(select 1 from (select workflow_phase_id,status from tasks union all select workflow_phase_id,status from project_subtasks union all select workflow_phase_id,status from campaign_subtasks) phase_tasks where workflow_phase_id=f.id and lower(status) not in ('deleted','archived','cancelled','canceled')) or exists(select 1 from (select workflow_phase_id,status from tasks union all select workflow_phase_id,status from project_subtasks union all select workflow_phase_id,status from campaign_subtasks) phase_tasks where workflow_phase_id=f.id and lower(status) not in ('done','completed','complete','deleted','archived','cancelled','canceled'))) then raise exception 'Complete phase tasks before completing the phase';end if;
 if nextstatus='completed' and exists(select 1 from workflow_phases where workflow_id=w.id and position<coalesce(f.position,2147483647) and status not in ('completed','cancelled')) then raise exception 'Previous phases must be completed first';end if;
 if p_data->>'opportunity' is not null and nullif(trim(p_data->>'opportunity_note'),'') is null then raise exception 'Explain the opportunity estimate';end if;
 select array_agg(distinct v::bigint) into ids from jsonb_array_elements_text(coalesce(p_data->'pic_ids','[]')||coalesce(p_data->'sub_pic_ids','[]')) v;
 if dashboard_private.work_leader(actor) and exists(
  select 1 from unnest(coalesce(ids,'{}'::bigint[])) chosen(person)
  where not dashboard_private.work_invitee_allowed(actor,chosen.person)
   and not exists(select 1 from public.workflow_phase_members m where m.phase_id=f.id and m.user_id=chosen.person)) then
  raise exception 'Leader may invite own department or another department Leader' using errcode='42501';end if;
 if coalesce(jsonb_array_length(p_data->'pic_ids'),0)=0 then raise exception 'Assign a phase PIC';end if;
 foreach uid in array coalesce(ids,'{}') loop if not exists(select 1 from users where id=uid and is_active) then raise exception 'Inactive PIC';end if;end loop;
 if f.id is null then
 insert into workflow_phases(workflow_id,position,title,start_date,due_date,status,opportunity,opportunity_note,created_by) values(w.id,(select coalesce(max(position),0)+1 from workflow_phases where workflow_id=w.id),trim(p_data->>'title'),startd,endd,nextstatus,nullif(p_data->>'opportunity','')::numeric,p_data->>'opportunity_note',actor) returning * into f;
 else
 update workflow_phases set title=trim(p_data->>'title'),start_date=startd,due_date=endd,status=nextstatus,opportunity=nullif(p_data->>'opportunity','')::numeric,opportunity_note=p_data->>'opportunity_note',version=version+1,updated_at=now() where id=f.id returning * into f;
 end if;
 delete from workflow_phase_members where phase_id=f.id;
 insert into workflow_phase_members(phase_id,user_id,role) select f.id,invited.user_id,case when coalesce(p_data->'pic_ids','[]') @> to_jsonb(array[invited.user_id]) then 'pic' else 'sub_pic' end from unnest(ids) invited(user_id);
 insert into notifications(user_id,type,message,entity_type,entity_id) select invited.user_id,'system','Bạn được giao phase: '||f.title,w.entity_type,w.entity_id from unnest(ids) invited(user_id) where invited.user_id<>actor;
 return f.id; end
$function$;

CREATE OR REPLACE FUNCTION public.workflow_configure_phase(p_workflow uuid, p_phase uuid, p_data jsonb, p_expected integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pid uuid; w workflow_tracks; f workflow_phases; desired integer; lastpos integer; totalweight numeric; passedweight numeric;begin
 select * into w from workflow_tracks where id=p_workflow;
 if workflow_actor() is null or (
   not workflow_root(w.entity_type,w.entity_id)
   and not (dashboard_private.work_leader(workflow_actor()) and dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,workflow_actor()))
 ) then
   raise exception 'Only parent PIC or department Leader can configure phases' using errcode='42501';
 end if;
 if dashboard_private.work_leader(workflow_actor()) and exists(
  select 1 from (
    select value::bigint person from jsonb_array_elements_text(coalesce(p_data->'pics','[]'::jsonb))
    union select value::bigint from jsonb_array_elements_text(coalesce(p_data->'sub_pics','[]'::jsonb))
  ) chosen where not dashboard_private.work_invitee_allowed(workflow_actor(),chosen.person)
   and not exists(select 1 from public.workflow_phase_members m where m.phase_id=p_phase and m.user_id=chosen.person)) then
  raise exception 'Leader may invite own department or another department Leader' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(p_workflow::text));
 perform workflow_validate_gate(coalesce(p_data->'gate_criteria','[]'));
 if p_data->>'status'='completed' then
  select sum((v->>'weight')::numeric),sum(case when (v->>'checked')::boolean then (v->>'weight')::numeric else 0 end) into totalweight,passedweight from jsonb_array_elements(coalesce(p_data->'gate_criteria','[]')) v;
  if totalweight is null or passedweight/totalweight<0.8 then raise exception 'Complete at least 80%% of the gate checklist';end if;
 end if;
 pid:=workflow_save_phase(p_workflow,p_phase,p_data,p_expected);
 select * into f from workflow_phases where id=pid;
 update workflow_phases set description=coalesce(p_data->>'description',''),gate_criteria=coalesce(p_data->'gate_criteria',f.gate_criteria) where id=pid;
 if p_phase is null and p_data->>'position' is not null then
  select max(position) into lastpos from workflow_phases where workflow_id=w.id;
  desired:=greatest(1,least((p_data->>'position')::integer,lastpos));
  if desired<lastpos then
   update workflow_phases set position=-position where workflow_id=w.id and position>=desired;
   update workflow_phases set position=-position+1,version=version+1 where workflow_id=w.id and id<>pid and position<0;
   update workflow_phases set position=desired where id=pid;
  end if;
 end if;
 return pid;
end
$function$;

CREATE OR REPLACE FUNCTION public.workflow_remove_phase(p_phase uuid, p_expected integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w workflow_tracks; f workflow_phases;begin
 select * into f from workflow_phases where id=p_phase;
 select * into w from workflow_tracks where id=f.workflow_id;
 if workflow_actor() is null or (
   not workflow_root(w.entity_type,w.entity_id)
   and not (dashboard_private.work_leader(workflow_actor()) and dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,workflow_actor()))
 ) then
   raise exception 'Only parent PIC or department Leader can remove a phase' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtext(w.id::text));
 select * into f from workflow_phases where id=p_phase for update;
 if f.version<>p_expected then raise exception 'Phase changed. Refresh before saving.' using errcode='40001';end if;
 if exists(select 1 from tasks where workflow_phase_id=f.id) or exists(select 1 from project_subtasks where workflow_phase_id=f.id) or exists(select 1 from campaign_subtasks where workflow_phase_id=f.id) then raise exception 'Phase contains tasks. Keep it or cancel it to preserve tracking.';end if;
 delete from workflow_phases where id=f.id;
 update workflow_phases set position=-position where workflow_id=w.id and position>f.position;
 update workflow_phases set position=-position-1,version=version+1 where workflow_id=w.id and position<0;
end
$function$;

notify pgrst, 'reload schema';
