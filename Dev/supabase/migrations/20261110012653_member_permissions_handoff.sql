-- Account permission changes are explicit, server-authorized operations.
-- Prerequisite: 20261109040841_member_directory_realtime_and_account_guards.sql.
-- Personal profile updates/linking keep their existing column access and guard.
revoke update on table public.users from authenticated;
grant update(name,avatar_url,initials,last_sign_in_at,auth_id,is_active)
  on table public.users to authenticated;

create or replace function public.account_set_member_permissions(
  p_member_id bigint, p_role text, p_department_id uuid default null, p_job_title text default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  actor public.users%rowtype;
  target public.users%rowtype;
  clean_role text := lower(trim(coalesce(p_role,'')));
  clean_title text := nullif(trim(coalesce(p_job_title,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Same lock as account guard; protects final Admin and concurrent role changes.
  perform pg_catalog.pg_advisory_xact_lock(84635581);
  select * into actor from public.users where auth_id=auth.uid() and is_active;
  if actor.id is null or not dashboard_private.account_is_manager() then
    raise exception 'Member permission management required' using errcode='42501';
  end if;
  select * into target from public.users where id=p_member_id for update;
  if target.id is null then raise exception 'Member not found' using errcode='P0002'; end if;
  if target.id=actor.id then raise exception 'Cannot change your own access' using errcode='42501'; end if;
  if clean_role not in ('admin','manager','leader','member') then raise exception 'Invalid account role' using errcode='22023'; end if;
  if lower(actor.role)<>'admin' and (clean_role='admin' or lower(target.role)='admin') then
    raise exception 'Only Admin can manage Admin accounts' using errcode='42501';
  end if;
  if (p_department_id is null and clean_role in ('member','leader')) or
    (p_department_id is not null and not exists(select 1 from public.departments where id=p_department_id)) then
    raise exception 'Valid department required' using errcode='22023';
  end if;
  if length(clean_title)>120 then raise exception 'Job title too long' using errcode='22023'; end if;
  update public.users set role=clean_role,department_id=p_department_id,job_title=clean_title,
    employment_level=case clean_role when 'admin' then 'ADMIN' when 'manager' then 'Manager'
      when 'leader' then 'Leader' else 'Nhân viên' end
    where id=target.id;
  return target.id;
end
$$;
revoke all on function public.account_set_member_permissions(bigint,text,uuid,text) from public,anon;
grant execute on function public.account_set_member_permissions(bigint,text,uuid,text) to authenticated;
notify pgrst,'reload schema';
