-- Workflow ownership regression. Run the entire file in one database session.
-- Intended for Supabase execute_sql or psql on either isolated environment.
-- Every fixture, existing-user role override, and notification is rolled back.
-- To validate an unapplied migration, place its SQL immediately after BEGIN.
begin;
set local statement_timeout = '60s';
set local plpgsql.check_asserts = on;

do $regression$
declare
  fixture_users bigint[];
  fixture_auth uuid[];
  deps uuid[];
  space uuid;
  creator_id bigint;
  pic_id bigint;
  phase_pic_id bigint;
  assignee_id bigint;
  sub_pic_id bigint;
  mentioned_id bigint;
  outsider_id bigint;
  kind text;
  parent_id uuid;
  track_id uuid;
  phases uuid[];
  phase_id uuid;
  phase_version integer;
  empty_id uuid;
  task_id uuid;
  owner_task uuid;
  phase_tasks uuid[];
  legacy_id uuid;
  next_id uuid;
  index_track jsonb;
  phase_data jsonb;
  owner_index integer;
  i integer;
  j integer;
  affected integer;
  assertions integer := 0;
  rejected boolean;
  checked_statement text;
  checked_label text;
begin
  select array_agg(id order by ordinal), array_agg(auth_id order by ordinal)
    into fixture_users, fixture_auth
  from (
    select id, auth_id, row_number() over (order by id) ordinal
    from public.users where auth_id is not null and is_active
    order by id limit 7
  ) fixture;
  assert (cardinality(fixture_users) = 7), 'Seven active authenticated fixture users are required';
    assertions := assertions + 1;
  select array_agg(id order by id) into deps
    from (select id from public.departments order by id limit 2) fixture;
  assert (cardinality(deps) = 2), 'Two existing departments are required';
    assertions := assertions + 1;
  select id into space from public.workspaces order by id limit 1;
  assert (space is not null), 'An existing workspace is required';
    assertions := assertions + 1;

  creator_id := fixture_users[1];
  pic_id := fixture_users[2];
  phase_pic_id := fixture_users[3];
  assignee_id := fixture_users[4];
  sub_pic_id := fixture_users[5];
  mentioned_id := fixture_users[6];
  outsider_id := fixture_users[7];

  -- Ordinary staff, including a parent PIC in a different department, must
  -- receive ownership through the relationship rather than global role scope.
  update public.users set role = 'staff', employment_level = 'Staff',
    department_id = case when id in (pic_id, outsider_id) then deps[2] else deps[1] end
  where id = any(fixture_users);

  foreach kind in array array['project', 'campaign'] loop
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', fixture_auth[1]::text, true);
    if kind = 'project' then
      insert into public.projects(name, workspace_id, department_id, created_by,
        status, start_date, due_date)
      values ('[QA rollback] creator and PIC ownership', space, deps[1], creator_id,
        'active', '2026-10-01', '2026-10-31') returning id into parent_id;
      insert into public.project_members(project_id, user_id, workflow_role)
        values (parent_id, pic_id, 'pic');
    else
      insert into public.campaigns(name, workspace_id, department_id, created_by,
        lead_id, status, start_date, end_date)
      values ('[QA rollback] creator and PIC ownership', space, deps[1], creator_id,
        pic_id, 'planning', '2026-10-01', '2026-10-31') returning id into parent_id;
      insert into public.campaign_members(campaign_id, user_id, workflow_role)
        values (parent_id, pic_id, 'pic');
    end if;
    select id into track_id from public.workflow_tracks
      where entity_type = kind and entity_id = parent_id;
    assert (track_id is not null), kind || ': linked track exists';
    assertions := assertions + 1;

    phases := '{}';
    phase_tasks := '{}';
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[1])::text, true);
    execute 'set local role authenticated';
    for i in 1..2 loop
      phase_data := jsonb_build_object(
        'title', 'Ownership phase ' || i,
        'status', 'todo', 'start_date', '2026-10-01', 'due_date', '2026-10-31',
        'pic_ids', jsonb_build_array(phase_pic_id),
        'sub_pic_ids', case when i = 1 then jsonb_build_array(assignee_id, sub_pic_id)
          else '[]'::jsonb end,
        'gate_criteria', jsonb_build_array(jsonb_build_object(
          'id', 'accepted', 'label', 'Acceptance confirmed', 'weight', 100, 'checked', false)));
      select public.workflow_configure_phase(track_id, null, phase_data, 0) into phase_id;
      phases := array_append(phases, phase_id);
    end loop;
    assert (not exists (
      select 1 from public.workflow_phase_members member
      where member.phase_id = any(phases) and member.user_id in (creator_id, pic_id))), kind || ': neither parent owner is a phase member';
    assertions := assertions + 1;

    -- Each owner can see and configure both phases without being phase PIC.
    for owner_index in 1..2 loop
      execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[owner_index])::text, true);
    execute 'set local role authenticated';
      assert (public.workflow_root(kind, parent_id)), kind || ': owner ' || owner_index || ' keeps full root access';
    assertions := assertions + 1;
      assert ((select count(*) from public.workflow_phases
        where workflow_id = track_id) = 2), kind || ': owner ' || owner_index || ' sees every phase';
    assertions := assertions + 1;
      select entry into index_track from jsonb_array_elements(public.workflow_hub_index()) entry
        where entry->>'id' = track_id::text;
      assert ((index_track->>'root')::boolean), kind || ': owner root flag survives the hub RPC';
    assertions := assertions + 1;
      assert (index_track->'creator'->>'id' = creator_id::text), kind || ': hub retains creator when a distinct primary PIC exists';
    assertions := assertions + 1;
      assert (jsonb_array_length(index_track->'phases') = 2
        and not exists (select 1 from jsonb_array_elements(index_track->'phases') entry
          where (entry->>'can_edit_tasks')::boolean is distinct from true)), kind || ': all owner phases permit task editing through the hub RPC';
    assertions := assertions + 1;

      phase_data := jsonb_build_object('title', 'Owner temporary phase', 'status', 'todo',
        'start_date', '2026-10-01', 'due_date', '2026-10-31',
        'pic_ids', jsonb_build_array(phase_pic_id), 'sub_pic_ids', '[]'::jsonb,
        'gate_criteria', '[]'::jsonb);
      select public.workflow_configure_phase(track_id, null, phase_data, 0) into empty_id;
      assert (empty_id is not null), kind || ': owner ' || owner_index || ' adds a phase';
    assertions := assertions + 1;
      select version into phase_version from public.workflow_phases where id = empty_id;
      perform public.workflow_configure_phase(track_id, empty_id,
        phase_data || jsonb_build_object('title', 'Updated owner phase'), phase_version);
      assert ((select title from public.workflow_phases where id = empty_id)
        = 'Updated owner phase'), kind || ': owner updates a phase';
    assertions := assertions + 1;
      select version into phase_version from public.workflow_phases where id = empty_id;
      perform public.workflow_remove_phase(empty_id, phase_version);
      assert (not exists (select 1 from public.workflow_phases where id = empty_id)), kind || ': owner removes an empty phase';
    assertions := assertions + 1;

      select public.workflow_create_task(phases[owner_index], jsonb_build_object(
        'title', 'Parent owner self assignment', 'assignee_id', fixture_users[owner_index],
        'priority', 'medium', 'start_date', '2026-10-03', 'due_date', '2026-10-20')) into owner_task;
      assert ((select task.assignee_id from public.tasks task where task.id = owner_task)
        = fixture_users[owner_index]), kind || ': owner can self assign without phase membership';
    assertions := assertions + 1;
      checked_statement := format(
        'update public.tasks set status = %L where id = %L::uuid', 'deleted', owner_task);
      checked_label := kind || ': owner removes a task through its existing soft delete state';
      execute checked_statement;
      get diagnostics affected = row_count;
      assert affected = 1, checked_label;
      assertions := assertions + 1;
    end loop;

    -- Create work as the separate phase PIC so parent owners are neither its
    -- creator nor assignee; their edits must rely on parent Workflow ownership.
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[3])::text, true);
    execute 'set local role authenticated';
    for i in 1..2 loop
      select public.workflow_create_task(phases[i], jsonb_build_object(
        'title', 'Other phase PIC work ' || i, 'assignee_id', phase_pic_id,
        'priority', 'medium', 'start_date', '2026-10-03', 'due_date', '2026-10-20')) into task_id;
      phase_tasks := array_append(phase_tasks, task_id);
    end loop;
    select public.workflow_create_task(phases[1], jsonb_build_object(
      'title', 'Assigned staff work', 'assignee_id', assignee_id,
      'priority', 'medium', 'start_date', '2026-10-03', 'due_date', '2026-10-20')) into task_id;
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[1])::text, true);
    execute 'set local role authenticated';
    insert into public.comments(task_id, author_id, body, mentions)
      values (task_id, creator_id, '[QA rollback] explicit mention', array[mentioned_id]);

    for j in 4..5 loop
      execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[j])::text, true);
    execute 'set local role authenticated';
      assert (not public.workflow_root(kind, parent_id)), kind || ': scoped participant is not promoted to parent owner';
    assertions := assertions + 1;
      assert (not exists (select 1 from public.workflow_phases where id = phases[2])), kind || ': scoped participant cannot see unrelated phase';
    assertions := assertions + 1;
      checked_statement := format(
        'select public.workflow_configure_phase(%L::uuid, null, %L::jsonb, 0)',
        track_id, phase_data::text);
      checked_label := kind || ': scoped participant cannot add a phase';
      rejected := false;
      begin
        execute checked_statement;
      exception when insufficient_privilege then
        rejected := true;
      end;
      assert rejected, checked_label;
      assertions := assertions + 1;
      select version into phase_version from public.workflow_phases where id = phases[1];
      checked_statement := format(
        'select public.workflow_advance_phase(%L::uuid, %s)', phases[1], phase_version);
      checked_label := kind || ': scoped participant cannot approve a gate';
      rejected := false;
      begin
        execute checked_statement;
      exception when insufficient_privilege then
        rejected := true;
      end;
      assert rejected, checked_label;
      assertions := assertions + 1;
      checked_statement := format(
        'select public.workflow_remove_phase(%L::uuid, %s)', phases[1], phase_version);
      checked_label := kind || ': scoped participant cannot remove a phase';
      rejected := false;
      begin
        execute checked_statement;
      exception when insufficient_privilege then
        rejected := true;
      end;
      assert rejected, checked_label;
      assertions := assertions + 1;
      update public.tasks set title = 'Unauthorized unrelated phase edit' where id = phase_tasks[2];
      get diagnostics affected = row_count;
      assert (affected = 0), kind || ': scoped participant cannot edit unrelated phase task';
    assertions := assertions + 1;
    end loop;

    execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[4])::text, true);
    execute 'set local role authenticated';
    checked_statement := format(
      'update public.tasks set workflow_status = %L where id = %L::uuid', 'completed', task_id);
      checked_label := kind || ': assigned staff can still complete their own task';
      execute checked_statement;
      get diagnostics affected = row_count;
      assert affected = 1, checked_label;
      assertions := assertions + 1;
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[6])::text, true);
    execute 'set local role authenticated';
    assert (exists (select 1 from public.tasks where id = task_id)), kind || ': mentioned staff sees the explicitly mentioned task';
    assertions := assertions + 1;
    -- Existing phase-context reads stay unchanged. The mention must never
    -- authorize editing sibling tasks, even when those rows are readable.
    update public.tasks set title = 'Unauthorized sibling edit' where id = phase_tasks[1];
    get diagnostics affected = row_count;
    assert (affected = 0), kind || ': mention cannot edit another task in the same phase';
    assertions := assertions + 1;
    assert (not exists (select 1 from public.workflow_phases where id = phases[2])), kind || ': mention does not expose another phase';
    assertions := assertions + 1;
    update public.tasks set title = 'Unauthorized mentioned edit' where id = task_id;
    get diagnostics affected = row_count;
    assert (affected = 0), kind || ': mention remains read only';
    assertions := assertions + 1;
    checked_statement := format(
      'select public.workflow_create_task(%L::uuid, %L::jsonb)', phases[1],
      jsonb_build_object('title', 'Mention escalation', 'assignee_id', mentioned_id)::text);
      checked_label := kind || ': mention cannot create a phase task';
      rejected := false;
      begin
        execute checked_statement;
      exception when insufficient_privilege then
        rejected := true;
      end;
      assert rejected, checked_label;
      assertions := assertions + 1;

    execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[7])::text, true);
    execute 'set local role authenticated';
    assert (not public.workflow_root(kind, parent_id)), kind || ': outsider has no root';
    assertions := assertions + 1;
    assert (not exists (select 1 from public.workflow_tracks where id = track_id)), kind || ': outsider has no track access';
    assertions := assertions + 1;

    -- Both creator and primary PIC can edit/complete canonical and legacy work.
    for owner_index in 1..2 loop
      execute 'reset role';
    perform set_config('request.jwt.claim.sub', (fixture_auth[owner_index])::text, true);
    execute 'set local role authenticated';
      checked_statement := format(
        'update public.tasks set title = %L, workflow_status = %L where id = %L::uuid',
        'Edited by parent owner ' || owner_index, 'completed', phase_tasks[owner_index]);
      checked_label := kind || ': parent owner edits and completes another phase PIC task';
      execute checked_statement;
      get diagnostics affected = row_count;
      assert affected = 1, checked_label;
      assertions := assertions + 1;
      execute format('insert into public.%I(%I, title, assignee_id, status) values ($1,$2,$3,$4) returning id',
        kind || '_subtasks', kind || '_id')
        into legacy_id using parent_id, '[QA rollback] legacy task', phase_pic_id, 'todo';
      perform public.workflow_link_task(phases[owner_index], legacy_id, kind || '_subtask');
      checked_statement := format(
        'update public.%I set title = %L, status = %L where id = %L::uuid',
        kind || '_subtasks', 'Legacy owner completion', 'completed', legacy_id);
      checked_label := kind || ': parent owner edits and completes linked legacy work';
      execute checked_statement;
      get diagnostics affected = row_count;
      assert affected = 1, checked_label;
      assertions := assertions + 1;
      select version into phase_version from public.workflow_phases where id = phases[owner_index];
      perform public.workflow_update_gate(phases[owner_index], jsonb_build_array(jsonb_build_object(
        'id', 'accepted', 'label', 'Acceptance confirmed', 'weight', 100, 'checked', true)), phase_version);
      select version into phase_version from public.workflow_phases where id = phases[owner_index];
      select public.workflow_advance_phase(phases[owner_index], phase_version) into next_id;
      assert ((select status from public.workflow_phases where id = phases[owner_index])
        = 'completed'), kind || ': parent owner confirms phase completion';
    assertions := assertions + 1;
      if owner_index = 1 then
        assert (next_id = phases[2]
          and (select status from public.workflow_phases where id = phases[2]) = 'in_progress'), kind || ': creator approval starts the next phase atomically';
    assertions := assertions + 1;
      else
        assert (next_id is null), kind || ': primary PIC completes the final phase';
    assertions := assertions + 1;
      end if;
    end loop;
  end loop;
  execute 'reset role';
  perform set_config('kcoffee.owner_assertions', assertions::text, true);
end
$regression$;

select current_setting('kcoffee.owner_assertions')::integer as workflow_owner_assertions,
  'Passed; all fixture writes are rolled back by this script.' as result;
rollback;
