-- User explicitly approved Official Web Push activation on 15/10/2026.
-- Retain Develop and the existing VAPID keys/device registrations.
do $$ begin
 if not exists(select 1 from public.dashboard_push_config where id) then
  raise exception 'Configure dashboard_push_config before enabling Official';
 end if;
 update public.dashboard_push_config
 set enabled=true,allowed_origins=array(
  select distinct value from unnest(allowed_origins||array['https://dashboard-nu-tan-30.vercel.app']) as value
 ) where id;
end $$;
