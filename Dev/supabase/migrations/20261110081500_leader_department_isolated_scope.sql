-- Restrict Leaders to their own department's Projects, Campaigns, and Tasks.
-- Leaders can only view other departments' Projects/Campaigns/Tasks when explicitly invited/assigned or created by them.

-- 1. Restore work_parent_allowed without blanket work_leader(a) access
create or replace function dashboard_private.work_parent_allowed(k text,e uuid,a bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=a and u.is_active and (
  public.workflow2_global(a)
  or dashboard_private.work_invited(k,e,a)
  or exists(select 1 from public.projects where k='project' and id=e and created_by=a)
  or exists(select 1 from public.campaigns where k='campaign' and id=e and created_by=a)
  or (u.department_id is not null and u.department_id=case when k='project' then
    (select department_id from public.projects where id=e) when k='campaign' then
    (select department_id from public.campaigns where id=e) end)))
$$;

-- 2. Scope workflow_read on public.projects to creator, own department Leader, or authorized access
drop policy if exists workflow_read on public.projects;
create policy workflow_read on public.projects for select to authenticated using (
  created_by = public.workflow_actor()
  or public.workflow_parent_access('project', id)
  or exists (
    select 1 from public.users actor
    where actor.id = public.workflow_actor() and actor.is_active
      and actor.department_id is not null and actor.department_id = projects.department_id
      and (lower(actor.role) = 'leader' or lower(coalesce(actor.employment_level, '')) = 'leader')
  )
);

-- 3. Scope workflow_read on public.campaigns to creator, own department Leader, or authorized access
drop policy if exists workflow_read on public.campaigns;
create policy workflow_read on public.campaigns for select to authenticated using (
  created_by = public.workflow_actor()
  or public.workflow_parent_access('campaign', id)
  or exists (
    select 1 from public.users actor
    where actor.id = public.workflow_actor() and actor.is_active
      and actor.department_id is not null and actor.department_id = campaigns.department_id
      and (lower(actor.role) = 'leader' or lower(coalesce(actor.employment_level, '')) = 'leader')
  )
);

notify pgrst, 'reload schema';
