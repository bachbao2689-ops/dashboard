begin;

-- The star is shared phase metadata, including after Gate approval. It must
-- never unlock or change the approved checklist, weights or phase status.
create or replace function public.workflow_update_gate(
  p_phase uuid, p_items jsonb, p_expected integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  phase public.workflow_phases;
  previous_checklist jsonb;
  next_checklist jsonb;
begin
  if public.workflow_actor() is null
     or not public.workflow_phase_access(p_phase, true) then
    raise exception 'Phase access denied' using errcode = '42501';
  end if;

  select * into phase from public.workflow_phases where id = p_phase for update;
  if not found then
    raise exception 'Phase not found';
  end if;
  if p_expected is null or phase.version is distinct from p_expected then
    raise exception 'Phase changed. Refresh before saving.' using errcode = '40001';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid gate checklist';
  end if;
  perform public.workflow_validate_gate(p_items);
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where item ? 'starred' and jsonb_typeof(item->'starred') <> 'boolean'
  ) then
    raise exception 'Invalid key criterion mark';
  end if;

  if phase.status in ('completed', 'cancelled') then
    select coalesce(jsonb_agg(item - 'starred' order by position), '[]'::jsonb)
      into previous_checklist
      from jsonb_array_elements(phase.gate_criteria) with ordinality as entries(item, position);
    select coalesce(jsonb_agg(item - 'starred' order by position), '[]'::jsonb)
      into next_checklist
      from jsonb_array_elements(p_items) with ordinality as entries(item, position);
    if previous_checklist is distinct from next_checklist then
      raise exception 'Reopen the phase before editing its gate';
    end if;
  end if;

  if phase.gate_criteria is distinct from p_items then
    update public.workflow_phases
    set gate_criteria = p_items, version = version + 1, updated_at = now()
    where id = p_phase;
  end if;
end;
$function$;

commit;
