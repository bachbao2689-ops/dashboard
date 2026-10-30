export interface DeliverableChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
  due_date?: string | null;
  quantity?: number | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at?: string;
}

export interface TaskDeliverableMeta {
  quantity?: number | null;
  target_department_id?: string | null;
  target_department_name?: string | null;
  checklist_items?: DeliverableChecklistItem[];
  description?: string;
  image_url?: string | null;
  [key: string]: any;
}

const STORAGE_KEY = 'kcoffee.deliverables.v1';
const DEFAULT_WORKSPACE_ID = '9000eae0-528c-47a2-b6f3-eba019d4edca';

function getStorageCache(): Record<string, TaskDeliverableMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStorageCache(cache: Record<string, TaskDeliverableMeta>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

export function getCachedDeliverable(key: string): TaskDeliverableMeta | undefined {
  const cache = getStorageCache();
  return cache[key];
}

export function setCachedDeliverable(key: string, meta: TaskDeliverableMeta) {
  const cache = getStorageCache();
  cache[key] = { ...(cache[key] || {}), ...meta };
  setStorageCache(cache);
}

/** Detail events may be patches. Newer fields win, including explicit null/empty resets. */
export function mergeDeliverableMetadata(newestFirst: readonly (TaskDeliverableMeta | null | undefined)[]): TaskDeliverableMeta {
  return newestFirst.reduceRight<TaskDeliverableMeta>((meta, patch) => ({...meta, ...(patch || {})}), {});
}

export function computeDeliverableQuantity(taskOrMeta?: {
  quantity?: number | null;
  checklist_items?: Array<{ quantity?: number | null; completed?: boolean }>;
}): { baseQuantity: number; checklistQuantity: number; totalQuantity: number } {
  const rawBase = Number(taskOrMeta?.quantity);
  const baseQuantity = Number.isFinite(rawBase) && rawBase > 0 ? rawBase : 0;
  const items = Array.isArray(taskOrMeta?.checklist_items) ? taskOrMeta.checklist_items : [];
  const checklistQuantity = items.reduce((sum, item) => {
    const q = Number(item?.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  // If user entered quantity for task/subtask or checklist items, take their sum.
  // Otherwise fallback to 1 unit of deliverable.
  const totalQuantity = (baseQuantity > 0 || checklistQuantity > 0)
    ? (baseQuantity + checklistQuantity)
    : 1;

  return { baseQuantity, checklistQuantity, totalQuantity };
}

export async function saveTaskDeliverables(
  entityType: 'task' | 'project_subtask' | 'campaign_subtask',
  entityId: string | number,
  updates: Partial<TaskDeliverableMeta>,
  profileId?: number | string | null,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
) {
  if (!entityId) return;
  const cacheKey = `${entityType}:${entityId}`;
  const { supabase } = await import('../services/supabase.ts');
  const {error} = await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: profileId ? Number(profileId) || null : null,
      action: 'details_updated',
      entity_type: entityType,
      entity_id: String(entityId),
      metadata: {
        ...updates,
        is_internal_detail_sync: true,
      },
  });
  if (error) throw error;
  setCachedDeliverable(cacheKey, updates);
  window.dispatchEvent(new Event('tasks:changed'));
}

export async function fetchTaskDeliverableMeta(
  entityType: 'task' | 'project_subtask' | 'campaign_subtask',
  entityId: string | number,
): Promise<TaskDeliverableMeta | undefined> {
  const cacheKey = `${entityType}:${entityId}`;
  const { supabase } = await import('../services/supabase.ts');
  const patches: TaskDeliverableMeta[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('metadata')
      .eq('entity_type', entityType)
      .eq('entity_id', String(entityId))
      .eq('action', 'details_updated')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    patches.push(...(data || []).map(row => row.metadata || {}));
    if (!data || data.length < 500) break;
  }
  if (!patches.length) return undefined;
  const meta = mergeDeliverableMetadata(patches);
  // Replace stale cache fields; persisted business data is authoritative.
  const cache = getStorageCache(); cache[cacheKey] = meta; setStorageCache(cache);
  return meta;
}
