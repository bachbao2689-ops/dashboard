-- Keep task and subtask comment edit times authoritative in the Develop DB.
-- Task comments already expose these fields in the current schema; IF NOT EXISTS
-- keeps this migration safe for older Dev snapshots as well.
alter table public.comments add column if not exists is_edited boolean not null default false;
alter table public.comments add column if not exists updated_at timestamptz;

create or replace function public.dashboard_mark_task_comment_edited()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'comments' then
    if new.body is distinct from old.body then
      new.is_edited := true;
      new.updated_at := transaction_timestamp();
    end if;
  elsif tg_table_name = 'activity_log'
    and new.action = 'comment'
    and old.action = 'comment'
    and new.metadata->>'body' is distinct from old.metadata->>'body' then
    new.new_value :=
      case when jsonb_typeof(new.new_value) = 'object' then new.new_value else '{}'::jsonb end
      || jsonb_build_object(
        'edited_at', transaction_timestamp(),
        'edit_count', (case when coalesce(old.new_value->>'edit_count', '') ~ '^[0-9]+$'
          then (old.new_value->>'edit_count')::integer else 0 end) + 1
      );
  end if;
  return new;
end;
$$;

revoke all on function public.dashboard_mark_task_comment_edited() from public, anon, authenticated;

drop trigger if exists dashboard_mark_task_comment_edited on public.comments;
create trigger dashboard_mark_task_comment_edited
before update on public.comments
for each row execute function public.dashboard_mark_task_comment_edited();

drop trigger if exists dashboard_mark_task_comment_edited on public.activity_log;
create trigger dashboard_mark_task_comment_edited
before update on public.activity_log
for each row execute function public.dashboard_mark_task_comment_edited();
