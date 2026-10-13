begin;

-- Read the existing stores under the caller's RLS. No duplicate comment table.
create or replace function public.workflow_task_comment_counts(
  p_tasks uuid[] default '{}',
  p_project_subtasks uuid[] default '{}',
  p_campaign_subtasks uuid[] default '{}'
) returns table(task_key text,comment_count bigint,last_comment_at timestamptz)
language sql stable security invoker set search_path=public as $$
  select c.task_id::text,count(*),max(c.created_at)
  from public.comments c where c.task_id=any(p_tasks) group by c.task_id
  union all
  select (case a.entity_type when 'project_subtask' then 'ps-' else 'cs-' end)||a.entity_id::text,count(*),max(a.created_at)
  from public.activity_log a
  where a.action='comment' and (
    (a.entity_type='project_subtask' and a.entity_id=any(p_project_subtasks)) or
    (a.entity_type='campaign_subtask' and a.entity_id=any(p_campaign_subtasks))
  ) group by a.entity_type,a.entity_id;
$$;
revoke all on function public.workflow_task_comment_counts(uuid[],uuid[],uuid[]) from public,anon;
grant execute on function public.workflow_task_comment_counts(uuid[],uuid[],uuid[]) to authenticated;
create index if not exists activity_log_task_comments_lookup on public.activity_log(entity_type,entity_id,created_at,id) where action='comment' and entity_type in ('project_subtask','campaign_subtask');
notify pgrst,'reload schema';
commit;
