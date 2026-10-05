import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export type WorkspaceTask = {
  id: string;
  task_ref: string | null;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  assignee_id: string | null;
  assignee?: { id: string; name: string; avatar_url?: string | null } | null;
  department?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
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
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [assets, setAssets] = useState<WorkspaceData['assets']>([]);
  const [users, setUsers] = useState<WorkspaceData['users']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksResult, assetsResult, usersResult] = await Promise.all([
        supabase.from('tasks').select('id, task_ref, title, status, priority, due_date, start_date, created_at, assignee_id, assignee:assignee_id(id, name, avatar_url), department:department_id(id, name), project:project_id(id, name)').order('created_at', { ascending: false }),
        supabase.from('assets').select('id, asset_code, name, status, is_available, category:category_id(name)').order('asset_code'),
        supabase.from('users').select('id, name, avatar_url, role, employment_level, job_title, department:department_id(name)').eq('is_active', true).order('name'),
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
        setUsers((usersResult.data || []) as unknown as WorkspaceData['users']);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load workspace data');
    } finally {
      setLoading(false);
    }
  }, []);

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
