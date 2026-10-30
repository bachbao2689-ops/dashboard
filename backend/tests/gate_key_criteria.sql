-- Run through an administrative SQL connection. All fixtures and writes roll back.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

do $fixtures$
declare
  base bigint := -1000000000000 - floor(random() * 100000000)::bigint;
  workspace uuid := gen_random_uuid();
  project uuid := gen_random_uuid();
  track uuid;
  approved uuid := gen_random_uuid();
  active uuid := gen_random_uuid();
  cancelled uuid := gen_random_uuid();
  actors jsonb := '{}'::jsonb;
  names text[] := array['creator','parent_pic','phase_pic','sub_pic','outsider','admin','manager','inactive'];
  name text;
  auth uuid;
  index integer := 0;
  items jsonb := '[{"id":"review","label":"Review deliverables","weight":80,"checked":true,"note":"Preserve legacy metadata"},{"id":"handover","label":"Handover","weight":20,"checked":true}]';
begin
  foreach name in array names loop
    auth := gen_random_uuid();
    insert into public.users(id, name, email, role, employment_level, auth_id, is_active)
    values(base-index, 'Gate fixture '||name, auth::text||'@example.invalid',
      case when name in ('admin','manager') then name else 'member' end,
      case when name='manager' then 'Manager' else 'Nhân viên' end,
      auth, name<>'inactive');
    actors := actors || jsonb_build_object(name, jsonb_build_object('id',base-index,'auth',auth));
    index := index+1;
  end loop;
  insert into public.workspaces(id,name,slug,owner_id)
    values(workspace,'Gate fixture',workspace::text,base);
  insert into public.projects(id,workspace_id,name,created_by)
    values(project,workspace,'Gate fixture',base);
  insert into public.workflow_tracks(entity_type,entity_id) values('project',project)
    on conflict(entity_type,entity_id) do update set entity_id=excluded.entity_id returning id into track;
  insert into public.project_members(project_id,user_id,workflow_role)
    values(project,base-1,'pic');
  insert into public.workflow_phases(id,workflow_id,position,title,status,created_by,gate_criteria)
    values(approved,track,1,'Approved fixture','completed',base,items),
          (active,track,2,'Active fixture','in_progress',base,items),
          (cancelled,track,3,'Cancelled fixture','cancelled',base,items);
  insert into public.workflow_phase_members(phase_id,user_id,role)
    values(approved,base-2,'pic'),(approved,base-3,'sub_pic');
  perform set_config('gate_test.context',jsonb_build_object('actors',actors,'project',project,
    'approved',approved,'active',active,'cancelled',cancelled,'original',items)::text,true);
end $fixtures$;

set local role authenticated;
do $checks$
declare
  context jsonb := current_setting('gate_test.context')::jsonb;
  actors jsonb := context->'actors';
  phase uuid := (context->>'approved')::uuid;
  items jsonb;
  original jsonb := context->'original';
  expected_version integer;
  name text;
  invalid jsonb;
  tests integer := 0;
  found_phase jsonb;
begin
  -- Every existing editor can persist a star on an approved phase.
  foreach name in array array['creator','parent_pic','phase_pic','admin','manager'] loop
    perform set_config('request.jwt.claim.sub',actors->name->>'auth',true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors->name->>'auth','role','authenticated')::text,true);
    select f.gate_criteria,f.version into items,expected_version from public.workflow_phases f where id=phase;
    items := jsonb_set(items,'{0,starred}',to_jsonb(not coalesce((items->0->>'starred')::boolean,false)));
    perform public.workflow_update_gate(phase,items,expected_version);
    if not exists(select 1 from public.workflow_phases f where f.id=phase and f.gate_criteria=items
        and f.version=expected_version+1 and f.status='completed') then raise exception 'Editor % did not persist star',name;end if;
    tests := tests+1;
  end loop;

  -- A fresh, separately scoped read must include the saved star.
  perform set_config('request.jwt.claim.sub',actors->'parent_pic'->>'auth',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actors->'parent_pic'->>'auth','role','authenticated')::text,true);
  select p into found_phase from jsonb_array_elements(public.workflow_hub_index()) t,
    lateral jsonb_array_elements(t->'phases') p where p->>'id'=phase::text;
  if found_phase is null or found_phase->'gate_criteria'->0->>'starred'<>'true' then
    raise exception 'Fresh Workflow/Project read omitted persisted star';end if;
  tests := tests+1;

  -- Read-only sub-PIC, unrelated staff, inactive accounts and anonymous callers cannot mark criteria.
  foreach name in array array['sub_pic','outsider','inactive','anonymous'] loop
    perform set_config('request.jwt.claim.sub',coalesce(actors->name->>'auth',''),true);
    perform set_config('request.jwt.claims',case when name='anonymous' then '{}' else jsonb_build_object('sub',actors->name->>'auth','role','authenticated')::text end,true);
    begin
      perform public.workflow_update_gate(phase,original,1);
      raise exception 'Unauthorized actor % accepted',name using errcode='XX000';
    exception when insufficient_privilege then null;end;
    tests := tests+1;
  end loop;

  perform set_config('request.jwt.claim.sub',actors->'creator'->>'auth',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actors->'creator'->>'auth','role','authenticated')::text,true);
  select f.gate_criteria,f.version into items,expected_version from public.workflow_phases f where id=phase;

  -- Two clients cannot overwrite each other, including null-version requests.
  begin
    perform public.workflow_update_gate(phase,items,expected_version-1);
    raise exception 'Stale version accepted' using errcode='XX000';
  exception when serialization_failure then null;end;
  tests := tests+1;
  begin
    perform public.workflow_update_gate(phase,items,null);
    raise exception 'Null version accepted' using errcode='XX000';
  exception when serialization_failure then null;end;
  tests := tests+1;

  -- Closed phases allow only the star: no changes to checks, labels, weights, order, IDs or metadata.
  for invalid in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_set(items,'{0,checked}','false'),jsonb_set(items,'{0,label}','"Other label"'),
    jsonb_set(items,'{0,weight}','1'),jsonb_set(items,'{0,id}','"different"'),
    jsonb_set(items,'{0,note}','"Changed metadata"'),jsonb_build_array(items->1,items->0),
    items - 1,items||jsonb_build_array(jsonb_build_object('id','added','label','Added','weight',1,'checked',true)),
    jsonb_set(items,'{0,starred}','"false"'),jsonb_set(items,'{0,starred}','null'),
    'null'::jsonb,'{}'::jsonb
  )) loop
    begin
      perform public.workflow_update_gate(phase,invalid,expected_version);
      raise exception 'Invalid/closed checklist edit accepted' using errcode='XX000';
    exception when sqlstate 'P0001' then null;end;
    tests := tests+1;
  end loop;
  if not exists(select 1 from public.workflow_phases f where f.id=phase and f.gate_criteria=items and f.version=expected_version) then
    raise exception 'Rejected writes changed saved data';end if;
  tests := tests+1;

  perform public.workflow_update_gate(phase,items,expected_version);
  if (select f.version from public.workflow_phases f where id=phase)<>expected_version then
    raise exception 'No-op write incremented version';end if;
  tests := tests+1;

  -- Unmarking is persisted and immediately removed from a fresh hub read.
  items := jsonb_set(items,'{0,starred}','false');
  perform public.workflow_update_gate(phase,items,expected_version);
  select p into found_phase from jsonb_array_elements(public.workflow_hub_index()) t,
    lateral jsonb_array_elements(t->'phases') p where p->>'id'=phase::text;
  if found_phase->'gate_criteria'->0->>'starred' is distinct from 'false' then
    raise exception 'Unmark not reflected by shared read';end if;
  tests := tests+1;

  phase := (context->>'cancelled')::uuid;
  perform public.workflow_update_gate(phase,jsonb_set(original,'{0,starred}','true'),1);
  if not exists(select 1 from public.workflow_phases f where id=phase and status='cancelled' and gate_criteria->0->>'starred'='true') then
    raise exception 'Cancelled phase metadata did not persist';end if;
  tests := tests+1;

  phase := (context->>'active')::uuid;
  items := jsonb_set(original,'{0,checked}','false');
  perform public.workflow_update_gate(phase,items,1);
  if not exists(select 1 from public.workflow_phases f where id=phase and gate_criteria=items and status='in_progress') then
    raise exception 'Active gate checkbox stopped saving';end if;
  tests := tests+1;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename='workflow_phases') then raise exception 'Phase realtime not enabled';end if;
  tests := tests+1;

  perform set_config('gate_test.result',jsonb_build_object('passed',tests,'writes_rolled_back',true)::text,true);
end $checks$;
reset role;
select current_setting('gate_test.result')::jsonb as regression_result;
rollback;
