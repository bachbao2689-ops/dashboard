import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export interface TeamMemberWorkload {
  id: string;
  name: string;
  avatar_url?: string;
  activeTasksCount: number;
  capacityPercentage: number;
  status: 'good' | 'warning' | 'high' | 'overloaded';
  tasks: any[];
}

export const useTeamWorkload = () => {
  const [workloads, setWorkloads] = useState<TeamMemberWorkload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkload = async () => {
    setIsLoading(true);
    try {
      // Fetch users (profiles) and tasks
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');
        
      if (usersError) throw usersError;

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'done');

      if (tasksError) throw tasksError;

      const tasksByUser: Record<string, any[]> = {};
      (tasksData || []).forEach(task => {
        if (task.assignee_id) {
          if (!tasksByUser[task.assignee_id]) {
            tasksByUser[task.assignee_id] = [];
          }
          tasksByUser[task.assignee_id].push(task);
        }
      });

      const MAX_CAPACITY = 40; // 40 hours/week
      const TASK_ESTIMATE = 8; // 8 hours per task

      const formattedWorkloads: TeamMemberWorkload[] = (usersData || []).map(user => {
        const userTasks = tasksByUser[user.id] || [];
        const activeTasksCount = userTasks.length;
        const estimatedHours = activeTasksCount * TASK_ESTIMATE;
        const capacityPercentage = Math.round((estimatedHours / MAX_CAPACITY) * 100);

        let status: TeamMemberWorkload['status'] = 'good';
        if (capacityPercentage > 100) status = 'overloaded';
        else if (capacityPercentage >= 80) status = 'high';
        else if (capacityPercentage >= 60) status = 'warning';

        return {
          id: user.id,
          name: user.full_name || user.email || 'Unknown',
          avatar_url: user.avatar_url,
          activeTasksCount,
          capacityPercentage,
          status,
          tasks: userTasks,
        };
      });

      setWorkloads(formattedWorkloads);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to load team workload');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkload();
  }, []);

  return { workloads, isLoading, refetch: fetchWorkload };
};
