begin;
-- Single atomic migration for the real Workflow hub. Safe to re-apply.

-- workflow-hub.sql
-- Parent PICs and execution members are different scopes. Existing PIC membership
-- is preserved; creation_details distinguishes the previously mixed member list.
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='project_members' and column_name='workflow_role') then
 alter table project_members add column if not exists workflow_role text not null default 'pic' check(workflow_role in ('pic','sub_pic'));
update project_members m set workflow_role='sub_pic' where exists (
 select 1 from activity_log a where a.entity_type='project' and a.entity_id=m.project_id and a.action='creation_details'
 and coalesce(a.metadata->'member_ids','[]') @> to_jsonb(array[m.user_id])
 and not coalesce(a.metadata->'owner_ids','[]') @> to_jsonb(array[m.user_id]));
 end if;
end $$;
alter table campaign_members add column if not exists workflow_role text not null default 'pic' check(workflow_role in ('pic','sub_pic'));

create table if not exists workflow_tracks (
 id uuid primary key default gen_random_uuid(), entity_type text not null check(entity_type in ('project','campaign')),
 entity_id uuid not null, created_at timestamptz not null default now(), unique(entity_type,entity_id)
);
create table if not exists workflow_phases (
 id uuid primary key default gen_random_uuid(), workflow_id uuid not null references workflow_tracks(id) on delete cascade,
 position integer not null, title text not null check(length(trim(title))>0), start_date date, due_date date,
 status text not null default 'todo' check(status in ('todo','in_progress','in_review','completed','on_hold','cancelled')),
 opportunity numeric check(opportunity between 0 and 100), opportunity_note text,
 version integer not null default 1, created_by bigint not null references users(id), updated_at timestamptz not null default now(),
 check(start_date is null or due_date is null or due_date>=start_date), unique(workflow_id,position)
);
create table if not exists workflow_phase_members (
 phase_id uuid not null references workflow_phases(id) on delete cascade, user_id bigint not null references users(id),
 role text not null check(role in ('pic','sub_pic')), primary key(phase_id,user_id)
);
alter table tasks add column if not exists workflow_phase_id uuid references workflow_phases(id) on delete restrict;
create index if not exists tasks_workflow_phase on tasks(workflow_phase_id);
create index if not exists workflow_phase_member_user on workflow_phase_members(user_id,phase_id);
create index if not exists task_mentions on comments using gin(mentions);

create or replace function workflow_actor() returns bigint language sql stable security definer set search_path=public as $$
 select id from users where auth_id=auth.uid() and is_active limit 1
$$;
create or replace function workflow_root(k text,e uuid,u bigint default workflow_actor()) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(workflow2_global(u),false) or case when k='project' then
 exists(select 1 from project_members where project_id=e and user_id=u and workflow_role='pic')
 or exists(select 1 from projects where id=e and created_by=u and not exists(select 1 from project_members where project_id=e and workflow_role='pic'))
 when k='campaign' then exists(select 1 from campaigns where id=e and lead_id=u)
 or exists(select 1 from campaign_members where campaign_id=e and user_id=u and workflow_role='pic')
 or exists(select 1 from campaigns where id=e and created_by=u and lead_id is null and not exists(select 1 from campaign_members where campaign_id=e and workflow_role='pic'))
 else false end
$$;
create or replace function workflow_phase_access(p uuid,editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from workflow_phases f join workflow_tracks w on w.id=f.workflow_id where f.id=p and workflow_actor() is not null and (
 workflow_root(w.entity_type,w.entity_id) or exists(select 1 from workflow_phase_members where phase_id=p and user_id=workflow_actor())
 or (not editing and exists(select 1 from tasks t where t.workflow_phase_id=p and (t.assignee_id=workflow_actor() or exists(select 1 from comments c where c.task_id=t.id and workflow_actor()=any(c.mentions)))))
 ))
$$;
create or replace function workflow_parent_access(k text,e uuid) returns boolean language sql stable security definer set search_path=public as $$
 select workflow_actor() is not null and (workflow_root(k,e) or
 exists(select 1 from users u where u.id=workflow_actor() and u.department_id is not null and u.department_id=case when k='project' then (select department_id from projects where id=e) else (select department_id from campaigns where id=e) end) or
 (k='project' and exists(select 1 from project_members where project_id=e and user_id=workflow_actor())) or
 (k='campaign' and exists(select 1 from campaign_members where campaign_id=e and user_id=workflow_actor())) or
 exists(select 1 from workflow_tracks w join workflow_phases f on f.workflow_id=w.id where w.entity_type=k and w.entity_id=e and workflow_phase_access(f.id)) or
 exists(select 1 from tasks t where (case when k='project' then t.project_id else t.campaign_id end)=e and (t.assignee_id=workflow_actor() or exists(select 1 from comments c where c.task_id=t.id and workflow_actor()=any(c.mentions)))) or
 (k='project' and exists(select 1 from project_subtasks where project_id=e and assignee_id=workflow_actor())) or
 (k='campaign' and exists(select 1 from campaign_subtasks where campaign_id=e and assignee_id=workflow_actor())))
$$;
create or replace function workflow_parent_edit(k text,e uuid) returns boolean language sql stable security definer set search_path=public as $$
 select workflow_root(k,e) or (case when k='project' then (select created_by from projects where id=e) else (select created_by from campaigns where id=e) end)=workflow_actor()
$$;
create or replace function workflow_task_access(tid uuid,editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from tasks t join users u on u.id=workflow_actor() where t.id=tid and (
 workflow2_global(u.id) or (t.workflow_phase_id is not null and (workflow_phase_access(t.workflow_phase_id,true) or t.assignee_id=u.id)) or
 (t.workflow_phase_id is null and (t.assignee_id=u.id or workflow_root('project',t.project_id) or workflow_root('campaign',t.campaign_id) or (t.department_id=u.department_id and (not editing or lower(u.role)='leader' or lower(u.employment_level)='leader')) or t.created_by=u.id)) or
 (not editing and exists(select 1 from comments c where c.task_id=t.id and u.id=any(c.mentions)))))
$$;
create or replace function workflow_legacy_access(k text,e uuid,a bigint,editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select workflow_actor() is not null and (a=workflow_actor() or workflow_root(k,e) or (not editing and exists(select 1 from users u where u.id=workflow_actor() and u.department_id is not null and u.department_id=case when k='project' then (select department_id from projects where id=e) else (select department_id from campaigns where id=e) end)))
$$;

-- One automatic, empty track per REAL source record: no synthesized phases/tasks.
create or replace function workflow_track_parent() returns trigger language plpgsql security definer set search_path=public as $$
 begin insert into workflow_tracks(entity_type,entity_id) values(case when tg_table_name='projects' then 'project' else 'campaign' end,new.id) on conflict do nothing; return new; end
$$;
drop trigger if exists workflow_track_created on projects;
drop trigger if exists workflow_track_created on projects;
create trigger workflow_track_created after insert on projects for each row execute function workflow_track_parent();
drop trigger if exists workflow_track_created on campaigns;
drop trigger if exists workflow_track_created on campaigns;
create trigger workflow_track_created after insert on campaigns for each row execute function workflow_track_parent();
insert into workflow_tracks(entity_type,entity_id) select 'project',id from projects on conflict do nothing;
insert into workflow_tracks(entity_type,entity_id) select 'campaign',id from campaigns on conflict do nothing;

alter table workflow_tracks enable row level security;
alter table workflow_phases enable row level security;
alter table workflow_phase_members enable row level security;
drop policy if exists workflow_read on workflow_tracks;
create policy workflow_read on workflow_tracks for select to authenticated using(workflow_parent_access(entity_type,entity_id));
drop policy if exists workflow_read on workflow_phases;
create policy workflow_read on workflow_phases for select to authenticated using(workflow_phase_access(id));
drop policy if exists workflow_read on workflow_phase_members;
create policy workflow_read on workflow_phase_members for select to authenticated using(workflow_phase_access(phase_id));
grant select on workflow_tracks,workflow_phases,workflow_phase_members to authenticated;
revoke insert,update,delete on workflow_tracks,workflow_phases,workflow_phase_members from anon,authenticated;

-- RLS is authoritative, including direct REST queries (not just UI filtering).
alter table projects enable row level security;
alter table campaigns enable row level security;
drop policy if exists workflow_read on projects;
create policy workflow_read on projects for select to authenticated using(workflow_parent_access('project',id));
drop policy if exists workflow_read on campaigns;
create policy workflow_read on campaigns for select to authenticated using(workflow_parent_access('campaign',id));
drop policy if exists workflow_write on projects;
create policy workflow_write on projects for update to authenticated using(workflow_parent_edit('project',id)) with check(workflow_parent_edit('project',id));
drop policy if exists workflow_write on campaigns;
create policy workflow_write on campaigns for update to authenticated using(workflow_parent_edit('campaign',id)) with check(workflow_parent_edit('campaign',id));
drop policy if exists workflow_create on projects;
create policy workflow_create on projects for insert to authenticated with check(created_by=workflow_actor() and exists(select 1 from users where id=workflow_actor() and (workflow2_global(id) or (department_id=projects.department_id and (lower(role)='leader' or lower(employment_level)='leader')))));
drop policy if exists workflow_create on campaigns;
create policy workflow_create on campaigns for insert to authenticated with check(created_by=workflow_actor() and exists(select 1 from users where id=workflow_actor() and (workflow2_global(id) or (department_id=campaigns.department_id and (lower(role)='leader' or lower(employment_level)='leader')))));
do $$declare k text;t text;col text;begin
 foreach k in array array['project','campaign'] loop
 t:=k||'_members'; col:=k||'_id';
 execute format('alter table %I enable row level security',t);
 execute format('drop policy if exists workflow_read on %I',t);
 execute format('create policy workflow_read on %I for select to authenticated using(workflow_parent_access(%L,%I))',t,k,col);
 execute format('drop policy if exists workflow_write on %I',t);
 execute format('create policy workflow_write on %I for all to authenticated using(workflow_parent_edit(%L,%I)) with check(workflow_parent_edit(%L,%I))',t,k,col,k,col);
 t:=k||'_subtasks';
 execute format('alter table %I enable row level security',t);
 execute format('drop policy if exists workflow_read on %I',t);
 execute format('create policy workflow_read on %I for select to authenticated using(workflow_legacy_access(%L,%I,assignee_id))',t,k,col);
 execute format('drop policy if exists workflow_write on %I',t);
 execute format('create policy workflow_write on %I for update to authenticated using(workflow_legacy_access(%L,%I,assignee_id,true)) with check(workflow_legacy_access(%L,%I,assignee_id,true))',t,k,col,k,col);
 execute format('drop policy if exists workflow_create on %I',t);
 execute format('create policy workflow_create on %I for insert to authenticated with check(workflow_parent_edit(%L,%I))',t,k,col);
 end loop;
end $$;
alter table tasks enable row level security;
alter table comments enable row level security;
drop policy if exists workflow_read on tasks;
create policy workflow_read on tasks for select to authenticated using(workflow_task_access(id));
drop policy if exists workflow_write on tasks;
create policy workflow_write on tasks for update to authenticated using(workflow_task_access(id,true)) with check(workflow_task_access(id,true));
-- Phase task creation only through validated RPC; legacy New Task stays available.
drop policy if exists workflow_create on tasks;
create policy workflow_create on tasks for insert to authenticated with check(workflow_phase_id is null and created_by=workflow_actor() and (workflow2_global(workflow_actor()) or exists(select 1 from users u where u.id=workflow_actor() and u.department_id=tasks.department_id and (lower(u.role)='leader' or lower(u.employment_level)='leader'))));
drop policy if exists workflow_read on comments;
create policy workflow_read on comments for select to authenticated using(workflow_task_access(task_id));
drop policy if exists workflow_create on comments;
create policy workflow_create on comments for insert to authenticated with check(author_id=workflow_actor() and workflow_task_access(task_id));
drop policy if exists workflow_write on comments;
create policy workflow_write on comments for update to authenticated using(author_id=workflow_actor() and workflow_task_access(task_id)) with check(author_id=workflow_actor() and workflow_task_access(task_id));
drop policy if exists workflow_delete on comments;
create policy workflow_delete on comments for delete to authenticated using(author_id=workflow_actor() and workflow_task_access(task_id));

-- A task cannot be moved to another parent/phase by a phase-only member.
create or replace function workflow_task_guard() returns trigger language plpgsql security definer set search_path=public as $$
 declare w workflow_tracks; begin
 if lower(coalesce(new.status,'')) in ('done','completed','complete') then new.completed_at:=coalesce(new.completed_at,now());
 elsif tg_op='UPDATE' and lower(coalesce(old.status,'')) in ('done','completed','complete') then new.completed_at:=null;end if;
 if tg_op='UPDATE' and auth.uid() is not null and (new.created_by is distinct from old.created_by or new.workspace_id is distinct from old.workspace_id) then raise exception 'Task provenance is immutable';end if;
 if new.workflow_phase_id is not null then
 select r.* into w from workflow_tracks r join workflow_phases f on f.workflow_id=r.id where f.id=new.workflow_phase_id;
 if w.id is null or (w.entity_type='project' and (new.project_id is distinct from w.entity_id or new.campaign_id is not null)) or (w.entity_type='campaign' and (new.campaign_id is distinct from w.entity_id or new.project_id is not null)) then raise exception 'Task/phase parent mismatch';end if;
 select department_id into new.department_id from users where id=new.assignee_id;
 if tg_op='UPDATE' and new.status is distinct from old.status and new.status not in ('done','completed','complete','deleted','archived') and exists(select 1 from workflow_phases where id=new.workflow_phase_id and status in ('completed','cancelled')) then raise exception 'Reopen the phase before reopening its task';end if;
 end if;
 if tg_op='UPDATE' and auth.uid() is not null and new.workflow_phase_id is distinct from old.workflow_phase_id and new.workflow_phase_id is not null and not workflow_root(w.entity_type,w.entity_id) then raise exception 'Only target parent PIC can link a phase task' using errcode='42501';end if;
 if tg_op='UPDATE' and auth.uid() is not null and (new.workflow_phase_id is distinct from old.workflow_phase_id or new.project_id is distinct from old.project_id or new.campaign_id is distinct from old.campaign_id or new.assignee_id is distinct from old.assignee_id) then
 if old.workflow_phase_id is not null and not exists(select 1 from workflow_phases f join workflow_tracks r on r.id=f.workflow_id where f.id=old.workflow_phase_id and workflow_root(r.entity_type,r.entity_id)) then raise exception 'Only parent PIC can reassign a phase task' using errcode='42501'; end if;
 end if; return new; end
$$;
drop trigger if exists workflow_task_guard on tasks;
create trigger workflow_task_guard before insert or update on tasks for each row execute function workflow_task_guard();

create or replace function workflow_save_phase(p_workflow uuid,p_phase uuid,p_data jsonb,p_expected integer default 0) returns uuid language plpgsql security definer set search_path=public as $$
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
 if nextstatus='completed' and (f.id is null or not exists(select 1 from tasks where workflow_phase_id=f.id and status not in ('deleted','archived')) or exists(select 1 from tasks where workflow_phase_id=f.id and status not in ('done','completed','complete','deleted','archived'))) then raise exception 'Complete phase tasks before completing the phase';end if;
 if nextstatus in ('in_progress','in_review','completed') and exists(select 1 from workflow_phases where workflow_id=w.id and position<coalesce(f.position,2147483647) and status not in ('completed','cancelled')) then raise exception 'Previous phases must be completed first';end if;
 if p_data->>'opportunity' is not null and nullif(trim(p_data->>'opportunity_note'),'') is null then raise exception 'Explain the opportunity estimate';end if;
 select array_agg(distinct v::bigint) into ids from jsonb_array_elements_text(coalesce(p_data->'pic_ids','[]')||coalesce(p_data->'sub_pic_ids','[]')) v;
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
$$;
create or replace function workflow_create_task(p_phase uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
 declare w workflow_tracks; f workflow_phases; actor bigint:=workflow_actor(); uid bigint; dep uuid; space uuid; tid uuid; begin
 if actor is null or not workflow_phase_access(p_phase,true) then raise exception 'Phase access denied' using errcode='42501';end if;
 select * into f from workflow_phases where id=p_phase for update;
 if f.status in ('completed','cancelled') then raise exception 'Phase is closed';end if;
 select * into w from workflow_tracks where id=f.workflow_id;
 uid:=nullif(p_data->>'assignee_id','')::bigint;
 select department_id into dep from users where id=uid and is_active;
 if uid is null or not exists(select 1 from users where id=uid and is_active) then raise exception 'Assign an active PIC';end if;
 if not exists(select 1 from workflow_phase_members where phase_id=p_phase and user_id=uid) and not workflow_root(w.entity_type,w.entity_id,uid) then raise exception 'Task PIC must be assigned to this phase';end if;
 if nullif(p_data->>'start_date','')::date>nullif(p_data->>'due_date','')::date then raise exception 'Invalid task dates';end if;
 if nullif(p_data->>'start_date','')::date<f.start_date or nullif(p_data->>'start_date','')::date>f.due_date or nullif(p_data->>'due_date','')::date<f.start_date or nullif(p_data->>'due_date','')::date>f.due_date then raise exception 'Task dates must fit the phase';end if;
 if coalesce(p_data->>'priority','medium') not in ('low','medium','high','urgent') then raise exception 'Invalid priority';end if;
 select workspace_id into space from projects where id=w.entity_id and w.entity_type='project';
 if w.entity_type='campaign' then select workspace_id into space from campaigns where id=w.entity_id;end if;
 if nullif(trim(p_data->>'title'),'') is null then raise exception 'Task title required';end if;
 insert into tasks(workspace_id,project_id,campaign_id,workflow_phase_id,title,description,assignee_id,department_id,priority,status,start_date,due_date,created_by)
 values(space,case when w.entity_type='project' then w.entity_id end,case when w.entity_type='campaign' then w.entity_id end,p_phase,trim(p_data->>'title'),p_data->>'description',uid,dep,coalesce(p_data->>'priority','medium'),'todo',nullif(p_data->>'start_date','')::date,nullif(p_data->>'due_date','')::date,actor) returning id into tid;
 insert into notifications(user_id,type,message,entity_type,entity_id) values(uid,'system','Task mới trong phase '||f.title||': '||(p_data->>'title'),'task',tid);
 return tid;end
$$;
revoke all on function workflow_save_phase(uuid,uuid,jsonb,integer),workflow_create_task(uuid,jsonb) from public;
grant execute on function workflow_save_phase(uuid,uuid,jsonb,integer),workflow_create_task(uuid,jsonb) to authenticated;

-- Retired Workflow 2 cannot expose a full JSON document to a phase-only invite.
create or replace function workflow2_access(wid uuid,editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from workflow2_workflows w where w.id=wid and workflow_actor() is not null and workflow_root(w.entity_type,w.entity_id))
$$;
revoke execute on function workflow2_save(text,uuid,jsonb,integer) from authenticated;
notify pgrst,'reload schema';


-- workflow-hub-index.sql
create or replace function workflow_hub_index() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',w.id,'entity_type',w.entity_type,'entity_id',w.entity_id,'name',s.name,'status',s.status,'start_date',s.start_date,'due_date',s.due_date,
 'root',workflow_root(w.entity_type,w.entity_id),'asset',s.asset,
 'pics',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url)), '[]') from users u where u.is_active and (
 (w.entity_type='project' and exists(select 1 from project_members m where m.project_id=w.entity_id and m.user_id=u.id and m.workflow_role='pic')) or
 (w.entity_type='campaign' and (u.id=s.lead_id or exists(select 1 from campaign_members m where m.campaign_id=w.entity_id and m.user_id=u.id and m.workflow_role='pic'))) or
 (u.id=s.created_by and not exists(select 1 from project_members m where w.entity_type='project' and m.project_id=w.entity_id and m.workflow_role='pic') and (w.entity_type='project' or s.lead_id is null and not exists(select 1 from campaign_members m where m.campaign_id=w.entity_id and m.workflow_role='pic'))))),
 'phases',(select coalesce(jsonb_agg(jsonb_build_object(
 'id',f.id,'title',f.title,'position',f.position,'start_date',f.start_date,'due_date',f.due_date,'status',f.status,'version',f.version,
 'opportunity',f.opportunity,'opportunity_note',f.opportunity_note,'can_edit_tasks',workflow_phase_access(f.id,true),
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url,'role',m.role)), '[]') from workflow_phase_members m join users u on u.id=m.user_id where m.phase_id=f.id)
 ) order by f.position),'[]') from workflow_phases f where f.workflow_id=w.id and workflow_phase_access(f.id))
 ) order by s.name),'[]') from workflow_tracks w join lateral (
 select name,status,start_date,due_date,created_by,null::bigint lead_id,assets_url asset from projects where w.entity_type='project' and id=w.entity_id
 union all select name,status,start_date,end_date,created_by,lead_id,(select metadata->>'strategy_asset' from activity_log where entity_type='campaign' and entity_id=w.entity_id and action='attachment_added' order by created_at desc limit 1) from campaigns where w.entity_type='campaign' and id=w.entity_id
 ) s on true where workflow_actor() is not null and coalesce(s.status,'') not in ('deleted','archived') and workflow_parent_access(w.entity_type,w.entity_id)
$$;
revoke all on function workflow_hub_index() from public;
grant execute on function workflow_hub_index() to authenticated;
notify pgrst,'reload schema';


-- workflow-hub-hardening.sql
alter table project_subtasks add column if not exists workflow_phase_id uuid references workflow_phases(id) on delete restrict;
alter table campaign_subtasks add column if not exists workflow_phase_id uuid references workflow_phases(id) on delete restrict;
create index if not exists project_subtasks_workflow_phase on project_subtasks(workflow_phase_id);
create index if not exists campaign_subtasks_workflow_phase on campaign_subtasks(workflow_phase_id);
-- Administrative exception is Admin, not an automatic whole-workflow grant to
-- every Manager. Managers/Leaders still need parent PIC membership for phases.
create or replace function workflow_root(k text,e uuid,u bigint default workflow_actor()) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from users where id=u and is_active and lower(role)='admin') or case when k='project' then
 exists(select 1 from project_members where project_id=e and user_id=u and workflow_role='pic')
 or exists(select 1 from projects where id=e and created_by=u and not exists(select 1 from project_members where project_id=e and workflow_role='pic'))
 when k='campaign' then exists(select 1 from campaigns where id=e and lead_id=u)
 or exists(select 1 from campaign_members where campaign_id=e and user_id=u and workflow_role='pic')
 or exists(select 1 from campaigns where id=e and created_by=u and lead_id is null and not exists(select 1 from campaign_members where campaign_id=e and workflow_role='pic'))
 else false end
$$;
create or replace function workflow_old_task_access(k text,tid uuid,editing boolean default false) returns boolean language plpgsql stable security definer set search_path=public as $$
 declare r record; begin
 if k='project' then select project_id parent_id,assignee_id,workflow_phase_id into r from project_subtasks where id=tid;
 else select campaign_id parent_id,assignee_id,workflow_phase_id into r from campaign_subtasks where id=tid;end if;
 if r is null then return false;end if;
 if r.workflow_phase_id is not null then return r.assignee_id=workflow_actor() or workflow_phase_access(r.workflow_phase_id,true);end if;
 return workflow_legacy_access(k,r.parent_id,r.assignee_id,editing);
 end
$$;
do $$declare k text;t text;begin
 foreach k in array array['project','campaign'] loop
 t:=k||'_subtasks';
 execute format('drop policy workflow_read on %I',t);
 execute format('drop policy workflow_write on %I',t);
 execute format('drop policy if exists workflow_read on %I',t);
 execute format('create policy workflow_read on %I for select to authenticated using(workflow_old_task_access(%L,id))',t,k);
 execute format('drop policy if exists workflow_write on %I',t);
 execute format('create policy workflow_write on %I for update to authenticated using(workflow_old_task_access(%L,id,true)) with check(workflow_old_task_access(%L,id,true))',t,k,k);
 end loop;
end $$;
create or replace function workflow_link_task(p_phase uuid,p_task uuid,p_kind text default 'task') returns void language plpgsql security definer set search_path=public as $$
 declare w workflow_tracks; f workflow_phases; parent uuid; begin
 select * into f from workflow_phases where id=p_phase for update;
 select * into w from workflow_tracks where id=f.workflow_id;
 if workflow_actor() is null or not workflow_root(w.entity_type,w.entity_id) then raise exception 'Only parent PIC can link a task' using errcode='42501';end if;
 if f.status in ('completed','cancelled') then raise exception 'Phase is closed';end if;
 if p_kind='task' then
 select case when w.entity_type='project' then project_id else campaign_id end into parent from tasks where id=p_task and workflow_phase_id is null and status not in ('deleted','archived') for update;
 elsif p_kind='project_subtask' and w.entity_type='project' then select project_id into parent from project_subtasks where id=p_task and workflow_phase_id is null and status<>'deleted' for update;
 elsif p_kind='campaign_subtask' and w.entity_type='campaign' then select campaign_id into parent from campaign_subtasks where id=p_task and workflow_phase_id is null and status<>'deleted' for update;
 else raise exception 'Invalid task source';end if;
 if parent is distinct from w.entity_id then raise exception 'Task does not belong to parent or already linked';end if;
 if p_kind='task' then update tasks set workflow_phase_id=p_phase,updated_at=now() where id=p_task;
 elsif p_kind='project_subtask' then update project_subtasks set workflow_phase_id=p_phase where id=p_task;
 else update campaign_subtasks set workflow_phase_id=p_phase where id=p_task;end if;
 end
$$;
revoke all on function workflow_link_task(uuid,uuid,text) from public;
grant execute on function workflow_link_task(uuid,uuid,text) to authenticated;

create or replace function workflow_legacy_guard() returns trigger language plpgsql security definer set search_path=public as $$
 declare w workflow_tracks;k text:=case when tg_table_name='project_subtasks' then 'project' else 'campaign' end;parent uuid;oldparent uuid;begin
 parent:=case when k='project' then (to_jsonb(new)->>'project_id')::uuid else (to_jsonb(new)->>'campaign_id')::uuid end;
 if new.workflow_phase_id is not null then
 select r.* into w from workflow_tracks r join workflow_phases f on f.workflow_id=r.id where f.id=new.workflow_phase_id;
 if w.id is null or w.entity_type<>k or w.entity_id<>parent then raise exception 'Task/phase parent mismatch';end if;
 if tg_op='UPDATE' and new.status is distinct from old.status and new.status not in ('done','completed','complete','deleted','archived') and exists(select 1 from workflow_phases where id=new.workflow_phase_id and status in ('completed','cancelled')) then raise exception 'Reopen the phase before reopening its task';end if;
 end if;
 if tg_op='UPDATE' and auth.uid() is not null then
 oldparent:=case when k='project' then (to_jsonb(old)->>'project_id')::uuid else (to_jsonb(old)->>'campaign_id')::uuid end;
 if (new.workflow_phase_id is distinct from old.workflow_phase_id or parent is distinct from oldparent or new.assignee_id is distinct from old.assignee_id) and (not workflow_root(k,oldparent) or not workflow_root(k,parent)) then raise exception 'Only parent PIC can reassign task' using errcode='42501';end if;
 end if;return new;end
$$;
drop trigger if exists workflow_legacy_guard on project_subtasks;
create trigger workflow_legacy_guard before insert or update on project_subtasks for each row execute function workflow_legacy_guard();
drop trigger if exists workflow_legacy_guard on campaign_subtasks;
create trigger workflow_legacy_guard before insert or update on campaign_subtasks for each row execute function workflow_legacy_guard();
-- Phase completion counts both canonical Tasks and existing subtasks, without
-- copying subtasks (their comments and attachment IDs remain unchanged).
do $$declare definition text;begin
 select pg_get_functiondef('workflow_save_phase(uuid,uuid,jsonb,integer)'::regprocedure) into definition;
 definition:=replace(definition,'from tasks where workflow_phase_id=f.id','from (select workflow_phase_id,status from tasks union all select workflow_phase_id,status from project_subtasks union all select workflow_phase_id,status from campaign_subtasks) phase_tasks where workflow_phase_id=f.id');
 execute definition;
end $$;
create or replace function workflow_comment_added() returns trigger language plpgsql security definer set search_path=public as $$
 declare uid bigint;begin
 foreach uid in array coalesce(new.mentions,'{}') loop
 if not exists(select 1 from users where id=uid and is_active) then raise exception 'Mentioned PIC must be active';end if;
 if uid<>new.author_id then insert into notifications(user_id,type,message,entity_type,entity_id) values(uid,'system','Bạn được nhắc đến trong task: '||(select title from tasks where id=new.task_id),'task',new.task_id);end if;
 end loop;
 update tasks set comments_count=(select count(*) from comments where task_id=new.task_id),updated_at=now() where id=new.task_id;
 return new;end
$$;
drop trigger if exists workflow_comment_added on comments;
create trigger workflow_comment_added after insert on comments for each row execute function workflow_comment_added();
notify pgrst,'reload schema';


-- workflow-hub-scope.sql
create or replace function workflow_task_access(tid uuid,editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from tasks t join users u on u.id=workflow_actor() where t.id=tid and (
 (t.workflow_phase_id is null and workflow2_global(u.id)) or (t.workflow_phase_id is not null and (workflow_phase_access(t.workflow_phase_id,true) or t.assignee_id=u.id)) or
 (t.workflow_phase_id is null and (t.assignee_id=u.id or workflow_root('project',t.project_id) or workflow_root('campaign',t.campaign_id) or (t.department_id=u.department_id and (not editing or lower(u.role)='leader' or lower(u.employment_level)='leader')) or t.created_by=u.id)) or
 (not editing and exists(select 1 from comments c where c.task_id=t.id and u.id=any(c.mentions)))))
$$;
create or replace function workflow_old_task_access(k text,tid uuid,editing boolean default false) returns boolean language plpgsql stable security definer set search_path=public as $$
 declare r record; mentioned boolean;begin
 if k='project' then select project_id parent_id,assignee_id,workflow_phase_id into r from project_subtasks where id=tid;
 else select campaign_id parent_id,assignee_id,workflow_phase_id into r from campaign_subtasks where id=tid;end if;
 if r is null or workflow_actor() is null then return false;end if;
 mentioned:=not editing and exists(select 1 from notifications where user_id=workflow_actor() and entity_id=tid and entity_type=k||'_subtask' and (message like '%đã nhắc bạn%' or message like '%được nhắc đến%'));
 if r.workflow_phase_id is not null then return coalesce(r.assignee_id=workflow_actor(),false) or workflow_phase_access(r.workflow_phase_id,true) or mentioned;end if;
 return workflow_legacy_access(k,r.parent_id,r.assignee_id,editing) or mentioned;
 end
$$;
create or replace function workflow_phase_access(p uuid,editing boolean default false) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from workflow_phases f join workflow_tracks w on w.id=f.workflow_id where f.id=p and workflow_actor() is not null and (
 workflow_root(w.entity_type,w.entity_id) or exists(select 1 from workflow_phase_members where phase_id=p and user_id=workflow_actor())
 or (not editing and (
 exists(select 1 from tasks t where t.workflow_phase_id=p and (t.assignee_id=workflow_actor() or exists(select 1 from comments c where c.task_id=t.id and workflow_actor()=any(c.mentions)))) or
 exists(select 1 from project_subtasks where workflow_phase_id=p and workflow_old_task_access('project',id)) or
 exists(select 1 from campaign_subtasks where workflow_phase_id=p and workflow_old_task_access('campaign',id))
 ))))
$$;
-- Avoid recursion: phase metadata grants for legacy tasks are based on explicit
-- assignment/mention only, not workflow_old_task_access (which checks phase).
do $$declare d text;begin
 select pg_get_functiondef('workflow_phase_access(uuid,boolean)'::regprocedure) into d;
 d:=replace(d,'workflow_old_task_access(''project'',id)','(assignee_id=workflow_actor() or exists(select 1 from notifications n where n.user_id=workflow_actor() and n.entity_id=project_subtasks.id and n.entity_type=''project_subtask'' and n.message like ''%đã nhắc bạn%''))');
 d:=replace(d,'workflow_old_task_access(''campaign'',id)','(assignee_id=workflow_actor() or exists(select 1 from notifications n where n.user_id=workflow_actor() and n.entity_id=campaign_subtasks.id and n.entity_type=''campaign_subtask'' and n.message like ''%đã nhắc bạn%''))');
 execute d;
 select pg_get_functiondef('workflow_parent_access(text,uuid)'::regprocedure) into d;
 d:=replace(d,'project_id=e and assignee_id=workflow_actor()', 'project_id=e and workflow_old_task_access(''project'',id)');
 d:=replace(d,'campaign_id=e and assignee_id=workflow_actor()', 'campaign_id=e and workflow_old_task_access(''campaign'',id)');
 execute d;
end $$;
create or replace function workflow_activity_access(k text,e uuid,u bigint) returns boolean language sql stable security definer set search_path=public as $$
 select workflow_actor() is not null and case
 when k='task' then workflow_task_access(e)
 when k='project_subtask' then workflow_old_task_access('project',e)
 when k='campaign_subtask' then workflow_old_task_access('campaign',e)
 when k in ('project','campaign') then workflow_parent_access(k,e)
 when k='workflow2' then workflow2_access(e)
 else u=workflow_actor() or workflow2_global(workflow_actor()) or exists(select 1 from users a join users b on b.id=u where a.id=workflow_actor() and a.department_id=b.department_id and (lower(a.role)='leader' or lower(a.employment_level)='leader')) end
$$;
alter table activity_log enable row level security;
drop policy if exists workflow_read on activity_log;
create policy workflow_read on activity_log for select to authenticated using(workflow_activity_access(entity_type,entity_id,user_id));
drop policy if exists workflow_create on activity_log;
create policy workflow_create on activity_log for insert to authenticated with check(user_id=workflow_actor() and workflow_activity_access(entity_type,entity_id,user_id));
drop policy if exists workflow_write on activity_log;
create policy workflow_write on activity_log for update to authenticated using(user_id=workflow_actor() and workflow_activity_access(entity_type,entity_id,user_id)) with check(user_id=workflow_actor() and workflow_activity_access(entity_type,entity_id,user_id));
drop policy if exists workflow_delete on activity_log;
create policy workflow_delete on activity_log for delete to authenticated using(user_id=workflow_actor() and workflow_activity_access(entity_type,entity_id,user_id));
alter table project_comments enable row level security;
drop policy if exists workflow_read on project_comments;
create policy workflow_read on project_comments for select to authenticated using(workflow_parent_access('project',project_id));
drop policy if exists workflow_create on project_comments;
create policy workflow_create on project_comments for insert to authenticated with check(author_id=workflow_actor() and workflow_parent_access('project',project_id));
drop policy if exists workflow_write on project_comments;
create policy workflow_write on project_comments for update to authenticated using(author_id=workflow_actor()) with check(author_id=workflow_actor());
drop policy if exists workflow_delete on project_comments;
create policy workflow_delete on project_comments for delete to authenticated using(author_id=workflow_actor());
notify pgrst,'reload schema';


-- workflow-hub-finalize.sql
-- A notification is not an access grant. Only an actual authorized comment can
-- grant a legacy @mention, so broadcasts/spoofed notification rows cannot leak tasks.
do $$declare d text;begin
 select pg_get_functiondef('workflow_old_task_access(text,uuid,boolean)'::regprocedure) into d;
 d:=replace(d,'exists(select 1 from notifications where user_id=workflow_actor() and entity_id=tid and entity_type=k||''_subtask'' and (message like ''%đã nhắc bạn%'' or message like ''%được nhắc đến%''))',
 'exists(select 1 from activity_log a join users u on u.id=workflow_actor() where a.entity_id=tid and a.entity_type=k||''_subtask'' and a.action=''comment'' and (coalesce(a.metadata->''mentions'',''[]'') @> to_jsonb(array[u.id]) or position(lower(''@''||replace(u.name,'' '','''')) in lower(coalesce(a.metadata->>''body'',''''))) > 0))');
 execute d;
 select pg_get_functiondef('workflow_phase_access(uuid,boolean)'::regprocedure) into d;
 d:=replace(d,'exists(select 1 from notifications n where n.user_id=workflow_actor() and n.entity_id=project_subtasks.id and n.entity_type=''project_subtask'' and n.message like ''%đã nhắc bạn%'')',
 'exists(select 1 from activity_log a join users u on u.id=workflow_actor() where a.entity_id=project_subtasks.id and a.entity_type=''project_subtask'' and a.action=''comment'' and (coalesce(a.metadata->''mentions'',''[]'') @> to_jsonb(array[u.id]) or position(lower(''@''||replace(u.name,'' '','''')) in lower(coalesce(a.metadata->>''body'',''''))) > 0))');
 d:=replace(d,'exists(select 1 from notifications n where n.user_id=workflow_actor() and n.entity_id=campaign_subtasks.id and n.entity_type=''campaign_subtask'' and n.message like ''%đã nhắc bạn%'')',
 'exists(select 1 from activity_log a join users u on u.id=workflow_actor() where a.entity_id=campaign_subtasks.id and a.entity_type=''campaign_subtask'' and a.action=''comment'' and (coalesce(a.metadata->''mentions'',''[]'') @> to_jsonb(array[u.id]) or position(lower(''@''||replace(u.name,'' '','''')) in lower(coalesce(a.metadata->>''body'',''''))) > 0))');
 execute d;
end $$;
create or replace function workflow_set_parent_pics(p_kind text,p_parent uuid,p_ids bigint[]) returns void language plpgsql security definer set search_path=public as $$
 declare uid bigint;begin
 if workflow_actor() is null or not workflow_parent_edit(p_kind,p_parent) then raise exception 'Parent PIC access required' using errcode='42501';end if;
 if coalesce(array_length(p_ids,1),0)=0 then raise exception 'Parent must have a PIC';end if;
 foreach uid in array p_ids loop if not exists(select 1 from users where id=uid and is_active) then raise exception 'Inactive PIC';end if;end loop;
 if p_kind='project' then
 delete from project_members where project_id=p_parent and workflow_role='pic' and user_id<>all(p_ids);
 insert into project_members(project_id,user_id,workflow_role) select p_parent,invited.user_id,'pic' from unnest(p_ids) invited(user_id) on conflict(project_id,user_id) do update set workflow_role='pic';
 elsif p_kind='campaign' then
 delete from campaign_members where campaign_id=p_parent and workflow_role='pic' and user_id<>all(p_ids);
 insert into campaign_members(campaign_id,user_id,workflow_role) select p_parent,invited.user_id,'pic' from unnest(p_ids) invited(user_id) on conflict(campaign_id,user_id) do update set workflow_role='pic';
 update campaigns set lead_id=p_ids[1] where id=p_parent;
 else raise exception 'Invalid parent';end if;end
$$;
revoke all on function workflow_set_parent_pics(text,uuid,bigint[]) from public;
grant execute on function workflow_set_parent_pics(text,uuid,bigint[]) to authenticated;
-- Preserve staff's existing standalone New Task path, but never accept an
-- unchecked phase FK from the browser; phase creation uses workflow_create_task.
drop policy workflow_create on tasks;
drop policy if exists workflow_create on tasks;
create policy workflow_create on tasks for insert to authenticated with check(workflow_phase_id is null and created_by=workflow_actor() and (workflow2_global(workflow_actor()) or assignee_id=workflow_actor() or exists(select 1 from users u where u.id=workflow_actor() and u.department_id=tasks.department_id and (lower(u.role)='leader' or lower(u.employment_level)='leader'))));
-- Anonymous users cannot invoke privileged helper functions directly.
do $$declare r record;begin
 for r in select oid::regprocedure::text signature from pg_proc where pronamespace='public'::regnamespace and proname in ('workflow_actor','workflow_root','workflow_parent_access','workflow_parent_edit','workflow_phase_access','workflow_task_access','workflow_legacy_access','workflow_old_task_access','workflow_activity_access') loop
 execute 'revoke all on function '||r.signature||' from public';
 execute 'grant execute on function '||r.signature||' to authenticated';
 end loop;
end $$;
notify pgrst,'reload schema';


-- workflow-hub-returning.sql
-- INSERT ... RETURNING must use current row values for the core scope. A STABLE
-- helper querying the parent table cannot see the just-inserted row yet.
drop policy workflow_read on projects;
drop policy workflow_read on campaigns;
drop policy if exists workflow_read on projects;
create policy workflow_read on projects for select to authenticated using(workflow_actor() is not null and (created_by=workflow_actor() or department_id=(select department_id from users where id=workflow_actor()) or workflow_parent_access('project',id)));
drop policy if exists workflow_read on campaigns;
create policy workflow_read on campaigns for select to authenticated using(workflow_actor() is not null and (created_by=workflow_actor() or department_id=(select department_id from users where id=workflow_actor()) or workflow_parent_access('campaign',id)));
drop policy workflow_read on tasks;
drop policy if exists workflow_read on tasks;
create policy workflow_read on tasks for select to authenticated using(workflow_actor() is not null and (assignee_id=workflow_actor() or (workflow_phase_id is null and (created_by=workflow_actor() or department_id=(select department_id from users where id=workflow_actor()))) or workflow_task_access(id)));
drop policy workflow_read on project_subtasks;
drop policy workflow_read on campaign_subtasks;
drop policy if exists workflow_read on project_subtasks;
create policy workflow_read on project_subtasks for select to authenticated using(workflow_actor() is not null and (assignee_id=workflow_actor() or (workflow_phase_id is null and workflow_legacy_access('project',project_id,assignee_id)) or workflow_old_task_access('project',id)));
drop policy if exists workflow_read on campaign_subtasks;
create policy workflow_read on campaign_subtasks for select to authenticated using(workflow_actor() is not null and (assignee_id=workflow_actor() or (workflow_phase_id is null and workflow_legacy_access('campaign',campaign_id,assignee_id)) or workflow_old_task_access('campaign',id)));
notify pgrst,'reload schema';


-- workflow-hub-aliases.sql
do $$declare d text;begin
 select pg_get_functiondef('workflow_save_phase(uuid,uuid,jsonb,integer)'::regprocedure) into d;
 d:=replace(d,'select f.id,uid,case when coalesce(p_data->''pic_ids'',''[]'') @> to_jsonb(array[uid]) then ''pic'' else ''sub_pic'' end from unnest(ids) uid','select f.id,invited.user_id,case when coalesce(p_data->''pic_ids'',''[]'') @> to_jsonb(array[invited.user_id]) then ''pic'' else ''sub_pic'' end from unnest(ids) invited(user_id)');
 d:=replace(d,'select uid,''system'',''Bạn được giao phase: ''||f.title,w.entity_type,w.entity_id from unnest(ids) uid where uid<>actor','select invited.user_id,''system'',''Bạn được giao phase: ''||f.title,w.entity_type,w.entity_id from unnest(ids) invited(user_id) where invited.user_id<>actor');
 execute d;
 select pg_get_functiondef('workflow_set_parent_pics(text,uuid,bigint[])'::regprocedure) into d;
 d:=replace(d,'select p_parent,uid,''pic'' from unnest(p_ids) uid','select p_parent,invited.user_id,''pic'' from unnest(p_ids) invited(user_id)');
 execute d;
end $$;
notify pgrst,'reload schema';


-- workflow-hub-activity-write.sql
create or replace function workflow_activity_write(k text,e uuid,a text,u bigint) returns boolean language sql stable security definer set search_path=public as $$
 select workflow_actor() is not null and u=workflow_actor() and case
 when k='task' then workflow_task_access(e,a<>'comment')
 when k='project_subtask' then workflow_old_task_access('project',e,a<>'comment')
 when k='campaign_subtask' then workflow_old_task_access('campaign',e,a<>'comment')
 when k in ('project','campaign') then case when a='comment' then workflow_parent_access(k,e) else workflow_parent_edit(k,e) end
 else workflow_activity_access(k,e,u) end
$$;
revoke all on function workflow_activity_write(text,uuid,text,bigint) from public;
grant execute on function workflow_activity_write(text,uuid,text,bigint) to authenticated;
drop policy workflow_create on activity_log;
drop policy workflow_write on activity_log;
drop policy if exists workflow_create on activity_log;
create policy workflow_create on activity_log for insert to authenticated with check(workflow_activity_write(entity_type,entity_id,action,user_id));
drop policy if exists workflow_write on activity_log;
create policy workflow_write on activity_log for update to authenticated using(workflow_activity_write(entity_type,entity_id,action,user_id)) with check(workflow_activity_write(entity_type,entity_id,action,user_id));
-- Events for new phase/member tables keep open dashboards in sync.
do $$declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables) then
 foreach t in array array['workflow_tracks','workflow_phases','workflow_phase_members','project_members','campaign_members'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;end if;
end $$;
notify pgrst,'reload schema';

-- Preserve the existing seven-step marketing task picker while normalizing its
-- status into the shared Tasks/report/performance vocabulary.
alter table tasks add column if not exists workflow_status text check(workflow_status in ('backlog','planned','scoping','in_progress','in_qa','completed','canceled'));
alter table project_subtasks add column if not exists workflow_status text check(workflow_status in ('backlog','planned','scoping','in_progress','in_qa','completed','canceled'));
alter table campaign_subtasks add column if not exists workflow_status text check(workflow_status in ('backlog','planned','scoping','in_progress','in_qa','completed','canceled'));
create or replace function workflow_stage_bridge() returns trigger language plpgsql security definer set search_path=public as $$
 begin
 if new.workflow_phase_id is null then new.workflow_status:=null;return new;end if;
 if new.workflow_status is not null and (tg_op='INSERT' or new.workflow_status is distinct from old.workflow_status) then
 new.status:=case new.workflow_status when 'backlog' then 'todo' when 'planned' then 'todo' when 'scoping' then 'in_progress' when 'in_progress' then 'in_progress' when 'in_qa' then 'in_review' when 'completed' then 'done' when 'canceled' then 'cancelled' else new.status end;
 elsif new.workflow_status is null or (tg_op='UPDATE' and new.status is distinct from old.status) then
 new.workflow_status:=case lower(new.status) when 'done' then 'completed' when 'completed' then 'completed' when 'complete' then 'completed' when 'in_review' then 'in_qa' when 'review' then 'in_qa' when 'in_qa' then 'in_qa' when 'in_progress' then 'in_progress' when 'in-progress' then 'in_progress' when 'doing' then 'in_progress' when 'canceled' then 'canceled' when 'cancelled' then 'canceled' else 'backlog' end;
 end if;return new;end
$$;
drop trigger if exists workflow_a_stage_status on tasks;
drop trigger if exists workflow_a_stage_status on project_subtasks;
drop trigger if exists workflow_a_stage_status on campaign_subtasks;
create trigger workflow_a_stage_status before insert or update on tasks for each row execute function workflow_stage_bridge();
create trigger workflow_a_stage_status before insert or update on project_subtasks for each row execute function workflow_stage_bridge();
create trigger workflow_a_stage_status before insert or update on campaign_subtasks for each row execute function workflow_stage_bridge();
notify pgrst,'reload schema';
commit;
