create or replace function public.save_task_checklist_report(
 p_kind text,p_id uuid,p_item_id text,p_metadata jsonb,p_week_start date,p_week_end date,p_complete boolean default false
) returns boolean language plpgsql security invoker set search_path=public
as $function$
declare
 actor bigint:=public.workflow_actor(); table_name text; r jsonb; space uuid; parent_status text;
 details jsonb; child jsonb; items jsonb; meta jsonb; report_id uuid;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if p_week_start is null or p_week_end is null or p_week_end<p_week_start or p_week_end-p_week_start>366 then raise exception 'Invalid report period'; end if;
 if jsonb_typeof(p_metadata) is distinct from 'object' then raise exception 'Invalid report metadata'; end if;
 if not coalesce((p_metadata->>'unchanged')::boolean,false) and length(trim(coalesce(p_metadata->>'body','')))=0 then raise exception 'Report result required'; end if;
 table_name:=case p_kind when 'task' then 'tasks' when 'project_subtask' then 'project_subtasks' when 'campaign_subtask' then 'campaign_subtasks' end;
 if table_name is null then raise exception 'Invalid task kind'; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',table_name) into r using p_id;
 if r is null or (r->>'assignee_id')::bigint is distinct from actor then raise exception 'Only the assignee may submit their report'; end if;
 if lower(r->>'status') in ('deleted','archived','cancelled','canceled') or r->>'workflow_status'='canceled' then raise exception 'Task is no longer active'; end if;
 if p_kind='task' then
  space:=(r->>'workspace_id')::uuid;
  if r->>'project_id' is not null then select status into parent_status from public.projects where id=(r->>'project_id')::uuid;
  elsif r->>'campaign_id' is not null then select status into parent_status from public.campaigns where id=(r->>'campaign_id')::uuid; end if;
 elsif p_kind='project_subtask' then select workspace_id,status into space,parent_status from public.projects where id=(r->>'project_id')::uuid;
 else select workspace_id,status into space,parent_status from public.campaigns where id=(r->>'campaign_id')::uuid; end if;
 if space is null or parent_status in ('deleted','archived') then raise exception 'Parent unavailable'; end if;
 select coalesce(jsonb_object_agg(e.key,e.value order by a.created_at,a.id),'{}'::jsonb) into details
 from public.activity_log a cross join lateral jsonb_each(a.metadata) e
 where a.entity_type=p_kind and a.entity_id=p_id and a.action='details_updated';
 select value into child from jsonb_array_elements(coalesce(details->'checklist_items','[]'::jsonb)) where value->>'id'=p_item_id;
 if child is null then raise exception 'Checklist item unavailable'; end if;
 if p_complete then
  select jsonb_agg(case when value->>'id'=p_item_id then value||jsonb_build_object('completed',true,'completed_at',case when coalesce((value->>'completed')::boolean,false) then coalesce(nullif(value->>'completed_at',''),now()::text) else now()::text end,'status','done','workflow_status','completed') else value end order by ord)
  into items from jsonb_array_elements(details->'checklist_items') with ordinality x(value,ord);
  perform public.save_task_deliverables(p_kind,p_id,jsonb_build_object('checklist_items',items),details->'checklist_items');
 end if;
 meta:=p_metadata||jsonb_build_object('week_start',p_week_start,'week_end',p_week_end,'task_kind',p_kind,'checklist_item_id',p_item_id,'task_title',child->>'title');
 select id into report_id from public.activity_log where user_id=actor and entity_type=p_kind and entity_id=p_id and action='checklist_weekly_report'
  and metadata->>'week_start'=p_week_start::text and metadata->>'week_end'=p_week_end::text and metadata->>'checklist_item_id'=p_item_id order by created_at desc,id desc limit 1;
 if report_id is null then
  insert into public.activity_log(workspace_id,user_id,entity_type,entity_id,action,metadata) values(space,actor,p_kind,p_id,'checklist_weekly_report',meta);
 else
  update public.activity_log set metadata=meta where id=report_id;
  if not found then raise exception 'Report update denied'; end if;
 end if;
 return true;
end;
$function$;
revoke all on function public.save_task_checklist_report(text,uuid,text,jsonb,date,date,boolean) from public,anon;
grant execute on function public.save_task_checklist_report(text,uuid,text,jsonb,date,date,boolean) to authenticated;
