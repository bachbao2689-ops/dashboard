-- One read scope for Projects, Campaigns, Workflow and all task sources.
-- A department Leader reads parents owned/created by that team's people, plus
-- their own explicit parent invitations. department_id can name the requesting
-- department and does not itself grant access to another execution team's work.
-- Read access never turns a department Leader into a parent/phase editor.

create or replace function dashboard_private.work_team_person(a bigint, p bigint)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.users actor join public.users person on person.id=p
  where actor.id=a and actor.is_active and actor.department_id is not null
   and actor.department_id=person.department_id
 )
$$;

-- A foreign collaborator is invited personally, not on behalf of their whole
-- department. Resolve the originating team before considering peer visibility:
-- creator team, then primary PIC/lead for Admin-created work, then an unambiguous
-- PIC team for older records. Sub-PIC membership never changes the owning team.
create or replace function dashboard_private.work_parent_owner_department(k text,e uuid)
returns uuid language sql stable security definer set search_path='' as $$
 select case when k='project' then (
  select coalesce(creator.department_id,
   (select owner.department_id from public.activity_log l
    join public.users owner on owner.id::text=l.metadata->>'primary_owner_id'
    where l.entity_type='project' and l.entity_id=p.id and l.action='creation_details'
     and owner.department_id is not null order by l.created_at desc,l.id desc limit 1),
   (select min(owner.department_id::text)::uuid from public.project_members m
    join public.users owner on owner.id=m.user_id
    where m.project_id=p.id and m.workflow_role='pic' and owner.department_id is not null
    having count(distinct owner.department_id)=1)
  ) from public.projects p left join public.users creator on creator.id=p.created_by where p.id=e
 ) when k='campaign' then (
  select coalesce(creator.department_id,lead_person.department_id,
   (select min(owner.department_id::text)::uuid from public.campaign_members m
    join public.users owner on owner.id=m.user_id
    where m.campaign_id=c.id and m.workflow_role='pic' and owner.department_id is not null
    having count(distinct owner.department_id)=1)
  ) from public.campaigns c left join public.users creator on creator.id=c.created_by
   left join public.users lead_person on lead_person.id=c.lead_id where c.id=e
 ) end
$$;

create or replace function dashboard_private.work_parent_owned_by_team(k text,e uuid,a bigint)
returns boolean language sql stable security definer set search_path='' as $$
 select dashboard_private.work_leader(a) and exists(
  select 1 from public.users actor where actor.id=a and actor.is_active
   and actor.department_id is not null
   and actor.department_id=dashboard_private.work_parent_owner_department(k,e)
 )
$$;

create or replace function dashboard_private.work_parent_allowed(k text,e uuid,a bigint)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.users actor
  where actor.id=a and actor.is_active
   and ((k='project' and exists(select 1 from public.projects where id=e))
    or (k='campaign' and exists(select 1 from public.campaigns where id=e)))
   and (
    public.workflow2_global(a)
    or dashboard_private.work_invited(k,e,a)
    or (k='project' and exists(select 1 from public.projects where id=e and created_by=a))
    or (k='campaign' and exists(select 1 from public.campaigns where id=e and created_by=a))
    or dashboard_private.work_parent_owned_by_team(k,e,a)
   )
 )
$$;

-- Historical work remains visible when a teammate is deactivated; only the
-- viewing account must be active. Invite guards still require active invitees.
-- Compare IDs as text rather than casting arbitrary custom_fields JSON to bigint.
create or replace function dashboard_private.work_task_person_allowed(a bigint,primary_assignee bigint,fields jsonb,include_team boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.users actor where actor.id=a and actor.is_active and (
   primary_assignee=a
   or exists(select 1 from jsonb_array_elements_text(
    case when jsonb_typeof(fields->'assignee_ids')='array' then fields->'assignee_ids' else '[]'::jsonb end
   ) assigned(id) where assigned.id=a::text)
   or (include_team and dashboard_private.work_leader(a) and (
    dashboard_private.work_team_person(a,primary_assignee)
    or exists(select 1 from public.users person
     join jsonb_array_elements_text(
      case when jsonb_typeof(fields->'assignee_ids')='array' then fields->'assignee_ids' else '[]'::jsonb end
     ) assigned(id) on person.id::text=assigned.id
     where actor.department_id is not null and person.department_id=actor.department_id)
   ))
  )
 )
$$;

create or replace function public.workflow_phase_access_for(p uuid,editing boolean,_actor bigint)
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
 select exists(
  select 1 from public.workflow_phases f join public.workflow_tracks w on w.id=f.workflow_id
  where f.id=p and exists(select 1 from public.users where id=_actor and is_active)
   and (not dashboard_private.work_leader(_actor) or dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,_actor))
   and (
    (not editing and dashboard_private.work_leader(_actor)
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

create or replace function public.workflow_legacy_access_for(k text,e uuid,a bigint,editing boolean,_actor bigint)
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
 select exists(select 1 from public.users where id=_actor and is_active) and
  case when not editing and dashboard_private.work_leader(_actor) then
   a=_actor or dashboard_private.work_team_person(_actor,a) or dashboard_private.work_parent_allowed(k,e,_actor)
  else (
   a=_actor or public.workflow_root(k,e,_actor)
   or (not editing and dashboard_private.work_invited(k,e,_actor))
   or (not editing and exists(select 1 from public.users u where u.id=_actor
    and u.department_id is not null and u.department_id=case when k='project'
     then (select department_id from public.projects where id=e)
     else (select department_id from public.campaigns where id=e) end))
  ) end
$$;

create or replace function public.workflow_task_access_for(tid uuid,editing boolean,_actor bigint)
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
 select exists(
  select 1 from public.tasks t join public.users u on u.id=_actor and u.is_active
  where t.id=tid and (
   (not editing and dashboard_private.work_task_person_allowed(_actor,t.assignee_id,t.custom_fields,false))
   or case when not editing and dashboard_private.work_leader(_actor) then (
    dashboard_private.work_task_person_allowed(_actor,t.assignee_id,t.custom_fields,true)
    or t.created_by=_actor or dashboard_private.work_team_person(_actor,t.created_by)
    or dashboard_private.work_parent_allowed('project',t.project_id,_actor)
    or dashboard_private.work_parent_allowed('campaign',t.campaign_id,_actor)
    or (t.project_id is null and t.campaign_id is null and t.workflow_phase_id is null
     and t.assignee_id is null
     and not exists(select 1 from public.users creator where creator.id=t.created_by and creator.department_id is not null)
     and jsonb_array_length(case when jsonb_typeof(t.custom_fields->'assignee_ids')='array'
      then t.custom_fields->'assignee_ids' else '[]'::jsonb end)=0
     and u.department_id is not null and t.department_id=u.department_id)
    or exists(select 1 from public.comments c where c.task_id=t.id and _actor=any(c.mentions))
   ) else (
    t.created_by=u.id
    or (not editing and (dashboard_private.work_invited('project',t.project_id,_actor)
     or dashboard_private.work_invited('campaign',t.campaign_id,_actor)))
    or (t.workflow_phase_id is null and public.workflow2_global(u.id))
    or (t.workflow_phase_id is not null and (
     public.workflow_phase_access_for(t.workflow_phase_id,editing,_actor) or t.assignee_id=u.id))
    or (t.workflow_phase_id is null and (
     t.assignee_id=u.id or public.workflow_root('project',t.project_id,_actor)
     or public.workflow_root('campaign',t.campaign_id,_actor)
     or (t.department_id=u.department_id and (not editing or lower(u.role)='leader' or lower(u.employment_level)='leader'))
    ))
    or (not editing and exists(select 1 from public.comments c where c.task_id=t.id and u.id=any(c.mentions)))
   ) end
  )
 )
$$;

create or replace function public.workflow_old_task_access_for(k text,tid uuid,editing boolean,_actor bigint)
returns boolean language plpgsql stable security definer set search_path='public','pg_temp' as $$
 declare r record; mentioned boolean;
 begin
  if not exists(select 1 from public.users where id=_actor and is_active) then return false;end if;
  if k='project' then
   select project_id parent_id,assignee_id,workflow_phase_id,custom_fields into r from public.project_subtasks where id=tid;
  elsif k='campaign' then
   select campaign_id parent_id,assignee_id,workflow_phase_id,custom_fields into r from public.campaign_subtasks where id=tid;
  else return false;end if;
  if not found then return false;end if;
  mentioned:=not editing and exists(
   select 1 from public.activity_log l join public.users u on u.id=_actor
   where l.entity_id=tid and l.entity_type=k||'_subtask' and l.action='comment'
    and (coalesce(l.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id])
     or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(l.metadata->>'body',''))) > 0)
  );
  if not editing and dashboard_private.work_leader(_actor) then
   return dashboard_private.work_task_person_allowed(_actor,r.assignee_id,r.custom_fields,true)
    or dashboard_private.work_parent_allowed(k,r.parent_id,_actor) or mentioned;
  end if;
  if not editing and dashboard_private.work_task_person_allowed(_actor,r.assignee_id,r.custom_fields,false) then return true;end if;
  if r.workflow_phase_id is not null then
   return coalesce(r.assignee_id=_actor,false) or public.workflow_phase_access_for(r.workflow_phase_id,editing,_actor) or mentioned;
  end if;
  return public.workflow_legacy_access_for(k,r.parent_id,r.assignee_id,editing,_actor) or mentioned;
 end
$$;

-- Remove the blanket "any Leader" SELECT and label-based policy bypasses.
-- The wrappers derive their actor only from the authenticated Supabase session.
drop policy if exists workflow_read on public.projects;
create policy workflow_read on public.projects for select to authenticated
 using(created_by=public.workflow_actor() or public.workflow_parent_access('project',id));
drop policy if exists workflow_read on public.campaigns;
create policy workflow_read on public.campaigns for select to authenticated
 using(created_by=public.workflow_actor() or public.workflow_parent_access('campaign',id));
drop policy if exists workflow_read on public.tasks;
create policy workflow_read on public.tasks for select to authenticated using(public.workflow_task_access(id));
drop policy if exists workflow_read on public.project_subtasks;
create policy workflow_read on public.project_subtasks for select to authenticated using(public.workflow_old_task_access('project',id));
drop policy if exists workflow_read on public.campaign_subtasks;
create policy workflow_read on public.campaign_subtasks for select to authenticated using(public.workflow_old_task_access('campaign',id));

revoke all on function dashboard_private.work_parent_owner_department(text,uuid),
 dashboard_private.work_parent_owned_by_team(text,uuid,bigint),
 dashboard_private.work_task_person_allowed(bigint,bigint,jsonb,boolean)
 from public,anon,authenticated;
notify pgrst,'reload schema';
