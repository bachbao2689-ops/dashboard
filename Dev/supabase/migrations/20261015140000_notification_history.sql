-- Keep notification history navigable after marking it read. Badges count unread only.
create index if not exists notifications_recipient_date on public.notifications(user_id,created_at desc,id);
create or replace function public.dashboard_notification_summary() returns jsonb
language sql stable security invoker set search_path=public as $$
 with me as (select id,lower(role) role,lower(coalesce(employment_level,'')) level from users where auth_id=auth.uid() and is_active),
 unread as (select n.* from notifications n join me on n.user_id=me.id where not n.is_read),
 counts as (select count(*) total,count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask')) tasks,
 count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask','workflow','workflow_track','workflow2')) workflow,
 count(*) filter(where entity_type in ('project','campaign','project_subtask','campaign_subtask')) projects,
 count(*) filter(where entity_type in ('profile','task','project','campaign','project_subtask','campaign_subtask','weekly_report')) profile,
 count(*) filter(where entity_type='department') departments from unread),
 recent as (select n.id,n.type,n.message,n.entity_type,n.entity_id,n.is_read,n.created_at from notifications n join me on n.user_id=me.id order by n.created_at desc,n.id limit 12)
 select jsonb_build_object('unread',total,'counts',jsonb_build_object('tasksCount',tasks,'workflowCount',workflow,'projectCount',projects,'profileCount',profile,'departmentCount',departments,
 'borrowCount',(select count(*) from borrow_requests b where b.approval_status='pending' and exists(select 1 from me where me.role in ('admin','manager') or me.level='manager' or b.requester_id=me.id))),
 'items',coalesce((select jsonb_agg(recent order by created_at desc,id) from recent),'[]'::jsonb)) from counts
$$;
revoke all on function public.dashboard_notification_summary() from public,anon;
grant execute on function public.dashboard_notification_summary() to authenticated;
