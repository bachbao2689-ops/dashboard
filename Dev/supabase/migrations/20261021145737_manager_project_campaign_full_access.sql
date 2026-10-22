-- Global managers and admins can manage every Project/Campaign, including
-- editing its description and managing its workflow, tasks, and subtasks.
-- Keep creator/PIC access scoped to their own parent records.
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
      public.workflow2_global(actor.id)
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

notify pgrst, 'reload schema';
