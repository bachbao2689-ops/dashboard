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
  tasks: any[];
  assetStatusData: { name: string; value: number; fill: string }[];
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
  ],
  tasks: [],
  assetStatusData: []
};

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    myTasksCount: 0,
    dueSoonCount: 0,
    borrowedCount: 0,
    overdueCount: 0,
    upcomingTasks: [],
    recentRequests: [],
    tasks: [],
    assetStatusData: []
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
      
      const { data: tasks, error: err1 } = await supabase
        .from('tasks')
        .select(`id, task_ref, title, priority, status, due_date, start_date, created_at, assignee_id, assignee:assignee_id(name, avatar_url)`);
      if (err1) throw err1;

      const { data: assets, error: err2 } = await supabase
        .from('assets')
        .select('status, is_available');
      if (err2) throw err2;

      const { data: recent, error: err4 } = await supabase
        .from('borrow_requests')
        .select(`id, approval_status, due_date, asset:asset_id(name), requester:requester_id(name)`)
        .order('requested_at', { ascending: false })
        .limit(5);
      if (err4) throw err4;

      const allTasks = tasks || [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const inSevenDays = new Date(today); inSevenDays.setDate(today.getDate() + 7);
      const userId = useAuthStore.getState().user?.id;
      const myTasks = allTasks.filter(task => task.assignee_id === userId);
      const openTasks = myTasks.filter(task => task.status !== 'done');
      const upcoming = openTasks.filter(task => task.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);
      const overdue = openTasks.filter(task => task.due_date && new Date(task.due_date) < today);
      const dueSoon = openTasks.filter(task => task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) <= inSevenDays);
      const assetCounts = (assets || []).reduce((counts: Record<string, number>, asset: any) => {
        const key = asset.status || (asset.is_available ? 'available' : 'borrowed');
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      }, {});

      setData({
        myTasksCount: openTasks.length,
        dueSoonCount: dueSoon.length,
        borrowedCount: assetCounts.borrowed || 0,
        overdueCount: overdue.length,
        upcomingTasks: upcoming,
        recentRequests: recent || []
        , tasks: allTasks,
        assetStatusData: [
          { name: 'Borrowed', value: assetCounts.borrowed || 0, fill: '#093570' },
          { name: 'Available', value: assetCounts.available || 0, fill: '#45a894' },
          { name: 'Maintenance', value: assetCounts.maintenance || 0, fill: '#d9435a' },
        ].filter(item => item.value > 0)
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
