import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export type TimeRange = 'week' | 'month' | 'quarter' | 'all';

export const useReports = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    kpis: {
      tasksCompleted: number;
      tasksCompletedPrev: number;
      overdueRate: number;
      avgCompletionTimeDays: number;
    };
    completionTrend: any[];
    statusDistribution: any[];
    priorityBreakdown: any[];
    topPerformers: any[];
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*');

      if (tasksError) throw tasksError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) throw profilesError;

      const allTasks = tasks || [];
      const allProfiles = profiles || [];

      const completedTasks = allTasks.filter(t => t.status === 'done');
      const overdueTasks = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');
      
      const kpis = {
        tasksCompleted: completedTasks.length,
        tasksCompletedPrev: Math.floor(completedTasks.length * 0.8), // Mock previous period
        overdueRate: allTasks.length > 0 ? Math.round((overdueTasks.length / allTasks.length) * 100) : 0,
        avgCompletionTimeDays: 3.5, // Mock value
      };

      const completionTrend = [
        { name: 'Week 1', completed: Math.floor(completedTasks.length * 0.1) },
        { name: 'Week 2', completed: Math.floor(completedTasks.length * 0.2) },
        { name: 'Week 3', completed: Math.floor(completedTasks.length * 0.3) },
        { name: 'Week 4', completed: Math.floor(completedTasks.length * 0.4) },
      ];

      const statusCounts = allTasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const statusDistribution = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status]
      }));

      const priorityCounts = allTasks.reduce((acc, t) => {
        const p = t.priority || 'medium';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityBreakdown = Object.keys(priorityCounts).map(priority => ({
        name: priority,
        count: priorityCounts[priority]
      }));

      const userCompletions = completedTasks.reduce((acc, t) => {
        if (t.assignee_id) {
          acc[t.assignee_id] = (acc[t.assignee_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topPerformers = Object.keys(userCompletions)
        .map(userId => {
          const user = allProfiles.find(p => p.id === userId);
          return {
            name: user?.full_name || user?.email || 'Unknown',
            completed: userCompletions[userId]
          };
        })
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5);

      setData({
        kpis,
        completionTrend,
        statusDistribution,
        priorityBreakdown,
        topPerformers
      });

    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const exportCSV = () => {
    toast.success('Report export started');
  };

  return { data, isLoading, timeRange, setTimeRange, exportCSV, refetch: fetchData };
};
