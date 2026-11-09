-- Preserve the current signed-in directory contract while protecting account
-- writes. Role previews are client views; only the real Auth identity authorizes writes.
create schema if not exists dashboard_private;
revoke all on schema dashboard_private from public, anon;
grant usage on schema dashboard_private to authenticated;

create or replace function dashboard_private.account_is_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users where auth_id=(select auth.uid()) and is_active)
$$;
create or replace function dashboard_private.account_is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users where auth_id=(select auth.uid()) and is_active and (
    lower(role)='admin' or lower(coalesce(employment_level,''))='manager'
    or (lower(role)='manager' and lower(coalesce(employment_level,''))<>'leader')))
$$;
create or replace function dashboard_private.account_email_matches(target_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=(select auth.uid())
    and email_confirmed_at is not null and lower(email)=lower(target_email))
$$;
revoke all on function dashboard_private.account_is_active() from public, anon;
revoke all on function dashboard_private.account_is_manager() from public, anon;
revoke all on function dashboard_private.account_email_matches(text) from public, anon;
grant execute on function dashboard_private.account_is_active() to authenticated;
grant execute on function dashboard_private.account_is_manager() to authenticated;
grant execute on function dashboard_private.account_email_matches(text) to authenticated;

create or replace function dashboard_private.guard_account_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor public.users%rowtype;
  global_manager boolean;
  client_role text := current_setting('role',true);
  permitted_fields text[];
begin
  -- Migration/maintenance and trusted server operations retain their privileges.
  if client_role not in ('anon','authenticated') then return new; end if;
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into actor from public.users where auth_id=auth.uid() and is_active;
  global_manager := coalesce(actor.id is not null and (
    lower(actor.role)='admin' or lower(coalesce(actor.employment_level,''))='manager'
    or (lower(actor.role)='manager' and lower(coalesce(actor.employment_level,''))<>'leader')),false);

  if global_manager then
    -- Serialize member management so two admins cannot remove the last admin.
    perform pg_catalog.pg_advisory_xact_lock(84635581);
    if new.role not in ('admin','manager','leader','member') then
      raise exception 'Invalid account role' using errcode='42501';
    end if;
    if lower(actor.role)<>'admin' and (new.role='admin' or (tg_op='UPDATE' and old.role='admin')) then
      raise exception 'Only Admin can manage Admin accounts' using errcode='42501';
    end if;
    if tg_op='INSERT' then
      if new.auth_id is not null then raise exception 'Auth identity must be linked by its owner' using errcode='42501'; end if;
      new.created_at := now();
    else
      if row(new.id,new.auth_id,new.email,new.created_at) is distinct from row(old.id,old.auth_id,old.email,old.created_at) then
        raise exception 'Account identity cannot be reassigned' using errcode='42501';
      end if;
      if old.id=actor.id and row(new.role,new.employment_level,new.is_active) is distinct from row(old.role,old.employment_level,old.is_active) then
        raise exception 'Cannot change your own access' using errcode='42501';
      end if;
      if old.role='admin' and old.is_active and (new.role<>'admin' or not new.is_active)
        and not exists(select 1 from public.users where role='admin' and is_active and id<>old.id) then
        raise exception 'Cannot remove the last Admin' using errcode='42501';
      end if;
    end if;
    return new;
  end if;

  if tg_op='INSERT' then
    if actor.id is not null or new.auth_id is distinct from auth.uid()
      or not dashboard_private.account_email_matches(new.email)
      or new.role<>'member' or not new.is_active or new.department_id is not null
      or coalesce(new.employment_level,'') not in ('','Staff','Nhân viên') or new.job_title is not null then
      raise exception 'New accounts must start as unassigned Staff' using errcode='42501';
    end if;
    new.created_at := now(); new.last_sign_in_at := now();
    return new;
  end if;

  if old.auth_id=auth.uid() and old.is_active then
    permitted_fields := array['name','avatar_url','initials','last_sign_in_at'];
  elsif old.auth_id is null and new.auth_id=auth.uid() and dashboard_private.account_email_matches(old.email) then
    permitted_fields := array['auth_id','last_sign_in_at'];
  else
    raise exception 'Cannot edit another staff account' using errcode='42501';
  end if;
  if (to_jsonb(new)-permitted_fields) is distinct from (to_jsonb(old)-permitted_fields) then
    raise exception 'Staff cannot change rank, department or account ownership' using errcode='42501';
  end if;
  if new.last_sign_in_at is distinct from old.last_sign_in_at then new.last_sign_in_at := now(); end if;
  return new;
end
$$;
revoke all on function dashboard_private.guard_account_write() from public, anon, authenticated;
create trigger dashboard_guard_account_write before insert or update on public.users
  for each row execute function dashboard_private.guard_account_write();

create unique index if not exists dashboard_users_auth_id_unique on public.users(auth_id) where auth_id is not null;
alter table public.users enable row level security;
revoke all on table public.users from public, anon, authenticated;
grant select, insert, update on table public.users to authenticated;
-- Existing staff invitation/login code inserts through the owned sequence.
grant usage on sequence public.users_id_seq to authenticated;
drop policy if exists "Staff view own user data" on public.users;
create policy dashboard_accounts_read on public.users for select to authenticated using (
  (select dashboard_private.account_is_active()) or auth_id=(select auth.uid())
  or (auth_id is null and dashboard_private.account_email_matches(email))
);
create policy dashboard_accounts_insert on public.users for insert to authenticated with check (
  (select dashboard_private.account_is_manager()) or auth_id=(select auth.uid())
);
create policy dashboard_accounts_update on public.users for update to authenticated using (
  (select dashboard_private.account_is_manager()) or (is_active and auth_id=(select auth.uid()))
  or (auth_id is null and dashboard_private.account_email_matches(email))
) with check ((select dashboard_private.account_is_manager()) or auth_id=(select auth.uid()));

-- A single shared websocket already watches these tables in the application.
-- Register only the missing sources; keep every existing publication member.
do $$ declare target text; begin
  foreach target in array array['users','departments'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target) then
      execute format('alter publication supabase_realtime add table public.%I',target);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
