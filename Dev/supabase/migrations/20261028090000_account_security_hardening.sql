-- Account access is tied to the signed-in Supabase identity. Password storage,
-- salted password hashing, and JWT issuance/validation remain owned by Supabase Auth.

create or replace function public.dashboard_account_actor()
returns table(id bigint, role text, employment_level text, department_id text, is_active boolean)
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select u.id, lower(coalesce(u.role, '')), lower(coalesce(u.employment_level, '')),
         u.department_id::text, u.is_active
  from public.users u
  where u.auth_id = (select auth.uid())
  limit 1
$$;

create or replace function public.dashboard_account_is_global_manager()
returns boolean language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce((select
    a.is_active and (a.role = 'admin' or a.employment_level = 'manager'
      or (a.role = 'manager' and a.employment_level <> 'leader'))
    from public.dashboard_account_actor() a), false)
$$;

create or replace function public.dashboard_account_can_read_user(target_id bigint)
returns boolean language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.dashboard_account_actor() actor
    join public.users target on target.id = target_id and target.is_active
    where actor.is_active and (
      actor.id = target.id
      or actor.role = 'admin'
      or actor.employment_level = 'manager'
      or (actor.role = 'manager' and actor.employment_level <> 'leader')
      or (actor.department_id is not null and actor.department_id = target.department_id::text)
    )
  )
$$;

create or replace function public.account_get_current_profile(p_mark_signed_in boolean default false)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  actor_email_confirmed boolean;
  target public.users%rowtype;
  matches integer;
  department_name text;
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select lower(trim(u.email)), u.email_confirmed_at is not null
    into actor_email, actor_email_confirmed from auth.users u where u.id = actor_id;

  select * into target from public.users where auth_id = actor_id for update;
  if not found and actor_email is not null and actor_email_confirmed then
    select count(*) into matches from public.users u
      where u.auth_id is null and lower(trim(u.email)) = actor_email;
    if matches > 1 then raise exception 'Account email matches more than one staff record' using errcode = '23505'; end if;
    if matches = 1 then
      update public.users u set auth_id = actor_id,
        last_sign_in_at = case when p_mark_signed_in then now() else u.last_sign_in_at end
        where u.auth_id is null and lower(trim(u.email)) = actor_email
        returning u.* into target;
    end if;
  elsif found and p_mark_signed_in then
    update public.users set last_sign_in_at = now() where id = target.id returning * into target;
  end if;
  if target.id is null then return null; end if;
  select d.name into department_name from public.departments d where d.id = target.department_id;
  return jsonb_build_object(
    'id', target.id, 'auth_id', target.auth_id, 'email', target.email,
    'name', target.name, 'avatar_url', target.avatar_url, 'role', target.role,
    'department_id', target.department_id, 'department_name', department_name,
    'employment_level', target.employment_level, 'job_title', target.job_title,
    'is_active', target.is_active
  );
end
$$;

create or replace function public.account_update_my_profile(
  p_name text, p_avatar_url text default null, p_update_avatar boolean default false
) returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare actor_id uuid := auth.uid(); target public.users%rowtype; display_name text := trim(coalesce(p_name, ''));
begin
  if actor_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(display_name) < 1 or length(display_name) > 120 then raise exception 'Name must be 1 to 120 characters'; end if;
  update public.users u set name = display_name,
    initials = upper(left(regexp_replace(display_name, '\s+', '', 'g'), 2)),
    avatar_url = case when p_update_avatar then p_avatar_url else u.avatar_url end
    where u.auth_id = actor_id and u.is_active returning u.* into target;
  if target.id is null then raise exception 'Active staff account not found' using errcode = '42501'; end if;
  return public.account_get_current_profile(false);
end
$$;

create or replace function public.account_list_members()
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare actor public.users%rowtype; is_global boolean;
begin
  select u.* into actor from public.users u where u.auth_id = auth.uid() and u.is_active;
  is_global := public.dashboard_account_is_global_manager();
  if actor.id is null or (not is_global and (actor.department_id is null or not (
    lower(actor.role) = 'leader' or lower(coalesce(actor.employment_level,'')) = 'leader'
  ))) then raise exception 'Team member visibility permission required' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', u.id, 'name', u.name, 'email', u.email, 'role', u.role,
    'is_active', u.is_active, 'created_at', u.created_at, 'avatar_url', u.avatar_url,
    'employment_level', u.employment_level, 'job_title', u.job_title,
    'department_id', u.department_id
  ) order by u.created_at desc) from public.users u
    where is_global or u.department_id = actor.department_id), '[]'::jsonb);
end
$$;

create or replace function public.account_add_member(
  p_email text, p_name text, p_role text, p_department_id text, p_job_title text default null
) returns bigint language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare actor public.users%rowtype; new_id bigint; clean_email text := lower(trim(coalesce(p_email, '')));
  clean_name text := trim(coalesce(p_name, '')); clean_role text := lower(trim(coalesce(p_role, '')));
begin
  select u.* into actor from public.users u where u.auth_id = auth.uid() and u.is_active;
  if actor.id is null or not public.dashboard_account_is_global_manager() then raise exception 'Member management permission required' using errcode = '42501'; end if;
  if clean_email = '' or clean_name = '' or clean_role not in ('admin','member','manager','leader') then raise exception 'Invalid member details'; end if;
  if clean_role = 'admin' and lower(actor.role) <> 'admin' then raise exception 'Only Admin can add Admin' using errcode = '42501'; end if;
  if not exists(select 1 from public.departments d where d.id::text = p_department_id) then raise exception 'Invalid department'; end if;
  if exists(select 1 from public.users u where lower(trim(u.email)) = clean_email) then raise exception 'Email already exists'; end if;
  insert into public.users(name,email,role,department_id,job_title,employment_level,initials,is_active)
  values(clean_name,clean_email,clean_role,p_department_id::uuid,nullif(trim(coalesce(p_job_title,'')),''),
    case clean_role when 'member' then 'Nhân viên' when 'admin' then 'ADMIN' when 'manager' then 'Manager' else 'Leader' end,
    upper(left(regexp_replace(clean_name, '\s+', '', 'g'), 2)),true)
  returning id into new_id;
  return new_id;
end
$$;

create or replace function public.account_set_member_active(p_member_id bigint, p_active boolean)
returns boolean language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare actor public.users%rowtype; target public.users%rowtype;
begin
  select u.* into actor from public.users u where u.auth_id = auth.uid() and u.is_active;
  if actor.id is null or not public.dashboard_account_is_global_manager() then raise exception 'Member management permission required' using errcode = '42501'; end if;
  select u.* into target from public.users u where u.id = p_member_id for update;
  if target.id is null then return false; end if;
  if target.id = actor.id then raise exception 'You cannot deactivate your own account'; end if;
  if lower(target.role) = 'admin' and lower(actor.role) <> 'admin' then raise exception 'Only Admin can manage Admin accounts' using errcode = '42501'; end if;
  if not p_active and lower(target.role) = 'admin' and target.is_active
    and (select count(*) from public.users u where lower(u.role)='admin' and u.is_active) <= 1
    then raise exception 'Cannot deactivate the last Admin'; end if;
  update public.users set is_active = p_active where id = target.id and is_active is distinct from p_active;
  return found;
end
$$;

create or replace function public.account_weekly_user_activity(
  p_user_id bigint, p_action text, p_start date, p_end date, p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare actor public.users%rowtype; target public.users%rowtype; workspace_id uuid;
begin
  if p_action not in ('weekly_summary_image','weekly_report_submitted') or p_end < p_start then raise exception 'Invalid weekly activity'; end if;
  select u.* into actor from public.users u where u.auth_id=auth.uid() and u.is_active;
  select u.* into target from public.users u where u.id=p_user_id and u.is_active;
  if actor.id is null or target.id is null or target.auth_id is null then raise exception 'Active linked staff account not found' using errcode='42501'; end if;
  if actor.id <> target.id and not (
    lower(actor.role)='admin' or lower(actor.employment_level)='manager'
    or (lower(actor.role)='manager' and lower(coalesce(actor.employment_level,''))<>'leader')
    or (actor.department_id is not null and actor.department_id=target.department_id
      and (lower(actor.role)='leader' or lower(actor.employment_level)='leader'))
  ) then raise exception 'Cannot submit activity for this staff member' using errcode='42501'; end if;
  select w.id into workspace_id from public.workspaces w order by w.id limit 1;
  if workspace_id is null then raise exception 'Workspace is not configured'; end if;
  insert into public.activity_log(workspace_id,user_id,entity_type,entity_id,action,metadata)
  values(workspace_id,target.id,'user',target.auth_id,p_action,
    coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('owner_id',target.id,'week_start',p_start,'week_end',p_end));
end
$$;

-- Remove anonymous and direct account writes. Authenticated users get only the
-- directory columns needed by normal dashboard views; email and auth_id are
-- available through guarded account RPCs only.
alter table public.users enable row level security;
revoke all on table public.users from public, anon, authenticated;
grant select (id,name,avatar_url,role,department_id,employment_level,job_title,is_active)
  on table public.users to authenticated;
drop policy if exists dashboard_users_directory_read on public.users;
create policy dashboard_users_directory_read on public.users for select to authenticated
  using (public.dashboard_account_can_read_user(id));

revoke all on function public.dashboard_account_actor() from public, anon;
revoke all on function public.dashboard_account_is_global_manager() from public, anon;
revoke all on function public.dashboard_account_can_read_user(bigint) from public, anon;
revoke all on function public.account_get_current_profile(boolean) from public, anon;
revoke all on function public.account_update_my_profile(text,text,boolean) from public, anon;
revoke all on function public.account_list_members() from public, anon;
revoke all on function public.account_add_member(text,text,text,text,text) from public, anon;
revoke all on function public.account_set_member_active(bigint,boolean) from public, anon;
revoke all on function public.account_weekly_user_activity(bigint,text,date,date,jsonb) from public, anon;
grant execute on function public.dashboard_account_actor() to authenticated;
grant execute on function public.dashboard_account_is_global_manager() to authenticated;
grant execute on function public.dashboard_account_can_read_user(bigint) to authenticated;
grant execute on function public.account_get_current_profile(boolean) to authenticated;
grant execute on function public.account_update_my_profile(text,text,boolean) to authenticated;
grant execute on function public.account_list_members() to authenticated;
grant execute on function public.account_add_member(text,text,text,text,text) to authenticated;
grant execute on function public.account_set_member_active(bigint,boolean) to authenticated;
grant execute on function public.account_weekly_user_activity(bigint,text,date,date,jsonb) to authenticated;

notify pgrst, 'reload schema';
