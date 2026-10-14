-- Preserve the existing timestamp tracking in versioned source. No guessed backfill.
alter table public.project_subtasks add column if not exists updated_at timestamptz;
alter table public.project_subtasks add column if not exists completed_at timestamptz;
alter table public.campaign_subtasks add column if not exists updated_at timestamptz;
alter table public.campaign_subtasks add column if not exists completed_at timestamptz;
create or replace function public.track_task_timestamps() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' then
  new.updated_at:=coalesce(new.updated_at,now());
  if lower(coalesce(new.status,'')) in ('done','completed','complete') then new.completed_at:=coalesce(new.completed_at,now());end if;
 else
  new.updated_at:=now();
  if lower(coalesce(new.status,'')) in ('done','completed','complete') and lower(coalesce(old.status,'')) not in ('done','completed','complete') then new.completed_at:=now();
  elsif lower(coalesce(new.status,'')) not in ('done','completed','complete') then new.completed_at:=null;
  else new.completed_at:=old.completed_at;end if;
 end if;return new;
end $$;
do $$ declare t text;begin
 foreach t in array array['tasks','project_subtasks','campaign_subtasks'] loop
  execute format('drop trigger if exists workflow_b_tracking_timestamps on public.%I',t);
  execute format('create trigger workflow_b_tracking_timestamps before insert or update on public.%I for each row execute function public.track_task_timestamps()',t);
 end loop;
end $$;
-- One transaction: task completion and its weekly report succeed together.
-- Caller RLS applies to both writes; reports can only be authored by the assignee.
create or replace function public.save_task_weekly_reports(p_items jsonb,p_week_start date,p_week_end date)
returns integer language plpgsql security invoker set search_path=public as $$
declare actor bigint:=public.workflow_actor();item jsonb;kind text;table_name text;tid uuid;r jsonb;space uuid;parent_status text;meta jsonb;report_id uuid;changed integer;total integer:=0;
begin
 if actor is null then raise exception 'Authentication required';end if;
 if p_week_start is null or p_week_end is null or p_week_end<p_week_start or p_week_end-p_week_start>366 then raise exception 'Invalid report period';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>200 then raise exception 'Invalid task batch';end if;
 -- Stable order avoids deadlocks when two requests include the same task batch.
 for item in select value from jsonb_array_elements(p_items) order by value->>'kind',value->>'id' loop
  kind:=item->>'kind';tid:=(item->>'id')::uuid;
  table_name:=case kind when 'task' then 'tasks' when 'project_subtask' then 'project_subtasks' when 'campaign_subtask' then 'campaign_subtasks' end;
  if table_name is null then raise exception 'Invalid task kind';end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',table_name) into r using tid;
  if r is null or (r->>'assignee_id')::bigint is distinct from actor then raise exception 'Only the assignee may submit their report';end if;
  if lower(r->>'status') in ('deleted','archived','cancelled','canceled') then raise exception 'Task is no longer active';end if;
  if kind='task' then
   space:=(r->>'workspace_id')::uuid;parent_status:=null;
   if r->>'project_id' is not null then select status into parent_status from projects where id=(r->>'project_id')::uuid;
   elsif r->>'campaign_id' is not null then select status into parent_status from campaigns where id=(r->>'campaign_id')::uuid;end if;
  elsif kind='project_subtask' then select workspace_id,status into space,parent_status from projects where id=(r->>'project_id')::uuid;
  else select workspace_id,status into space,parent_status from campaigns where id=(r->>'campaign_id')::uuid;end if;
  if space is null or parent_status in ('deleted','archived') then raise exception 'Parent is unavailable';end if;
  meta:=coalesce(item->'metadata','{}'::jsonb);
  if jsonb_typeof(meta)<>'object' then raise exception 'Invalid report metadata';end if;
  if not coalesce((meta->>'unchanged')::boolean,false) and length(trim(coalesce(meta->>'body','')))=0 then raise exception 'Report result required';end if;
  if coalesce((item->>'complete')::boolean,false) then
   execute format('update public.%I set status=''done'' where id=$1',table_name) using tid;
   get diagnostics changed=row_count;
   if changed<>1 then raise exception 'Task update denied';end if;
  end if;
  meta:=meta||jsonb_build_object('week_start',p_week_start,'week_end',p_week_end,'task_kind',kind);
  select id into report_id from activity_log where user_id=actor and entity_type=kind and entity_id=tid and action='weekly_report'
    and metadata->>'week_start'=p_week_start::text and metadata->>'week_end'=p_week_end::text order by created_at desc,id desc limit 1;
  if report_id is null then
   insert into activity_log(workspace_id,user_id,entity_type,entity_id,action,metadata) values(space,actor,kind,tid,'weekly_report',meta);
  else update activity_log set metadata=meta where id=report_id;if not found then raise exception 'Report update denied';end if;end if;
  total:=total+1;
 end loop;return total;
end $$;
revoke all on function public.save_task_weekly_reports(jsonb,date,date) from public,anon;
grant execute on function public.save_task_weekly_reports(jsonb,date,date) to authenticated;
create index if not exists activity_log_weekly_tracking on public.activity_log(user_id,entity_type,entity_id,(metadata->>'week_start'),(metadata->>'week_end')) where action='weekly_report';
notify pgrst,'reload schema';
create or replace function public.complete_tracked_tasks(p_items jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare item jsonb;table_name text;tid uuid;changed integer;total integer:=0;
begin
 if public.workflow_actor() is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>200 then raise exception 'Select 1 to 200 tasks';end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'kind',value->>'id' loop
  table_name:=case item->>'kind' when 'task' then 'tasks' when 'project_subtask' then 'project_subtasks' when 'campaign_subtask' then 'campaign_subtasks' end;
  if table_name is null then raise exception 'Invalid task kind';end if;tid:=(item->>'id')::uuid;
  execute format('update public.%I set status=''done'' where id=$1 and status not in (''archived'',''deleted'',''cancelled'',''canceled'')',table_name) using tid;
  get diagnostics changed=row_count;if changed<>1 then raise exception 'Cannot complete task: unavailable or update denied';end if;
  total:=total+1;
 end loop;return total;
end $$;
revoke all on function public.complete_tracked_tasks(jsonb) from public,anon;
grant execute on function public.complete_tracked_tasks(jsonb) to authenticated;
notify pgrst,'reload schema';
