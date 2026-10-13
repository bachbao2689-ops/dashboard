begin;

-- Keep legacy Subtasks in place and persist their inherited start date.
alter table public.project_subtasks add column if not exists start_date date;
alter table public.campaign_subtasks add column if not exists start_date date;

create or replace function public.workflow_phase_calendar_guard() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_start date; parent_due date;begin
  if tg_op='UPDATE' and new.start_date is not distinct from old.start_date and new.due_date is not distinct from old.due_date and new.workflow_id=old.workflow_id then return new;end if;
  select p.start_date,p.due_date into parent_start,parent_due
  from workflow_tracks w join projects p on w.entity_type='project' and p.id=w.entity_id where w.id=new.workflow_id for share of p;
  if not found then
    select c.start_date,c.end_date into parent_start,parent_due
    from workflow_tracks w join campaigns c on w.entity_type='campaign' and c.id=w.entity_id where w.id=new.workflow_id for share of c;
  end if;
  if tg_op='INSERT' then
    new.start_date:=coalesce(new.start_date,parent_start);
    new.due_date:=coalesce(new.due_date,parent_due);
  end if;
  if new.start_date>new.due_date or new.start_date<parent_start or new.due_date<parent_start or new.start_date>parent_due or new.due_date>parent_due then
    raise exception 'Phase dates must fit the Project/Campaign calendar' using errcode='22023';
  end if;
  return new;
end $$;
drop trigger if exists workflow_calendar_guard on public.workflow_phases;
create trigger workflow_calendar_guard before insert or update on public.workflow_phases for each row execute function public.workflow_phase_calendar_guard();

create or replace function public.workflow_task_calendar_guard() returns trigger
language plpgsql security definer set search_path=public as $$
declare w workflow_tracks; f workflow_phases; parent_start date; parent_due date; minimum date; maximum date; parent_id uuid; kind text;begin
  if tg_op='UPDATE' and new.start_date is not distinct from old.start_date and new.due_date is not distinct from old.due_date and new.workflow_phase_id is not distinct from old.workflow_phase_id and (to_jsonb(new)->>'project_id') is not distinct from (to_jsonb(old)->>'project_id') and (to_jsonb(new)->>'campaign_id') is not distinct from (to_jsonb(old)->>'campaign_id') then return new;end if;
  if new.workflow_phase_id is not null then
    select * into f from workflow_phases where id=new.workflow_phase_id for share;
    select * into w from workflow_tracks where id=f.workflow_id;
    kind:=w.entity_type; parent_id:=w.entity_id;
  elsif tg_table_name='campaign_subtasks' then kind:='campaign'; parent_id:=(to_jsonb(new)->>'campaign_id')::uuid;
  elsif (to_jsonb(new)->>'project_id') is not null then kind:='project'; parent_id:=(to_jsonb(new)->>'project_id')::uuid;
  else kind:='campaign'; parent_id:=(to_jsonb(new)->>'campaign_id')::uuid;
  end if;
  if parent_id is null then return new;end if;
  if kind='project' then select start_date,due_date into parent_start,parent_due from projects where id=parent_id for share;
  else select start_date,end_date into parent_start,parent_due from campaigns where id=parent_id for share;end if;
  minimum:=greatest(parent_start,f.start_date); maximum:=least(parent_due,f.due_date);
  if tg_op='INSERT' or new.workflow_phase_id is distinct from old.workflow_phase_id then
    new.start_date:=coalesce(new.start_date,minimum);
    new.due_date:=coalesce(new.due_date,maximum);
  end if;
  if minimum>maximum or new.start_date>new.due_date or new.start_date<minimum or new.due_date<minimum or new.start_date>maximum or new.due_date>maximum then
    raise exception 'Task dates must fit the phase and Project/Campaign calendar' using errcode='22023';
  end if;
  return new;
end $$;
do $$declare t text;begin
  foreach t in array array['tasks','project_subtasks','campaign_subtasks'] loop
    execute format('drop trigger if exists workflow_calendar_guard on public.%I',t);
    execute format('create trigger workflow_calendar_guard before insert or update on public.%I for each row execute function public.workflow_task_calendar_guard()',t);
  end loop;
end $$;
revoke all on function public.workflow_phase_calendar_guard(),public.workflow_task_calendar_guard() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
