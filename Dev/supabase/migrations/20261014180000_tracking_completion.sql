begin;
alter table public.project_subtasks add column if not exists updated_at timestamptz, add column if not exists completed_at timestamptz;
alter table public.campaign_subtasks add column if not exists updated_at timestamptz, add column if not exists completed_at timestamptz;
create or replace function public.track_task_timestamps() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='INSERT' then
    new.updated_at := coalesce(new.updated_at,now());
    if lower(coalesce(new.status,'')) in ('done','completed','complete') then new.completed_at := coalesce(new.completed_at,now()); end if;
  else
    new.updated_at := now();
    if lower(coalesce(new.status,'')) in ('done','completed','complete') and lower(coalesce(old.status,'')) not in ('done','completed','complete') then
      new.completed_at := now();
    elsif lower(coalesce(new.status,'')) not in ('done','completed','complete') then
      new.completed_at := null;
    else
      new.completed_at := old.completed_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tracking_timestamps on public.tasks;
drop trigger if exists workflow_b_tracking_timestamps on public.tasks;
create trigger workflow_b_tracking_timestamps before insert or update on public.tasks for each row execute function public.track_task_timestamps();
drop trigger if exists tracking_timestamps on public.project_subtasks;
drop trigger if exists workflow_b_tracking_timestamps on public.project_subtasks;
create trigger workflow_b_tracking_timestamps before insert or update on public.project_subtasks for each row execute function public.track_task_timestamps();
drop trigger if exists tracking_timestamps on public.campaign_subtasks;
drop trigger if exists workflow_b_tracking_timestamps on public.campaign_subtasks;
create trigger workflow_b_tracking_timestamps before insert or update on public.campaign_subtasks for each row execute function public.track_task_timestamps();
notify pgrst,'reload schema';
commit;
