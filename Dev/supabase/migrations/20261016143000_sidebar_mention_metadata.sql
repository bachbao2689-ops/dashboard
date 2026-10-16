-- Preserve notification recipients/permissions; identify explicit mentions per recipient.
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
 select distinct u.id,event,k,e,msg,jsonb_build_object('origin','dashboard:v2','event_key',source||':'||event,'actor_id',actor,'actor_name',who,'actor_avatar_url',avatar,'parent_kind',pk,'parent_id',pe,'task_title',label,'task_ref',item->>'task_ref','target',case when phase is not null then 'workflow' end,'phase_id',phase,'is_mention',event in ('task_comment','project_comment','campaign_comment') and u.id=any(coalesce(mentioned,'{}')))
 from public.users u where u.id=any(ids) and u.id<>actor and u.is_active
 and case when phase is not null then public.workflow_phase_access_for(phase,false,u.id) else case k when 'task' then public.workflow_task_access_for(e,false,u.id)
  when 'project_subtask' then public.workflow_old_task_access_for('project',e,false,u.id)
  when 'campaign_subtask' then public.workflow_old_task_access_for('campaign',e,false,u.id)
  else public.workflow_parent_access_for(k,e,u.id) end end
 on conflict do nothing;
end $$;

