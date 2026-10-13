begin;
-- Persist the approved stage-gate UI on the existing scoped Workflow tables.
alter table workflow_phases add column if not exists description text not null default '';
alter table workflow_phases add column if not exists gate_criteria jsonb not null default '[]';

create or replace function workflow_validate_gate(items jsonb) returns void language plpgsql set search_path=public as $$
begin
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items)>100 then raise exception 'Invalid gate checklist';end if;
 if exists(select 1 from jsonb_array_elements(items) v where jsonb_typeof(v)<>'object' or nullif(trim(v->>'id'),'') is null or nullif(trim(v->>'label'),'') is null or coalesce(jsonb_typeof(v->'weight'),'null')<>'number' or (v->>'weight')::numeric<=0 or (v->>'weight')::numeric>100 or coalesce(jsonb_typeof(v->'checked'),'null')<>'boolean') then raise exception 'Invalid gate criterion';end if;
 if (select count(*) from jsonb_array_elements(items))<>(select count(distinct v->>'id') from jsonb_array_elements(items) v) then raise exception 'Duplicate gate criterion';end if;
end $$;

create or replace function workflow_configure_phase(p_workflow uuid,p_phase uuid,p_data jsonb,p_expected integer default 0) returns uuid language plpgsql security definer set search_path=public as $$
declare pid uuid; w workflow_tracks; f workflow_phases; desired integer; lastpos integer; totalweight numeric; passedweight numeric;begin
 select * into w from workflow_tracks where id=p_workflow;
 if workflow_actor() is null or not workflow_root(w.entity_type,w.entity_id) then raise exception 'Only parent PIC can configure phases' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(p_workflow::text));
 perform workflow_validate_gate(coalesce(p_data->'gate_criteria','[]'));
 if p_data->>'status'='completed' then
  select sum((v->>'weight')::numeric),sum(case when (v->>'checked')::boolean then (v->>'weight')::numeric else 0 end) into totalweight,passedweight from jsonb_array_elements(coalesce(p_data->'gate_criteria','[]')) v;
  if totalweight is null or passedweight/totalweight<0.8 then raise exception 'Complete at least 80%% of the gate checklist';end if;
 end if;
 pid:=workflow_save_phase(p_workflow,p_phase,p_data,p_expected);
 select * into f from workflow_phases where id=pid;
 update workflow_phases set description=coalesce(p_data->>'description',''),gate_criteria=coalesce(p_data->'gate_criteria',f.gate_criteria) where id=pid;
 -- Stable UUIDs never change when inserting between two phases.
 if p_phase is null and p_data->>'position' is not null then
  select max(position) into lastpos from workflow_phases where workflow_id=w.id;
  desired:=greatest(1,least((p_data->>'position')::integer,lastpos));
  if desired<lastpos then
   update workflow_phases set position=-position where workflow_id=w.id and position>=desired;
   update workflow_phases set position=-position+1,version=version+1 where workflow_id=w.id and id<>pid and position<0;
   update workflow_phases set position=desired where id=pid;
  end if;
 end if;
 return pid;
end $$;

create or replace function workflow_update_gate(p_phase uuid,p_items jsonb,p_expected integer) returns void language plpgsql security definer set search_path=public as $$
declare f workflow_phases;begin
 if workflow_actor() is null or not workflow_phase_access(p_phase,true) then raise exception 'Phase access denied' using errcode='42501';end if;
 select * into f from workflow_phases where id=p_phase for update;
 if f.version<>p_expected then raise exception 'Phase changed. Refresh before saving.' using errcode='40001';end if;
 if f.status in ('completed','cancelled') then raise exception 'Reopen the phase before editing its gate';end if;
 perform workflow_validate_gate(p_items);
 update workflow_phases set gate_criteria=p_items,version=version+1,updated_at=now() where id=p_phase;
end $$;

create or replace function workflow_remove_phase(p_phase uuid,p_expected integer) returns void language plpgsql security definer set search_path=public as $$
declare w workflow_tracks; f workflow_phases;begin
 select * into f from workflow_phases where id=p_phase;
 select * into w from workflow_tracks where id=f.workflow_id;
 if workflow_actor() is null or not workflow_root(w.entity_type,w.entity_id) then raise exception 'Only parent PIC can remove a phase' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(w.id::text));
 select * into f from workflow_phases where id=p_phase for update;
 if f.version<>p_expected then raise exception 'Phase changed. Refresh before saving.' using errcode='40001';end if;
 if exists(select 1 from tasks where workflow_phase_id=f.id) or exists(select 1 from project_subtasks where workflow_phase_id=f.id) or exists(select 1 from campaign_subtasks where workflow_phase_id=f.id) then raise exception 'Phase contains tasks. Keep it or cancel it to preserve tracking.';end if;
 delete from workflow_phases where id=f.id;
 update workflow_phases set position=-position where workflow_id=w.id and position>f.position;
 update workflow_phases set position=-position-1,version=version+1 where workflow_id=w.id and position<0;
end $$;

create or replace function workflow_advance_phase(p_phase uuid,p_expected integer) returns uuid language plpgsql security definer set search_path=public as $$
declare w workflow_tracks; f workflow_phases; nextphase workflow_phases; totalweight numeric; passedweight numeric;begin
 select * into f from workflow_phases where id=p_phase;
 select * into w from workflow_tracks where id=f.workflow_id;
 if workflow_actor() is null or not workflow_root(w.entity_type,w.entity_id) then raise exception 'Only parent PIC can approve a gate' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(w.id::text));
 select * into f from workflow_phases where id=p_phase for update;
 if f.version<>p_expected then raise exception 'Phase changed. Refresh before approving.' using errcode='40001';end if;
 select sum((v->>'weight')::numeric),sum(case when (v->>'checked')::boolean then (v->>'weight')::numeric else 0 end) into totalweight,passedweight from jsonb_array_elements(f.gate_criteria) v;
 if totalweight is null or passedweight/totalweight<0.8 then raise exception 'Complete at least 80%% of the gate checklist';end if;
 perform workflow_save_phase(w.id,f.id,jsonb_build_object('title',f.title,'start_date',f.start_date,'due_date',f.due_date,'status','completed','opportunity',f.opportunity,'opportunity_note',f.opportunity_note,'pic_ids',(select jsonb_agg(user_id) from workflow_phase_members where phase_id=f.id and role='pic'),'sub_pic_ids',(select coalesce(jsonb_agg(user_id),'[]') from workflow_phase_members where phase_id=f.id and role='sub_pic')),f.version);
 select * into nextphase from workflow_phases where workflow_id=w.id and position>f.position and status not in ('completed','cancelled') order by position limit 1 for update;
 if nextphase.id is not null then
  perform workflow_save_phase(w.id,nextphase.id,jsonb_build_object('title',nextphase.title,'start_date',nextphase.start_date,'due_date',nextphase.due_date,'status','in_progress','opportunity',nextphase.opportunity,'opportunity_note',nextphase.opportunity_note,'pic_ids',(select jsonb_agg(user_id) from workflow_phase_members where phase_id=nextphase.id and role='pic'),'sub_pic_ids',(select coalesce(jsonb_agg(user_id),'[]') from workflow_phase_members where phase_id=nextphase.id and role='sub_pic')),nextphase.version);
 end if;
 return nextphase.id;
end $$;

-- Add the saved UI fields to the already-sanitized list RPC; phase scope stays authoritative.
do $$declare d text;begin
 select pg_get_functiondef('workflow_hub_index()'::regprocedure) into d;
 if position('''gate_criteria'',f.gate_criteria' in d)=0 then d:=replace(d,'''opportunity'',f.opportunity,','''description'',f.description,''gate_criteria'',f.gate_criteria,''opportunity'',f.opportunity,');end if;
 if position('''sub_pics''' in d)=0 then d:=replace(d,'''root'',workflow_root(w.entity_type,w.entity_id),','''sub_pics'',(select coalesce(jsonb_agg(jsonb_build_object(''id'',u.id,''name'',u.name,''avatar_url'',u.avatar_url,''role'',''sub_pic'')),''[]'') from users u where u.is_active and ((w.entity_type=''project'' and exists(select 1 from project_members m where m.project_id=w.entity_id and m.user_id=u.id and m.workflow_role=''sub_pic'')) or (w.entity_type=''campaign'' and exists(select 1 from campaign_members m where m.campaign_id=w.entity_id and m.user_id=u.id and m.workflow_role=''sub_pic'')))),''root'',workflow_root(w.entity_type,w.entity_id),');end if;
 execute d;
 -- Initial seven-stage selection is part of the same task transaction.
 select pg_get_functiondef('workflow_create_task(uuid,jsonb)'::regprocedure) into d;
 if position('p_data->>''workflow_status''' in d)=0 then d:=replace(d,'return tid;end','if p_data->>''workflow_status'' is not null then update tasks set workflow_status=p_data->>''workflow_status'' where id=tid;end if; return tid;end');end if;
 execute d;
end $$;

revoke all on function workflow_validate_gate(jsonb),workflow_configure_phase(uuid,uuid,jsonb,integer),workflow_update_gate(uuid,jsonb,integer),workflow_remove_phase(uuid,integer),workflow_advance_phase(uuid,integer) from public;
grant execute on function workflow_configure_phase(uuid,uuid,jsonb,integer),workflow_update_gate(uuid,jsonb,integer),workflow_remove_phase(uuid,integer),workflow_advance_phase(uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
