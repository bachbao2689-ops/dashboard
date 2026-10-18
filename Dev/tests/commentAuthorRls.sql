-- Run only on Dev. Every fixture and DELETE is rolled back.
BEGIN;
DO $$
DECLARE
  author_record record;
  root_record record;
  parent_id uuid;
  fixture_id uuid;
  deleted_count integer;
BEGIN
  FOR author_record IN SELECT id,auth_id FROM public.users
    WHERE is_active AND auth_id IS NOT NULL ORDER BY id
  LOOP
    PERFORM set_config('request.jwt.claims',json_build_object('sub',author_record.auth_id,'role','authenticated')::text,true);
    SELECT p.id INTO parent_id FROM public.projects p
      WHERE public.workflow_parent_access('project',p.id)
        AND EXISTS (SELECT 1 FROM public.users u WHERE u.is_active AND u.auth_id IS NOT NULL
          AND u.id<>author_record.id AND public.workflow_root('project',p.id,u.id))
      LIMIT 1;
    EXIT WHEN parent_id IS NOT NULL;
  END LOOP;
  IF parent_id IS NULL THEN RAISE EXCEPTION 'No accessible Dev Project with a different root user for testing'; END IF;
  SELECT id,auth_id INTO root_record FROM public.users
    WHERE is_active AND auth_id IS NOT NULL AND id<>author_record.id
      AND public.workflow_root('project',parent_id,id) LIMIT 1;
  INSERT INTO public.project_comments(project_id,author_id,body)
    VALUES(parent_id,author_record.id,'comment_author_delete rollback test') RETURNING id INTO fixture_id;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims',json_build_object('sub',root_record.auth_id,'role','authenticated')::text,true);
  IF NOT public.workflow_root('project',parent_id) THEN RAISE EXCEPTION 'Expected Project root actor'; END IF;
  DELETE FROM public.project_comments WHERE id=fixture_id;
  GET DIAGNOSTICS deleted_count=ROW_COUNT;
  IF deleted_count<>0 THEN RAISE EXCEPTION 'Project root deleted another author comment'; END IF;

  PERFORM set_config('request.jwt.claims',json_build_object('sub',author_record.auth_id,'role','authenticated')::text,true);
  DELETE FROM public.project_comments WHERE id=fixture_id;
  GET DIAGNOSTICS deleted_count=ROW_COUNT;
  IF deleted_count<>1 THEN RAISE EXCEPTION 'Author could not delete own comment'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT 'PASS: Project root cannot delete another author comment; author can delete own; fixtures rolled back' AS result;
