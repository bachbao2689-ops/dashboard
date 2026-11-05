-- Keep backend authorization aligned with the dashboard's roleScope rules:
-- Design Leaders are treated as global managers, while other Leaders remain
-- scoped to their own department by the Project/Campaign INSERT policies.
create or replace function public.workflow2_global(uid bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(
    lower(u.role) = 'admin'
    or lower(u.employment_level) = 'manager'
    or (
      lower(u.role) = 'manager'
      and coalesce(lower(u.employment_level), '') <> 'leader'
    )
    or (
      (lower(u.role) = 'leader' or lower(u.employment_level) = 'leader')
      and exists (
        select 1
        from public.departments d
        where d.id = u.department_id
          and lower(trim(d.name)) in ('design', 'thiết kế')
      )
    ),
    false
  )
  from public.users u
  where u.id = uid
$function$;
