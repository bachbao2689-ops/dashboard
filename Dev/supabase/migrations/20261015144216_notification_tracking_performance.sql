set local lock_timeout='3s';
-- One server event -> one row per recipient -> existing Web Push delivery queue.
-- Legacy clients remain compatible while Develop is reviewed; old producers are
-- recognized duplicate client events are suppressed by the canonical writer.
create unique index if not exists notifications_event_recipient
 on public.notifications(user_id,(metadata->>'event_key'))
 where metadata->>'origin'='dashboard:v2';

-- BEGIN WORKFLOW_PERMISSION_CACHE
-- Same permission predicates; resolve the current actor once instead of in every nested call.

create or replace function public.workflow_legacy_access_for(k text, e uuid, a bigint, editing boolean,_actor bigint) returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select _actor is not null and (a=_actor or workflow_root(k,e,_actor) or (not editing and exists(select 1 from users u where u.id=_actor and u.department_id is not null and u.department_id=case when k='project' then (select department_id from projects where id=e) else (select department_id from campaigns where id=e) end)))
$predicate$;
revoke all on function public.workflow_legacy_access_for(text,uuid,bigint,boolean,bigint) from public,anon,authenticated;

create or replace function public.workflow_phase_access_for(p uuid, editing boolean,_actor bigint) returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select exists(select 1 from workflow_phases f join workflow_tracks w on w.id=f.workflow_id where f.id=p and _actor is not null and (
 workflow_root(w.entity_type,w.entity_id,_actor) or exists(select 1 from workflow_phase_members where phase_id=p and user_id=_actor)
 or (not editing and (
 exists(select 1 from tasks t where t.workflow_phase_id=p and (t.assignee_id=_actor or exists(select 1 from comments c where c.task_id=t.id and _actor=any(c.mentions)))) or
 exists(select 1 from project_subtasks where workflow_phase_id=p and (assignee_id=_actor or exists(select 1 from activity_log a join users u on u.id=_actor where a.entity_id=project_subtasks.id and a.entity_type='project_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]') @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0)))) or
 exists(select 1 from campaign_subtasks where workflow_phase_id=p and (assignee_id=_actor or exists(select 1 from activity_log a join users u on u.id=_actor where a.entity_id=campaign_subtasks.id and a.entity_type='campaign_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]') @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0))))
 ))))
$predicate$;
revoke all on function public.workflow_phase_access_for(uuid,boolean,bigint) from public,anon,authenticated;

create or replace function public.workflow_old_task_access_for(k text, tid uuid, editing boolean,_actor bigint) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $predicate$
 declare r record; mentioned boolean;begin
 if k='project' then select project_id parent_id,assignee_id,workflow_phase_id into r from project_subtasks where id=tid;
 else select campaign_id parent_id,assignee_id,workflow_phase_id into r from campaign_subtasks where id=tid;end if;
 if r is null or _actor is null then return false;end if;
 mentioned:=not editing and exists(select 1 from activity_log a join users u on u.id=_actor where a.entity_id=tid and a.entity_type=k||'_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]') @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0));
 if r.workflow_phase_id is not null then return coalesce(r.assignee_id=_actor,false) or workflow_phase_access_for(r.workflow_phase_id,true,_actor) or mentioned;end if;
 return workflow_legacy_access_for(k,r.parent_id,r.assignee_id,editing,_actor) or mentioned;
 end
$predicate$;
revoke all on function public.workflow_old_task_access_for(text,uuid,boolean,bigint) from public,anon,authenticated;

create or replace function public.workflow_task_access_for(tid uuid, editing boolean,_actor bigint) returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select exists(select 1 from tasks t join users u on u.id=_actor where t.id=tid and (
 (t.workflow_phase_id is null and workflow2_global(u.id)) or (t.workflow_phase_id is not null and (workflow_phase_access_for(t.workflow_phase_id,true,_actor) or t.assignee_id=u.id)) or
 (t.workflow_phase_id is null and (t.assignee_id=u.id or workflow_root('project',t.project_id,_actor) or workflow_root('campaign',t.campaign_id,_actor) or (t.department_id=u.department_id and (not editing or lower(u.role)='leader' or lower(u.employment_level)='leader')) or t.created_by=u.id)) or
 (not editing and exists(select 1 from comments c where c.task_id=t.id and u.id=any(c.mentions)))))
$predicate$;
revoke all on function public.workflow_task_access_for(uuid,boolean,bigint) from public,anon,authenticated;

create or replace function public.workflow_parent_access_for(k text, e uuid,_actor bigint) returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select _actor is not null and (workflow_root(k,e,_actor) or
 exists(select 1 from users u where u.id=_actor and u.department_id is not null and u.department_id=case when k='project' then (select department_id from projects where id=e) else (select department_id from campaigns where id=e) end) or
 (k='project' and exists(select 1 from project_members where project_id=e and user_id=_actor)) or
 (k='campaign' and exists(select 1 from campaign_members where campaign_id=e and user_id=_actor)) or
 exists(select 1 from workflow_tracks w join workflow_phases f on f.workflow_id=w.id where w.entity_type=k and w.entity_id=e and workflow_phase_access_for(f.id,false,_actor)) or
 exists(select 1 from tasks t where (case when k='project' then t.project_id else t.campaign_id end)=e and (t.assignee_id=_actor or exists(select 1 from comments c where c.task_id=t.id and _actor=any(c.mentions)))) or
 (k='project' and exists(select 1 from project_subtasks where project_id=e and workflow_old_task_access_for('project',id,false,_actor))) or
 (k='campaign' and exists(select 1 from campaign_subtasks where campaign_id=e and workflow_old_task_access_for('campaign',id,false,_actor))))
$predicate$;
revoke all on function public.workflow_parent_access_for(text,uuid,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.workflow_legacy_access(k text, e uuid, a bigint, editing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select public.workflow_legacy_access_for(k,e,a,editing,public.workflow_actor())
$function$;

CREATE OR REPLACE FUNCTION public.workflow_phase_access(p uuid, editing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select public.workflow_phase_access_for(p,editing,public.workflow_actor())
$function$;

CREATE OR REPLACE FUNCTION public.workflow_old_task_access(k text, tid uuid, editing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin return public.workflow_old_task_access_for(k,tid,editing,public.workflow_actor());end;
$function$;

CREATE OR REPLACE FUNCTION public.workflow_task_access(tid uuid, editing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select public.workflow_task_access_for(tid,editing,public.workflow_actor())
$function$;

CREATE OR REPLACE FUNCTION public.workflow_parent_access(k text, e uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select public.workflow_parent_access_for(k,e,public.workflow_actor())
$function$;

-- END WORKFLOW_PERMISSION_CACHE

create or replace function public.dashboard_emit_activity(k text,e uuid,event text,source text,actor bigint,mentioned bigint[] default '{}',phase uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; parent jsonb; pk text; pe uuid; dep uuid; label text; phase_data jsonb; who text; avatar text; ids bigint[]:='{}'; msg text; uid bigint;
begin
 if k='task' then select to_jsonb(t) into item from public.tasks t where t.id=e;
 elsif k='project_subtask' then select to_jsonb(t) into item from public.project_subtasks t where t.id=e;
 elsif k='campaign_subtask' then select to_jsonb(t) into item from public.campaign_subtasks t where t.id=e;
 elsif k='project' then select to_jsonb(t) into item from public.projects t where t.id=e;
 elsif k='campaign' then select to_jsonb(t) into item from public.campaigns t where t.id=e;
 else return;end if;
 if item is null or coalesce(item->>'status','') in ('deleted','archived') then return;end if;
 select name,avatar_url into who,avatar from public.users where id=actor and is_active;
 if actor is null or who is null then return;end if;
 if k in ('project','campaign') then pk:=k;pe:=e;parent:=item;
 elsif item->>'project_id' is not null then pk:='project';pe:=(item->>'project_id')::uuid;select to_jsonb(p) into parent from public.projects p where id=pe;
 elsif item->>'campaign_id' is not null then pk:='campaign';pe:=(item->>'campaign_id')::uuid;select to_jsonb(c) into parent from public.campaigns c where id=pe;
 end if;
 if pe is not null and (parent is null or coalesce(parent->>'status','') in ('deleted','archived')) then return;end if;
 dep:=coalesce(nullif(item->>'department_id','')::uuid,nullif(parent->>'department_id','')::uuid);
 label:=coalesce(item->>'title',item->>'name','Công việc');
 if phase is not null then
  select to_jsonb(f) into phase_data from public.workflow_phases f join public.workflow_tracks w on w.id=f.workflow_id where f.id=phase and w.entity_type=k and w.entity_id=e;
  if phase_data is null then return;end if;
  label:=(phase_data->>'title')||' · '||label;
 end if;
 if event in ('task_assigned','project_assigned','campaign_assigned','phase_assigned') then
  ids:=case when k in ('task','project_subtask','campaign_subtask') then array[nullif(item->>'assignee_id','')::bigint] else mentioned end;
 else
  ids:=array[nullif(item->>'assignee_id','')::bigint,nullif(parent->>'created_by','')::bigint,nullif(parent->>'lead_id','')::bigint]||coalesce(mentioned,'{}');
  if pk='project' then ids:=ids||array(select user_id from public.project_members where project_id=pe);
  elsif pk='campaign' then ids:=ids||array(select user_id from public.campaign_members where campaign_id=pe);end if;
  if k in ('project','campaign') then
   ids:=ids||array(select assignee_id from public.tasks where case when k='project' then project_id else campaign_id end=e and coalesce(status,'') not in ('deleted','archived','cancelled','canceled'));
   if k='project' then ids:=ids||array(select assignee_id from public.project_subtasks where project_id=e and coalesce(status,'') not in ('deleted','archived','cancelled','canceled'));
   else ids:=ids||array(select assignee_id from public.campaign_subtasks where campaign_id=e and coalesce(status,'') not in ('deleted','archived','cancelled','canceled'));end if;
  end if;
  if phase is not null then ids:=ids||array(select user_id from public.workflow_phase_members where phase_id=phase);end if;
  ids:=ids||array(select id from public.users where is_active and department_id=dep and (lower(role)='leader' or lower(coalesce(employment_level,''))='leader'));
 end if;
 msg:=who||case event
  when 'phase_assigned' then ' đã giao chặng: '
  when 'phase_updated' then ' đã cập nhật chặng: '
  when 'phase_completed' then ' đã hoàn thành chặng: '
  when 'phase_ready' then ' đã đến lượt chặng: '
  when 'task_assigned' then ' đã giao bạn công việc: '
  when 'project_assigned' then ' đã giao dự án: '
  when 'campaign_assigned' then ' đã giao chiến dịch: '
  when 'task_comment' then ' đã bình luận tại công việc: '
  when 'project_comment' then ' đã bình luận trong dự án: '
  when 'campaign_comment' then ' đã bình luận trong chiến dịch: '
  when 'weekly_report' then ' đã cập nhật báo cáo cho: '
  when 'task_completed' then ' đã hoàn thành công việc: '
  when 'project_completed' then ' đã đánh dấu hoàn thành dự án: '
  when 'campaign_completed' then ' đã đánh dấu hoàn thành chiến dịch: '
  else ' đã cập nhật: ' end||label;
 insert into public.notifications(user_id,type,entity_type,entity_id,message,metadata)
 select distinct u.id,event,k,e,msg,jsonb_build_object('origin','dashboard:v2','event_key',source||':'||event,'actor_id',actor,'actor_name',who,'actor_avatar_url',avatar,'parent_kind',pk,'parent_id',pe,'task_title',label,'task_ref',item->>'task_ref','target',case when phase is not null then 'workflow' end,'phase_id',phase)
 from public.users u where u.id=any(ids) and u.id<>actor and u.is_active
 and case when phase is not null then public.workflow_phase_access_for(phase,false,u.id) else case k when 'task' then public.workflow_task_access_for(e,false,u.id)
  when 'project_subtask' then public.workflow_old_task_access_for('project',e,false,u.id)
  when 'campaign_subtask' then public.workflow_old_task_access_for('campaign',e,false,u.id)
  else public.workflow_parent_access_for(k,e,u.id) end end
 on conflict do nothing;
end $$;
revoke all on function public.dashboard_emit_activity(text,uuid,text,text,bigint,bigint[],uuid) from public,anon,authenticated;

create or replace function public.dashboard_activity_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare j jsonb:=to_jsonb(new);o jsonb;kind text;eid uuid;event text;actor bigint;mentions bigint[]:='{}';body text;source text;
begin
 if tg_op='UPDATE' then o:=to_jsonb(old);end if;
 actor:=public.workflow_actor();
 if tg_op='UPDATE' and tg_table_name in ('comments','project_comments') and j->'body' is not distinct from o->'body' and j->'mentions' is not distinct from o->'mentions' then return new;end if;
 if actor is null then return new;end if;
 if tg_op='INSERT' and ((tg_table_name in ('comments','project_comments') and nullif(j->>'author_id','')::bigint is distinct from actor) or (tg_table_name='activity_log' and nullif(j->>'user_id','')::bigint is distinct from actor)) then raise exception 'Activity author does not match the signed-in staff member' using errcode='42501';end if;
 source:=tg_table_name||':'||coalesce(j->>'id',j->>'project_id',j->>'campaign_id')||':'||txid_current()::text;
 if tg_table_name='comments' then
  kind:='task';eid:=(j->>'task_id')::uuid;body:=j->>'body';
  mentions:=array(select jsonb_array_elements_text(coalesce(j->'mentions','[]'))::bigint);event:='task_comment';
 elsif tg_table_name='project_comments' then
  kind:='project';eid:=(j->>'project_id')::uuid;body:=j->>'body';event:='project_comment';
 elsif tg_table_name='activity_log' then
  if j->>'action' not in ('comment','weekly_report','details_updated') then return new;end if;
  if tg_op='UPDATE' and j->'metadata' is not distinct from o->'metadata' then return new;end if;
  kind:=j->>'entity_type';eid:=(j->>'entity_id')::uuid;body:=j->'metadata'->>'body';
  if kind not in ('task','project_subtask','campaign_subtask','campaign') then return new;end if;
  mentions:=array(select jsonb_array_elements_text(coalesce(j->'metadata'->'mentions','[]'))::bigint);
  event:=case when j->>'action'='weekly_report' then 'weekly_report' when j->>'action'='details_updated' then 'task_updated' when kind='campaign' then 'campaign_comment' else 'task_comment' end;
 elsif tg_table_name in ('project_members','campaign_members') then
  if tg_op='UPDATE' and j->>'workflow_role' is not distinct from o->>'workflow_role' then return new;end if;
  kind:=case when tg_table_name='project_members' then 'project' else 'campaign' end;eid:=(j->>(kind||'_id'))::uuid;
  mentions:=array[(j->>'user_id')::bigint];event:=kind||'_assigned';source:='parent-assignment:'||kind||':'||eid::text||':'||txid_current()::text;
 elsif tg_table_name in ('tasks','project_subtasks','campaign_subtasks') then
  if tg_op<>'UPDATE' then return new;end if;
  if (j->>'created_at')::timestamptz>=transaction_timestamp() then return new;end if;
  if jsonb_build_array(j->'title',j->'description',j->'priority',j->'start_date',j->'due_date',j->'status',j->'workflow_status') is not distinct from jsonb_build_array(o->'title',o->'description',o->'priority',o->'start_date',o->'due_date',o->'status',o->'workflow_status') then return new;end if;
  kind:=case tg_table_name when 'tasks' then 'task' when 'project_subtasks' then 'project_subtask' else 'campaign_subtask' end;eid:=(j->>'id')::uuid;
  event:=case when (j->>'status' in ('done','complete','completed') or j->>'workflow_status'='completed') and not(coalesce(o->>'status','') in ('done','complete','completed') or coalesce(o->>'workflow_status','')='completed') then 'task_completed' else 'task_updated' end;
 elsif tg_table_name in ('projects','campaigns') then
  kind:=case tg_table_name when 'projects' then 'project' else 'campaign' end;eid:=(j->>'id')::uuid;
  if tg_table_name='campaigns' and (tg_op='INSERT' or j->>'lead_id' is distinct from o->>'lead_id') and j->>'lead_id' is not null then
   perform public.dashboard_emit_activity(kind,eid,'campaign_assigned','parent-assignment:campaign:'||eid::text||':'||txid_current()::text,actor,array[(j->>'lead_id')::bigint]);
  end if;
  if tg_op<>'UPDATE' then return new;end if;
  if jsonb_build_array(j->'name',j->'description',j->'objective',j->'status',j->'start_date',j->'due_date',j->'end_date',j->'priority',j->'budget') is not distinct from jsonb_build_array(o->'name',o->'description',o->'objective',o->'status',o->'start_date',o->'due_date',o->'end_date',o->'priority',o->'budget') then return new;end if;
  event:=kind||case when j->>'status' in ('done','complete','completed') and coalesce(o->>'status','') not in ('done','complete','completed') then '_completed' else '_updated' end;
 else return new;end if;
 if event in ('project_comment','campaign_comment') and body is not null then
  mentions:=mentions||array(select id from public.users where is_active and exists(select 1 from regexp_matches(lower(body),'@([^[:space:]@]+)','g') match(token) where rtrim(token[1],'.,!?;:()[]{}')=regexp_replace(lower(name),'\s','','g')));
 end if;
 perform public.dashboard_emit_activity(kind,eid,event,source,actor,mentions);return new;
end $$;
revoke all on function public.dashboard_activity_event() from public,anon,authenticated;

-- Stage events are emitted against the final transaction state. Rebuilding an
-- unchanged member list or checking Gate criteria alone does not send push.
create or replace function public.dashboard_phase_event_before() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare marks jsonb;key text;previous jsonb;existing text;present boolean;phase uuid;person bigint;
begin
 if tg_table_name='workflow_phase_members' then
  phase:=case when tg_op='DELETE' then old.phase_id else new.phase_id end;person:=case when tg_op='DELETE' then old.user_id else new.user_id end;
  key:=phase::text||':'||person::text;
  marks:=coalesce(nullif(current_setting('dashboard.phase_member_before',true),''),'{}')::jsonb;
  if not marks?key then
   if tg_op='INSERT' then select role into existing from public.workflow_phase_members where phase_id=phase and user_id=person;present:=found;
   else existing:=old.role;present:=true;end if;
   marks:=jsonb_set(marks,array[key],jsonb_build_object('existed',present,'role',existing,'actor',public.workflow_actor()),true);
   perform set_config('dashboard.phase_member_before',marks::text,true);
  end if;
 else
  marks:=coalesce(nullif(current_setting('dashboard.phase_before',true),''),'{}')::jsonb;key:=old.id::text;
  if not marks?key then
   previous:=jsonb_build_object('title',old.title,'status',old.status,'start_date',old.start_date,'due_date',old.due_date,'actor',public.workflow_actor());
   perform set_config('dashboard.phase_before',jsonb_set(marks,array[key],previous,true)::text,true);
  end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function public.dashboard_phase_event_before() from public,anon,authenticated;

create or replace function public.dashboard_phase_event_after() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare phase public.workflow_phases;track public.workflow_tracks;before jsonb;role_now text;actor bigint;event text;next_phase uuid;targets bigint[]:='{}';
begin
 if tg_table_name='workflow_phase_members' then
  select * into phase from public.workflow_phases where id=new.phase_id;
  select role into role_now from public.workflow_phase_members where phase_id=new.phase_id and user_id=new.user_id;
  if not found or role_now is distinct from new.role then return new;end if;
  before:=(coalesce(nullif(current_setting('dashboard.phase_member_before',true),''),'{}')::jsonb)->(new.phase_id::text||':'||new.user_id::text);
  if coalesce((before->>'existed')::boolean,false) and before->>'role'=role_now then return new;end if;
  actor:=(before->>'actor')::bigint;event:='phase_assigned';targets:=array[new.user_id];
 else
  select * into phase from public.workflow_phases where id=new.id;
  if phase.id is null then return new;end if;
  if jsonb_build_array(phase.title,phase.status,phase.start_date,phase.due_date) is distinct from jsonb_build_array(new.title,new.status,new.start_date,new.due_date) then return new;end if;
  before:=(coalesce(nullif(current_setting('dashboard.phase_before',true),''),'{}')::jsonb)->new.id::text;
  if jsonb_build_array(phase.title,phase.status,phase.start_date,phase.due_date) is not distinct from jsonb_build_array(before->>'title',before->>'status',before->>'start_date',before->>'due_date') then return new;end if;
  actor:=(before->>'actor')::bigint;
  event:=case when phase.status='completed' and coalesce(before->>'status','')<>'completed' then 'phase_completed' else 'phase_updated' end;
 end if;
 select * into track from public.workflow_tracks where id=phase.workflow_id;
 if actor is null or track.id is null then return new;end if;
 perform public.dashboard_emit_activity(track.entity_type,track.entity_id,event,'phase:'||phase.id::text||':'||txid_current()::text,actor,targets,phase.id);
 if event='phase_completed' then
  select id into next_phase from public.workflow_phases where workflow_id=phase.workflow_id and position>phase.position and status not in ('completed','cancelled') order by position limit 1;
  if next_phase is not null and not exists(select 1 from public.workflow_phases f where f.workflow_id=phase.workflow_id and f.position<(select position from public.workflow_phases where id=next_phase) and f.status<>'completed') then
   perform public.dashboard_emit_activity(track.entity_type,track.entity_id,'phase_ready','phase:'||next_phase::text||':'||txid_current()::text,actor,'{}'::bigint[],next_phase);
  end if;
 end if;
 return new;
end $$;
revoke all on function public.dashboard_phase_event_after() from public,anon,authenticated;
drop trigger if exists dashboard_phase_member_before on public.workflow_phase_members;
create trigger dashboard_phase_member_before before insert or update or delete on public.workflow_phase_members for each row execute function public.dashboard_phase_event_before();
drop trigger if exists dashboard_phase_before on public.workflow_phases;
create trigger dashboard_phase_before before update on public.workflow_phases for each row execute function public.dashboard_phase_event_before();
drop trigger if exists dashboard_phase_member_event on public.workflow_phase_members;
create constraint trigger dashboard_phase_member_event after insert or update on public.workflow_phase_members deferrable initially deferred for each row execute function public.dashboard_phase_event_after();
drop trigger if exists dashboard_phase_event on public.workflow_phases;
create constraint trigger dashboard_phase_event after update on public.workflow_phases deferrable initially deferred for each row execute function public.dashboard_phase_event_after();

-- Existing canonical task comment trigger keeps its validated cached count;
-- notification creation now belongs to dashboard_activity_event for every entry point.
create or replace function public.workflow_comment_added() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare uid bigint;begin
 foreach uid in array coalesce(new.mentions,'{}') loop
  if not exists(select 1 from public.users where id=uid and is_active) then raise exception 'Mentioned PIC must be active';end if;
 end loop;
 update public.tasks set comments_count=(select count(*) from public.comments where task_id=new.task_id),updated_at=now() where id=new.task_id;
 return new;end $$;
revoke all on function public.workflow_comment_added() from public,anon,authenticated;

create or replace function public.notify_dashboard_assignment() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare kind text;begin
 if new.assignee_id is null or (tg_op='UPDATE' and new.assignee_id is not distinct from old.assignee_id) then return new;end if;
 if tg_op='INSERT' and tg_table_name='tasks' and new.workflow_phase_id is not null then return new;end if;
 kind:=case tg_table_name when 'tasks' then 'task' when 'project_subtasks' then 'project_subtask' else 'campaign_subtask' end;
 perform public.dashboard_emit_activity(kind,new.id,'task_assigned','assignment:'||kind||':'||new.id::text||':'||txid_current()::text,public.workflow_actor());return new;
end $$;
revoke all on function public.notify_dashboard_assignment() from public,anon,authenticated;

-- Preserve all existing Workflow permission/calendar checks and versioned behavior.
do $patch$ declare definition text;old_text text:=$old$insert into notifications(user_id,type,message,entity_type,entity_id) values(uid,'system','Task mới trong phase '||f.title||': '||(p_data->>'title'),'task',tid);$old$;begin
 select pg_get_functiondef('public.workflow_create_task(uuid,jsonb)'::regprocedure) into definition;
 if position(old_text in definition)>0 then
  execute replace(definition,old_text,$new$perform public.dashboard_emit_activity('task',tid,'task_assigned','assignment:task:'||tid::text||':'||txid_current()::text,actor);$new$);
 elsif position('dashboard_emit_activity' in definition)=0 then raise exception 'Workflow task creator changed; review before applying';end if;
end $patch$;

do $$declare tab text;begin
 foreach tab in array array['comments','project_comments','activity_log','tasks','project_subtasks','campaign_subtasks','projects','campaigns','project_members','campaign_members'] loop
  execute format('drop trigger if exists dashboard_activity_event on public.%I',tab);
  execute format('create trigger dashboard_activity_event after insert or update on public.%I for each row execute function public.dashboard_activity_event()',tab);
 end loop;
end $$;

create or replace function public.dashboard_notification_family(k text,t text,m text) returns text language sql immutable set search_path=public,pg_temp as $$
 select case
  when t in ('task_assigned','task_comment','task_completed','task_updated','weekly_report','project_comment','campaign_comment','project_updated','campaign_updated','project_completed','campaign_completed','project_assigned','campaign_assigned') then t
  when m ilike '%subtask%' and m ilike '%giao%' then 'task_assigned'
  when m ilike '%subtask%' and m ilike '%hoàn thành%' then 'task_completed'
  when m ilike '%Task mới trong phase%' then 'task_assigned'
  when m ilike '%bình luận%' or m ilike '%nhắc%' then case when k in ('project','campaign') then k||'_comment' else 'task_comment' end
  when m ilike '%giao dự án%' then 'project_assigned'
  when m ilike '%giao chiến dịch%' then 'campaign_assigned'
  when m ilike '%hoàn thành%' and k in ('project','campaign') then k||'_completed'
  when m ilike '%cập nhật%' and k in ('project','campaign') then k||'_updated'
  else null end
$$;
revoke all on function public.dashboard_notification_family(text,text,text) from public,anon,authenticated;
create or replace function public.dashboard_legacy_notification_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare family text;actor bigint:=public.workflow_actor();begin
 if new.metadata->>'origin'='dashboard:v2' or actor is null then return new;end if;
 family:=public.dashboard_notification_family(new.entity_type,new.type,new.message);
 -- Known task/project events are already emitted in the source transaction.
 -- Older Official clients remain usable, while their duplicate copies are ignored.
 if family is not null then return null;end if;
 return new;end $$;
revoke all on function public.dashboard_legacy_notification_guard() from public,anon,authenticated;
drop trigger if exists dashboard_legacy_notification_guard on public.notifications;
create trigger dashboard_legacy_notification_guard before insert on public.notifications for each row execute function public.dashboard_legacy_notification_guard();

-- Project comment events must obey the same parent scope as their destination.
alter table public.project_comments enable row level security;
revoke all on public.project_comments from anon;
grant select,insert,delete on public.project_comments to authenticated;
revoke update on public.project_comments from authenticated;
grant update(body) on public.project_comments to authenticated;
drop policy if exists dashboard_project_comments_read on public.project_comments;
create policy dashboard_project_comments_read on public.project_comments for select to authenticated using(public.workflow_parent_access('project',project_id));
drop policy if exists dashboard_project_comments_insert on public.project_comments;
create policy dashboard_project_comments_insert on public.project_comments for insert to authenticated with check(author_id=(select public.workflow_actor()) and public.workflow_parent_access('project',project_id));
drop policy if exists dashboard_project_comments_edit on public.project_comments;
create policy dashboard_project_comments_edit on public.project_comments for update to authenticated using(author_id=(select public.workflow_actor()) or public.workflow_root('project',project_id)) with check(public.workflow_parent_access('project',project_id));
drop policy if exists dashboard_project_comments_delete on public.project_comments;
create policy dashboard_project_comments_delete on public.project_comments for delete to authenticated using(author_id=(select public.workflow_actor()) or public.workflow_root('project',project_id));

-- Only recipient and the existing permitted team scope may read notifications.
alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
grant select,insert on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update(is_read,read_at) on public.notifications to authenticated;
drop policy if exists dashboard_notifications_read on public.notifications;
create policy dashboard_notifications_read on public.notifications for select to authenticated using(
 user_id=(select public.workflow_actor()) or (select public.workflow2_global(public.workflow_actor())) or user_id in (
  select recipient.id from public.users actor join public.users recipient on recipient.department_id=actor.department_id
  where actor.auth_id=(select auth.uid()) and actor.is_active and recipient.is_active
   and (lower(actor.role)='leader' or lower(coalesce(actor.employment_level,''))='leader')));
drop policy if exists dashboard_notifications_legacy_insert on public.notifications;
create policy dashboard_notifications_legacy_insert on public.notifications for insert to authenticated with check(
 (select public.workflow_actor()) is not null and coalesce(metadata->>'origin','')<>'dashboard:v2'
 and exists(select 1 from public.users where id=user_id and is_active));
drop policy if exists dashboard_notifications_read_state on public.notifications;
create policy dashboard_notifications_read_state on public.notifications for update to authenticated
 using(user_id=(select public.workflow_actor())) with check(user_id=(select public.workflow_actor()));
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime add table public.notifications;end if;
end $$;

create or replace function public.dashboard_notification_summary() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 with me as materialized(select id,lower(role) role,lower(coalesce(employment_level,'')) level from public.users where auth_id=(select auth.uid()) and is_active),
 unread as(select n.* from public.notifications n join me on n.user_id=me.id where not n.is_read),
 counts as(select count(*) total,count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask')) tasks,
 count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask','workflow','workflow_track','workflow2') or type like 'phase_%') workflow,
 count(*) filter(where entity_type in ('project','campaign','project_subtask','campaign_subtask')) projects,
 count(*) filter(where entity_type in ('profile','task','project','campaign','project_subtask','campaign_subtask','weekly_report')) profile,
 count(*) filter(where entity_type='department') departments from unread),
 history as materialized(select n.id,n.user_id,n.type,n.message,n.entity_type,n.entity_id,n.is_read,n.created_at,n.metadata from public.notifications n join me on n.user_id=me.id order by n.created_at desc,n.id limit 50),
 recent as(select * from history order by created_at desc,id limit 12)
 select jsonb_build_object('writerVersion',2,'features',jsonb_build_object('batchCompletion',to_regprocedure('public.complete_tracked_tasks(jsonb)') is not null,'batchReport',to_regprocedure('public.save_task_weekly_reports(jsonb,date,date)') is not null),'unread',total,'counts',jsonb_build_object('tasksCount',tasks,'workflowCount',workflow,'projectCount',projects,'profileCount',profile,'departmentCount',departments,
 'borrowCount',(select count(*) from public.borrow_requests b where b.approval_status='pending' and exists(select 1 from me where me.role in ('admin','manager') or me.level='manager' or b.requester_id=me.id))),
 'items',coalesce((select jsonb_agg(recent order by created_at desc,id) from recent),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(history order by created_at desc,id) from history),'[]'::jsonb)) from counts
$$;
revoke all on function public.dashboard_notification_summary() from public,anon;
grant execute on function public.dashboard_notification_summary() to authenticated;

-- A batch fan-out wakes the existing worker once per transaction, after all rows commit.
create or replace function public.wake_dashboard_push() returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare cfg public.dashboard_push_config;begin
 if current_setting('dashboard.push_woken',true)='yes' then return;end if;
 select * into cfg from public.dashboard_push_config where id and enabled;
 if cfg.id is null or not exists(select 1 from public.push_deliveries where state in ('pending','sending') and next_attempt<=now() and (lease_until is null or lease_until<now())) then return;end if;
 perform set_config('dashboard.push_woken','yes',true);
 perform net.http_post(url:=cfg.worker_url,headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',cfg.webhook_secret),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function public.wake_dashboard_push() from public,anon,authenticated;
grant execute on function public.wake_dashboard_push() to service_role;

-- Timestamp tracking already maintains updated_at for every task update.
do $$begin
 if exists(select 1 from pg_trigger where tgrelid='public.tasks'::regclass and tgname='workflow_b_tracking_timestamps' and tgenabled='O') then drop trigger if exists update_tasks_updated_at on public.tasks;end if;
end $$;
-- Cache the Auth actor and each parent capability once per RPC statement.
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
  select * from visible w where w.can_root or (w.actor_department_id is not null and w.department_id=w.actor_department_id) or workflow_parent_access_for(w.entity_type,w.entity_id,w.actor_id)
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
 'pics',coalesce((select people from pics p where p.kind=w.entity_type and p.entity=w.entity_id),'[]'::jsonb),
 'sub_pics',coalesce((select people from sub_pics p where p.kind=w.entity_type and p.entity=w.entity_id),'[]'::jsonb),
 'phases',coalesce((select data from phase_data p where p.workflow_id=w.id),'[]'::jsonb)
 ) order by w.name,w.entity_type,w.entity_id),'[]') from eligible w
$function$;

notify pgrst,'reload schema';
