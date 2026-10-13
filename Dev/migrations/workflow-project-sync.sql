begin;

-- Publish the source records already protected by RLS. No policy or role grants change.
do $$declare t text;begin
  foreach t in array array['projects','campaigns','tasks','project_subtasks','campaign_subtasks','project_members','campaign_members','workflow_tracks','workflow_phases','workflow_phase_members','comments'] loop
    if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then
      raise exception 'Enable RLS on % before publishing it',t;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

-- Existing source UUIDs are the identity. Backfill only a missing empty track,
-- without generating stages, copying tasks, or changing any source record.
insert into workflow_tracks(entity_type,entity_id) select 'project',id from projects on conflict(entity_type,entity_id) do nothing;
insert into workflow_tracks(entity_type,entity_id) select 'campaign',id from campaigns on conflict(entity_type,entity_id) do nothing;

-- Gate completion and progress use the same active task set. Cancelled tasks
-- remain in history but never block approval or count as completed work.
do $$declare d text;begin
  select pg_get_functiondef('workflow_save_phase(uuid,uuid,jsonb,integer)'::regprocedure) into d;
  d:=replace(d,'status not in (''deleted'',''archived'')','lower(status) not in (''deleted'',''archived'',''cancelled'',''canceled'')');
  d:=replace(d,'status not in (''done'',''completed'',''complete'',''deleted'',''archived'')','lower(status) not in (''done'',''completed'',''complete'',''deleted'',''archived'',''cancelled'',''canceled'')');
  execute d;
end $$;

create or replace function workflow_hub_index() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',w.id,'entity_type',w.entity_type,'entity_id',w.entity_id,'name',s.name,'status',s.status,
 'description',s.description,'start_date',s.start_date,'due_date',s.due_date,'priority',s.priority,
 'department_id',s.department_id,'campaign_id',s.campaign_id,'budget',s.budget,'channels',s.channels,
 'root',workflow_root(w.entity_type,w.entity_id),'asset',s.asset,
 'pics',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url) order by u.name,u.id), '[]') from users u where u.is_active and (
 (w.entity_type='project' and exists(select 1 from project_members m where m.project_id=w.entity_id and m.user_id=u.id and m.workflow_role='pic')) or
 (w.entity_type='campaign' and (u.id=s.lead_id or exists(select 1 from campaign_members m where m.campaign_id=w.entity_id and m.user_id=u.id and m.workflow_role='pic'))) or
 (u.id=s.created_by and not exists(select 1 from project_members m where w.entity_type='project' and m.project_id=w.entity_id and m.workflow_role='pic') and (w.entity_type='project' or s.lead_id is null and not exists(select 1 from campaign_members m where m.campaign_id=w.entity_id and m.workflow_role='pic'))))),
 'sub_pics',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url,'role','sub_pic') order by u.name,u.id),'[]') from users u where u.is_active and (
 (w.entity_type='project' and exists(select 1 from project_members m where m.project_id=w.entity_id and m.user_id=u.id and m.workflow_role='sub_pic')) or
 (w.entity_type='campaign' and exists(select 1 from campaign_members m where m.campaign_id=w.entity_id and m.user_id=u.id and m.workflow_role='sub_pic')))),
 'phases',(select coalesce(jsonb_agg(jsonb_build_object(
 'id',f.id,'title',f.title,'position',f.position,'description',f.description,'gate_criteria',f.gate_criteria,
 'start_date',f.start_date,'due_date',f.due_date,'status',f.status,'version',f.version,
 'opportunity',f.opportunity,'opportunity_note',f.opportunity_note,'can_edit_tasks',workflow_phase_access(f.id,true),
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url,'role',m.role) order by m.role,u.name,u.id), '[]') from workflow_phase_members m join users u on u.id=m.user_id where m.phase_id=f.id)
 ) order by f.position),'[]') from workflow_phases f where f.workflow_id=w.id and workflow_phase_access(f.id))
 ) order by s.name,w.entity_type,w.entity_id),'[]') from workflow_tracks w join lateral (
 select name,status,description,start_date,due_date,priority,department_id,campaign_id,null::numeric budget,null::text[] channels,created_by,null::bigint lead_id,assets_url asset from projects where w.entity_type='project' and id=w.entity_id
 union all select name,status,objective,start_date,end_date,null::text,department_id,null::uuid,budget,channels,created_by,lead_id,(select metadata->>'strategy_asset' from activity_log where entity_type='campaign' and entity_id=w.entity_id and action='attachment_added' order by created_at desc limit 1) from campaigns where w.entity_type='campaign' and id=w.entity_id
 ) s on true where workflow_actor() is not null and coalesce(s.status,'') not in ('deleted','archived') and workflow_parent_access(w.entity_type,w.entity_id)
$$;
revoke all on function workflow_hub_index() from public;
grant execute on function workflow_hub_index() to authenticated;
notify pgrst,'reload schema';
commit;
