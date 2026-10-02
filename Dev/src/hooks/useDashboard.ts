import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export interface DashboardData {
  myTasksCount: number;
  dueSoonCount: number;
  borrowedCount: number;
  overdueCount: number;
  upcomingTasks: any[];
  recentRequests: any[];
}

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
      
      const { count: pendingTasks, error: err1 } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done');
      if (err1) throw err1;

      const { count: activeBorrows, error: err2 } = await supabase.from('borrow_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved');
      if (err2) throw err2;

      const { data: upcoming, error: err3 } = await supabase
        .from('tasks')
        .select(`id, task_ref, title, priority, due_date`)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(5);
      if (err3) throw err3;

      const { data: recent, error: err4 } = await supabase
        .from('borrow_requests')
        .select(`id, approval_status, due_date`)
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
      console.error('Error fetching dashboard', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchDashboard };
}
