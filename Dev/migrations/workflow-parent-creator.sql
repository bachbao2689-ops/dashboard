-- Include the parent creator independently from the current primary PICs.
-- Preserve workflow_root, RLS, phase/task visibility, gate rules and existing ACLs.
-- CREATE OR REPLACE keeps the current function owner and EXECUTE grants.
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
 'creator',(select jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url) from users u where u.id=w.created_by and u.is_active),
 'pics',coalesce((select people from pics p where p.kind=w.entity_type and p.entity=w.entity_id),'[]'::jsonb),
 'sub_pics',coalesce((select people from sub_pics p where p.kind=w.entity_type and p.entity=w.entity_id),'[]'::jsonb),
 'phases',coalesce((select data from phase_data p where p.workflow_id=w.id),'[]'::jsonb)
 ) order by w.name,w.entity_type,w.entity_id),'[]') from eligible w
$function$
;

