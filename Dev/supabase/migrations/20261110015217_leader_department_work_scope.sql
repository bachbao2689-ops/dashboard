-- Same department visibility and explicit cross-department PIC/Sub-PIC only.
-- This migration does not turn department Leaders into global managers.
create schema if not exists dashboard_private;
revoke all on schema dashboard_private from public,anon;
create or replace function public.workflow2_global(uid bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=uid and u.is_active and (
  lower(u.role)='admin' or lower(coalesce(u.employment_level,''))='manager'
  or (lower(u.role)='manager' and lower(coalesce(u.employment_level,''))<>'leader')))
$$;
create or replace function dashboard_private.work_leader(a bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=a and u.is_active and not public.workflow2_global(u.id)
  and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader'))
$$;
create or replace function dashboard_private.work_invited(k text,e uuid,a bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=a and u.is_active) and (
  (k='project' and exists(select 1 from public.project_members m where m.project_id=e and m.user_id=a and m.workflow_role in ('pic','sub_pic')))
  or (k='campaign' and (exists(select 1 from public.campaign_members m where m.campaign_id=e and m.user_id=a and m.workflow_role in ('pic','sub_pic'))
   or exists(select 1 from public.campaigns c where c.id=e and c.lead_id=a))))
$$;
create or replace function dashboard_private.work_parent_allowed(k text,e uuid,a bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=a and u.is_active and (
  public.workflow2_global(a) or dashboard_private.work_invited(k,e,a)
  or (u.department_id is not null and u.department_id=case when k='project' then
    (select department_id from public.projects where id=e) when k='campaign' then
    (select department_id from public.campaigns where id=e) end)))
$$;
create or replace function dashboard_private.work_team_person(a bigint,p bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users actor join public.users person on person.id=p and person.is_active
  where actor.id=a and actor.is_active and actor.department_id is not null and actor.department_id=person.department_id)
$$;
create or replace function dashboard_private.work_invitee_allowed(a bigint,p bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users person where person.id=p and person.is_active and (
  not dashboard_private.work_leader(a) or dashboard_private.work_team_person(a,p) or dashboard_private.work_leader(p)))
$$;
CREATE OR REPLACE FUNCTION public.workflow_root(k text, e uuid, u bigint DEFAULT workflow_actor())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.users actor
    where actor.id = u and actor.is_active
      and (not dashboard_private.work_leader(u) or dashboard_private.work_parent_allowed(k,e,u)) and (
      public.workflow2_global(actor.id)
      or (k = 'project' and (
        exists (select 1 from public.projects p where p.id = e and p.created_by = u)
        or exists (select 1 from public.project_members m
                   where m.project_id = e and m.user_id = u and m.workflow_role = 'pic')
      ))
      or (k = 'campaign' and (
        exists (select 1 from public.campaigns c
                where c.id = e and (c.created_by = u or c.lead_id = u))
        or exists (select 1 from public.campaign_members m
                   where m.campaign_id = e and m.user_id = u and m.workflow_role = 'pic')
      ))
    )
  )
$function$
;
create or replace function public.workflow_parent_access_for(k text,e uuid,_actor bigint)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.users where id=_actor and is_active) then return false;end if;
 if dashboard_private.work_leader(_actor) then return dashboard_private.work_parent_allowed(k,e,_actor);end if;
 return (_actor is not null and (
  public.workflow_root(k,e,_actor)
  or exists(select 1 from public.users u where u.id=_actor and u.is_active and u.department_id is not null
   and u.department_id=case when k='project' then (select department_id from public.projects where id=e) else (select department_id from public.campaigns where id=e) end
   and not public.workflow2_global(u.id) and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader'))
  or (k='project' and exists(select 1 from public.project_members where project_id=e and user_id=_actor))
  or (k='campaign' and exists(select 1 from public.campaign_members where campaign_id=e and user_id=_actor))
  or exists(select 1 from public.workflow_tracks w join public.workflow_phases f on f.workflow_id=w.id where w.entity_type=k and w.entity_id=e and public.workflow_phase_access_for(f.id,false,_actor))
  or exists(select 1 from public.tasks t where (case when k='project' then t.project_id else t.campaign_id end)=e and (t.assignee_id=_actor or exists(select 1 from public.comments c where c.task_id=t.id and _actor=any(c.mentions))))
  or (k='project' and exists(select 1 from public.project_subtasks where project_id=e and public.workflow_old_task_access_for('project',id,false,_actor)))
  or (k='campaign' and exists(select 1 from public.campaign_subtasks where campaign_id=e and public.workflow_old_task_access_for('campaign',id,false,_actor)))
 ));
end $$;
CREATE OR REPLACE FUNCTION public.workflow_phase_access_for(p uuid, editing boolean, _actor bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(
  select 1 from public.workflow_phases f
  join public.workflow_tracks w on w.id=f.workflow_id
  where f.id=p and exists(select 1 from public.users where id=_actor and is_active)
   and (not dashboard_private.work_leader(_actor) or dashboard_private.work_parent_allowed(w.entity_type,w.entity_id,_actor)) and (
   public.workflow_root(w.entity_type,w.entity_id,_actor) or (not editing and dashboard_private.work_invited(w.entity_type,w.entity_id,_actor))
   or exists(select 1 from public.workflow_phase_members m where m.phase_id=p and m.user_id=_actor and (not editing or m.role='pic'))
   or (not editing and (
    exists(select 1 from public.users u where u.id=_actor and u.is_active and u.department_id is not null
      and u.department_id=case when w.entity_type='project' then (select department_id from public.projects where id=w.entity_id) else (select department_id from public.campaigns where id=w.entity_id) end
      and not public.workflow2_global(u.id) and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader'))
    or exists(select 1 from public.tasks t where t.workflow_phase_id=p and (t.assignee_id=_actor or exists(select 1 from public.comments c where c.task_id=t.id and _actor=any(c.mentions))))
    or exists(select 1 from public.project_subtasks s where s.workflow_phase_id=p and (s.assignee_id=_actor or exists(select 1 from public.activity_log a join public.users u on u.id=_actor where a.entity_id=s.id and a.entity_type='project_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0))))
    or exists(select 1 from public.campaign_subtasks s where s.workflow_phase_id=p and (s.assignee_id=_actor or exists(select 1 from public.activity_log a join public.users u on u.id=_actor where a.entity_id=s.id and a.entity_type='campaign_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0))))
   ))
  )
 )
$function$
;
CREATE OR REPLACE FUNCTION public.workflow_legacy_access_for(k text, e uuid, a bigint, editing boolean, _actor bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select _actor is not null and (a=_actor or workflow_root(k,e,_actor) or (not editing and dashboard_private.work_invited(k,e,_actor)) or (not editing and exists(select 1 from users u where u.id=_actor and u.department_id is not null and u.department_id=case when k='project' then (select department_id from projects where id=e) else (select department_id from campaigns where id=e) end)))
$function$
;
CREATE OR REPLACE FUNCTION public.workflow_task_access_for(tid uuid, editing boolean, _actor bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.tasks t
    join public.users u on u.id = _actor and u.is_active
    where t.id = tid and (
      t.created_by = u.id
      or (not editing and dashboard_private.work_leader(_actor) and (
        dashboard_private.work_team_person(_actor,t.assignee_id) or dashboard_private.work_team_person(_actor,t.created_by)))
      or (not editing and (dashboard_private.work_invited('project',t.project_id,_actor) or dashboard_private.work_invited('campaign',t.campaign_id,_actor)))
      or (t.workflow_phase_id is null and public.workflow2_global(u.id))
      or (t.workflow_phase_id is not null and (
        public.workflow_phase_access_for(t.workflow_phase_id, editing, _actor)
        or t.assignee_id = u.id
      ))
      or (t.workflow_phase_id is null and (
        t.assignee_id = u.id
        or public.workflow_root('project', t.project_id, _actor)
        or public.workflow_root('campaign', t.campaign_id, _actor)
        or (t.department_id = u.department_id and (
          not editing or lower(u.role) = 'leader' or lower(u.employment_level) = 'leader'
        ))
      ))
      or (not editing and exists (
        select 1 from public.comments c where c.task_id = t.id and u.id = any(c.mentions)
      ))
    )
  )
$function$
;
CREATE OR REPLACE FUNCTION public.workflow_old_task_access_for(k text, tid uuid, editing boolean, _actor bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 declare r record; mentioned boolean;
 begin
  if k='project' then select project_id parent_id,assignee_id,workflow_phase_id into r from public.project_subtasks where id=tid;
  else select campaign_id parent_id,assignee_id,workflow_phase_id into r from public.campaign_subtasks where id=tid; end if;
  if r is null or _actor is null then return false; end if;
  if not editing and dashboard_private.work_leader(_actor) and dashboard_private.work_team_person(_actor,r.assignee_id) then return true;end if;
  mentioned:=not editing and exists(select 1 from public.activity_log a join public.users u on u.id=_actor where a.entity_id=tid and a.entity_type=k||'_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0));
  if r.workflow_phase_id is not null then return coalesce(r.assignee_id=_actor,false) or public.workflow_phase_access_for(r.workflow_phase_id,editing,_actor) or mentioned; end if;
  return public.workflow_legacy_access_for(k,r.parent_id,r.assignee_id,editing,_actor) or mentioned;
 end
$function$
;
CREATE OR REPLACE FUNCTION public.workflow_hub_index()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

 with actor as materialized(select workflow_actor() uid),
 context as materialized(select u.id uid,u.department_id,lower(u.role)='admin' is_admin from actor join users u on u.id=actor.uid and u.is_active),
 visible as materialized(
  select w.id,w.entity_type,w.entity_id,s.*,ctx.uid actor_id,ctx.department_id actor_department_id,
   case when ctx.is_admin then true else workflow_root(w.entity_type,w.entity_id,ctx.uid) end can_root
 from context ctx cross join workflow_tracks w join lateral (
 select name,status,description,start_date,due_date,priority,department_id,campaign_id,null::numeric budget,null::text[] channels,created_by,null::bigint lead_id,assets_url asset from projects where w.entity_type='project' and id=w.entity_id
 union all select name,status,objective,start_date,end_date,null::text,department_id,null::uuid,budget,channels,created_by,lead_id,(select metadata->>'strategy_asset' from activity_log where entity_type='campaign' and entity_id=w.entity_id and action='attachment_added' order by created_at desc limit 1) from campaigns where w.entity_type='campaign' and id=w.entity_id
 ) s on true where ctx.uid is not null and coalesce(s.status,'') not in ('deleted','archived')
 ), eligible as materialized(
  select * from visible w where workflow_parent_access_for(w.entity_type,w.entity_id,w.actor_id)
 ), pic_candidates as materialized(
  select 'project'::text kind,project_id entity,user_id person from project_members where workflow_role='pic'
  union all select 'campaign',campaign_id,user_id from campaign_members where workflow_role='pic'
  union all select 'campaign',id,lead_id from campaigns where lead_id is not null
  union all select 'project',p.id,p.created_by from projects p where not exists(select 1 from project_members m where m.project_id=p.id and m.workflow_role='pic')
  union all select 'campaign',c.id,c.created_by from campaigns c where c.lead_id is null and not exists(select 1 from campaign_members m where m.campaign_id=c.id and m.workflow_role='pic')
 ), pic_people as materialized(
  select distinct p.kind,p.entity,u.id,u.name,u.avatar_url from pic_candidates p join users u on u.id=p.person and u.is_active
 ), pics as materialized(
  select kind,entity,jsonb_agg(jsonb_build_object('id',id,'name',name,'avatar_url',avatar_url) order by name,id) people from pic_people group by kind,entity
 ), sub_candidates as materialized(
  select 'project'::text kind,project_id entity,user_id person from project_members where workflow_role='sub_pic'
  union all select 'campaign',campaign_id,user_id from campaign_members where workflow_role='sub_pic'
 ), sub_people as materialized(
  select distinct p.kind,p.entity,u.id,u.name,u.avatar_url from sub_candidates p join users u on u.id=p.person and u.is_active
 ), sub_pics as materialized(
  select kind,entity,jsonb_agg(jsonb_build_object('id',id,'name',name,'avatar_url',avatar_url,'role','sub_pic') order by name,id) people from sub_people group by kind,entity
 ), phase_people as materialized(
  select m.phase_id,jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url,'role',m.role) order by m.role,u.name,u.id) people
  from workflow_phase_members m join users u on u.id=m.user_id group by m.phase_id
 ), phase_permissions as materialized(
  select f.*,coalesce(m.people,'[]'::jsonb) members,
   (w.can_root or workflow_phase_access_for(f.id,false,w.actor_id)) can_read,
   (w.can_root or workflow_phase_access_for(f.id,true,w.actor_id)) can_edit
  from workflow_phases f join eligible w on w.id=f.workflow_id left join phase_people m on m.phase_id=f.id
 ), phase_data as materialized(
  select workflow_id,jsonb_agg(jsonb_build_object('id',id,'title',title,'position',position,'description',description,'gate_criteria',gate_criteria,'start_date',start_date,'due_date',due_date,'status',status,'version',version,'opportunity',opportunity,'opportunity_note',opportunity_note,'can_edit_tasks',can_edit,'members',members) order by position) data
  from phase_permissions where can_read group by workflow_id
 )
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',w.id,'entity_type',w.entity_type,'entity_id',w.entity_id,'name',w.name,'status',w.status,
 'description',w.description,'start_date',w.start_date,'due_date',w.due_date,'priority',w.priority,
 'department_id',w.department_id,'campaign_id',w.campaign_id,'budget',w.budget,'channels',w.channels,
 'root',w.can_root,'asset',w.asset,
 'creator',(select jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url) from users u where u.id=w.created_by and u.is_active),
 'pics',coalesce((select people from pics p where p.kind=w.entity_type and p.entity=w.entity_id),'[]'::jsonb),
 'sub_pics',coalesce((select people from sub_pics p where p.kind=w.entity_type and p.entity=w.entity_id),'[]'::jsonb),
 'phases',coalesce((select data from phase_data p where p.workflow_id=w.id),'[]'::jsonb)
 ) order by w.name,w.entity_type,w.entity_id),'[]') from eligible w
$function$
;

drop policy if exists workflow_read on public.projects;
create policy workflow_read on public.projects for select to authenticated using (public.workflow_parent_access('project',id));
drop policy if exists workflow_read on public.campaigns;
create policy workflow_read on public.campaigns for select to authenticated using (public.workflow_parent_access('campaign',id));

-- The picker is not authorization: reject newly invited foreign Staff server-side.
create or replace function dashboard_private.work_member_invite_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare a bigint:=public.workflow_actor();begin
 if current_setting('role',true) not in ('anon','authenticated') then return new;end if;
 if tg_op='UPDATE' and new.user_id=old.user_id then return new;end if;
 if dashboard_private.work_leader(a) and not dashboard_private.work_invitee_allowed(a,new.user_id) then
  raise exception 'Leader may invite own department or another department Leader' using errcode='42501';end if;
 return new;
end $$;
drop trigger if exists work_member_invite_guard on public.project_members;
create trigger work_member_invite_guard before insert or update on public.project_members for each row execute function dashboard_private.work_member_invite_guard();
drop trigger if exists work_member_invite_guard on public.campaign_members;
create trigger work_member_invite_guard before insert or update on public.campaign_members for each row execute function dashboard_private.work_member_invite_guard();

create or replace function dashboard_private.work_parent_assignment_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare a bigint:=public.workflow_actor();d uuid;begin
 if current_setting('role',true) not in ('anon','authenticated') or not dashboard_private.work_leader(a) then return new;end if;
 select department_id into d from public.users where id=a;
 if tg_op='INSERT' or new.department_id is distinct from old.department_id then
  if new.department_id is distinct from d then raise exception 'Leader creates parents only in own department' using errcode='42501';end if;
 end if;
 if tg_table_name='campaigns' then
  if tg_op='INSERT' or new.lead_id is distinct from old.lead_id then
   if new.lead_id is not null and not dashboard_private.work_invitee_allowed(a,new.lead_id) then
    raise exception 'PIC must be own department or another department Leader' using errcode='42501';end if;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists work_parent_assignment_guard on public.projects;
create trigger work_parent_assignment_guard before insert or update on public.projects for each row execute function dashboard_private.work_parent_assignment_guard();
drop trigger if exists work_parent_assignment_guard on public.campaigns;
create trigger work_parent_assignment_guard before insert or update on public.campaigns for each row execute function dashboard_private.work_parent_assignment_guard();
CREATE OR REPLACE FUNCTION public.workflow_save_phase(p_workflow uuid, p_phase uuid, p_data jsonb, p_expected integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 declare w workflow_tracks; f workflow_phases; actor bigint:=workflow_actor(); ids bigint[]; uid bigint; startd date; endd date; nextstatus text; begin
 select * into w from workflow_tracks where id=p_workflow;
 if actor is null or not workflow_root(w.entity_type,w.entity_id) then raise exception 'Only parent PIC can configure phases' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(p_workflow::text));
 select * into f from workflow_phases where id=p_phase and workflow_id=p_workflow for update;
 if p_phase is not null and f.id is null then raise exception 'Phase not found';end if;
 if coalesce(f.version,0)<>p_expected then raise exception 'Phase changed. Refresh before saving.' using errcode='40001';end if;
 startd:=nullif(p_data->>'start_date','')::date; endd:=nullif(p_data->>'due_date','')::date;
 if startd>endd then raise exception 'Invalid dates';end if;
 nextstatus:=coalesce(p_data->>'status','todo');
 if nextstatus='completed' and (f.id is null or not exists(select 1 from (select workflow_phase_id,status from tasks union all select workflow_phase_id,status from project_subtasks union all select workflow_phase_id,status from campaign_subtasks) phase_tasks where workflow_phase_id=f.id and lower(status) not in ('deleted','archived','cancelled','canceled')) or exists(select 1 from (select workflow_phase_id,status from tasks union all select workflow_phase_id,status from project_subtasks union all select workflow_phase_id,status from campaign_subtasks) phase_tasks where workflow_phase_id=f.id and lower(status) not in ('done','completed','complete','deleted','archived','cancelled','canceled'))) then raise exception 'Complete phase tasks before completing the phase';end if;
 if nextstatus in ('in_progress','in_review','completed') and exists(select 1 from workflow_phases where workflow_id=w.id and position<coalesce(f.position,2147483647) and status not in ('completed','cancelled')) then raise exception 'Previous phases must be completed first';end if;
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
$function$
;
revoke all on function dashboard_private.work_leader(bigint),dashboard_private.work_invited(text,uuid,bigint),
 dashboard_private.work_parent_allowed(text,uuid,bigint),dashboard_private.work_team_person(bigint,bigint),
 dashboard_private.work_invitee_allowed(bigint,bigint),dashboard_private.work_member_invite_guard(),dashboard_private.work_parent_assignment_guard()
 from public,anon,authenticated;
notify pgrst,'reload schema';
