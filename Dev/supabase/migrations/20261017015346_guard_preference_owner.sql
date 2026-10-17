-- A request queued for one account must not be written under another account
-- if the browser session changes before the network request is sent.
drop function if exists public.dashboard_set_ui_preference(text,jsonb,bigint);

create function public.dashboard_set_ui_preference(
  p_user_id bigint, p_key text, p_value jsonb, p_changed_ms bigint
)
returns void language plpgsql security invoker set search_path=public,pg_temp as $function$
declare
  actor_id bigint := public.workflow_actor();
  entry jsonb;
begin
  if actor_id is null or actor_id is distinct from p_user_id then
    raise exception 'Staff account required' using errcode='42501';
  end if;
  if p_key is null or p_key !~ '^[a-z][a-z0-9._:-]{0,79}$' then
    raise exception 'Invalid preference key' using errcode='22023';
  end if;
  if p_changed_ms is null or p_changed_ms < 0 or p_changed_ms > (extract(epoch from now()) * 1000)::bigint + 86400000 then
    raise exception 'Invalid preference timestamp' using errcode='22023';
  end if;
  if p_value is not null and length(p_value::text) > 16000 then
    raise exception 'Preference value too large' using errcode='22023';
  end if;
  entry := jsonb_build_object('value',p_value,'updatedAt',p_changed_ms);

  insert into public.user_preferences(user_id,ui_state,language,updated_at)
  values(actor_id,jsonb_build_object(p_key,entry),
    case when p_key='lang' and (p_value #>> '{}') in ('vi','en') then p_value #>> '{}' else 'vi' end,now())
  on conflict(user_id) do update set
    ui_state=case
      when coalesce((public.user_preferences.ui_state->p_key->>'updatedAt')::bigint,-1) > p_changed_ms
        then public.user_preferences.ui_state
      else jsonb_set(coalesce(public.user_preferences.ui_state,'{}'::jsonb),array[p_key],entry,true)
    end,
    language=case
      when p_key='lang' and (p_value #>> '{}') in ('vi','en')
       and coalesce((public.user_preferences.ui_state->p_key->>'updatedAt')::bigint,-1) <= p_changed_ms
      then p_value #>> '{}' else public.user_preferences.language
    end,
    updated_at=now();
end;
$function$;

revoke all on function public.dashboard_set_ui_preference(bigint,text,jsonb,bigint) from public,anon;
grant execute on function public.dashboard_set_ui_preference(bigint,text,jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
