import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export interface OverdueTask {
  id: string;
  title: string;
  priority: string;
  due_date: string;
  status: string;
  assignee_id?: string;
  assignee_name?: string;
}

export function useOverdueTasks() {
  const [tasks, setTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverdueTasks = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          users:assignee_id (name)
        `)
        .lt('due_date', today)
        .neq('status', 'done')
        .neq('status', 'completed')
        .order('due_date', { ascending: true }); // Most overdue first

      if (error) throw error;
      
      const formattedData = (data || []).map(task => ({
        ...task,
        // @ts-ignore - Handle possible relation struct differences
        assignee_name: task.users?.name || task.users?.[0]?.name || 'Unknown'
      }));

      setTasks(formattedData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch overdue tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueTasks();

    const intervalId = setInterval(() => {
      fetchOverdueTasks();
    }, 5 * 60 * 1000); // Auto-refresh every 5 minutes

    const channel = supabase
      .channel('public:tasks:overdue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchOverdueTasks();
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  const grantExtension = async (taskId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDate })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Extension granted successfully');
      fetchOverdueTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant extension');
    }
  };

  const reassign = async (taskId: string, newAssigneeId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: newAssigneeId })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Task reassigned successfully');
      fetchOverdueTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reassign task');
    }
  };

  return { tasks, loading, grantExtension, reassign };
}
