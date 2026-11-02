-- A task and each checklist item are separate work units. Quantity is output,
-- not a multiplier for completed work. Save metadata atomically under existing RLS.
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
  merged := existing || p_updates;
  if p_updates ? 'quantity' and not p_updates ? 'base_quantity' then merged:=merged||jsonb_build_object('base_quantity',p_updates->'quantity'); end if;
  if not merged ? 'base_quantity' then merged:=merged||jsonb_build_object('base_quantity',merged->'quantity'); end if;
  if jsonb_typeof(merged->'checklist_items') is distinct from 'array' then merged:=merged||jsonb_build_object('checklist_items','[]'::jsonb); end if;
  if coalesce(merged->>'base_quantity','') ~ '^[0-9]+(\.[0-9]+)?$' then base:=(merged->>'base_quantity')::numeric; end if;
  select coalesce(sum(case when coalesce(item->>'quantity','') ~ '^[0-9]+(\.[0-9]+)?$' then (item->>'quantity')::numeric else 0 end),0) into children
  from jsonb_array_elements(merged->'checklist_items') item;
  merged := merged || jsonb_build_object('base_quantity',nullif(base,0),'quantity',base+children,'is_internal_detail_sync',true);
  insert into public.activity_log(workspace_id,user_id,entity_type,entity_id,action,metadata)
  values(space,actor,p_kind,p_id,'details_updated',merged);
  return merged;
end;
$function$;
revoke all on function public.save_task_deliverables(text,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_task_deliverables(text,uuid,jsonb,jsonb) to authenticated;
