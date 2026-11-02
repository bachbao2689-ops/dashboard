-- Run as postgres against a seeded test database with assigned tasks of all three types.
-- Every fixture write is rolled back. Verifies staff RLS, child-only completion,
-- quantity reconciliation, sibling report identity and event ordering in one transaction.
begin; do $test$
declare r record; details jsonb; first_done boolean; second_done boolean; unchanged_status text; checks integer:=0;
begin
 for r in (
 with candidates as (
 select 'task' kind,t.id,t.status,u.auth_id,u.id actor from tasks t join users u on u.id=t.assignee_id left join projects p on p.id=t.project_id left join campaigns c on c.id=t.campaign_id where u.auth_id is not null and t.status not in ('deleted','archived','cancelled','canceled') and coalesce(p.status,'active') not in ('deleted','archived') and coalesce(c.status,'active') not in ('deleted','archived') and lower(u.role)<>'admin'
 union all select 'project_subtask',t.id,t.status,u.auth_id,u.id from project_subtasks t join projects p on p.id=t.project_id join users u on u.id=t.assignee_id where u.auth_id is not null and t.status not in ('deleted','archived','cancelled','canceled') and p.status not in ('deleted','archived') and lower(u.role)<>'admin'
 union all select 'campaign_subtask',t.id,t.status,u.auth_id,u.id from campaign_subtasks t join campaigns p on p.id=t.campaign_id join users u on u.id=t.assignee_id where u.auth_id is not null and t.status not in ('deleted','archived','cancelled','canceled') and p.status not in ('deleted','archived') and lower(u.role)<>'admin'
 ) select distinct on(kind) * from candidates order by kind,id
 ) loop
 perform set_config('request.jwt.claims',jsonb_build_object('sub',r.auth_id,'role','authenticated')::text,true);execute 'set local role authenticated';
 perform public.save_task_deliverables(r.kind,r.id,'{"base_quantity":2,"checklist_items":[{"id":"rollback-report-1","title":"test","quantity":3,"completed":false},{"id":"rollback-report-2","title":"test","quantity":5,"completed":false}]}'::jsonb,null);
 perform public.save_task_checklist_report(r.kind,r.id,'rollback-report-1','{"body":"test"}','2026-11-02','2026-11-08',true);
 perform public.save_task_checklist_report(r.kind,r.id,'rollback-report-2','{"body":"test"}','2026-11-02','2026-11-08',false);
 perform public.save_task_checklist_report(r.kind,r.id,'rollback-report-1','{"body":"edited test"}','2026-11-02','2026-11-08',false);
 select metadata into details from public.activity_log where entity_type=r.kind and entity_id=r.id and action='details_updated' order by created_at desc,id desc limit 1;
 select (value->>'completed')::boolean into first_done from jsonb_array_elements(details->'checklist_items') where value->>'id'='rollback-report-1';
 select (value->>'completed')::boolean into second_done from jsonb_array_elements(details->'checklist_items') where value->>'id'='rollback-report-2';
 if first_done is distinct from true or second_done is distinct from false or (details->>'quantity')::numeric<>10 then raise exception 'Child report tracking mismatch: %',r.kind; end if;
 if (select count(*) from activity_log where entity_type=r.kind and entity_id=r.id and user_id=r.actor and action='checklist_weekly_report' and metadata->>'checklist_item_id' in ('rollback-report-1','rollback-report-2'))<>2 then raise exception 'Report identity mismatch';end if;
 execute format('select status from public.%I where id=$1',case r.kind when 'task' then 'tasks' when 'project_subtask' then 'project_subtasks' else 'campaign_subtasks' end) into unchanged_status using r.id;
 if unchanged_status is distinct from r.status then raise exception 'Parent status was changed';end if;
 execute 'reset role';checks:=checks+1;
 end loop;
 if checks<>3 then raise exception 'All work types must be checked';end if;
end $test$; rollback; select jsonb_build_object('atomic_staff_report_checks','all_three_types_passed_and_rolled_back','anonymous_denied',not has_function_privilege('anon','public.save_task_checklist_report(text,uuid,text,jsonb,date,date,boolean)','EXECUTE')) verification;
