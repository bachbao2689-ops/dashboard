-- Persist who created/edited task rows and when, regardless of which Dashboard
-- surface performed the write. Notifications use the same transaction timestamp.
create or replace function public.dashboard_task_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id bigint := public.workflow_actor();
  kind text;
  workspace uuid;
  row_before jsonb := '{}'::jsonb;
  row_after jsonb := to_jsonb(new);
  old_fields jsonb := '{}'::jsonb;
  new_fields jsonb := '{}'::jsonb;
  changed text[] := '{}'::text[];
  field_name text;
  event_name text;
  event_source text;
  core_changed boolean := false;
  assignee_changed boolean := false;
  actor_name text;
begin
  kind := case tg_table_name
    when 'tasks' then 'task'
    when 'project_subtasks' then 'project_subtask'
    else 'campaign_subtask'
  end;

  if tg_table_name = 'tasks' then
    workspace := new.workspace_id;
  elsif tg_table_name = 'project_subtasks' then
    select p.workspace_id into workspace from public.projects p where p.id = new.project_id;
  else
    select c.workspace_id into workspace from public.campaigns c where c.id = new.campaign_id;
  end if;

  if actor_id is null or workspace is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    row_before := to_jsonb(old);
  end if;

  foreach field_name in array array[
    'title', 'description', 'priority', 'start_date', 'due_date', 'status',
    'workflow_status', 'completed_at', 'assignee_id', 'department_id', 'project_id',
    'campaign_id', 'workflow_phase_id', 'column_id'
  ] loop
    if tg_op = 'INSERT' or row_after->field_name is distinct from row_before->field_name then
      changed := array_append(changed, field_name);
      old_fields := old_fields || jsonb_build_object(field_name, row_before->field_name);
      new_fields := new_fields || jsonb_build_object(field_name, row_after->field_name);
    end if;
  end loop;

  if tg_op = 'UPDATE' and cardinality(changed) = 0 then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    core_changed := row_after->'title' is distinct from row_before->'title'
      or row_after->'description' is distinct from row_before->'description'
      or row_after->'priority' is distinct from row_before->'priority'
      or row_after->'start_date' is distinct from row_before->'start_date'
      or row_after->'due_date' is distinct from row_before->'due_date'
      or row_after->'status' is distinct from row_before->'status'
      or row_after->'workflow_status' is distinct from row_before->'workflow_status';
    assignee_changed := row_after->'assignee_id' is distinct from row_before->'assignee_id';
    event_name := case
      when (new.status in ('done', 'complete', 'completed') or new.workflow_status = 'completed')
        and not (coalesce(old.status, '') in ('done', 'complete', 'completed') or old.workflow_status = 'completed')
      then 'task_completed'
      else 'task_updated'
    end;
  else
    event_name := 'task_created';
  end if;

  select u.name into actor_name from public.users u where u.id = actor_id and u.is_active;

  insert into public.activity_log(
    workspace_id, user_id, entity_type, entity_id, action, old_value, new_value, metadata
  ) values (
    workspace, actor_id, kind, new.id,
    case when tg_op = 'INSERT' then 'task_created' else 'task_updated' end,
    case when tg_op = 'INSERT' then null else old_fields end,
    new_fields,
    jsonb_build_object(
      'source_table', tg_table_name,
      'task_ref', to_jsonb(new)->>'task_ref',
      'task_title', to_jsonb(new)->>'title',
      'changed_fields', to_jsonb(changed),
      'actor_name', actor_name,
      'recorded_at', transaction_timestamp()
    )
  );

  event_source := 'task-audit:' || tg_table_name || ':' || new.id::text || ':' || txid_current()::text;

  if tg_op = 'INSERT' then
    -- A task assignment notification already covers newly assigned tasks.
    -- Emit a creation event for unassigned work so it is visible to its owners.
    if new.assignee_id is null and new.created_at >= transaction_timestamp() then
      perform public.dashboard_emit_activity(kind, new.id, 'task_created', event_source, actor_id);
      update public.notifications n
      set created_at = new.created_at,
          message = coalesce(actor_name, 'Một thành viên') || ' đã tạo công việc: ' || coalesce(new.title, 'Task')
      where n.metadata->>'event_key' = event_source || ':task_created';
    end if;
  elsif not core_changed and not assignee_changed then
    -- The existing canonical trigger already emits core edits; assignment has
    -- its own trigger. This branch covers other meaningful task fields only.
    perform public.dashboard_emit_activity(kind, new.id, 'task_updated', event_source, actor_id);
    update public.notifications n
    set created_at = coalesce(new.updated_at, transaction_timestamp())
    where n.metadata->>'event_key' = event_source || ':task_updated';
  else
    -- Canonical edit/completion and assignment events share transaction time.
    update public.notifications n
    set created_at = coalesce(new.updated_at, transaction_timestamp())
    where n.metadata->>'event_key' in (
      (tg_table_name || ':' || new.id::text || ':' || txid_current()::text || ':' || event_name),
      ('assignment:' || kind || ':' || new.id::text || ':' || txid_current()::text || ':task_assigned')
    );
  end if;

  return new;
end;
$$;

revoke all on function public.dashboard_task_audit_event() from public, anon, authenticated;

drop trigger if exists dashboard_task_audit_event on public.tasks;
create trigger dashboard_task_audit_event
after insert or update on public.tasks
for each row execute function public.dashboard_task_audit_event();

drop trigger if exists dashboard_task_audit_event on public.project_subtasks;
create trigger dashboard_task_audit_event
after insert or update on public.project_subtasks
for each row execute function public.dashboard_task_audit_event();

drop trigger if exists dashboard_task_audit_event on public.campaign_subtasks;
create trigger dashboard_task_audit_event
after insert or update on public.campaign_subtasks
for each row execute function public.dashboard_task_audit_event();

-- Treat task-created notices as canonical Dashboard notifications in old-client
-- dedupe logic too.
create or replace function public.dashboard_notification_family(k text, t text, m text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when t in (
      'task_created', 'task_assigned', 'task_comment', 'task_completed', 'task_updated',
      'weekly_report', 'project_comment', 'campaign_comment', 'project_updated',
      'campaign_updated', 'project_completed', 'campaign_completed', 'project_assigned',
      'campaign_assigned'
    ) then t
    when m ilike '%subtask%' and m ilike '%giao%' then 'task_assigned'
    when m ilike '%subtask%' and m ilike '%hoàn thành%' then 'task_completed'
    when m ilike '%Task mới trong phase%' then 'task_assigned'
    when m ilike '%bình luận%' or m ilike '%nhắc%' then case when k in ('project','campaign') then k||'_comment' else 'task_comment' end
    when m ilike '%giao dự án%' then 'project_assigned'
    when m ilike '%giao chiến dịch%' then 'campaign_assigned'
    when m ilike '%hoàn thành%' and k in ('project','campaign') then k||'_completed'
    when m ilike '%cập nhật%' and k in ('project','campaign') then k||'_updated'
    else null
  end
$$;
revoke all on function public.dashboard_notification_family(text, text, text) from public, anon, authenticated;
