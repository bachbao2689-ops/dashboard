import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { readWorkspaceTasks } from '../services/workspaceTasks';
import { useWorkspaceRealtime } from './useWorkspaceRealtime';

export interface Task {
  id: string; task_ref: string; title: string; status: string; priority: string; due_date: string;
  start_date?: string; completed_at?: string; description?: string; project_id?: string; campaign_id?: string;
  department_id?: string; workspace_id?: string; workflow_phase_id?: string; created_at?: string; updated_at?: string;
  workflow_status?: string | null;
  project?: { id?: string; name: string }; campaign?: { id?: string; name: string }; assignee_id?: string;
  assignee?: { id?: string; name: string; avatar_url: string }; department?: { id?: string; name: string }; column?: { name: string };
}
export function useTasks() {
  const profile = useAuthStore(state => state.profile);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const loadedActor = useRef<number | null>(null);
  const fetchTasks = async () => {
    const token = ++request.current;
    setLoading(loadedActor.current !== profile?.id); setError(null);
    try {
      if (!profile) { setTasks([]); return; }
      const all = await readWorkspaceTasks();
      if (token === request.current) { loadedActor.current = profile.id; setTasks(all); }
    } catch (err: any) {
      // Never substitute fixtures for real assignments after a request failure.
      if (token === request.current) { setTasks([]); setError(err.message || 'Không thể tải Tasks. Vui lòng thử lại.'); }
    } finally { if (token === request.current) setLoading(false); }
  };
  useEffect(() => {
    loadedActor.current = null; setTasks([]); void fetchTasks();
    return () => { request.current++; };
  }, [profile?.id, profile?.department_id, profile?.role]);
  useWorkspaceRealtime(['tasks', 'project_subtasks', 'campaign_subtasks', 'projects', 'campaigns', 'workflow_phase_members', 'project_members', 'campaign_members', 'comments'], fetchTasks, profile?.id);
  return { tasks:loadedActor.current===profile?.id?tasks:[], loading, error, refetch: fetchTasks };
}
