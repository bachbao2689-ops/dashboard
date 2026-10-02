import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndTasks = async () => {
      try {
        setLoading(true);
        // Simulate getting current user (first user in DB)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single();

        let currentUserId = null;
        if (!userError && userData) {
          currentUserId = userData.id;
          setUserId(currentUserId);
        } else {
          console.warn("Could not fetch user, fetching tasks anyway");
        }

        let query = supabase.from('tasks').select('*');
        if (currentUserId) {
          query = query.eq('assignee_id', currentUserId);
        }

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
                return [...current, payload.new as Task];
             }
             if (payload.eventType === 'UPDATE') {
                return current.map(t => t.id === payload.new.id ? payload.new as Task : t);
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
  }, []);

  const markComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Task marked as complete');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark task as complete');
    }
  };

  return { tasks, loading, markComplete, userId };
}
