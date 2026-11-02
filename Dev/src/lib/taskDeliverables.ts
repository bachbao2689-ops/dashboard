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
  completed_at?: string | null;
}

export interface TaskDeliverableMeta {
  quantity?: number | null;
  base_quantity?: number | null;
  target_department_id?: string | null;
  target_department_name?: string | null;
  checklist_items?: DeliverableChecklistItem[];
  description?: string;
  image_url?: string | null;
  [key: string]: any;
}

const STORAGE_KEY = 'kcoffee.deliverables.v1';

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
  base_quantity?: number | null;
  checklist_items?: Array<{ quantity?: number | null; completed?: boolean }>;
}): { baseQuantity: number; checklistQuantity: number; totalQuantity: number } {
  // Current detail snapshots store quantity as the aggregate and base_quantity
  // as the subtask's own output. Older creation events stored only the base.
  const rawBase = Number(taskOrMeta && 'base_quantity' in taskOrMeta ? taskOrMeta.base_quantity : taskOrMeta?.quantity);
  const baseQuantity = Number.isFinite(rawBase) && rawBase > 0 ? rawBase : 0;
  const items = Array.isArray(taskOrMeta?.checklist_items) ? taskOrMeta.checklist_items : [];
  const checklistQuantity = items.reduce((sum, item) => {
    const q = Number(item?.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  // Missing output quantity is zero images/files; the work still counts as one task.
  const totalQuantity = baseQuantity + checklistQuantity;

  return { baseQuantity, checklistQuantity, totalQuantity };
}

export async function saveTaskDeliverables(
  entityType: 'task' | 'project_subtask' | 'campaign_subtask',
  entityId: string | number,
  updates: Partial<TaskDeliverableMeta>,
  _profileId?: number | string | null,
  _workspaceId?: string,
  expectedItems?: DeliverableChecklistItem[],
) {
  if (!entityId) throw new Error('Chưa xác định được công việc.');
  const {supabase} = await import('../services/supabase.ts');
  const {data,error} = await supabase.rpc('save_task_deliverables', {
    p_kind: entityType, p_id: String(entityId), p_updates: updates,
    p_expected_items: expectedItems ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error('Không thể lưu số lượng công việc.');
  setCachedDeliverable(`${entityType}:${entityId}`, data);
  window.dispatchEvent(new Event('tasks:changed'));
}

export async function fetchTaskDeliverableMeta(
  entityType: 'task' | 'project_subtask' | 'campaign_subtask',
  entityId: string | number,
  forceRefresh = false,
): Promise<TaskDeliverableMeta | undefined> {
  const cacheKey = `${entityType}:${entityId}`;
  if (!forceRefresh) {
    const cached = getCachedDeliverable(cacheKey);
    if (cached && (cached.checklist_items !== undefined || cached.quantity !== undefined)) return cached;
  }
  try {
    const { supabase } = await import('../services/supabase.ts');
    const rows: any[] = [];
    for (let offset = 0;; offset += 500) {
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
      rows.push(...(data || []));
      if (!data || data.length < 500) break;
    }
    if (rows.length > 0) {
      // Merge across rows from oldest to newest so newest fields override older ones
      // without dropping fields recorded in an earlier details_updated row.
      const merged: TaskDeliverableMeta = {};
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowMeta = rows[i]?.metadata;
        if (rowMeta && typeof rowMeta === 'object') {
          Object.assign(merged, rowMeta);
        }
      }
      setCachedDeliverable(cacheKey, merged);
      return merged;
    }
  } catch (error) {
    if (forceRefresh) throw error;
  }
  return forceRefresh ? undefined : getCachedDeliverable(cacheKey);
}
