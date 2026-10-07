import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
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
      if (useAuthStore.getState().user?.id === 'dev-admin-id') {
        const mockW: TeamMemberWorkload[] = [
          { id: '1', name: 'Admin', activeTasksCount: 5, capacityPercentage: 80, status: 'high', tasks: [1,2,3] as any },
          { id: '2', name: 'Bách Bảo', activeTasksCount: 2, capacityPercentage: 40, status: 'good', tasks: [1] as any },
          { id: '3', name: 'Test Staff', activeTasksCount: 8, capacityPercentage: 110, status: 'overloaded', tasks: [1,2,3,4,5] as any },
        ];
        setWorkloads(mockW);
        setIsLoading(false);
        return;
      }

      // The dashboard stores its members in public.users, not auth profiles.
      const profile = useAuthStore.getState().profile;
      const canViewAll = profile?.role === 'admin' || profile?.employment_level?.toLowerCase() === 'admin' || profile?.employment_level?.toLowerCase() === 'manager' || (profile?.role === 'manager' && profile?.employment_level !== 'Leader');
      
      let usersQuery = supabase
        .from('users')
        .select('id, name, email, avatar_url, department_id')
        .eq('is_active', true);
        
      if (!canViewAll && profile?.department_id) {
        usersQuery = usersQuery.eq('department_id', profile.department_id);
      }

      const { data: usersData, error: usersError } = await usersQuery;
        
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
          name: user.name || user.email || 'Unknown',
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
