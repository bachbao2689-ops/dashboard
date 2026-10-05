import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import mockData from '../data/mock_generated.json';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export interface Task {
  id: string;
  task_ref: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  start_date?: string;
  description?: string;
  project?: { name: string };
  assignee_id?: string;
  assignee?: { id?: string; name: string; avatar_url: string };
  department?: { name: string };
  column?: { name: string };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    
    // Subscribe to realtime changes
    const channelName = `tasks_channel_${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks(); // Refresh list on change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // INSTANT BYPASS FOR DEV ADMIN
      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        setTasks(mockData.tasks as any);
        setError('Instant Offline Mode');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, task_ref, title, status, priority, due_date, start_date, description, assignee_id,
          project:project_id(name),
          assignee:assignee_id(id, name, avatar_url),
          department:department_id(name),
          column:column_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data as any);
    } catch (err: any) {
      console.warn('Error fetching tasks, falling back to Google Sheets mock', err);
      // OFFLINE FALLBACK TO IMPORTED GOOGLE SHEETS
      setTasks(mockData.tasks as any);
      setError(err.message || 'Offline Mode');
      toast.error('Offline Mode: Loaded Tasks from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  return { tasks, loading, error, refetch: fetchTasks };
}
