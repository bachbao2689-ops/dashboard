-- The parent creator and assigned parent PIC both manage its workflow, even
-- after a PIC has been appointed. Staff assigned to an individual task retain
-- their existing edit rights; the individual task creator can also edit it.
create or replace function public.workflow_root(
  k text, e uuid, u bigint default public.workflow_actor()
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $permission$
  select exists (
    select 1 from public.users actor
    where actor.id = u and actor.is_active and (
      lower(actor.role) = 'admin'
      or (k = 'project' and (
        exists (select 1 from public.projects p where p.id = e and p.created_by = u)
        or exists (select 1 from public.project_members m
                   where m.project_id = e and m.user_id = u and m.workflow_role = 'pic')
      ))
      or (k = 'campaign' and (
        exists (select 1 from public.campaigns c
                where c.id = e and (c.created_by = u or c.lead_id = u))
        or exists (select 1 from public.campaign_members m
                   where m.campaign_id = e and m.user_id = u and m.workflow_role = 'pic')
      ))
    )
  )
$permission$;

create or replace function public.workflow_task_access_for(
  tid uuid, editing boolean, _actor bigint
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $permission$
  select exists (
    select 1 from public.tasks t
    join public.users u on u.id = _actor and u.is_active
    where t.id = tid and (
      t.created_by = u.id
      or (t.workflow_phase_id is null and public.workflow2_global(u.id))
      or (t.workflow_phase_id is not null and (
        public.workflow_phase_access_for(t.workflow_phase_id, editing, _actor)
        or t.assignee_id = u.id
      ))
      or (t.workflow_phase_id is null and (
        t.assignee_id = u.id
        or public.workflow_root('project', t.project_id, _actor)
        or public.workflow_root('campaign', t.campaign_id, _actor)
        or (t.department_id = u.department_id and (
          not editing or lower(u.role) = 'leader' or lower(u.employment_level) = 'leader'
        ))
      ))
      or (not editing and exists (
        select 1 from public.comments c where c.task_id = t.id and u.id = any(c.mentions)
      ))
    )
  )
$permission$;

notify pgrst, 'reload schema';
