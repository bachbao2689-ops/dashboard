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
  campaign?: { name: string };
  assignee_id?: string;
  assignee?: { id?: string; name: string; avatar_url: string };
  department?: { name: string };
  column?: { name: string };
}

export function useTasks() {
  const profile = useAuthStore(state => state.profile);
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
  }, [profile?.department_id, profile?.role]);

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

      // Never request the shared task list while the signed-in user's profile is
      // still loading. It prevents a department leader from briefly receiving
      // another department's data before the department filter is available.
      if (!profile) {
        setTasks([]);
        return;
      }

      let query = supabase
        .from('tasks')
        .select(`
          id, task_ref, title, status, priority, due_date, start_date, description, assignee_id, project_id, campaign_id, department_id,
          project:project_id(name),
          assignee:assignee_id(id, name, avatar_url),
          department:department_id(name),
          column:column_id(name)
        `)
        .neq('status', 'deleted').order('created_at', { ascending: false });


      
      const [tasksRes, pSubRes, cSubRes] = await Promise.all([
        query,
        supabase.from('project_subtasks').select('id, title, due_date, project_id, projects(name, department_id), assignee:assignee_id(id, name, avatar_url)').neq('status', 'deleted'),
        supabase.from('campaign_subtasks').select('id, title, due_date, campaign_id, campaigns(name, department_id), assignee:assignee_id(id, name, avatar_url)').neq('status', 'deleted')
      ]);

      if (tasksRes.error) throw tasksRes.error;


      let combined: any[] = [...(tasksRes.data || [])];

      if (pSubRes.data) {
        const pTasks = pSubRes.data.map((ps: any) => ({
          id: `ps-${ps.id}`,
          task_ref: null,
          title: ps.title,
          status: 'todo',
          priority: 'Medium',
          due_date: ps.due_date,
          project: ps.projects ? { name: ps.projects.name } : null,
          assignee: ps.assignee,
          assignee_id: ps.assignee?.id,
          department_id: ps.projects?.department_id // subtasks get this from projects
        }));
        combined = [...combined, ...pTasks];
      }

      if (cSubRes.data) {
        const cTasks = cSubRes.data.map((cs: any) => ({
          id: `cs-${cs.id}`,
          task_ref: null,
          title: cs.title,
          status: 'todo',
          priority: 'Medium',
          due_date: cs.due_date,
          project: cs.campaigns ? { name: cs.campaigns.name } : null,
          assignee: cs.assignee,
          assignee_id: cs.assignee?.id,
          department_id: cs.campaigns?.department_id
        }));
        combined = [...combined, ...cTasks];
      }

      // --- NEW RBAC FILTERING ---
      const isAdminOrManager = ['admin'].includes(profile.role?.toLowerCase() || '') || (profile.role?.toLowerCase() === 'manager' && profile.employment_level !== 'Leader') || profile.employment_level === 'manager';
      const isLeader = profile.employment_level === 'Leader' || profile.role?.toLowerCase() === 'leader';
      
      if (!isAdminOrManager) {
        // Fetch projects/campaigns owned or member of
        const [memRes, projRes, campRes] = await Promise.all([
          supabase.from('project_members').select('project_id').eq('user_id', profile.id),
          supabase.from('projects').select('id').eq('created_by', profile.id),
          supabase.from('campaigns').select('id').or(`lead_id.eq.${profile.id},created_by.eq.${profile.id}`)
        ]);
        const validProjects = new Set([
          ...(memRes.data?.map(m => m.project_id) || []),
          ...(projRes.data?.map(p => p.id) || [])
        ]);
        const validCampaigns = new Set(campRes.data?.map(c => c.id) || []);

        combined = combined.filter(t => {
          
          // If explicitly assigned
          if (String(t.assignee_id) === String(profile.id)) return true;
          // If owns/is member of the parent project/campaign
          if (t.project_id && validProjects.has(t.project_id)) return true;
          if (t.campaign_id && validCampaigns.has(t.campaign_id)) return true;

          if (String(t.assignee_id) === String(profile.id)) return true;
          // If Leader, see everything in their department
          if (isLeader && String(t.department_id) === String(profile.department_id)) return true;
          return false;
        });
      }

      setTasks(combined as any);
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
