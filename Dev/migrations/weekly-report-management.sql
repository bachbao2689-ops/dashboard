-- Source migration for Supabase DEV ONLY (samuuyxxtocqmtujnnhe).
-- Applied to Dev through Supabase MCP: 20261019093749_weekly_report_management.
-- CLI unavailable locally; this is the reviewed SQL source for that migration.
-- Do not apply to Official as part of this UI release.
-- All unrelated activity_log actions preserve their existing helper predicates.
begin;

create or replace function public.weekly_report_period_valid(m jsonb)
returns boolean language plpgsql immutable security invoker
set search_path = public, pg_temp as $$
declare first_day date; last_day date;
begin
  if jsonb_typeof(m) is distinct from 'object'
    or m->'schema' is distinct from '1'::jsonb
    or coalesce(m->>'week_start','') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(m->>'week_end','') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  first_day := (m->>'week_start')::date;
  last_day := (m->>'week_end')::date;
  return first_day <= last_day and last_day - first_day <= 366
    and first_day::text=m->>'week_start' and last_day::text=m->>'week_end';
exception when invalid_datetime_format or datetime_field_overflow then return false;
end;
$$;

-- Uses the saved department, never the author's present role/department/status.
-- SECURITY INVOKER only reads the signed-in actor's own directory row.
create or replace function public.weekly_report_management_scope(department text)
returns boolean language sql stable security invoker
set search_path = public, pg_temp as $$
  select exists(select 1 from public.users actor
    where actor.id=(select public.workflow_actor()) and actor.auth_id=(select auth.uid()) and actor.is_active
      and (public.workflow2_global(actor.id) or
        ((lower(actor.role)='leader' or lower(coalesce(actor.employment_level,''))='leader')
          and actor.department_id::text=department)));
$$;

create or replace function public.weekly_report_activity_insert(k text, e uuid, a text, u bigint, m jsonb)
returns boolean language plpgsql stable security invoker
set search_path = public, pg_temp as $$
declare actor public.users%rowtype; output jsonb; entry jsonb; captured timestamptz; department uuid;
begin
  select * into actor from public.users where id=(select public.workflow_actor()) and auth_id=(select auth.uid()) and is_active;
  if not found or u is distinct from actor.id
    or not coalesce(public.workflow2_global(actor.id) or lower(actor.role)='leader' or lower(actor.employment_level)='leader',false)
    or not public.weekly_report_period_valid(m) then return false; end if;

  if a='weekly_report_outputs' then
    if k not in ('task','project_subtask','campaign_subtask')
      or not coalesce(public.workflow_activity_write(k,e,a,u),false)
      or jsonb_typeof(m->'channel') is distinct from 'string' or length(m->>'channel')>80
      or jsonb_typeof(m->'outputs') is distinct from 'array' then return false; end if;
    if jsonb_array_length(m->'outputs')>50 then return false; end if;
    for output in select value from jsonb_array_elements(m->'outputs') loop
      if jsonb_typeof(output) is distinct from 'object'
        or jsonb_typeof(output->'id') is distinct from 'string'
        or jsonb_typeof(output->'name') is distinct from 'string'
        or length(trim(output->>'name'))=0 or length(output->>'name')>200
        or jsonb_typeof(output->'quantity') is distinct from 'number'
        or jsonb_typeof(output->'url') is distinct from 'string'
        or coalesce(output->>'unit','') not in ('image','file','page','sku','option')
        or coalesce(output->>'kind','') not in ('image','file','link') then return false; end if;
      if (output->>'quantity')::numeric<1 or (output->>'quantity')::numeric>100000
        or trunc((output->>'quantity')::numeric)<>(output->>'quantity')::numeric
        or ((output->>'url')<>'' and (output->>'url') !~* '^https?://[^[:space:]]+$') then return false; end if;
    end loop;
    return true;
  end if;

  if a not in ('team_weekly_report_draft','team_weekly_report_published')
    or k is distinct from 'user' or e is distinct from actor.auth_id
    or not public.weekly_report_management_scope(m->>'department_id') then return false; end if;
  department := (m->>'department_id')::uuid;
  if not exists(select 1 from public.departments where id=department)
    or jsonb_typeof(m->'notes') is distinct from 'object' then return false; end if;
  if exists(select 1 from unnest(array['summary','decisions','nextWeek']) as note(key)
    where jsonb_typeof(m->'notes'->note.key) is distinct from 'string' or length(m->'notes'->>note.key)>5000) then return false; end if;
  if a='team_weekly_report_draft' then return not (m ? 'snapshot'); end if;

  if length(trim(m->'notes'->>'summary'))=0
    or jsonb_typeof(m->'snapshot') is distinct from 'object'
    or m->'snapshot'->'schema' is distinct from '1'::jsonb
    or m->'snapshot'->>'weekStart' is distinct from m->>'week_start'
    or m->'snapshot'->>'weekEnd' is distinct from m->>'week_end'
    or m->'snapshot'->>'departmentId' is distinct from m->>'department_id'
    or m->'snapshot'->'notes' is distinct from m->'notes'
    or m->'snapshot'->>'authorName' is distinct from actor.name
    or jsonb_typeof(m->'snapshot'->'departmentName') is distinct from 'string'
    or jsonb_typeof(m->'snapshot'->'capturedAt') is distinct from 'string'
    or jsonb_typeof(m->'snapshot'->'entries') is distinct from 'array' then return false; end if;
  captured := (m->'snapshot'->>'capturedAt')::timestamptz;
  if not isfinite(captured) or jsonb_array_length(m->'snapshot'->'entries')=0 then return false; end if;
  for entry in select value from jsonb_array_elements(m->'snapshot'->'entries') loop
    if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'outputs') is distinct from 'array'
      or exists(select 1 from unnest(array['id','title','status','memberId','memberName','parentId','parentName','dueDate','body','blocker','nextStep','channel']) as field(key)
        where jsonb_typeof(entry->field.key) is distinct from 'string') then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then return false;
end;
$$;

revoke all on function public.weekly_report_period_valid(jsonb) from public, anon;
revoke all on function public.weekly_report_management_scope(text) from public, anon;
revoke all on function public.weekly_report_activity_insert(text,uuid,text,bigint,jsonb) from public, anon;
grant execute on function public.weekly_report_period_valid(jsonb) to authenticated;
grant execute on function public.weekly_report_management_scope(text) to authenticated;
grant execute on function public.weekly_report_activity_insert(text,uuid,text,bigint,jsonb) to authenticated;

drop policy if exists workflow_read on public.activity_log;
create policy workflow_read on public.activity_log for select to authenticated using (
  case when action in ('team_weekly_report_draft','team_weekly_report_published')
    then entity_type='user' and public.weekly_report_management_scope(metadata->>'department_id')
      and (action='team_weekly_report_published' or user_id=(select public.workflow_actor()))
    else public.workflow_activity_access(entity_type::text,entity_id,user_id) end
);
drop policy if exists workflow_create on public.activity_log;
create policy workflow_create on public.activity_log for insert to authenticated with check (
  case when action in ('team_weekly_report_draft','team_weekly_report_published','weekly_report_outputs')
    then public.weekly_report_activity_insert(entity_type::text,entity_id,action::text,user_id,metadata)
    else public.workflow_activity_write(entity_type::text,entity_id,action::text,user_id) end
);

-- Report actions are append-only. This also prevents converting a legacy log
-- into a published report through UPDATE instead of the guarded INSERT path.
drop policy if exists workflow_write on public.activity_log;
create policy workflow_write on public.activity_log for update to authenticated
using (action not in ('team_weekly_report_draft','team_weekly_report_published','weekly_report_outputs')
  and public.workflow_activity_write(entity_type::text,entity_id,action::text,user_id))
with check (action not in ('team_weekly_report_draft','team_weekly_report_published','weekly_report_outputs')
  and public.workflow_activity_write(entity_type::text,entity_id,action::text,user_id));
drop policy if exists workflow_delete on public.activity_log;
create policy workflow_delete on public.activity_log for delete to authenticated using (
  action not in ('team_weekly_report_draft','team_weekly_report_published','weekly_report_outputs')
    and user_id=(select public.workflow_actor())
    and public.workflow_activity_access(entity_type::text,entity_id,user_id)
);

commit;

-- Dev validation plan (each data assertion in BEGIN / ROLLBACK):
-- 1. Active department Leader inserts own draft/published report and reads it;
--    draft+snapshot period, saved department and notes match the payload.
-- 2. Staff cannot insert a draft/published snapshot or output declaration;
--    foreign-department Leader cannot insert/read a snapshot for this department.
-- 3. Global Manager can publish for a selected department; that department's
--    Leader can read it even when the Manager belongs to another department.
-- 4. Disable/demote/transfer the author inside the transaction: another current
--    Leader in the report's saved department still reads the published snapshot.
-- 5. Owner/Manager UPDATE and DELETE of published records affect zero rows;
--    UPDATE of a legacy row to a new report action is rejected.
-- 6. Management output writes require the same task edit scope as before;
--    malformed date/notes/output quantities are rejected, outputs=[] is accepted.
-- 7. Existing comment, weekly_report and details_updated activity actions keep
--    their previous SELECT/INSERT/UPDATE/DELETE behavior under the same actors.
