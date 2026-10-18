-- A Project manager must not delete another person's comment.
-- Task and activity_log DELETE policies already require the author.
DROP POLICY IF EXISTS dashboard_project_comments_delete ON public.project_comments;
DROP POLICY IF EXISTS workflow_delete ON public.project_comments;
CREATE POLICY dashboard_project_comments_delete ON public.project_comments
  FOR DELETE TO authenticated
  USING (author_id = (SELECT public.workflow_actor()));
