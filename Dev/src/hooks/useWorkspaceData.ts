import {readVisibleTasks} from './useTasks';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import {readAllRows} from '../services/readAllRows';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export type WorkspaceTask = {
  id: string;
  task_ref: string | null;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at?: string | null;
  department_id?: string;
  assignee_id: string | null;
  assignee?: { id: string; name: string; avatar_url?: string | null } | null;
  department?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  campaign?: { id: string; name: string } | null;
};

export type WorkspaceData = {
  tasks: WorkspaceTask[];
  assets: Array<{ id: string; asset_code: string; name: string; status: string; is_available: boolean; category?: { name: string } | null }>;
  users: Array<{ id: string; name: string; department_id?: string | null; avatar_url?: string | null; role?: string | null; employment_level?: string | null; job_title?: string | null; department?: { name: string } | null }>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useWorkspaceData(): WorkspaceData {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const generation=useRef(0);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [assets, setAssets] = useState<WorkspaceData['assets']>([]);
  const [users, setUsers] = useState<WorkspaceData['users']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const token=++generation.current;
    setLoading(true);
    setError(null);
    try {
      const isDevAdmin = user?.id === 'dev-admin-id';
      // Do not run unfiltered workspace queries during authentication/profile
      // hydration. A leader must only receive records from their department.
      if (!profile && !isDevAdmin) {
        setTasks([]);
        setUsers([]);
        setAssets([]);
        return;
      }

      const normalizedRole = (profile?.role || '').toLowerCase();
      const normalizedLevel = (profile?.employment_level || '').toLowerCase();
      const canViewAllDepartments = ['admin', 'manager'].includes(normalizedRole) || ['admin', 'manager'].includes(normalizedLevel);
      if (!canViewAllDepartments && !profile?.department_id && !profile?.id) {
        setTasks([]);
        setUsers([]);
        setAssets([]);
        return;
      }
      const departmentId = profile?.department_id;
      const taskQuery = readVisibleTasks().then(data=>({data,error:null})).catch(error=>({data:[],error}));
      let userQuery = supabase.from('users').select('id, name, avatar_url, role, employment_level, job_title, department_id').eq('is_active', true).order('name');
      if (!canViewAllDepartments) {
        userQuery = departmentId ? userQuery.eq('department_id', departmentId) : userQuery.eq('id', profile!.id);
      }
      const [tasksResult, assetsResult, usersResult, departmentsResult] = await Promise.all([
        taskQuery,
        supabase.from('assets').select('id, asset_code, name, status, is_available, category:category_id(name)').order('asset_code'),
        readAllRows(userQuery).then(data=>({data,error:null})).catch(error=>({data:[],error})),
        supabase.from('departments').select('id, name'),
      ]);
      if(token!==generation.current)return;
      if (tasksResult.error) throw tasksResult.error;
      const liveTasks = (tasksResult.data || []) as unknown as WorkspaceTask[];

      setTasks(liveTasks.map(task=>({...task, department: task.department || (task.department_id ? {id:task.department_id,name:(departmentsResult.data||[]).find(d=>d.id===task.department_id)?.name || 'Chưa cập nhật team'}:null)})));
      setAssets(assetsResult.error ? [] : (assetsResult.data || []) as unknown as WorkspaceData['assets']);
      if (usersResult.error) {
        // Profile fields can be unavailable briefly after a schema migration. Keep the
        // dashboard functional using the assignee relation already returned with tasks.
        const assignees = new Map<string, WorkspaceData['users'][number]>();
        liveTasks.forEach(task => {
          const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
          if (assignee?.id) assignees.set(String(assignee.id), { id: String(assignee.id), name: assignee.name, avatar_url: assignee.avatar_url });
        });
        setUsers([...assignees.values()]);
        setError(`Profile details are temporarily unavailable: ${usersResult.error.message}`);
      } else {
        const departmentNames = new Map(((departmentsResult.data || []) as any[]).map(d => [d.id, d.name]));
        setUsers(((usersResult.data || []) as any[]).map(u => ({
          ...u,
          department: u.department_id ? { name: departmentNames.get(u.department_id) || 'Chưa cập nhật team' } : null,
        })) as unknown as WorkspaceData['users']);
      }
    } catch (err: any) {
      if(token!==generation.current)return;
      setTasks([]);setUsers([]);setAssets([]);
      setError(err.message || 'Unable to load workspace data');
    } finally {
      if(token===generation.current)setLoading(false);
    }
  }, [profile?.id, profile?.department_id, profile?.role, profile?.employment_level, user?.id]);

  useEffect(() => { setTasks([]);setUsers([]);void refetch();return()=>{generation.current++;}; }, [refetch]);
  useWorkspaceRealtime(['tasks','project_subtasks','campaign_subtasks','projects','campaigns','assets','borrow_requests','users','departments'],refetch,profile?.id);

  return { tasks, assets, users, loading, error, refetch };
}
