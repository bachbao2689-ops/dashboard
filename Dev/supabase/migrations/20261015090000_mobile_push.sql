-- Push is opt-in, bound to the signed-in device/session, and fed by existing notifications.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create index if not exists notifications_recipient_unread_date on public.notifications(user_id,is_read,created_at desc);
create index if not exists comments_task_date on public.comments(task_id,created_at desc);
create index if not exists activity_entity_action_date on public.activity_log(entity_type,entity_id,action,created_at desc);

create or replace function public.dashboard_notification_summary() returns jsonb language sql stable security invoker set search_path=public as $$
 with me as (select id,lower(role) role,lower(coalesce(employment_level,'')) level from users where auth_id=auth.uid() and is_active),
 unread as (select n.* from notifications n join me on n.user_id=me.id where not n.is_read),
 counts as (select count(*) total,count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask')) tasks,
 count(*) filter(where entity_type in ('task','project_subtask','campaign_subtask','workflow','workflow_track','workflow2')) workflow,
 count(*) filter(where entity_type in ('project','campaign','project_subtask','campaign_subtask')) projects,
 count(*) filter(where entity_type in ('profile','task','project','campaign','project_subtask','campaign_subtask','weekly_report')) profile,
 count(*) filter(where entity_type='department') departments from unread),
 recent as (select id,type,message,entity_type,entity_id,created_at from unread order by created_at desc,id limit 12)
 select jsonb_build_object('unread',total,'counts',jsonb_build_object('tasksCount',tasks,'workflowCount',workflow,'projectCount',projects,'profileCount',profile,'departmentCount',departments,
 'borrowCount',(select count(*) from borrow_requests b where b.approval_status='pending' and exists(select 1 from me where me.role in ('admin','manager') or me.level='manager' or b.requester_id=me.id))),
 'items',coalesce((select jsonb_agg(recent order by created_at desc) from recent),'[]'::jsonb)) from counts
$$;
revoke all on function public.dashboard_notification_summary() from public,anon;
grant execute on function public.dashboard_notification_summary() to authenticated;

create table if not exists public.dashboard_push_config (
 id boolean primary key default true check(id), public_key text not null, private_key text not null,
 webhook_secret text not null, worker_url text not null, subject text not null,
 allowed_origins text[] not null, enabled boolean not null default false
);
alter table public.dashboard_push_config enable row level security;
revoke all on public.dashboard_push_config from anon,authenticated;
grant all on public.dashboard_push_config to service_role;

create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id bigint not null references public.users(id) on delete cascade,
 auth_id uuid not null,session_id uuid not null,endpoint text not null unique,
 p256dh text not null,auth text not null,origin text not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
grant all on public.push_subscriptions to service_role;
create index if not exists push_subscription_recipient on public.push_subscriptions(user_id);

create or replace function public.dashboard_push_public_config() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('publicKey',public_key,'enabled',enabled,'origins',allowed_origins) from dashboard_push_config where id and exists(select 1 from users where auth_id=auth.uid() and is_active)
$$;
create or replace function public.register_dashboard_push(p_endpoint text,p_p256dh text,p_auth text,p_origin text) returns uuid language plpgsql security definer set search_path=public as $$
 declare actor bigint;result uuid;session uuid;
 begin
 select id into actor from users where auth_id=auth.uid() and is_active;
 session:=nullif(auth.jwt()->>'session_id','')::uuid;
 if actor is null or session is null then raise exception 'Sign in again to enable notifications';end if;
 if not exists(select 1 from dashboard_push_config where id and enabled and p_origin=any(allowed_origins)) then raise exception 'Push not enabled for this environment';end if;
 if length(p_endpoint)>2000 or p_endpoint !~ '^https://(web\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)(:[0-9]+)?/'
 or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'Invalid push subscription';end if;
 insert into push_subscriptions(user_id,auth_id,session_id,endpoint,p256dh,auth,origin) values(actor,auth.uid(),session,p_endpoint,p_p256dh,p_auth,p_origin)
 on conflict(endpoint) do update set user_id=excluded.user_id,auth_id=excluded.auth_id,session_id=excluded.session_id,p256dh=excluded.p256dh,auth=excluded.auth,origin=excluded.origin,updated_at=now() returning id into result;
 return result;
 end $$;
create or replace function public.unregister_dashboard_push(p_endpoint text) returns void language sql security definer set search_path=public as $$
 delete from push_subscriptions where endpoint=p_endpoint and auth_id=auth.uid()
$$;
revoke all on function public.dashboard_push_public_config(),public.register_dashboard_push(text,text,text,text),public.unregister_dashboard_push(text) from public,anon;
grant execute on function public.dashboard_push_public_config(),public.register_dashboard_push(text,text,text,text),public.unregister_dashboard_push(text) to authenticated;

create table if not exists public.push_deliveries (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete cascade,
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 state text not null default 'pending',attempts integer not null default 0,next_attempt timestamptz not null default now(),
 lease_until timestamptz,last_status integer,created_at timestamptz not null default now(),sent_at timestamptz,
 unique(notification_id,subscription_id)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
grant all on public.push_deliveries to service_role;
create index if not exists push_delivery_pending on public.push_deliveries(next_attempt) where state in ('pending','sending');

create or replace function public.wake_dashboard_push() returns void language plpgsql security definer set search_path=public,extensions as $$
 declare cfg dashboard_push_config;
 begin
 select * into cfg from dashboard_push_config where id and enabled;
 if cfg.id is null or not exists(select 1 from push_deliveries where state in ('pending','sending') and next_attempt<=now() and (lease_until is null or lease_until<now())) then return;end if;
 perform net.http_post(url:=cfg.worker_url,headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',cfg.webhook_secret),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=10000);
 end $$;
revoke all on function public.wake_dashboard_push() from public,anon,authenticated;
grant execute on function public.wake_dashboard_push() to service_role;

create or replace function public.enqueue_dashboard_push() returns trigger language plpgsql security definer set search_path=public as $$
 begin
 if new.is_read then return new;end if;
 insert into push_deliveries(notification_id,subscription_id)
 select new.id,s.id from push_subscriptions s join users u on u.id=s.user_id and u.is_active and u.auth_id=s.auth_id
 join auth.sessions sess on sess.id=s.session_id and sess.user_id=s.auth_id
 join dashboard_push_config c on c.id and c.enabled and s.origin=any(c.allowed_origins) where s.user_id=new.user_id
 on conflict do nothing;
 perform wake_dashboard_push();return new;
 end $$;
drop trigger if exists notification_mobile_push on public.notifications;
create trigger notification_mobile_push after insert on public.notifications for each row execute function public.enqueue_dashboard_push();
revoke all on function public.enqueue_dashboard_push() from public,anon,authenticated;

-- Workflow already sends its own phase-task assignment. Cover normal assignments
-- and legacy subtasks here without creating a second notification for that path.
create or replace function public.notify_dashboard_assignment() returns trigger language plpgsql security definer set search_path=public as $$
 declare kind text;actor bigint;label text;
 begin
 if new.assignee_id is null then return new;end if;
 if tg_op='UPDATE' and new.assignee_id is not distinct from old.assignee_id then return new;end if;
 if tg_op='INSERT' and tg_table_name='tasks' and new.workflow_phase_id is not null then return new;end if;
 select id,name into actor,label from users where auth_id=auth.uid();
 if new.assignee_id=actor then return new;end if;
 kind:=case tg_table_name when 'tasks' then 'task' when 'project_subtasks' then 'project_subtask' else 'campaign_subtask' end;
 insert into notifications(user_id,type,entity_type,entity_id,message) values(new.assignee_id,'task_assigned',kind,new.id,coalesce(label,'Leader')||' giao bạn công việc: '||new.title);
 return new;
 end $$;
revoke all on function public.notify_dashboard_assignment() from public,anon,authenticated;
drop trigger if exists mobile_task_assignment on public.tasks;
create trigger mobile_task_assignment after insert or update of assignee_id on public.tasks for each row execute function public.notify_dashboard_assignment();
drop trigger if exists mobile_task_assignment on public.project_subtasks;
create trigger mobile_task_assignment after insert or update of assignee_id on public.project_subtasks for each row execute function public.notify_dashboard_assignment();
drop trigger if exists mobile_task_assignment on public.campaign_subtasks;
create trigger mobile_task_assignment after insert or update of assignee_id on public.campaign_subtasks for each row execute function public.notify_dashboard_assignment();

create or replace function public.claim_dashboard_push() returns jsonb language plpgsql security definer set search_path=public as $$
 declare result jsonb;
 begin
 -- Old/read notifications and signed-out devices never receive queued messages.
 update push_deliveries d set state='skipped' where d.state in ('pending','sending') and
 (d.created_at<now()-interval '24 hours' or not exists(select 1 from notifications n join push_subscriptions s on s.id=d.subscription_id and s.user_id=n.user_id
 join users u on u.id=s.user_id and u.is_active and u.auth_id=s.auth_id join auth.sessions sess on sess.id=s.session_id and sess.user_id=s.auth_id
 join dashboard_push_config c on c.id and c.enabled and s.origin=any(c.allowed_origins) where n.id=d.notification_id and not n.is_read));
 with picked as (select id from push_deliveries where state in ('pending','sending') and attempts<5 and next_attempt<=now() and (lease_until is null or lease_until<now()) order by created_at limit 30 for update skip locked),
 leased as (update push_deliveries d set state='sending',attempts=attempts+1,lease_until=now()+interval '90 seconds' from picked where picked.id=d.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'subscriptionId',s.id,'origin',s.origin,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)),
 'notification',jsonb_build_object('id',n.id,'type',n.type,'message',n.message,'entity_type',n.entity_type,'entity_id',n.entity_id))),'[]'::jsonb) into result from leased d join push_subscriptions s on s.id=d.subscription_id join notifications n on n.id=d.notification_id;
 return result;
 end $$;
create or replace function public.finish_dashboard_push(p_id uuid,p_status integer) returns void language plpgsql security definer set search_path=public as $$
 begin
 if p_status in (404,410) then delete from push_subscriptions where id=(select subscription_id from push_deliveries where id=p_id);return;end if;
 update push_deliveries set state=case when p_status between 200 and 299 then 'sent' when attempts>=5 or p_status in (400,401,403,413) then 'failed' else 'pending' end,
 sent_at=case when p_status between 200 and 299 then now() else null end,last_status=p_status,lease_until=null,next_attempt=now()+make_interval(secs=>least(3600,30*(2^attempts)::integer)) where id=p_id and state='sending';
 end $$;
revoke all on function public.claim_dashboard_push(),public.finish_dashboard_push(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_dashboard_push(),public.finish_dashboard_push(uuid,integer) to service_role;

-- Minute retry is independent of whether a Dashboard browser is open.
select cron.schedule('dashboard-push-retry','* * * * *','select public.wake_dashboard_push()');
notify pgrst,'reload schema';
