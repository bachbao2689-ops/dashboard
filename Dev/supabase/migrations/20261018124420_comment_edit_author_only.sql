-- Apply the same author-only edit rule in every deployment environment.
DROP POLICY IF EXISTS dashboard_project_comments_edit ON public.project_comments;
DROP POLICY IF EXISTS workflow_write ON public.project_comments;
CREATE POLICY dashboard_project_comments_edit ON public.project_comments
  FOR UPDATE TO authenticated
  USING (author_id = (SELECT public.workflow_actor()) AND public.workflow_parent_access('project',project_id))
  WITH CHECK (author_id = (SELECT public.workflow_actor()) AND public.workflow_parent_access('project',project_id));
