import {useTasks} from './useTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import {isTaskDone,isTaskClosed,taskDay} from '../lib/taskTracking';
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
  assignee?: { name?: string; avatar_url?: string | null } | null;
  department?: { name?: string | null } | null;
}

export interface PersonalBorrowRequest {
  id: string;
  approval_status: string | null;
  requested_at: string | null;
  approved_at: string | null;
  returned_at: string | null;
  created_at: string;
  asset?: { name?: string | null } | null;
}


export function useProfileWorkload() {
  const profileId = useAuthStore(state => state.profile?.id);
  const source=useTasks();
  const tasks=useMemo(()=>source.tasks.filter(t=>String(t.assignee_id)===String(profileId)) as unknown as PersonalTask[],[source.tasks,profileId]);
  const [borrowRequests, setBorrowRequests] = useState<PersonalBorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!profileId) {
        if (active) { setBorrowRequests([]); setLoading(false); }
        return;
      }
      setLoading(true);
      const [borrowResult] = await Promise.all([
        supabase.from('borrow_requests').select('id, approval_status, requested_at, approved_at, returned_at, created_at, asset:asset_id(name)').eq('requester_id', profileId).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (borrowResult.error) console.warn('Could not load personal borrow requests:', borrowResult.error.message);
      setBorrowRequests((borrowResult.data || []) as PersonalBorrowRequest[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [profileId]);

  const summary = useMemo(() => {
    const completed = tasks.filter(task => isTaskDone(task.status)).length;
    const open = tasks.filter(t=>!isTaskClosed(t.status)).length;
    const overdue = tasks.filter(task => !isTaskClosed(task.status) && taskDay(task.due_date) && taskDay(task.due_date) < taskDay(new Date().toISOString())).length;
    const pendingBorrow = borrowRequests.filter(request => (request.approval_status || '').toLowerCase() === 'pending').length;
    return { total: tasks.length, completed, open, overdue, completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0, pendingBorrow };
  }, [tasks, borrowRequests]);

  useWorkspaceRealtime(['borrow_requests'],()=>{void supabase.from('borrow_requests').select('id,approval_status,requested_at,approved_at,returned_at,created_at,asset:asset_id(name)').eq('requester_id',profileId || -1).then(({data,error})=>{if(!error)setBorrowRequests((data||[]) as PersonalBorrowRequest[]);});},profileId);
  return { tasks, borrowRequests, summary, loading: loading || source.loading };
}
