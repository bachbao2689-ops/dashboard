import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { readAll } from '../services/workspaceTasks';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceRealtime } from './useWorkspaceRealtime';
import toast from 'react-hot-toast';

type Snapshot = { key: string; data: any; subtasks: any[]; comments: any[]; people: any[]; canManage: boolean };
const sources = ['projects', 'campaigns', 'project_subtasks', 'campaign_subtasks', 'project_comments', 'activity_log', 'project_members', 'campaign_members'];

export function useProjectCampaignDetails(kind: 'project' | 'campaign', id: string) {
  const profile = useAuthStore(s => s.profile);
  const key = `${profile?.id}:${profile?.role}:${profile?.employment_level}:${profile?.department_id}:${kind}:${id}`;
  const current = useRef(key);
  const request = useRef(0), lock = useRef(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [errorState, setError] = useState({key, message:''});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (current.current !== key) return;
    const token = ++request.current;
    if (!profile?.id) return;
    try {
      const parent = kind === 'project'
        ? supabase.from('projects').select('*, creator:created_by(name,avatar_url)').eq('id', id).single()
        : supabase.from('campaigns').select('*, lead:lead_id(name,avatar_url), creator:created_by(name,avatar_url)').eq('id', id).single();
      const comments = kind === 'project'
        ? supabase.from('project_comments').select('*, author:author_id(name,avatar_url)').eq('project_id', id)
        : supabase.from('activity_log').select('id,user_id,metadata,new_value,created_at,author:user_id(name,avatar_url)').eq('entity_type', 'campaign').eq('entity_id', id).eq('action', 'comment');
      const [p, rows, thread, people, permission] = await Promise.all([
        parent,
        readAll(supabase.from(`${kind}_subtasks`).select('*, assignee:assignee_id(name,avatar_url)').eq(`${kind}_id`, id).order('created_at').order('id')),
        readAll(comments.order('created_at').order('id')),
        readAll(supabase.from('users').select('id,name').eq('is_active', true).order('name').order('id')),
        supabase.rpc('workflow_root', { k: kind, e: id })
      ]);
      if (p.error) throw p.error;
      if (!p.data || ['deleted', 'archived'].includes(p.data.status)) throw new Error('Project/Campaign đã được ẩn hoặc xóa.');
      if (permission.error) throw permission.error;
      if (token !== request.current || current.current !== key) return;
      setSnapshot({key, data:p.data, subtasks:rows.filter(row => !['deleted','archived'].includes(row.status)), people, canManage:permission.data === true,
        comments:thread.map(c => ({...c, user_id:kind === 'project' ? c.author_id : c.user_id, body:kind === 'project' ? c.body : c.metadata?.body || ''}))});
      setError({key, message:''});
    } catch (failure: any) {
      if (token === request.current && current.current === key) {
        setSnapshot(null); setError({key, message:failure.message || 'Không tải được Project/Campaign.'});
      }
    }
  }, [key, kind, id, profile?.id]);

  useEffect(() => {
    current.current = key; void refresh();
    return () => { current.current = ''; };
  }, [key, refresh]);
  useWorkspaceRealtime(sources, refresh, profile?.id);

  const mutate = async (operation: () => PromiseLike<any>, success: string) => {
    if (lock.current || !profile?.id || !snapshot || snapshot.key !== key) return false;
    lock.current = true; setBusy(true);
    try {
      const {data, error: failure} = await operation();
      if (failure) throw failure;
      if (!data) throw new Error('Không có quyền lưu thay đổi này.');
      window.dispatchEvent(new Event('workspace:changed'));
      if (current.current !== key) return false;
      toast.success(success); await refresh(); return true;
    } catch (failure: any) {
      if (current.current === key) { setError({key, message:failure.message || 'Không thể lưu thay đổi.'}); toast.error(failure.message || 'Không thể lưu thay đổi.'); }
      return false;
    } finally { lock.current = false; setBusy(false); }
  };
  const visible = snapshot?.key === key ? snapshot : null;
  const error = errorState.key === key ? errorState.message : "";
  return { profile, data:visible?.data, subtasks:visible?.subtasks || [], comments:visible?.comments || [], people:visible?.people || [], canManage:visible?.canManage || false, loading:!visible && !error, error, busy, refresh, mutate };
}
