-- Migration: Fix ON DELETE behavior for users foreign key constraints
-- Prevents foreign key constraint errors when deleting staff/users in Supabase Table Editor

-- 1. workspaces.owner_id
ALTER TABLE IF EXISTS public.workspaces ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.workspaces DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;
ALTER TABLE IF EXISTS public.workspaces
  ADD CONSTRAINT workspaces_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. departments.head_id
ALTER TABLE IF EXISTS public.departments DROP CONSTRAINT IF EXISTS departments_head_id_fkey;
ALTER TABLE IF EXISTS public.departments
  ADD CONSTRAINT departments_head_id_fkey
  FOREIGN KEY (head_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. projects.created_by
ALTER TABLE IF EXISTS public.projects ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE IF EXISTS public.projects
  ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. tasks (assignee_id & created_by)
ALTER TABLE IF EXISTS public.tasks ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE IF EXISTS public.tasks
  ADD CONSTRAINT tasks_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE IF EXISTS public.tasks
  ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. assets.added_by
ALTER TABLE IF EXISTS public.assets ALTER COLUMN added_by DROP NOT NULL;
ALTER TABLE IF EXISTS public.assets DROP CONSTRAINT IF EXISTS assets_added_by_fkey;
ALTER TABLE IF EXISTS public.assets
  ADD CONSTRAINT assets_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 6. borrow_requests (requester_id, approved_by, return_confirmed_by)
ALTER TABLE IF EXISTS public.borrow_requests ALTER COLUMN requester_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.borrow_requests DROP CONSTRAINT IF EXISTS borrow_requests_requester_id_fkey;
ALTER TABLE IF EXISTS public.borrow_requests
  ADD CONSTRAINT borrow_requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.borrow_requests DROP CONSTRAINT IF EXISTS borrow_requests_approved_by_fkey;
ALTER TABLE IF EXISTS public.borrow_requests
  ADD CONSTRAINT borrow_requests_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.borrow_requests DROP CONSTRAINT IF EXISTS borrow_requests_return_confirmed_by_fkey;
ALTER TABLE IF EXISTS public.borrow_requests
  ADD CONSTRAINT borrow_requests_return_confirmed_by_fkey
  FOREIGN KEY (return_confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;
