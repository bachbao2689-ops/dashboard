import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useTasks, type Task } from './useTasks';
import type { HubTrack, WorkflowPerson } from '../lib/workflowHub';
import { useWorkspaceRealtime } from './useWorkspaceRealtime';

export function useWorkflowHub() {
  const profile = useAuthStore(s => s.profile);
  const { tasks, loading: taskLoading, error: taskError, refetch } = useTasks();
  const [tracks, setTracks] = useState<HubTrack[]>([]);
  const [trackActor, setTrackActor] = useState<number | null>(null);
  const [people, setPeople] = useState<WorkflowPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0), lock = useRef(false);
  const refresh = useCallback(async () => {
    const token = ++request.current;
    if (!profile) { setTracks([]); setLoading(false); return; }
    try {
      const { data, error: failure } = await supabase.rpc('workflow_hub_index');
      if (failure) throw failure;
      if (token === request.current) { setTracks(data || []); setTrackActor(profile.id); setError(''); }
    } catch (e: any) { if (token === request.current) { setTracks([]); setError(e.message || 'Không thể tải Workflow'); } }
    finally { if (token === request.current) setLoading(false); }
  }, [profile?.id]);
  useEffect(() => {
    setTracks([]); setPeople([]); setLoading(true); void refresh();
    const actor = profile?.id;
    if (actor) void (async () => {
      const rows: WorkflowPerson[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error: failure } = await supabase.from('users').select('id,name,avatar_url').eq('is_active', true).order('name').order('id').range(offset, offset + 499);
        if (failure) { if (useAuthStore.getState().profile?.id === actor) setError('Không thể tải danh sách PIC'); return; }
        rows.push(...(data || []));
        if (!data || data.length < 500) break;
      }
      if (useAuthStore.getState().profile?.id === actor) setPeople(rows);
    })();
    return () => { request.current++; };
  }, [refresh]);
  const connected = useWorkspaceRealtime(['workflow_tracks', 'workflow_phases', 'workflow_phase_members', 'projects', 'campaigns', 'project_members', 'campaign_members', 'comments', 'activity_log'], refresh, profile?.id);
  const mutate = async (operation: () => PromiseLike<any>) => {
    if (lock.current) throw new Error('Đang lưu. Vui lòng chờ.');
    lock.current = true; setBusy(true);
    try {
      const { data, error: failure } = await operation();
      if (failure) throw failure;
      await Promise.all([refresh(), refetch()]);
      window.dispatchEvent(new Event('workspace:changed'));
      return data;
    } finally { lock.current = false; setBusy(false); }
  };
  const updateTask = (task: Task, values: Record<string, unknown>) => mutate(async () => {
    const table = task.id.startsWith('ps-') ? 'project_subtasks' : task.id.startsWith('cs-') ? 'campaign_subtasks' : 'tasks';
    const id = table === 'tasks' ? task.id : task.id.slice(3);
    const result = await supabase.from(table).update(values).eq('id', id).select('id').maybeSingle();
    if (!result.error && !result.data) throw new Error('Không có quyền cập nhật task này');
    return result;
  });
  return { tracks: trackActor === profile?.id ? tracks : [], tasks, people, profile, connected, loading: loading || (taskLoading && !tasks.length), error: error || taskError, busy, refresh: async () => { await Promise.all([refresh(), refetch()]); }, mutate, updateTask };
}
