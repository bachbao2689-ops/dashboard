-- Expand allowed origins for push notifications to include develop and local environments.
do $$ begin
 if exists(select 1 from public.dashboard_push_config where id) then
  update public.dashboard_push_config
  set allowed_origins = array(
   select distinct value from unnest(
    allowed_origins || array[
     'https://dashboard-nu-tan-30.vercel.app',
     'https://dashboard-bart-c8ff.vercel.app',
     'https://dashboard-git-develop-bart-c8ff.vercel.app',
     'https://dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app',
     'http://localhost:5173',
     'http://localhost:3000'
    ]
   ) as value
  ) where id;
 end if;
end $$;
