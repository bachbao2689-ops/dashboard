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

  // Khi có checklist items với số lượng (checklistQuantity > 0), thì totalQuantity = checklistQuantity
  // (tránh double count baseQuantity + checklistQuantity).
  // Nếu không có checklist quantity, dùng baseQuantity (nếu > 0) hoặc fallback về 1.
  const totalQuantity = checklistQuantity > 0
    ? checklistQuantity
    : (baseQuantity > 0 ? baseQuantity : 1);

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
  let existing = getCachedDeliverable(cacheKey);
  if (!existing || existing.checklist_items === undefined || existing.quantity === undefined) {
    const remote = await fetchTaskDeliverableMeta(entityType, entityId);
    if (remote) {
      existing = { ...remote, ...(existing || {}) };
    }
  }
  const merged: TaskDeliverableMeta = { ...(existing || {}), ...updates };
  setCachedDeliverable(cacheKey, merged);

  try {
    const { supabase } = await import('../services/supabase.ts');
    await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: profileId ? Number(profileId) || null : null,
      action: 'details_updated',
      entity_type: entityType,
      entity_id: String(entityId),
      metadata: {
        ...merged,
        is_internal_detail_sync: true,
      },
    });
  } catch (err) {
    console.warn('Failed to sync deliverable metadata to activity_log:', err);
  }
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
    const { data } = await supabase
      .from('activity_log')
      .select('metadata')
      .eq('entity_type', entityType)
      .eq('entity_id', String(entityId))
      .eq('action', 'details_updated')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data && data.length > 0) {
      // Merge across rows from oldest to newest so newest fields override older ones
      // without dropping fields recorded in an earlier details_updated row.
      const merged: TaskDeliverableMeta = {};
      for (let i = data.length - 1; i >= 0; i--) {
        const rowMeta = data[i]?.metadata;
        if (rowMeta && typeof rowMeta === 'object') {
          Object.assign(merged, rowMeta);
        }
      }
      setCachedDeliverable(cacheKey, merged);
      return merged;
    }
  } catch {
    // Ignore fetch error
  }
  return getCachedDeliverable(cacheKey);
}
