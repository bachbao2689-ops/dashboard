-- INSERT ... RETURNING evaluates SELECT policy against NEW before a lookup
-- helper can find the just-created parent. Check NEW.department_id inline for
-- active department Leaders; persisted cross-team access still requires PIC/Sub-PIC.
drop policy if exists workflow_read on public.projects;
create policy workflow_read on public.projects for select to authenticated using (
 public.workflow_parent_access('project',id)
 or exists(select 1 from public.users actor where actor.id=public.workflow_actor()
  and actor.is_active and actor.department_id is not null and actor.department_id=projects.department_id
  and (lower(actor.role)='leader' or lower(coalesce(actor.employment_level,''))='leader'))
);
drop policy if exists workflow_read on public.campaigns;
create policy workflow_read on public.campaigns for select to authenticated using (
 public.workflow_parent_access('campaign',id)
 or exists(select 1 from public.users actor where actor.id=public.workflow_actor()
  and actor.is_active and actor.department_id is not null and actor.department_id=campaigns.department_id
  and (lower(actor.role)='leader' or lower(coalesce(actor.employment_level,''))='leader'))
);
notify pgrst,'reload schema';
