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
      
      // Simple aggregations
      await await supabase.from('tasks').select('*', { count: 'exact', head: true });
      const { count: pendingTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done');
      await await supabase.from('assets').select('*', { count: 'exact', head: true });
      const { count: activeBorrows } = await supabase.from('borrow_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved');

      // Fetch lists
      const { data: upcoming } = await supabase
        .from('tasks')
        .select(`id, task_ref, title, priority, due_date, assignee:assignee_id(name, avatar_url)`)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(5);

      const { data: recent } = await supabase
        .from('borrow_requests')
        .select(`id, approval_status, due_date, asset:asset_id(name), requester:requester_id(name)`)
        .order('requested_at', { ascending: false })
        .limit(5);

      setData({
        myTasksCount: pendingTasks || 0,
        dueSoonCount: 5,
        borrowedCount: activeBorrows || 0,
        overdueCount: 2,
        upcomingTasks: upcoming || [],
        recentRequests: recent || []
      });
    } catch (err) {
      console.error('Error fetching dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refetch: fetchDashboard };
}
