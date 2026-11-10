-- Restrict Leaders/Staff to Projects, Campaigns, and Workflow Tracks where they or their team members are actively assigned.
-- Do NOT track access by entity department_id labels.

-- 1. Redefine dashboard_private.work_parent_allowed without department label fallback
create or replace function dashboard_private.work_parent_allowed(k text, e uuid, a bigint) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.users u
    where u.id = a and u.is_active and (
      public.workflow2_global(a)
      or dashboard_private.work_invited(k, e, a)
      or (k = 'project' and exists (select 1 from public.projects where id = e and created_by = a))
      or (k = 'campaign' and exists (select 1 from public.campaigns where id = e and created_by = a))
      or (
        u.department_id is not null
        and (lower(u.role) = 'leader' or lower(coalesce(u.employment_level, '')) = 'leader')
        and (
          (k = 'project' and exists (
            select 1 from public.projects p
            join public.users pu on pu.id = p.created_by
            where p.id = e and pu.department_id = u.department_id and pu.is_active
          ))
          or (k = 'campaign' and exists (
            select 1 from public.campaigns c
            join public.users cu on cu.id = c.created_by
            where c.id = e and cu.department_id = u.department_id and cu.is_active
          ))
          or (k = 'project' and exists (
            select 1 from public.project_members pm
            join public.users pu on pu.id = pm.user_id
            where pm.project_id = e and pu.department_id = u.department_id and pu.is_active
              and pm.workflow_role in ('pic', 'sub_pic')
          ))
          or (k = 'campaign' and exists (
            select 1 from public.campaign_members cm
            join public.users cu on cu.id = cm.user_id
            where cm.campaign_id = e and cu.department_id = u.department_id and cu.is_active
              and cm.workflow_role in ('pic', 'sub_pic')
          ))
          or (k = 'campaign' and exists (
            select 1 from public.campaigns c
            join public.users cu on cu.id = c.lead_id
            where c.id = e and cu.department_id = u.department_id and cu.is_active
          ))
        )
      )
    )
  );
$$;

revoke all on function dashboard_private.work_parent_allowed(text, uuid, bigint) from public, anon, authenticated;

-- 2. Update workflow_parent_access_for to remove department label check
create or replace function public.workflow_parent_access_for(k text, e uuid, _actor bigint)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.users where id = _actor and is_active) then return false; end if;
  if dashboard_private.work_leader(_actor) then return dashboard_private.work_parent_allowed(k, e, _actor); end if;
  return (_actor is not null and (
    public.workflow_root(k, e, _actor)
    or (k = 'project' and exists (select 1 from public.project_members where project_id = e and user_id = _actor))
    or (k = 'campaign' and exists (select 1 from public.campaign_members where campaign_id = e and user_id = _actor))
    or exists (select 1 from public.workflow_tracks w join public.workflow_phases f on f.workflow_id = w.id where w.entity_type = k and w.entity_id = e and public.workflow_phase_access_for(f.id, false, _actor))
    or exists (select 1 from public.tasks t where (case when k = 'project' then t.project_id else t.campaign_id end) = e and (t.assignee_id = _actor or exists (select 1 from public.comments c where c.task_id = t.id and _actor = any(c.mentions))))
    or (k = 'project' and exists (select 1 from public.project_subtasks where project_id = e and public.workflow_old_task_access_for('project', id, false, _actor)))
    or (k = 'campaign' and exists (select 1 from public.campaign_subtasks where campaign_id = e and public.workflow_old_task_access_for('campaign', id, false, _actor)))
  ));
end $$;

-- 3. Update workflow_phase_access_for to remove department label check
create or replace function public.workflow_phase_access_for(p uuid, editing boolean, _actor bigint)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.workflow_phases f
    join public.workflow_tracks w on w.id = f.workflow_id
    where f.id = p and exists (select 1 from public.users where id = _actor and is_active)
      and (not dashboard_private.work_leader(_actor) or dashboard_private.work_parent_allowed(w.entity_type, w.entity_id, _actor))
      and (
        public.workflow_root(w.entity_type, w.entity_id, _actor)
        or (not editing and dashboard_private.work_invited(w.entity_type, w.entity_id, _actor))
        or exists (select 1 from public.workflow_phase_members m where m.phase_id = p and m.user_id = _actor and (not editing or m.role = 'pic'))
        or (not editing and (
          exists (select 1 from public.tasks t where t.workflow_phase_id = p and (t.assignee_id = _actor or exists (select 1 from public.comments c where c.task_id = t.id and _actor = any(c.mentions))))
          or exists (select 1 from public.project_subtasks s where s.workflow_phase_id = p and s.assignee_id = _actor)
          or exists (select 1 from public.campaign_subtasks s where s.workflow_phase_id = p and s.assignee_id = _actor)
        ))
      )
  );
$$;

-- 4. Scope workflow_read on public.projects
drop policy if exists workflow_read on public.projects;
create policy workflow_read on public.projects for select to authenticated using (
  created_by = public.workflow_actor()
  or public.workflow_parent_access('project', id)
);

-- 5. Scope workflow_read on public.campaigns
drop policy if exists workflow_read on public.campaigns;
create policy workflow_read on public.campaigns for select to authenticated using (
  created_by = public.workflow_actor()
  or public.workflow_parent_access('campaign', id)
);

notify pgrst, 'reload schema';
