const STORAGE_KEY = 'kcoffee.phasePermissions.v1';
const WORKSPACE_ID = '9000eae0-528c-47a2-b6f3-eba019d4edca';

export function readPhasePermissionsCache(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writePhasePermissionsCache(map: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function getEntityPhasePermission(
  entityType: 'project' | 'campaign',
  entityId?: string | null,
  fallbackMap?: Record<string, boolean>
): boolean {
  if (!entityId) return true;
  const key = `${entityType}:${entityId}`;
  if (fallbackMap && key in fallbackMap) {
    return fallbackMap[key] !== false;
  }
  const cache = readPhasePermissionsCache();
  if (key in cache) {
    return cache[key] !== false;
  }
  return true;
}

export function setCachedPhasePermission(
  entityType: 'project' | 'campaign',
  entityId: string,
  allow: boolean
): void {
  if (!entityId) return;
  const cache = readPhasePermissionsCache();
  const key = `${entityType}:${entityId}`;
  cache[key] = allow;
  writePhasePermissionsCache(cache);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('phase-permission:changed', {
        detail: { entityType, entityId, allow },
      })
    );
  }
}

export async function saveEntityPhasePermission(
  supabase: any,
  entityType: 'project' | 'campaign',
  entityId: string,
  allow: boolean,
  userId?: number | string | null
): Promise<void> {
  if (!entityId) return;
  setCachedPhasePermission(entityType, entityId, allow);
  if (!supabase) return;
  try {
    await supabase.from('activity_log').insert({
      workspace_id: WORKSPACE_ID,
      user_id: userId ? Number(userId) : null,
      action: 'phase_permission_updated',
      entity_type: entityType,
      entity_id: entityId,
      metadata: { allow_phase_creation: allow },
    });
  } catch (err) {
    console.warn('Could not persist phase permission to activity_log:', err);
  }
}

export async function loadPhasePermissionsFromLogs(supabase: any): Promise<Record<string, boolean>> {
  const cache = readPhasePermissionsCache();
  if (!supabase) return cache;
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('entity_type, entity_id, action, metadata, created_at')
      .in('action', ['creation_details', 'phase_permission_updated'])
      .in('entity_type', ['project', 'campaign'])
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (!row.entity_type || !row.entity_id) return;
        const key = `${row.entity_type}:${row.entity_id}`;
        if (row.action === 'phase_permission_updated' && row.metadata && typeof row.metadata.allow_phase_creation === 'boolean') {
          cache[key] = row.metadata.allow_phase_creation;
        } else if (row.action === 'creation_details' && row.metadata && typeof row.metadata.allow_phase_creation === 'boolean') {
          if (cache[key] === undefined) {
            cache[key] = row.metadata.allow_phase_creation;
          }
        }
      });
      writePhasePermissionsCache(cache);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('phase-permission:changed', { detail: { all: true } }));
      }
    }
  } catch (err) {
    console.warn('Could not load phase permissions from activity_log:', err);
  }
  return cache;
}
