import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export interface PersonalTask {
  id: string;
  task_ref: string | null;
  title: string;
  status: string | null;
  priority: string | null;
  description: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project?: { id?: string; name?: string | null } | null;
}

export interface PersonalBorrowRequest {
  id: string;
  approval_status: string | null;
  requested_at: string | null;
  created_at: string;
  asset?: { name?: string | null } | null;
}

const isDone = (status?: string | null) => ['done', 'completed', 'complete', 'cancelled', 'canceled'].includes((status || '').toLowerCase());

export function useProfileWorkload() {
  const profileId = useAuthStore(state => state.profile?.id);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<PersonalBorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!profileId) {
        if (active) { setTasks([]); setBorrowRequests([]); setLoading(false); }
        return;
      }
      setLoading(true);
      const [taskResult, borrowResult] = await Promise.all([
        supabase.from('tasks').select('id, task_ref, title, status, priority, description, due_date, created_at, updated_at, project:project_id(id,name)').eq('assignee_id', profileId).order('updated_at', { ascending: false }),
        supabase.from('borrow_requests').select('id, approval_status, requested_at, created_at, asset:asset_id(name)').eq('requester_id', profileId).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (taskResult.error) console.warn('Could not load personal tasks:', taskResult.error.message);
      if (borrowResult.error) console.warn('Could not load personal borrow requests:', borrowResult.error.message);
      setTasks((taskResult.data || []) as PersonalTask[]);
      setBorrowRequests((borrowResult.data || []) as PersonalBorrowRequest[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [profileId]);

  const summary = useMemo(() => {
    const completed = tasks.filter(task => isDone(task.status)).length;
    const open = tasks.length - completed;
    const overdue = tasks.filter(task => !isDone(task.status) && task.due_date && new Date(task.due_date) < new Date()).length;
    const pendingBorrow = borrowRequests.filter(request => (request.approval_status || '').toLowerCase() === 'pending').length;
    return { total: tasks.length, completed, open, overdue, completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0, pendingBorrow };
  }, [tasks, borrowRequests]);

  return { tasks, borrowRequests, summary, loading };
}
