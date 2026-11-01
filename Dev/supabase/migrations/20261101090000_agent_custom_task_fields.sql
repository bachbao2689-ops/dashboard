begin;

-- Freeform task fields are stored as JSON objects so the UI can define
-- workspace-specific fields without adding one database column per field.
alter table public.tasks
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists parent_task_id uuid references public.tasks(id) on delete cascade;
alter table public.project_subtasks
  add column if not exists description text,
  add column if not exists priority text not null default 'medium',
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;
alter table public.campaign_subtasks
  add column if not exists description text,
  add column if not exists priority text not null default 'medium',
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

create index if not exists tasks_parent_task_id_idx
  on public.tasks(parent_task_id) where parent_task_id is not null;

do $migration$
begin
  if not exists (select 1 from pg_constraint where conname='tasks_custom_fields_object') then
    alter table public.tasks add constraint tasks_custom_fields_object check (jsonb_typeof(custom_fields)='object') not valid;
    alter table public.tasks validate constraint tasks_custom_fields_object;
  end if;
  if not exists (select 1 from pg_constraint where conname='tasks_parent_not_self') then
    alter table public.tasks add constraint tasks_parent_not_self check (parent_task_id is null or parent_task_id <> id) not valid;
    alter table public.tasks validate constraint tasks_parent_not_self;
  end if;
  if not exists (select 1 from pg_constraint where conname='project_subtasks_custom_fields_object') then
    alter table public.project_subtasks add constraint project_subtasks_custom_fields_object check (jsonb_typeof(custom_fields)='object') not valid;
    alter table public.project_subtasks validate constraint project_subtasks_custom_fields_object;
  end if;
  if not exists (select 1 from pg_constraint where conname='project_subtasks_priority_valid') then
    alter table public.project_subtasks add constraint project_subtasks_priority_valid check (priority in ('low','medium','high')) not valid;
    alter table public.project_subtasks validate constraint project_subtasks_priority_valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='campaign_subtasks_custom_fields_object') then
    alter table public.campaign_subtasks add constraint campaign_subtasks_custom_fields_object check (jsonb_typeof(custom_fields)='object') not valid;
    alter table public.campaign_subtasks validate constraint campaign_subtasks_custom_fields_object;
  end if;
  if not exists (select 1 from pg_constraint where conname='campaign_subtasks_priority_valid') then
    alter table public.campaign_subtasks add constraint campaign_subtasks_priority_valid check (priority in ('low','medium','high')) not valid;
    alter table public.campaign_subtasks validate constraint campaign_subtasks_priority_valid;
  end if;
end
$migration$;

-- Keep task children in the same workspace and one level deep. This prevents
-- cycles and cross-workspace relationships without bypassing caller RLS.
create or replace function public.validate_task_parent_link()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare parent_workspace uuid; parent_department uuid; parent_parent uuid;
begin
  if new.parent_task_id is null then return new; end if;
  select workspace_id, department_id, parent_task_id
    into parent_workspace, parent_department, parent_parent
    from public.tasks where id = new.parent_task_id;
  if not found then
    raise exception 'Parent task is not visible or does not exist' using errcode = '23503';
  end if;
  if parent_workspace is distinct from new.workspace_id
     or parent_department is distinct from new.department_id then
    raise exception 'Parent and child task must stay in the same workspace and department' using errcode = '23514';
  end if;
  if parent_parent is not null then
    raise exception 'Task hierarchy is limited to one child level' using errcode = '23514';
  end if;
  return new;
end
$function$;

drop trigger if exists tasks_validate_parent_link on public.tasks;
create trigger tasks_validate_parent_link
before insert or update of parent_task_id, workspace_id, department_id
on public.tasks for each row execute function public.validate_task_parent_link();

notify pgrst, 'reload schema';

commit;
