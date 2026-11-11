-- Make parent-PIC subtask creation explicit for Staff accounts.
-- Preserve the existing creator, parent membership, global manager, and
-- same-department creation paths while avoiding dependence on an older
-- workflow_parent_edit implementation.
create or replace function public.workflow_subtask_create_allowed(k text, e uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.users actor
    where actor.id = public.workflow_actor()
      and actor.is_active
      and case k
        when 'project' then exists (
          select 1
          from public.projects p
          where p.id = e
            and (
              public.workflow2_global(actor.id)
              or p.created_by = actor.id
              or public.workflow_root('project', p.id, actor.id)
              or exists (
                select 1 from public.project_members m
                where m.project_id = p.id and m.user_id = actor.id
                  and m.workflow_role in ('pic', 'sub_pic')
              )
              or (
                not dashboard_private.work_leader(actor.id)
                and actor.department_id is not null
                and p.department_id = actor.department_id
              )
            )
        )
        when 'campaign' then exists (
          select 1
          from public.campaigns c
          where c.id = e
            and (
              public.workflow2_global(actor.id)
              or c.created_by = actor.id
              or c.lead_id = actor.id
              or public.workflow_root('campaign', c.id, actor.id)
              or exists (
                select 1 from public.campaign_members m
                where m.campaign_id = c.id and m.user_id = actor.id
                  and m.workflow_role in ('pic', 'sub_pic')
              )
              or (
                not dashboard_private.work_leader(actor.id)
                and actor.department_id is not null
                and c.department_id = actor.department_id
              )
            )
        )
        else false
      end
  )
$function$;

revoke all on function public.workflow_subtask_create_allowed(text, uuid)
  from public, anon;
grant execute on function public.workflow_subtask_create_allowed(text, uuid)
  to authenticated;

create or replace function public.workflow_subtask_returning_visible(
  k text, e uuid, phase uuid, assignee bigint, fields jsonb
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1 from public.users actor
    where actor.id = public.workflow_actor()
      and actor.is_active
      and case
        when dashboard_private.work_leader(actor.id) then
          dashboard_private.work_task_person_allowed(actor.id, assignee, fields, true)
          or dashboard_private.work_parent_allowed(k, e, actor.id)
        when dashboard_private.work_task_person_allowed(actor.id, assignee, fields, false) then true
        when phase is not null then
          assignee = actor.id or public.workflow_phase_access_for(phase, false, actor.id)
        else
          assignee = actor.id
          or public.workflow_root(k, e, actor.id)
          or dashboard_private.work_invited(k, e, actor.id)
          or (
            actor.department_id is not null
            and actor.department_id = case when k = 'project'
              then (select p.department_id from public.projects p where p.id = e)
              else (select c.department_id from public.campaigns c where c.id = e)
            end
          )
      end
  )
$function$;

revoke all on function public.workflow_subtask_returning_visible(text, uuid, uuid, bigint, jsonb)
  from public, anon;
grant execute on function public.workflow_subtask_returning_visible(text, uuid, uuid, bigint, jsonb)
  to authenticated;

drop policy if exists workflow_create on public.project_subtasks;
create policy workflow_create on public.project_subtasks
  for insert to authenticated
  with check (public.workflow_subtask_create_allowed('project', project_id));

drop policy if exists workflow_create on public.campaign_subtasks;
create policy workflow_create on public.campaign_subtasks
  for insert to authenticated
  with check (public.workflow_subtask_create_allowed('campaign', campaign_id));

-- PostgREST INSERT ... RETURNING also applies the SELECT policy. During that
-- statement the row-based access helper cannot look the new row up by id yet.
-- Permit the transaction's just-created row only when the actor could read it
-- under the canonical task scope; do not treat create-by-department as a read
-- grant for a Leader whose parent belongs to another team's execution scope.
drop policy if exists workflow_read on public.project_subtasks;
create policy workflow_read on public.project_subtasks
  for select to authenticated
  using (
    public.workflow_old_task_access('project', id)
    or (
      created_at >= transaction_timestamp()
      and public.workflow_subtask_returning_visible('project', project_id, workflow_phase_id, assignee_id, custom_fields)
    )
  );

drop policy if exists workflow_read on public.campaign_subtasks;
create policy workflow_read on public.campaign_subtasks
  for select to authenticated
  using (
    public.workflow_old_task_access('campaign', id)
    or (
      created_at >= transaction_timestamp()
      and public.workflow_subtask_returning_visible('campaign', campaign_id, workflow_phase_id, assignee_id, custom_fields)
    )
  );

notify pgrst, 'reload schema';
