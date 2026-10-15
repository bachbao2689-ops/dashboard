import { useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useTasks, type Task } from './useTasks';
import {useSharedResource} from './useSharedResource';
import {useWorkspaceDirectory} from './useWorkspaceData';
import {useWorkspaceRealtime} from './useWorkspaceRealtime';
import {workflowResource,workspaceScope} from '../services/workspaceResources';
import type {HubTrack} from '../lib/workflowHub';
const emptyTracks:HubTrack[]=[];

export function useWorkflowHub() {
  const profile = useAuthStore(s => s.profile);
  const { tasks, loading: taskLoading, error: taskError, refetch } = useTasks();
  const state=useSharedResource(workflowResource,workspaceScope(),Boolean(profile));
  const directory=useWorkspaceDirectory();
  const tracks=state.data||emptyTracks,people=useMemo(()=>(directory.data?.users||[]).map(person=>({...person,id:Number(person.id)})),[directory.data]);
  const loading=state.loading,error=state.error||directory.error;
  const [busy,setBusy]=useState(false);const lock=useRef(false);
  const refresh=state.refetch;
  const connected=useWorkspaceRealtime([],()=>{},profile?.id);
  const mutate = async (operation: () => PromiseLike<any>) => {
    if (lock.current) throw new Error('Đang lưu. Vui lòng chờ.');
    lock.current = true; setBusy(true);
    try {
      const { data, error: failure } = await operation();
      if (failure) throw failure;
      await Promise.all([refresh(), refetch()]);
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
  return { tracks, tasks, people, profile, connected, loading: loading || (taskLoading && !tasks.length), error: error || taskError, busy, refresh: async () => { await Promise.all([refresh(), refetch()]); }, mutate, updateTask };
}
