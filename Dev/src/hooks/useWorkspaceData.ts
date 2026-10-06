import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export type WorkspaceTask = {
  id: string;
  task_ref: string | null;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string | null;
  assignee_id: string | null;
  assignee?: { id: string; name: string; avatar_url?: string | null } | null;
  department?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  campaign?: { id: string; name: string } | null;
};

export type WorkspaceData = {
  tasks: WorkspaceTask[];
  assets: Array<{ id: string; asset_code: string; name: string; status: string; is_available: boolean; category?: { name: string } | null }>;
  users: Array<{ id: string; name: string; avatar_url?: string | null; role?: string | null; employment_level?: string | null; job_title?: string | null; department?: { name: string } | null }>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useWorkspaceData(): WorkspaceData {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [assets, setAssets] = useState<WorkspaceData['assets']>([]);
  const [users, setUsers] = useState<WorkspaceData['users']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isDevAdmin = user?.id === 'dev-admin-id';
      // Do not run unfiltered workspace queries during authentication/profile
      // hydration. A leader must only receive records from their department.
      if (!profile && !isDevAdmin) {
        setTasks([]);
        setUsers([]);
        setAssets([]);
        return;
      }

      const canViewAllDepartments = true;
      if (!canViewAllDepartments && !profile?.department_id) {
        setTasks([]);
        setUsers([]);
        setAssets([]);
        return;
      }
      const departmentId = profile?.department_id;
      let taskQuery = supabase.from('tasks').select('id, task_ref, title, status, priority, due_date, start_date, created_at, updated_at, assignee_id, assignee:assignee_id(id, name, avatar_url), department:department_id(id, name), project:project_id(id, name), campaign:campaign_id(id,name)').order('created_at', { ascending: false });
      let userQuery = supabase.from('users').select('id, name, avatar_url, role, employment_level, job_title, department_id').eq('is_active', true).order('name');
      if (!canViewAllDepartments) {
        taskQuery = taskQuery.eq('department_id', departmentId!);
        userQuery = userQuery.eq('department_id', departmentId!);
      }
      const [tasksResult, assetsResult, usersResult, departmentsResult] = await Promise.all([
        taskQuery,
        supabase.from('assets').select('id, asset_code, name, status, is_available, category:category_id(name)').order('asset_code'),
        userQuery,
        supabase.from('departments').select('id, name'),
      ]);
      if (tasksResult.error) throw tasksResult.error;
      const liveTasks = (tasksResult.data || []) as unknown as WorkspaceTask[];
      setTasks(liveTasks);
      setAssets(assetsResult.error ? [] : (assetsResult.data || []) as unknown as WorkspaceData['assets']);
      if (usersResult.error) {
        // Profile fields can be unavailable briefly after a schema migration. Keep the
        // dashboard functional using the assignee relation already returned with tasks.
        const assignees = new Map<string, WorkspaceData['users'][number]>();
        liveTasks.forEach(task => {
          const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
          if (assignee?.id) assignees.set(String(assignee.id), { id: String(assignee.id), name: assignee.name, avatar_url: assignee.avatar_url });
        });
        setUsers([...assignees.values()]);
        setError(`Profile details are temporarily unavailable: ${usersResult.error.message}`);
      } else {
        const departmentNames = new Map(((departmentsResult.data || []) as any[]).map(d => [d.id, d.name]));
        setUsers(((usersResult.data || []) as any[]).map(u => ({
          ...u,
          department: u.department_id ? { name: departmentNames.get(u.department_id) || 'Chưa cập nhật team' } : null,
        })) as unknown as WorkspaceData['users']);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load workspace data');
    } finally {
      setLoading(false);
    }
  }, [profile?.department_id, profile?.role, user?.id]);

  useEffect(() => {
    refetch();
    const channel = supabase.channel('workspace-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  return { tasks, assets, users, loading, error, refetch };
}
