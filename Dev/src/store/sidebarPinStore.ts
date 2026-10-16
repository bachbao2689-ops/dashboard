import { create } from 'zustand';

const STORAGE_PREFIX = 'kcoffee_sidebar_pinned_tasks_';
const ENTITY_PREFIX = 'kcoffee_sidebar_pinned_entities_';

export type PinnedEntity = { kind: 'project' | 'campaign'; id: string; name: string };

function load<T>(prefix: string, userId?: number | string | null): T[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${prefix}${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(prefix: string, userId: number | string | null | undefined, value: unknown) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${prefix}${userId}`, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

interface SidebarPinState {
  ownerId: string | null;
  pinnedIds: string[];
  pinnedEntities: PinnedEntity[];
  syncOwner: (userId?: number | string | null) => void;
  togglePin: (taskId: string, userId?: number | string | null) => void;
  isPinned: (taskId: string) => boolean;
  toggleEntityPin: (entity: PinnedEntity, userId?: number | string | null) => void;
  unpinEntity: (kind: string, id: string) => void;
}

export const useSidebarPinStore = create<SidebarPinState>((set, get) => ({
  ownerId: null,
  pinnedIds: [],
  pinnedEntities: [],
  syncOwner: (userId) => {
    const key = userId != null ? String(userId) : null;
    if (get().ownerId === key) return;
    set({
      ownerId: key,
      pinnedIds: load<string>(STORAGE_PREFIX, key).map(String),
      pinnedEntities: load<PinnedEntity>(ENTITY_PREFIX, key),
    });
  },
  togglePin: (taskId, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    const current = get().pinnedIds;
    const next = current.includes(taskId) ? current.filter(id => id !== taskId) : [taskId, ...current];
    save(STORAGE_PREFIX, key, next);
    set({ ownerId: key, pinnedIds: next });
  },
  isPinned: (taskId) => get().pinnedIds.includes(taskId),
  toggleEntityPin: (entity, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    const current = get().pinnedEntities;
    const exists = current.some(e => e.kind === entity.kind && e.id === entity.id);
    const next = exists
      ? current.filter(e => !(e.kind === entity.kind && e.id === entity.id))
      : [entity, ...current];
    save(ENTITY_PREFIX, key, next);
    set({ ownerId: key, pinnedEntities: next });
  },
  unpinEntity: (kind, id) => {
    const key = get().ownerId;
    const next = get().pinnedEntities.filter(e => !(e.kind === kind && e.id === id));
    save(ENTITY_PREFIX, key, next);
    set({ pinnedEntities: next });
  },
}));
