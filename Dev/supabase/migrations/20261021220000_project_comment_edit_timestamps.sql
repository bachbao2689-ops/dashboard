-- Persist an authoritative edit timestamp for project-root chat comments.
alter table public.project_comments
  add column if not exists edited_at timestamptz;

create or replace function public.dashboard_mark_project_comment_edited()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := transaction_timestamp();
  end if;
  return new;
end;
$$;

revoke all on function public.dashboard_mark_project_comment_edited() from public, anon, authenticated;

drop trigger if exists dashboard_mark_project_comment_edited on public.project_comments;
create trigger dashboard_mark_project_comment_edited
before update on public.project_comments
for each row execute function public.dashboard_mark_project_comment_edited();
