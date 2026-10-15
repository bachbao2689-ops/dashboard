set local lock_timeout='3s';
-- The canonical policies cover these identical/subset legacy predicates.
-- Keep one SELECT/INSERT/UPDATE/DELETE policy to avoid evaluating both.
drop policy if exists workflow_read on public.project_comments;
drop policy if exists workflow_create on public.project_comments;
drop policy if exists workflow_write on public.project_comments;
drop policy if exists workflow_delete on public.project_comments;
