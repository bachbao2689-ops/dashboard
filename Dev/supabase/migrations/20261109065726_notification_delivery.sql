-- Local release patch; apply with the corresponding frontend and dashboard-push release.
-- Initial metadata remains in audit history, but does not generate a second notice.
set local lock_timeout='3s';
create or replace function public.save_task_deliverables(
  p_kind text, p_id uuid, p_updates jsonb, p_expected_items jsonb default null
) returns jsonb
language plpgsql security invoker set search_path = public
as $function$
declare
  actor bigint := public.workflow_actor();
  table_name text;
  r jsonb;
  space uuid;
  parent_status text;
  existing jsonb;
  merged jsonb;
  base numeric := 0;
  children numeric := 0;
  initial_details boolean := coalesce(p_updates->>'_notification_initial','false')='true';
  core_version text := p_updates->>'_notification_core_version';
  previous_initial text := coalesce(current_setting('dashboard.initial_task_details',true),'');
begin
  if actor is null then raise exception 'Authentication required'; end if;
  table_name := case p_kind when 'task' then 'tasks' when 'project_subtask' then 'project_subtasks' when 'campaign_subtask' then 'campaign_subtasks' end;
  if table_name is null or jsonb_typeof(p_updates) is distinct from 'object' then raise exception 'Invalid deliverable update'; end if;
  -- Invoker rights and existing row policies apply to both the lock and insert.
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',table_name) into r using p_id;
  if r is null then raise exception 'Task unavailable or update denied'; end if;
  if lower(r->>'status') in ('deleted','archived','cancelled','canceled') or r->>'workflow_status'='canceled' then raise exception 'Task is no longer active'; end if;
  if p_kind='task' then
    space := (r->>'workspace_id')::uuid;
    if r->>'project_id' is not null then select status into parent_status from public.projects where id=(r->>'project_id')::uuid;
    elsif r->>'campaign_id' is not null then select status into parent_status from public.campaigns where id=(r->>'campaign_id')::uuid; end if;
  elsif p_kind='project_subtask' then
    select workspace_id,status into space,parent_status from public.projects where id=(r->>'project_id')::uuid;
  else
    select workspace_id,status into space,parent_status from public.campaigns where id=(r->>'campaign_id')::uuid;
  end if;
  if space is null or parent_status in ('deleted','archived') then raise exception 'Parent unavailable'; end if;
  select coalesce(jsonb_object_agg(e.key,e.value order by a.created_at,a.id),'{}'::jsonb) into existing
  from public.activity_log a cross join lateral jsonb_each(a.metadata) e
  where a.entity_type=p_kind and a.entity_id=p_id and a.action='details_updated';
  if p_expected_items is not null and p_expected_items is distinct from coalesce(existing->'checklist_items','[]'::jsonb) then
    raise exception using errcode='40001', message='Đầu việc đã được cập nhật ở nơi khác. Vui lòng làm mới trước khi lưu.';
  end if;
  p_updates := p_updates - '_notification_initial' - '_notification_core_version';
  merged := existing || p_updates;
  if p_updates ? 'quantity' and not p_updates ? 'base_quantity' then merged:=merged||jsonb_build_object('base_quantity',p_updates->'quantity'); end if;
  if not merged ? 'base_quantity' then merged:=merged||jsonb_build_object('base_quantity',merged->'quantity'); end if;
  if jsonb_typeof(merged->'checklist_items') is distinct from 'array' then merged:=merged||jsonb_build_object('checklist_items','[]'::jsonb); end if;
  if coalesce(merged->>'base_quantity','') ~ '^[0-9]+(\.[0-9]+)?$' then base:=(merged->>'base_quantity')::numeric; end if;
  select coalesce(sum(case when coalesce(item->>'quantity','') ~ '^[0-9]+(\.[0-9]+)?$' then (item->>'quantity')::numeric else 0 end),0) into children
  from jsonb_array_elements(merged->'checklist_items') item;
  merged := merged || jsonb_build_object('base_quantity',nullif(base,0),'quantity',base+children,'is_internal_detail_sync',true);
  if merged is not distinct from existing then return merged; end if;
  if initial_details then
    if existing <> '{}'::jsonb then raise exception 'Task details already initialized' using errcode='40001'; end if;
    perform set_config('dashboard.initial_task_details',p_kind||':'||p_id::text,true);
  end if;
  -- A multi-request edit carries the exact database version returned by its
  -- core update. Only that actor/version's real audit event can cover details.
  if core_version is not null then
    if core_version::timestamptz is distinct from (r->>'updated_at')::timestamptz then
      raise exception 'Task changed before details were saved' using errcode='40001';
    end if;
    if exists(select 1 from public.activity_log a where a.entity_type=p_kind and a.entity_id=p_id
      and a.user_id=actor and a.action='task_updated' and a.metadata->>'source_table'=table_name
      and (a.metadata->>'recorded_at')::timestamptz=core_version::timestamptz
      and a.metadata->'changed_fields' ?| array['title','description','priority','start_date','due_date','status','workflow_status','assignee_id']) then
      perform set_config('dashboard.initial_task_details',p_kind||':'||p_id::text,true);
    end if;
  end if;
  insert into public.activity_log(workspace_id,user_id,entity_type,entity_id,action,metadata,created_at)
  values(space,actor,p_kind,p_id,'details_updated',merged,clock_timestamp());
  perform set_config('dashboard.initial_task_details',previous_initial,true);
  return merged;
end;
$function$;
revoke all on function public.save_task_deliverables(text,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_task_deliverables(text,uuid,jsonb,jsonb) to authenticated;


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
  if j->>'action'='details_updated' and current_setting('dashboard.initial_task_details',true)=(j->>'entity_type')||':'||(j->>'entity_id') then return new;end if;
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


create or replace function public.claim_dashboard_push() returns jsonb language plpgsql security definer set search_path=public as $$
 declare result jsonb;
 begin
 -- Old/read notifications and signed-out devices never receive queued messages.
 update push_deliveries d set state='skipped' where d.state in ('pending','sending') and
 (d.created_at<now()-interval '24 hours' or not exists(select 1 from notifications n join push_subscriptions s on s.id=d.subscription_id and s.user_id=n.user_id
 join users u on u.id=s.user_id and u.is_active and u.auth_id=s.auth_id join auth.sessions sess on sess.id=s.session_id and sess.user_id=s.auth_id
 join dashboard_push_config c on c.id and c.enabled and s.origin=any(c.allowed_origins) where n.id=d.notification_id and not n.is_read));
 with picked as (select id from push_deliveries where state in ('pending','sending') and attempts<5 and next_attempt<=now() and (lease_until is null or lease_until<now()) order by created_at limit 30 for update skip locked),
 leased as (update push_deliveries d set state='sending',attempts=attempts+1,lease_until=now()+interval '90 seconds' from picked where picked.id=d.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'subscriptionId',s.id,'origin',s.origin,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)),
 'notification',jsonb_build_object('id',n.id,'type',n.type,'metadata',n.metadata,'message',n.message,'entity_type',n.entity_type,'entity_id',n.entity_id))),'[]'::jsonb) into result from leased d join push_subscriptions s on s.id=d.subscription_id join notifications n on n.id=d.notification_id;
 return result;
 end $$;
revoke all on function public.claim_dashboard_push() from public,anon,authenticated;
grant execute on function public.claim_dashboard_push() to service_role;

notify pgrst, 'reload schema';

-- Coalesce trigger fan-out inside one transaction per recipient/task/actor.
-- Comments and different phases remain independent events, never time-bucketed.
create or replace function public.dashboard_notification_operation_guard() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare operation_key text; previous public.notifications; old_rank int; new_rank int;
begin
 if new.metadata->>'origin' is distinct from 'dashboard:v2'
   or new.entity_type not in ('task','project_subtask','campaign_subtask')
   or new.type not in ('task_created','task_assigned','task_updated','task_completed') then return new; end if;
 operation_key := txid_current()::text||':'||new.entity_type||':'||new.entity_id::text||':'||coalesce(new.metadata->>'actor_id','');
 new.metadata := new.metadata || jsonb_build_object('operation_key',operation_key);
 select * into previous from public.notifications n where n.user_id=new.user_id
   and n.metadata->>'operation_key'=operation_key for update;
 if not found then return new; end if;
 old_rank := case previous.type when 'task_completed' then 4 when 'task_assigned' then 3 when 'task_updated' then 2 else 1 end;
 new_rank := case new.type when 'task_completed' then 4 when 'task_assigned' then 3 when 'task_updated' then 2 else 1 end;
 if new_rank>=old_rank then
   update public.notifications set type=new.type,message=new.message,metadata=new.metadata where id=previous.id;
 end if;
 return null;
end $$;
revoke all on function public.dashboard_notification_operation_guard() from public,anon,authenticated;
create unique index if not exists notifications_operation_recipient on public.notifications(user_id,(metadata->>'operation_key')) where metadata->>'operation_key' is not null;
drop trigger if exists dashboard_notification_operation_guard on public.notifications;
create trigger dashboard_notification_operation_guard before insert on public.notifications for each row execute function public.dashboard_notification_operation_guard();
