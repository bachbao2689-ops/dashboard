import {mergeDeliverableMetadata, type TaskDeliverableMeta, type DeliverableChecklistItem} from './taskDeliverables.ts';

const marker = '::item:';
export const checklistTaskKey = (parentKey: string, itemId: string) => `${parentKey}${marker}${encodeURIComponent(itemId)}`;
export function checklistTarget(key: string) {
  const index = key.indexOf(marker);
  return index < 0 ? {parentKey: key} : {parentKey: key.slice(0, index), checklistItemId: decodeURIComponent(key.slice(index + marker.length))};
}

/** Recover completion transitions from saved checklist snapshots, never from deadlines. */
export function deliverableHistory(rows: readonly {metadata?: TaskDeliverableMeta; created_at?: string}[]): TaskDeliverableMeta {
  const meta = mergeDeliverableMetadata(rows.map(row => row.metadata));
  const states = new Map<string, {done: boolean; at?: string | null}>();
  for (const row of [...rows].reverse()) {
    if (!Array.isArray(row.metadata?.checklist_items)) continue;
    const present = new Set(row.metadata.checklist_items.map(item => item.id));
    for (const id of states.keys()) if (!present.has(id)) states.delete(id);
    for (const item of row.metadata.checklist_items) {
      const previous = states.get(item.id);
      states.set(item.id, {done: item.completed, at: item.completed ? item.completed_at || (previous?.done ? previous.at : row.created_at) : null});
    }
  }
  if (Array.isArray(meta.checklist_items)) meta.checklist_items = meta.checklist_items.map(item => ({...item, completed_at: item.completed ? item.completed_at || states.get(item.id)?.at || null : null}));
  return meta;
}

/** Only the selected item changes. Completing/deleting a child must never mutate its parent. */
export function patchChecklistItem(items: DeliverableChecklistItem[], id: string, values: Record<string, unknown>, now = new Date().toISOString()) {
  if (!items.some(item => item.id === id)) throw new Error('Đầu việc không còn tồn tại. Vui lòng làm mới.');
  if (values.status === 'deleted') return items.filter(item => item.id !== id);
  const allowed = ['title', 'description', 'priority', 'quantity', 'due_date', 'start_date', 'assignee_id'];
  const patch = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
  if ('status' in values || 'workflow_status' in values) {
    const state = values.workflow_status || values.status;
    patch.completed = ['done', 'completed', 'complete'].includes(String(state).toLowerCase());
    patch.completed_at = patch.completed ? now : null;
    patch.status = values.status || (patch.completed ? 'done' : 'todo');
    patch.workflow_status = values.workflow_status || (patch.completed ? 'completed' : 'backlog');
  }
  return items.map(item => item.id === id ? {...item, ...patch, updated_at: now} : item);
}
