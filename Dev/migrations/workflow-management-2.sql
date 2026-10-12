begin;
create table if not exists public.workflow2_workflows (
 id uuid primary key default gen_random_uuid(), entity_type text not null check(entity_type in ('project','campaign')),
 entity_id uuid not null, name text not null, workspace_id uuid not null, department_id uuid,
 created_by bigint not null, version integer not null default 1, document jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(entity_type,entity_id)
);
create table if not exists public.workflow2_phases (id uuid primary key, workflow_id uuid not null references public.workflow2_workflows(id) on delete cascade, phase_order integer not null, name text not null, data jsonb not null);
create table if not exists public.workflow2_gates (phase_id uuid primary key references public.workflow2_phases(id) on delete cascade, workflow_id uuid not null references public.workflow2_workflows(id) on delete cascade, status text not null, owner_id bigint, checklist jsonb not null);
create table if not exists public.workflow2_milestones (id uuid primary key, phase_id uuid not null references public.workflow2_phases(id) on delete cascade, workflow_id uuid not null references public.workflow2_workflows(id) on delete cascade, name text not null, weight numeric not null check(weight>0), data jsonb not null);
create table if not exists public.workflow2_completion_records (id uuid primary key default gen_random_uuid(), workflow_id uuid not null references public.workflow2_workflows(id) on delete cascade, phase_id uuid not null, decision text not null, probability_at_decision numeric, progress_at_decision numeric not null, readiness_at_decision numeric not null, decided_by bigint not null, decided_at timestamptz not null default now(), note text, version integer not null);
create or replace function public.workflow2_global(uid bigint) returns boolean language sql stable security definer set search_path=public as $$select coalesce(lower(role)='admin' or lower(employment_level)='manager' or (lower(role)='manager' and coalesce(lower(employment_level),'')<>'leader'),false) from users where id=uid$$;
create or replace function public.workflow2_access(wid uuid, editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from workflow2_workflows w join users u on u.auth_id=auth.uid() where w.id=wid and u.is_active and (workflow2_global(u.id) or (u.department_id=w.department_id and (not editing or lower(u.role)='leader' or lower(u.employment_level)='leader')) or (not editing and u.id=w.created_by)))
$$;
do $$ declare t text; begin foreach t in array array['workflow2_workflows','workflow2_phases','workflow2_gates','workflow2_milestones','workflow2_completion_records'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('drop policy if exists workflow2_read on public.%I',t);
 execute format('create policy workflow2_read on public.%I for select to authenticated using(public.workflow2_access(%s,false))',t,case when t='workflow2_workflows' then 'id' else 'workflow_id' end);
 execute format('grant select on public.%I to authenticated',t);
 execute format('revoke insert,update,delete on public.%I from anon,authenticated',t);
 end loop; end $$;
create or replace function public.workflow2_save(p_kind text,p_entity uuid,p_document jsonb,p_expected integer) returns public.workflow2_workflows language plpgsql security definer set search_path=public as $$
declare actor users; parent record; w workflow2_workflows; p jsonb; oldp jsonb; m jsonb; c jsonb; n integer:=0; boundary numeric:=0; total numeric; progress numeric; ready numeric; status text; oldstatus text; allowed boolean; preceding boolean:=true; task_status text; task_parent uuid; task_key text; tid uuid; denominator numeric; evidence text; stats jsonb:='{}';
begin
 select * into actor from users where auth_id=auth.uid() and is_active limit 1;
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
end $$;
revoke all on function public.workflow2_save(text,uuid,jsonb,integer) from public;
grant execute on function public.workflow2_save(text,uuid,jsonb,integer) to authenticated;
create or replace view public.workflow2_portfolio with (security_invoker=true) as select id,entity_type,entity_id,name,department_id,version,document,updated_at from workflow2_workflows;
create or replace view public.workflow2_funnel_history with (security_invoker=true) as select workflow_id,phase_id,decision,decided_at,probability_at_decision from workflow2_completion_records;
grant select on public.workflow2_portfolio,public.workflow2_funnel_history to authenticated;
notify pgrst,'reload schema';
commit;
