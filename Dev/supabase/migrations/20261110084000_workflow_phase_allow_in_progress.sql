-- Allow phases to be switched to 'in_progress' or 'in_review' freely without requiring strict completion of previous phases.
-- Only 'completed' requires phase tasks to be done and prior phases to be resolved.

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
 if nextstatus='completed' and exists(select 1 from workflow_phases where workflow_id=w.id and position<coalesce(f.position,2147483647) and status not in ('completed','cancelled')) then raise exception 'Previous phases must be completed first';end if;
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
$function$;

notify pgrst, 'reload schema';
