-- Allow Leaders to create Projects & Campaigns for any selected department
-- and allow Leaders to view all Projects & Campaigns (cross-leader and staff of all departments).

-- 1. Update work_parent_assignment_guard: Remove department lock for Leaders on creation
create or replace function dashboard_private.work_parent_assignment_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare a bigint:=public.workflow_actor();begin
 if current_setting('role',true) not in ('anon','authenticated') or not dashboard_private.work_leader(a) then return new;end if;
 if tg_table_name='campaigns' then
  if tg_op='INSERT' or new.lead_id is distinct from old.lead_id then
   if new.lead_id is not null and not dashboard_private.work_invitee_allowed(a,new.lead_id) then
    raise exception 'PIC must be own department or another department Leader' using errcode='42501';end if;
  end if;
 end if;
 return new;
end $$;

-- 2. Update work_parent_allowed: Allow active Leaders cross-department parent access
create or replace function dashboard_private.work_parent_allowed(k text,e uuid,a bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=a and u.is_active and (
  public.workflow2_global(a)
  or dashboard_private.work_leader(a)
  or dashboard_private.work_invited(k,e,a)
  or (u.department_id is not null and u.department_id=case when k='project' then
    (select department_id from public.projects where id=e) when k='campaign' then
    (select department_id from public.campaigns where id=e) end)))
$$;

-- 3. Update workflow_create policy: Allow Leaders to create with chosen department
drop policy if exists workflow_create on public.projects;
create policy workflow_create on public.projects for insert to authenticated with check (
  created_by = public.workflow_actor()
  and exists (
    select 1 from public.users
    where users.id = public.workflow_actor() and users.is_active and (
      public.workflow2_global(users.id)
      or lower(users.role) = 'leader'
      or lower(coalesce(users.employment_level, '')) = 'leader'
    )
  )
);

drop policy if exists workflow_create on public.campaigns;
create policy workflow_create on public.campaigns for insert to authenticated with check (
  created_by = public.workflow_actor()
  and exists (
    select 1 from public.users
    where users.id = public.workflow_actor() and users.is_active and (
      public.workflow2_global(users.id)
      or lower(users.role) = 'leader'
      or lower(coalesce(users.employment_level, '')) = 'leader'
    )
  )
);

-- 4. Update workflow_read policy: Allow Leaders to view Project & Campaign of each other and all departments
drop policy if exists workflow_read on public.projects;
create policy workflow_read on public.projects for select to authenticated using (
  public.workflow_parent_access('project', id)
  or exists (
    select 1 from public.users actor
    where actor.id = public.workflow_actor() and actor.is_active
      and (lower(actor.role) = 'leader' or lower(coalesce(actor.employment_level, '')) = 'leader')
  )
);

drop policy if exists workflow_read on public.campaigns;
create policy workflow_read on public.campaigns for select to authenticated using (
  public.workflow_parent_access('campaign', id)
  or exists (
    select 1 from public.users actor
    where actor.id = public.workflow_actor() and actor.is_active
      and (lower(actor.role) = 'leader' or lower(coalesce(actor.employment_level, '')) = 'leader')
  )
);

notify pgrst,'reload schema';
