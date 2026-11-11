-- Admin-only test context, bound to the real Supabase Auth session.
-- Read/write scope remains in the existing workflow_actor RLS/RPC chain.
create schema if not exists dashboard_private;
create table if not exists dashboard_private.admin_preview_sessions (
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 admin_auth_id uuid not null references auth.users(id) on delete cascade,
 admin_id bigint not null references public.users(id),
 actor_id bigint not null references public.users(id),
 started_at timestamptz not null default now(), expires_at timestamptz not null
);
alter table dashboard_private.admin_preview_sessions enable row level security;
revoke all on dashboard_private.admin_preview_sessions from public,anon,authenticated;
create table if not exists dashboard_private.admin_preview_audit (
 id bigint generated always as identity primary key,
 session_id uuid not null, admin_id bigint not null, actor_id bigint not null,
 action text not null check(action in ('start','stop')), created_at timestamptz not null default now()
);
alter table dashboard_private.admin_preview_audit enable row level security;
revoke all on dashboard_private.admin_preview_audit from public,anon,authenticated;
create or replace function dashboard_private.preview_session_id() returns uuid
language plpgsql stable security definer set search_path='' as $$begin
 return nullif(auth.jwt()->>'session_id','')::uuid;
exception when invalid_text_representation then return null;end $$;

create or replace function dashboard_private.preview_require_session() returns bigint
language plpgsql stable security definer set search_path='' as $$
declare a bigint;
begin
 select id into a from public.users where auth_id=auth.uid() and is_active;
 if a is null or not exists(select 1 from auth.sessions s where s.id=dashboard_private.preview_session_id()
   and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now())) then
  raise exception 'A real signed-in session is required' using errcode='42501';
 end if;
 return a;
end $$;

create or replace function dashboard_private.preview_require_admin() returns bigint
language plpgsql stable security definer set search_path='' as $$
declare a bigint;
begin
 a:=dashboard_private.preview_require_session();
 if not exists(select 1 from public.users where id=a and lower(trim(role))='admin') then
  raise exception 'A real signed-in Admin is required' using errcode='42501';
 end if;
 return a;
end $$;

create or replace function public.workflow_actor() returns bigint
language plpgsql stable security definer set search_path='' as $$
declare real_actor public.users%rowtype;ctx dashboard_private.admin_preview_sessions%rowtype;sid uuid;
begin
 select * into real_actor from public.users where auth_id=auth.uid() and is_active;
 if real_actor.id is null then return null;end if;
 sid:=dashboard_private.preview_session_id();
 if sid is not null and not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=auth.uid()
  and (s.not_after is null or s.not_after>now())) then return null;end if;
 select * into ctx from dashboard_private.admin_preview_sessions where session_id=sid;
 if ctx.session_id is null then return real_actor.id;end if;
 -- Never fall back to Admin privileges while a stale test context exists.
 if ctx.admin_auth_id is distinct from auth.uid() or ctx.admin_id<>real_actor.id or lower(trim(real_actor.role))<>'admin'
   or ctx.expires_at<=now() or not exists(select 1 from auth.sessions s where s.id=ctx.session_id and s.user_id=auth.uid()
     and (s.not_after is null or s.not_after>now()))
   or not exists(select 1 from public.users where id=ctx.actor_id and is_active) then return null;end if;
 return ctx.actor_id;
end $$;

create or replace function public.admin_preview_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a bigint;ctx dashboard_private.admin_preview_sessions%rowtype;person jsonb;
begin
 a:=dashboard_private.preview_require_session();
 select * into ctx from dashboard_private.admin_preview_sessions where session_id=dashboard_private.preview_session_id()
  and admin_auth_id=auth.uid() and admin_id=a;
 if ctx.session_id is null then return jsonb_build_object('active',false);end if;
 if public.workflow_actor() is distinct from ctx.actor_id then
  return jsonb_build_object('active',false,'requires_reset',true);end if;
 select jsonb_build_object('id',u.id,'auth_id',u.auth_id,'email',u.email,'name',u.name,'avatar_url',u.avatar_url,
  'role',u.role,'employment_level',u.employment_level,'job_title',u.job_title,'department_id',u.department_id,
  'department_name',d.name,'is_active',u.is_active) into person
  from public.users u left join public.departments d on d.id=u.department_id where u.id=ctx.actor_id;
 return jsonb_build_object('active',true,'actor',person,'started_at',ctx.started_at,'expires_at',ctx.expires_at);
end $$;

create or replace function public.admin_preview_start(p_actor bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a bigint;sid uuid;
begin
 a:=dashboard_private.preview_require_admin();sid:=dashboard_private.preview_session_id();
 if not exists(select 1 from public.users where id=p_actor and is_active) then
  raise exception 'Active test account required' using errcode='22023';end if;
 insert into dashboard_private.admin_preview_sessions(session_id,admin_auth_id,admin_id,actor_id,expires_at)
 values(sid,auth.uid(),a,p_actor,now()+interval '30 minutes') on conflict(session_id) do update
 set admin_auth_id=excluded.admin_auth_id,admin_id=excluded.admin_id,actor_id=excluded.actor_id,started_at=clock_timestamp(),expires_at=excluded.expires_at;
 insert into dashboard_private.admin_preview_audit(session_id,admin_id,actor_id,action) values(sid,a,p_actor,'start');
 return public.admin_preview_status();
end $$;

create or replace function public.admin_preview_stop() returns void
language plpgsql security definer set search_path='' as $$
declare a bigint;ctx dashboard_private.admin_preview_sessions%rowtype;
begin
 -- A demoted Admin may stop their own context; they regain only their current rank.
 a:=dashboard_private.preview_require_session();
 delete from dashboard_private.admin_preview_sessions where session_id=dashboard_private.preview_session_id()
  and admin_auth_id=auth.uid() and admin_id=a returning * into ctx;
 if ctx.session_id is not null then
  insert into dashboard_private.admin_preview_audit(session_id,admin_id,actor_id,action) values(ctx.session_id,a,ctx.actor_id,'stop');end if;
end $$;
revoke all on function dashboard_private.preview_session_id(),dashboard_private.preview_require_session(),dashboard_private.preview_require_admin() from public,anon,authenticated;
revoke all on function public.admin_preview_status(),public.admin_preview_start(bigint),public.admin_preview_stop() from public,anon;
grant execute on function public.admin_preview_status(),public.admin_preview_start(bigint),public.admin_preview_stop() to authenticated;

-- Route identity-dependent helpers through the same effective actor.
CREATE OR REPLACE FUNCTION dashboard_private.account_is_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.users where id=(select public.workflow_actor()) and is_active)
$function$;

CREATE OR REPLACE FUNCTION dashboard_private.account_is_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.users where id=(select public.workflow_actor()) and is_active and (
    lower(role)='admin' or lower(coalesce(employment_level,''))='manager'
    or (lower(role)='manager' and lower(coalesce(employment_level,''))<>'leader')))
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_asset_approver()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.users u left join public.departments d on d.id=u.department_id
  where u.id=(select public.workflow_actor()) and u.is_active and (
   lower(u.role)='admin' or (
    lower(trim(coalesce(d.name,'')))='design' and not public.workflow2_global(u.id)
    and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader')
   )
  ))
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_asset_borrower()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select public.dashboard_asset_approver() or exists(select 1 from public.users u
  where u.id=(select public.workflow_actor()) and u.is_active and lower(u.role)='member'
   and not public.workflow2_global(u.id) and lower(coalesce(u.employment_level,''))<>'leader')
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_notification_summary()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 with me as materialized(select id,lower(role) role,lower(coalesce(employment_level,'')) level from public.users where id=(select public.workflow_actor()) and is_active),
 unread as(select n.* from public.notifications n join me on n.user_id=me.id where not n.is_read),
 counts as(select count(*) total,count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask')) tasks,
 count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask','workflow','workflow_track','workflow2') or type like 'phase_%') workflow,
 count(*) filter(where entity_type in ('project','campaign','project_subtask','campaign_subtask')) projects,
 count(*) filter(where entity_type in ('profile','task','project','campaign','project_subtask','campaign_subtask','weekly_report')) profile,
 count(*) filter(where entity_type='department') departments from unread),
 history as materialized(select n.id,n.user_id,n.type,n.message,n.entity_type,n.entity_id,n.is_read,n.created_at,n.metadata from public.notifications n join me on n.user_id=me.id order by n.created_at desc,n.id limit 50),
 recent as(select * from history order by created_at desc,id limit 12)
 select jsonb_build_object('writerVersion',2,'features',jsonb_build_object('batchCompletion',to_regprocedure('public.complete_tracked_tasks(jsonb)') is not null,'batchReport',to_regprocedure('public.save_task_weekly_reports(jsonb,date,date)') is not null),'unread',total,'counts',jsonb_build_object('tasksCount',tasks,'workflowCount',workflow,'projectCount',projects,'profileCount',profile,'departmentCount',departments,
 'borrowCount',(select count(*) from public.borrow_requests b where b.approval_status='pending' and (public.dashboard_asset_approver() or (public.dashboard_asset_borrower() and b.requester_id=(select id from me))))),
 'items',coalesce((select jsonb_agg(recent order by created_at desc,id) from recent),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(history order by created_at desc,id) from history),'[]'::jsonb)) from counts
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role FROM public.users WHERE id = public.workflow_actor();
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_dept()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT department_id FROM public.users WHERE id = public.workflow_actor();
$function$;

CREATE OR REPLACE FUNCTION dashboard_private.guard_account_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor public.users%rowtype;
  global_manager boolean;
  client_role text := current_setting('role',true);
  permitted_fields text[];
begin
  -- Migration/maintenance and trusted server operations retain their privileges.
  if client_role not in ('anon','authenticated') then return new; end if;
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into actor from public.users where id=public.workflow_actor() and is_active;
  global_manager := coalesce(actor.id is not null and (
    lower(actor.role)='admin' or lower(coalesce(actor.employment_level,''))='manager'
    or (lower(actor.role)='manager' and lower(coalesce(actor.employment_level,''))<>'leader')),false);

  if tg_op='UPDATE' and old.auth_id=auth.uid()
    and row(new.role,new.employment_level,new.department_id,new.is_active)
      is distinct from row(old.role,old.employment_level,old.department_id,old.is_active) then
    raise exception 'Cannot change the signed-in account access while testing' using errcode='42501';
  end if;
  if global_manager then
    -- Serialize member management so two admins cannot remove the last admin.
    perform pg_catalog.pg_advisory_xact_lock(84635581);
    if new.role not in ('admin','manager','leader','member') then
      raise exception 'Invalid account role' using errcode='42501';
    end if;
    if lower(actor.role)<>'admin' and (new.role='admin' or (tg_op='UPDATE' and old.role='admin')) then
      raise exception 'Only Admin can manage Admin accounts' using errcode='42501';
    end if;
    if tg_op='INSERT' then
      if new.auth_id is not null then raise exception 'Auth identity must be linked by its owner' using errcode='42501'; end if;
      new.created_at := now();
    else
      if row(new.id,new.auth_id,new.email,new.created_at) is distinct from row(old.id,old.auth_id,old.email,old.created_at) then
        raise exception 'Account identity cannot be reassigned' using errcode='42501';
      end if;
      if old.id=actor.id and row(new.role,new.employment_level,new.is_active) is distinct from row(old.role,old.employment_level,old.is_active) then
        raise exception 'Cannot change your own access' using errcode='42501';
      end if;
      if old.role='admin' and old.is_active and (new.role<>'admin' or not new.is_active)
        and not exists(select 1 from public.users where role='admin' and is_active and id<>old.id) then
        raise exception 'Cannot remove the last Admin' using errcode='42501';
      end if;
    end if;
    return new;
  end if;

  if tg_op='INSERT' then
    if actor.id is not null or new.auth_id is distinct from auth.uid()
      or not dashboard_private.account_email_matches(new.email)
      or new.role<>'member' or not new.is_active or new.department_id is not null
      or coalesce(new.employment_level,'') not in ('','Staff','Nhân viên') or new.job_title is not null then
      raise exception 'New accounts must start as unassigned Staff' using errcode='42501';
    end if;
    new.created_at := now(); new.last_sign_in_at := now();
    return new;
  end if;

  if old.id=actor.id and old.is_active then
    permitted_fields := array['name','avatar_url','initials','last_sign_in_at'];
  elsif old.auth_id is null and new.auth_id=auth.uid() and dashboard_private.account_email_matches(old.email) then
    permitted_fields := array['auth_id','last_sign_in_at'];
  else
    raise exception 'Cannot edit another staff account' using errcode='42501';
  end if;
  if (to_jsonb(new)-permitted_fields) is distinct from (to_jsonb(old)-permitted_fields) then
    raise exception 'Staff cannot change rank, department or account ownership' using errcode='42501';
  end if;
  if new.last_sign_in_at is distinct from old.last_sign_in_at then new.last_sign_in_at := now(); end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.workflow2_save(p_kind text, p_entity uuid, p_document jsonb, p_expected integer)
 RETURNS workflow2_workflows
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor users; parent record; w workflow2_workflows; p jsonb; oldp jsonb; m jsonb; c jsonb; n integer:=0; boundary numeric:=0; total numeric; progress numeric; ready numeric; status text; oldstatus text; allowed boolean; preceding boolean:=true; task_status text; task_parent uuid; task_key text; tid uuid; denominator numeric; evidence text; stats jsonb:='{}';
begin
 select * into actor from users where id=public.workflow_actor() and is_active limit 1;
 if actor.id is null then raise exception 'Authentication required'; end if;
 if p_kind='project' then select r.name,r.workspace_id,r.department_id into parent from projects r where r.id=p_entity and coalesce(r.status,'') not in ('deleted','archived');
 elsif p_kind='campaign' then select r.name,r.workspace_id,r.department_id into parent from campaigns r where r.id=p_entity and coalesce(r.status,'') not in ('deleted','archived'); else raise exception 'Invalid entity type'; end if;
 if parent is null then raise exception 'Parent not available'; end if;
 if not coalesce((workflow2_global(actor.id) or ((lower(actor.role)='leader' or lower(actor.employment_level)='leader') and actor.department_id=parent.department_id)),false) then raise exception 'Not authorized' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(p_kind||p_entity::text));
 select * into w from workflow2_workflows where entity_type=p_kind and entity_id=p_entity for update;
 if coalesce(w.version,0)<>p_expected then raise exception 'Workflow changed. Refresh before saving.' using errcode='40001'; end if;
 if exists(select x->>'taskKey' from jsonb_array_elements(p_document->'phases') p2 cross join lateral jsonb_array_elements(p2->'milestones') x where coalesce(x->>'taskKey','')<>'' group by x->>'taskKey' having count(*)>1) then raise exception 'A task can be counted only once';end if;
 if jsonb_array_length(p_document->'phases') not between 2 and 7 then raise exception 'Need 2–7 phases'; end if;
 if (p_document->'valuation'->>'commercialProbability')::numeric not between 0 and 100 or (p_document->'valuation'->>'technicalProbability')::numeric not between 0 and 100 then raise exception 'Invalid ECV probabilities';end if;
 if coalesce((p_document->>'value')::numeric,-1)<0 or coalesce((p_document->>'budget')::numeric,-1)<0 then raise exception 'Invalid values'; end if;
 -- Approved/terminal phases keep their definition and decision immutable.
 for oldp in select value from jsonb_array_elements(coalesce(w.document->'phases','[]')) loop
 if oldp->'gate'->>'status' in ('go','no_go') then
 select ordinality into n from jsonb_array_elements(w.document->'phases') with ordinality t where t.value=oldp;
 if p_document->'phases'->(n-1) is distinct from oldp then raise exception 'Approved or stopped phase is immutable';end if;
 end if;
 end loop;
 n:=0;
 for p in select value from jsonb_array_elements(p_document->'phases') loop
 n:=n+1; if nullif(trim(p->>'name'),'') is null or (p->>'boundary')::numeric<=boundary or (p->>'boundary')::numeric>100 then raise exception 'Invalid phase boundaries'; end if; boundary:=(p->>'boundary')::numeric;
 if nullif(p->'gate'->>'ownerId','') is not null and not exists(select 1 from users u where u.id=(p->'gate'->>'ownerId')::bigint and u.is_active and (workflow2_global(u.id) or ((lower(u.role)='leader' or lower(u.employment_level)='leader') and u.department_id=parent.department_id))) then raise exception 'Gate manager must be an active authorized leader';end if;
 if nullif(p->>'start','')::date>nullif(p->>'end','')::date then raise exception 'Invalid dates'; end if;
 if coalesce((p->>'investment')::numeric,-1)<0 then raise exception 'Invalid phase cost';end if;
 if p->>'probability' is not null and ((p->>'probability')::numeric<0 or (p->>'probability')::numeric>100) then raise exception 'Invalid probability'; end if;
 select sum((x->>'weight')::numeric) into total from jsonb_array_elements(p->'milestones') x;
 if coalesce(total,0)<>100 then raise exception 'Milestone weights must sum to 100'; end if;
 progress:=0;
 select value into oldp from jsonb_array_elements(coalesce(w.document->'phases','[]')) where value->>'id'=p->>'id';
 for m in select value from jsonb_array_elements(p->'milestones') loop
 if (m->>'weight')::numeric<=0 or nullif(trim(m->>'title'),'') is null then raise exception 'Invalid milestone'; end if;
 task_key:=coalesce(m->>'taskKey','');
 if task_key<>'' then
 if oldp->'gate'->>'status'='go' then progress:=progress+(m->>'weight')::numeric;
 else
 tid:=split_part(task_key,':',2)::uuid;task_status:=null;task_parent:=null;
 if split_part(task_key,':',1)='task' then
 if p_kind='project' then select r.status,r.project_id into task_status,task_parent from tasks r where r.id=tid; else select r.status,r.campaign_id into task_status,task_parent from tasks r where r.id=tid; end if;
 elsif split_part(task_key,':',1)='project_subtask' and p_kind='project' then select r.status,r.project_id into task_status,task_parent from project_subtasks r where r.id=tid;
 elsif split_part(task_key,':',1)='campaign_subtask' and p_kind='campaign' then select r.status,r.campaign_id into task_status,task_parent from campaign_subtasks r where r.id=tid;
 else raise exception 'Invalid task relation'; end if;
 if task_parent is distinct from p_entity or task_status in ('deleted','archived') then raise exception 'Task does not belong to this workflow'; end if;
 if lower(task_status) in ('done','completed','complete') then progress:=progress+(m->>'weight')::numeric; end if;
 end if;
 elsif (m->>'done')::boolean then progress:=progress+(m->>'weight')::numeric; end if;
 evidence:=coalesce(m->>'evidence',''); if evidence<>'' and evidence !~ '^https?://' then raise exception 'Evidence must be an HTTP URL'; end if;
 end loop;
 select sum((x->>'weight')::numeric),coalesce(sum(case when (x->>'checked')::boolean then (x->>'weight')::numeric else 0 end),0) into denominator,ready from jsonb_array_elements(p->'gate'->'criteria') x;
 if coalesce(denominator,0)<>100 then raise exception 'Checklist weights must sum to 100'; end if;
 for c in select value from jsonb_array_elements(p->'gate'->'criteria') loop if (c->>'weight')::numeric<=0 or nullif(trim(c->>'title'),'') is null or jsonb_typeof(c->'checked') is distinct from 'boolean' or jsonb_typeof(c->'required') is distinct from 'boolean' then raise exception 'Invalid criterion';end if;end loop;
 select value into oldp from jsonb_array_elements(coalesce(w.document->'phases','[]')) where value->>'id'=p->>'id';
 oldstatus:=coalesce(oldp->'gate'->>'status','not_started');status:=p->'gate'->>'status';
 if oldstatus in ('in_review','on_hold') and oldp->'gate'->>'ownerId' is distinct from p->'gate'->>'ownerId' and not workflow2_global(actor.id) then raise exception 'Only a global manager can reassign an active review';end if;
 if status not in ('not_started','in_review','go','on_hold','no_go') then raise exception 'Invalid gate status';end if;
 if status<>oldstatus then
 allowed:=(oldstatus='not_started' and status='in_review') or (oldstatus='in_review' and status in ('go','on_hold','no_go')) or (oldstatus='on_hold' and status='in_review');
 if not allowed or not preceding then raise exception 'Invalid gate transition';end if;
 if nullif(p->'gate'->>'ownerId','') is null then raise exception 'Assign gate manager';end if;
 if not workflow2_global(actor.id) and (p->'gate'->>'ownerId')::bigint<>actor.id then raise exception 'Only gate manager can decide';end if;
 if status in ('on_hold','no_go') and nullif(trim(p->'gate'->>'note'),'') is null then raise exception 'Decision note required';end if;
 if status='go' and (progress<>100 or ready<80 or exists(select 1 from jsonb_array_elements(p->'gate'->'criteria') x where (x->>'required')::boolean and not (x->>'checked')::boolean)) then raise exception 'Gate conditions not met';end if;
 end if;
 stats:=stats||jsonb_build_object(p->>'id',jsonb_build_object('progress',progress,'readiness',ready));
 preceding:=preceding and status='go';
 end loop;
 if boundary<>100 then raise exception 'Final boundary must be 100';end if;
 if w.id is null then insert into workflow2_workflows(entity_type,entity_id,name,workspace_id,department_id,created_by,document) values(p_kind,p_entity,parent.name,parent.workspace_id,parent.department_id,actor.id,p_document) returning * into w;
 else update workflow2_workflows set document=p_document,version=version+1,updated_at=now(),name=parent.name where id=w.id returning * into w; end if;
 -- Projections and audit snapshots are committed atomically with the document.
 for p in select value from jsonb_array_elements(p_document->'phases') loop
 select r.status into oldstatus from workflow2_gates r where r.phase_id=(p->>'id')::uuid;
 if oldstatus is distinct from p->'gate'->>'status' and p->'gate'->>'status'<>'not_started' then
 insert into workflow2_completion_records(workflow_id,phase_id,decision,probability_at_decision,progress_at_decision,readiness_at_decision,decided_by,note,version)
 values(w.id,(p->>'id')::uuid,p->'gate'->>'status',(p->>'probability')::numeric,(stats->(p->>'id')->>'progress')::numeric,(stats->(p->>'id')->>'readiness')::numeric,actor.id,p->'gate'->>'note',w.version);
 if nullif(p->'gate'->>'ownerId','') is not null then
 insert into notifications(user_id,type,message,entity_type,entity_id) values((p->'gate'->>'ownerId')::bigint,'system',actor.name||' cập nhật gate '||(p->>'name')||': '||(p->'gate'->>'status'),'workflow2',w.id);
 end if;
 end if;
 end loop;
 delete from workflow2_phases where workflow_id=w.id;
 n:=0;
 for p in select value from jsonb_array_elements(p_document->'phases') loop
 n:=n+1;insert into workflow2_phases values((p->>'id')::uuid,w.id,n,p->>'name',p);
 insert into workflow2_gates values((p->>'id')::uuid,w.id,p->'gate'->>'status',nullif(p->'gate'->>'ownerId','')::bigint,p->'gate'->'criteria');
 for m in select value from jsonb_array_elements(p->'milestones') loop insert into workflow2_milestones values((m->>'id')::uuid,(p->>'id')::uuid,w.id,m->>'title',(m->>'weight')::numeric,m);end loop;
 end loop;
 return w;
end $function$;

CREATE OR REPLACE FUNCTION public.register_dashboard_push(p_endpoint text, p_p256dh text, p_auth text, p_origin text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 declare actor bigint;result uuid;session uuid;
 begin
 if exists(select 1 from dashboard_private.admin_preview_sessions where session_id=dashboard_private.preview_session_id()) then
  raise exception 'Restore your original account before changing device subscriptions' using errcode='42501';end if;
 select id into actor from users where auth_id=auth.uid() and is_active;
 session:=nullif(auth.jwt()->>'session_id','')::uuid;
 if actor is null or session is null then raise exception 'Sign in again to enable notifications';end if;
 if not exists(select 1 from dashboard_push_config where id and enabled and p_origin=any(allowed_origins)) then raise exception 'Push not enabled for this environment';end if;
 if length(p_endpoint)>2000 or p_endpoint !~ '^https://(web\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)(:[0-9]+)?/'
 or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'Invalid push subscription';end if;
 insert into push_subscriptions(user_id,auth_id,session_id,endpoint,p256dh,auth,origin) values(actor,auth.uid(),session,p_endpoint,p_p256dh,p_auth,p_origin)
 on conflict(endpoint) do update set user_id=excluded.user_id,auth_id=excluded.auth_id,session_id=excluded.session_id,p256dh=excluded.p256dh,auth=excluded.auth,origin=excluded.origin,updated_at=now() returning id into result;
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.unregister_dashboard_push(p_endpoint text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 delete from push_subscriptions where endpoint=p_endpoint and auth_id=auth.uid() and not exists(select 1 from dashboard_private.admin_preview_sessions where session_id=dashboard_private.preview_session_id())
$function$;


drop policy if exists dashboard_accounts_update on public.users;
create policy dashboard_accounts_update on public.users for update to authenticated using (
 (select dashboard_private.account_is_manager()) or (is_active and id=(select public.workflow_actor()))
 or (auth_id is null and dashboard_private.account_email_matches(email))
) with check ((select dashboard_private.account_is_manager()) or id=(select public.workflow_actor()) or auth_id=(select auth.uid()));

drop policy if exists dashboard_notifications_read on public.notifications;
create policy dashboard_notifications_read on public.notifications for select to authenticated using (
 user_id=(select public.workflow_actor()) or (select public.workflow2_global(public.workflow_actor()))
 or user_id in (select recipient.id from public.users actor join public.users recipient on recipient.department_id=actor.department_id
  where actor.id=(select public.workflow_actor()) and actor.is_active and recipient.is_active
  and (lower(actor.role)='leader' or lower(coalesce(actor.employment_level,''))='leader'))
);
notify pgrst,'reload schema';
