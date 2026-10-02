import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export interface DashboardData {
  myTasksCount: number;
  dueSoonCount: number;
  borrowedCount: number;
  overdueCount: number;
  upcomingTasks: any[];
  recentRequests: any[];
}

const MOCK_DATA: DashboardData = {
  myTasksCount: 12,
  dueSoonCount: 5,
  borrowedCount: 3,
  overdueCount: 2,
  upcomingTasks: [
    { id: '1', task_ref: 'TSK-001', title: 'Hoàn thiện giao diện', priority: 'high', due_date: '2026-10-05', assignee: { name: 'Admin', avatar_url: null } },
    { id: '2', task_ref: 'TSK-002', title: 'Thiết kế Database', priority: 'medium', due_date: '2026-10-07', assignee: { name: 'Bach Bao', avatar_url: null } },
  ],
  recentRequests: [
    { id: '1', approval_status: 'pending', due_date: '2026-10-10', asset: { name: 'MacBook Pro M2' }, requester: { name: 'Admin' } },
  ]
};

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    myTasksCount: 0,
    dueSoonCount: 0,
    borrowedCount: 0,
    overdueCount: 0,
    upcomingTasks: [],
    recentRequests: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    
    const channel = supabase
      .channel('dashboard_channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // INSTANT BYPASS FOR DEV ADMIN
      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        setData(MOCK_DATA);
        setError('Instant Offline Mode');
        return;
      }
      
      const { count: pendingTasks, error: err1 } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done');
      if (err1) throw err1;

      const { count: activeBorrows, error: err2 } = await supabase.from('borrow_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved');
      if (err2) throw err2;

      const { data: upcoming, error: err3 } = await supabase
        .from('tasks')
        .select(`id, task_ref, title, priority, due_date, assignee:assignee_id(name, avatar_url)`)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(5);
      if (err3) throw err3;

      const { data: recent, error: err4 } = await supabase
        .from('borrow_requests')
        .select(`id, approval_status, due_date, asset:asset_id(name), requester:requester_id(name)`)
        .order('requested_at', { ascending: false })
        .limit(5);
      if (err4) throw err4;

      setData({
        myTasksCount: pendingTasks || 0,
        dueSoonCount: 5,
        borrowedCount: activeBorrows || 0,
        overdueCount: 2,
        upcomingTasks: upcoming || [],
        recentRequests: recent || []
      });
    } catch (err: any) {
      console.warn('Error fetching dashboard, using mock data:', err);
      setData(MOCK_DATA);
      setError(err.message || 'Supabase Timeout - Loading Offline Mode');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchDashboard };
}
