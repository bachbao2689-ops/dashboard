import { supabase } from './supabase';
import type { CalendarItem } from '../lib/profileCalendar';

export type ProfileBoardColumnKey = 'draft_on_hold' | 'planning' | 'active' | 'completed';

export interface BoardStatusTarget {
  status: string;
  workflow_status?: string;
}

export function resolveBoardDropStatus(
  item: CalendarItem,
  targetCol: ProfileBoardColumnKey,
  canApprove: boolean,
): BoardStatusTarget {
  const fromNorm = (item.status || '').toLowerCase().trim();
  const isOnHold = ['on_hold', 'paused', 'holding'].includes(fromNorm);

  if (item.kind === 'project' || item.kind === 'campaign') {
    if (targetCol === 'draft_on_hold') return { status: isOnHold ? 'on_hold' : 'draft' };
    if (targetCol === 'planning') return { status: 'planning' };
    if (targetCol === 'completed') return { status: canApprove ? 'completed' : 'pending_approval' };
    return { status: 'active' };
  }

  if (item.kind === 'task') {
    if (targetCol === 'draft_on_hold') {
      return { status: isOnHold ? 'on_hold' : 'todo', workflow_status: 'backlog' };
    }
    if (targetCol === 'planning') {
      return { status: 'todo', workflow_status: 'planned' };
    }
    if (targetCol === 'completed') {
      return canApprove
        ? { status: 'done', workflow_status: 'completed' }
        : { status: 'review', workflow_status: 'in_qa' };
    }
    return { status: 'in_progress', workflow_status: 'in_progress' };
  }

  // project_subtask | campaign_subtask
  if (targetCol === 'draft_on_hold') return { status: isOnHold ? 'on_hold' : 'todo' };
  if (targetCol === 'planning') return { status: 'planning' };
  if (targetCol === 'completed') return { status: canApprove ? 'completed' : 'review' };
  return { status: 'in_progress' };
}

export async function updateProfileBoardItemStatus(
  item: CalendarItem,
  target: BoardStatusTarget,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const nowIso = new Date().toISOString();

  if (item.kind === 'project') {
    const { data, error } = await supabase
      .from('projects')
      .update({ status: target.status })
      .eq('id', item.id)
      .select('id')
      .maybeSingle();
    if (error || !data) return { ok: false, errorMessage: error?.message || 'Permission denied' };
    window.dispatchEvent(new Event('projects:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
    return { ok: true };
  }

  if (item.kind === 'campaign') {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: target.status })
      .eq('id', item.id)
      .select('id')
      .maybeSingle();
    if (error || !data) return { ok: false, errorMessage: error?.message || 'Permission denied' };
    window.dispatchEvent(new Event('projects:changed'));
    window.dispatchEvent(new Event('tasks:changed'));
    return { ok: true };
  }

  if (item.kind === 'task') {
    const payload: Record<string, any> = { status: target.status, updated_at: nowIso };
    if (target.workflow_status) payload.workflow_status = target.workflow_status;
    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', item.id)
      .select('id')
      .maybeSingle();
    if (error || !data) return { ok: false, errorMessage: error?.message || 'Permission denied' };
    window.dispatchEvent(new Event('tasks:changed'));
    return { ok: true };
  }

  const table = item.kind === 'project_subtask' ? 'project_subtasks' : 'campaign_subtasks';
  const { data, error } = await supabase
    .from(table)
    .update({ status: target.status, updated_at: nowIso })
    .eq('id', item.id)
    .select('id')
    .maybeSingle();
  if (error || !data) return { ok: false, errorMessage: error?.message || 'Permission denied' };
  window.dispatchEvent(new Event('tasks:changed'));
  window.dispatchEvent(new Event('projects:changed'));
  return { ok: true };
}
