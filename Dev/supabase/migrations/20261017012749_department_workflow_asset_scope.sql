-- One read scope for Workflow: the department Leader sees all its phases;
-- the assigned parent PIC retains root control; other staff see only phases
-- containing their assignment or a mention.
create or replace function public.workflow_phase_access_for(p uuid, editing boolean, _actor bigint)
returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select exists(
  select 1 from public.workflow_phases f
  join public.workflow_tracks w on w.id=f.workflow_id
  where f.id=p and _actor is not null and (
   public.workflow_root(w.entity_type,w.entity_id,_actor)
   or exists(select 1 from public.workflow_phase_members m where m.phase_id=p and m.user_id=_actor and (not editing or m.role='pic'))
   or (not editing and (
    exists(select 1 from public.users u where u.id=_actor and u.is_active and u.department_id is not null
      and u.department_id=case when w.entity_type='project' then (select department_id from public.projects where id=w.entity_id) else (select department_id from public.campaigns where id=w.entity_id) end
      and not public.workflow2_global(u.id) and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader'))
    or exists(select 1 from public.tasks t where t.workflow_phase_id=p and (t.assignee_id=_actor or exists(select 1 from public.comments c where c.task_id=t.id and _actor=any(c.mentions))))
    or exists(select 1 from public.project_subtasks s where s.workflow_phase_id=p and (s.assignee_id=_actor or exists(select 1 from public.activity_log a join public.users u on u.id=_actor where a.entity_id=s.id and a.entity_type='project_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0))))
    or exists(select 1 from public.campaign_subtasks s where s.workflow_phase_id=p and (s.assignee_id=_actor or exists(select 1 from public.activity_log a join public.users u on u.id=_actor where a.entity_id=s.id and a.entity_type='campaign_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0))))
   ))
  )
 )
$predicate$;

-- Read rights for tasks must follow phase read rights. Editing remains bound
-- to the phase PIC, parent PIC, or the task's own assignee.
create or replace function public.workflow_old_task_access_for(k text, tid uuid, editing boolean, _actor bigint)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $predicate$
 declare r record; mentioned boolean;
 begin
  if k='project' then select project_id parent_id,assignee_id,workflow_phase_id into r from public.project_subtasks where id=tid;
  else select campaign_id parent_id,assignee_id,workflow_phase_id into r from public.campaign_subtasks where id=tid; end if;
  if r is null or _actor is null then return false; end if;
  mentioned:=not editing and exists(select 1 from public.activity_log a join public.users u on u.id=_actor where a.entity_id=tid and a.entity_type=k||'_subtask' and a.action='comment' and (coalesce(a.metadata->'mentions','[]'::jsonb) @> to_jsonb(array[u.id]) or position(lower('@'||replace(u.name,' ','')) in lower(coalesce(a.metadata->>'body',''))) > 0));
  if r.workflow_phase_id is not null then return coalesce(r.assignee_id=_actor,false) or public.workflow_phase_access_for(r.workflow_phase_id,editing,_actor) or mentioned; end if;
  return public.workflow_legacy_access_for(k,r.parent_id,r.assignee_id,editing,_actor) or mentioned;
 end
$predicate$;

create or replace function public.workflow_task_access_for(tid uuid, editing boolean, _actor bigint)
returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select exists(select 1 from public.tasks t join public.users u on u.id=_actor where t.id=tid and (
  (t.workflow_phase_id is null and public.workflow2_global(u.id))
  or (t.workflow_phase_id is not null and (public.workflow_phase_access_for(t.workflow_phase_id,editing,_actor) or t.assignee_id=u.id))
  or (t.workflow_phase_id is null and (t.assignee_id=u.id or public.workflow_root('project',t.project_id,_actor) or public.workflow_root('campaign',t.campaign_id,_actor) or (t.department_id=u.department_id and (not editing or lower(u.role)='leader' or lower(u.employment_level)='leader')) or t.created_by=u.id))
  or (not editing and exists(select 1 from public.comments c where c.task_id=t.id and u.id=any(c.mentions)))
 ))
$predicate$;

create or replace function public.workflow_parent_access_for(k text, e uuid, _actor bigint)
returns boolean language sql stable security definer set search_path=public,pg_temp as $predicate$
 select _actor is not null and (
  public.workflow_root(k,e,_actor)
  or exists(select 1 from public.users u where u.id=_actor and u.is_active and u.department_id is not null
   and u.department_id=case when k='project' then (select department_id from public.projects where id=e) else (select department_id from public.campaigns where id=e) end
   and not public.workflow2_global(u.id) and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader'))
  or (k='project' and exists(select 1 from public.project_members where project_id=e and user_id=_actor))
  or (k='campaign' and exists(select 1 from public.campaign_members where campaign_id=e and user_id=_actor))
  or exists(select 1 from public.workflow_tracks w join public.workflow_phases f on f.workflow_id=w.id where w.entity_type=k and w.entity_id=e and public.workflow_phase_access_for(f.id,false,_actor))
  or exists(select 1 from public.tasks t where (case when k='project' then t.project_id else t.campaign_id end)=e and (t.assignee_id=_actor or exists(select 1 from public.comments c where c.task_id=t.id and _actor=any(c.mentions))))
  or (k='project' and exists(select 1 from public.project_subtasks where project_id=e and public.workflow_old_task_access_for('project',id,false,_actor)))
  or (k='campaign' and exists(select 1 from public.campaign_subtasks where campaign_id=e and public.workflow_old_task_access_for('campaign',id,false,_actor)))
 )
$predicate$;

-- Authenticated identities are checked against the active staff row, not JWT
-- metadata supplied by a browser. This table is shared with Production.
create or replace function public.dashboard_asset_approver()
returns boolean language sql stable security definer set search_path=public,pg_temp as $policy$
 select exists(select 1 from public.users u left join public.departments d on d.id=u.department_id
  where u.auth_id=(select auth.uid()) and u.is_active and (
   lower(u.role)='admin' or (
    lower(trim(coalesce(d.name,'')))='design' and not public.workflow2_global(u.id)
    and (lower(u.role)='leader' or lower(coalesce(u.employment_level,''))='leader')
   )
  ))
$policy$;
revoke all on function public.dashboard_asset_approver() from public,anon;
grant execute on function public.dashboard_asset_approver() to authenticated;

create or replace function public.dashboard_asset_borrower()
returns boolean language sql stable security definer set search_path=public,pg_temp as $policy$
 select public.dashboard_asset_approver() or exists(select 1 from public.users u
  where u.auth_id=(select auth.uid()) and u.is_active and lower(u.role)='member'
   and not public.workflow2_global(u.id) and lower(coalesce(u.employment_level,''))<>'leader')
$policy$;
revoke all on function public.dashboard_asset_borrower() from public,anon;
grant execute on function public.dashboard_asset_borrower() to authenticated;

alter table public.borrow_requests enable row level security;
drop policy if exists dashboard_borrow_select on public.borrow_requests;
drop policy if exists dashboard_borrow_insert on public.borrow_requests;
drop policy if exists dashboard_borrow_update on public.borrow_requests;
create policy dashboard_borrow_select on public.borrow_requests for select to authenticated
 using (public.dashboard_asset_approver() or (public.dashboard_asset_borrower() and requester_id=(select public.workflow_actor())));
create policy dashboard_borrow_insert on public.borrow_requests for insert to authenticated
 with check (public.dashboard_asset_borrower() and requester_id=(select public.workflow_actor())
  and department_id is not distinct from (select department_id from public.users where id=(select public.workflow_actor()))
  and approval_status='pending' and approved_by is null and returned_at is null);
create policy dashboard_borrow_update on public.borrow_requests for update to authenticated
 using (public.dashboard_asset_approver()) with check (public.dashboard_asset_approver());

-- The existing client listens to borrow_requests; publish scoped row changes.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
  and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='borrow_requests') then
  alter publication supabase_realtime add table public.borrow_requests;
 end if;
end$$;

create or replace function public.dashboard_notification_summary()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
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
 'borrowCount',(select count(*) from public.borrow_requests b where b.approval_status='pending' and (public.dashboard_asset_approver() or (public.dashboard_asset_borrower() and b.requester_id=(select id from me))))),
 'items',coalesce((select jsonb_agg(recent order by created_at desc,id) from recent),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(history order by created_at desc,id) from history),'[]'::jsonb)) from counts
$$;

notify pgrst,'reload schema';
