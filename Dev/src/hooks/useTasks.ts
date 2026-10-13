import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceRealtime } from './useWorkspaceRealtime';

export interface Task {
  id: string; task_ref: string; title: string; status: string; priority: string; due_date: string;
  start_date?: string; completed_at?: string; description?: string; project_id?: string; campaign_id?: string;
  department_id?: string; workflow_phase_id?: string; created_at?: string;
  workflow_status?: string | null;
  project?: { name: string }; campaign?: { name: string }; assignee_id?: string;
  assignee?: { id?: string; name: string; avatar_url: string }; department?: { name: string }; column?: { name: string };
}
// Read all visible pages. RLS is authoritative for department + invitation scope.
async function allRows(table: string, select: string) {
  const result: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(select).neq('status', 'deleted').neq('status', 'archived').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}
export function useTasks() {
  const profile = useAuthStore(state => state.profile);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const fetchTasks = async () => {
    const token = ++request.current;
    setLoading(true); setError(null);
    try {
      if (!profile) { setTasks([]); return; }
      const [real, projects, campaigns] = await Promise.all([
        allRows('tasks', 'id,task_ref,title,status,priority,due_date,start_date,completed_at,created_at,description,assignee_id,project_id,campaign_id,department_id,workflow_phase_id,workflow_status,project:project_id(name),campaign:campaign_id(name),assignee:assignee_id(id,name,avatar_url),department:department_id(name),column:column_id(name)'),
        allRows('project_subtasks', 'id,title,status,start_date,due_date,created_at,project_id,workflow_phase_id,workflow_status,projects(name,department_id),assignee:assignee_id(id,name,avatar_url)'),
        allRows('campaign_subtasks', 'id,title,status,start_date,due_date,created_at,campaign_id,workflow_phase_id,workflow_status,campaigns(name,department_id),assignee:assignee_id(id,name,avatar_url)')
      ]);
      const legacy = (items: any[], kind: 'project' | 'campaign') => items.map(s => ({
        id: `${kind === 'project' ? 'ps' : 'cs'}-${s.id}`, task_ref: '', title: s.title,
        status: s.status || 'todo', priority: 'medium', start_date: s.start_date, due_date: s.due_date, created_at: s.created_at, workflow_phase_id: s.workflow_phase_id, workflow_status: s.workflow_status,
        [`${kind}_id`]: s[`${kind}_id`], [kind]: s[`${kind}s`] ? { name: s[`${kind}s`].name } : null,
        assignee: s.assignee, assignee_id: s.assignee?.id, department_id: s[`${kind}s`]?.department_id
      }));
      if (token === request.current) setTasks([...real, ...legacy(projects, 'project'), ...legacy(campaigns, 'campaign')] as Task[]);
    } catch (err: any) {
      // Never substitute fixtures for real assignments after a request failure.
      if (token === request.current) { setTasks([]); setError(err.message || 'Không thể tải Tasks. Vui lòng thử lại.'); }
    } finally { if (token === request.current) setLoading(false); }
  };
  useEffect(() => {
    setTasks([]); void fetchTasks();
    return () => { request.current++; };
  }, [profile?.id, profile?.department_id, profile?.role]);
  useWorkspaceRealtime(['tasks', 'project_subtasks', 'campaign_subtasks', 'projects', 'campaigns', 'workflow_phase_members', 'project_members', 'campaign_members', 'comments'], fetchTasks, profile?.id);
  return { tasks, loading, error, refetch: fetchTasks };
}
