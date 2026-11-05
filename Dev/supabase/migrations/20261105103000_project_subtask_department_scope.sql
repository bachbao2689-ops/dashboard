-- Keep subtask creation consistent with the parent Project/Campaign workflow.
-- The actor must be an active dashboard user and be a parent owner/PIC/global
-- manager, an explicitly assigned member, or belong to the parent's department.
create or replace function public.workflow_subtask_create_allowed(k text, e uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(
    public.workflow_parent_edit(k, e)
    or exists (
      select 1
      from public.project_members m
      where k = 'project'
        and m.project_id = e
        and m.user_id = public.workflow_actor()
    )
    or exists (
      select 1
      from public.campaign_members m
      where k = 'campaign'
        and m.campaign_id = e
        and m.user_id = public.workflow_actor()
    )
    or exists (
      select 1
      from public.users actor
      where actor.id = public.workflow_actor()
        and actor.is_active
        and actor.department_id is not null
        and (
          (k = 'project' and exists (
            select 1 from public.projects p
            where p.id = e and p.department_id = actor.department_id
          ))
          or (k = 'campaign' and exists (
            select 1 from public.campaigns c
            where c.id = e and c.department_id = actor.department_id
          ))
        )
    ),
    false
  )
$function$;

revoke all on function public.workflow_subtask_create_allowed(text, uuid) from public;
grant execute on function public.workflow_subtask_create_allowed(text, uuid) to authenticated;

drop policy if exists workflow_create on public.project_subtasks;
create policy workflow_create on public.project_subtasks
for insert to authenticated
with check (public.workflow_subtask_create_allowed('project', project_id));

drop policy if exists workflow_create on public.campaign_subtasks;
create policy workflow_create on public.campaign_subtasks
for insert to authenticated
with check (public.workflow_subtask_create_allowed('campaign', campaign_id));

notify pgrst, 'reload schema';
