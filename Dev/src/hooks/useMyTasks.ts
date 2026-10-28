import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { completeTrackedTask } from '../services/workspaceTasks';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export interface Task {
  id: string;
  title: string;
  priority: string;
  due_date: string;
  status: string;
  assignee_id?: string;
  created_at?: string;
}

export function useMyTasks() {
  const profile = useAuthStore(state => state.profile);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndTasks = async () => {
      try {
        setLoading(true);
        const currentUserId = profile?.id;
        if (!currentUserId) {
          setUserId(null);
          setTasks([]);
          return;
        }
        setUserId(String(currentUserId));

        let query = supabase.from('tasks').select('*');
        query = query.eq('assignee_id', currentUserId);

        const { data: tasksData, error: tasksError } = await query;
        if (tasksError) throw tasksError;
        
        setTasks(tasksData || []);
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTasks();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('public:tasks:my_tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks(current => {
             if (payload.eventType === 'INSERT') {
                return String(payload.new.assignee_id) === String(profile?.id) ? [...current, payload.new as Task] : current;
             }
             if (payload.eventType === 'UPDATE') {
                if (String(payload.new.assignee_id) !== String(profile?.id)) return current.filter(t => t.id !== payload.new.id);
                return current.some(t => t.id === payload.new.id)
                  ? current.map(t => t.id === payload.new.id ? payload.new as Task : t)
                  : [...current, payload.new as Task];
             }
             if (payload.eventType === 'DELETE') {
                return current.filter(t => t.id !== payload.old.id);
             }
             return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markComplete = async (taskId: string) => {
    try {
      await completeTrackedTask(taskId);
      toast.success('Task marked as complete');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark task as complete');
    }
  };

  return { tasks, loading, markComplete, userId };
}
