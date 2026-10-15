import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceRealtime } from './useWorkspaceRealtime';

export interface SidebarBadgeCounts {
  borrowCount: number;
  workflowCount: number;
  tasksCount: number;
  projectCount: number;
  profileCount: number;
  departmentCount: number;
}

export function useSidebarBadges(): SidebarBadgeCounts {
  const profile = useAuthStore(s => s.profile);
  const profileId = profile?.id || 2; // fallback to admin ID 2 for dev
  const role = (profile?.role || 'member').toLowerCase();
  const isAdminOrManager = ['admin', 'manager', 'leader'].includes(role);

  const [counts, setCounts] = useState<SidebarBadgeCounts>({
    borrowCount: 0,
    workflowCount: 0,
    tasksCount: 0,
    projectCount: 0,
    profileCount: 0,
    departmentCount: 0,
  });

  const isFetchingRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      // 1. Borrow Requests pending count
      let borrowQuery = supabase
        .from('borrow_requests')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (!isAdminOrManager && profile?.id) {
        borrowQuery = borrowQuery.eq('requester_id', profile.id);
      }

      // 2. All Tasks unread comments/notifications
      const tasksQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('is_read', false)
        .in('entity_type', ['task']);

      // 3. Workflow Management unread notifications (tasks, workflow)
      const workflowQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('is_read', false)
        .in('entity_type', ['task', 'workflow']);

      // 4. Projects / Campaigns unread notifications (projects, campaigns, subtasks)
      const projectQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('is_read', false)
        .in('entity_type', ['project', 'campaign', 'project_subtask', 'campaign_subtask']);

      // 5. Profile unread notifications
      const profileQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('is_read', false)
        .in('entity_type', ['profile', 'task', 'project']);

      // 6. Department unread updates/notifications
      const departmentQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('is_read', false)
        .eq('entity_type', 'department');

      const [borrowRes, tasksRes, workflowRes, projectRes, profileRes, departmentRes] = await Promise.all([
        borrowQuery,
        tasksQuery,
        workflowQuery,
        projectQuery,
        profileQuery,
        departmentQuery,
      ]);

      setCounts({
        borrowCount: borrowRes.count || 0,
        tasksCount: tasksRes.count || 0,
        workflowCount: workflowRes.count || 0,
        projectCount: projectRes.count || 0,
        profileCount: profileRes.count || 0,
        departmentCount: departmentRes.count || 0,
      });
    } catch (err) {
      console.error('Error fetching sidebar badge counts:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [profileId, profile?.id, isAdminOrManager]);

  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts]);

  // Subscribe to real-time changes
  useWorkspaceRealtime(
    ['borrow_requests', 'notifications', 'comments', 'activity_log'],
    () => { void fetchCounts(); },
    profileId
  );

  return counts;
}
