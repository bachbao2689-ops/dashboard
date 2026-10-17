import { create } from 'zustand';
import { userCache } from '../lib/userCache';
import { useAuthStore } from './authStore';

export type PinnedEntity = { kind: 'project' | 'campaign'; id: string; name: string };

const loadTasks = (userId?: number | string | null) => {
  const value = userCache.get<unknown>(userId, 'pinnedTasks', []);
  return Array.isArray(value) ? value.map(String) : [];
};
const loadEntities = (userId?: number | string | null) => {
  const value = userCache.get<unknown>(userId, 'pinnedEntities', []);
  return Array.isArray(value) ? value.filter((entry): entry is PinnedEntity =>
    Boolean(entry && typeof entry === 'object' && ['project', 'campaign'].includes(entry.kind) && typeof entry.id === 'string' && typeof entry.name === 'string')) : [];
};

interface SidebarPinState {
  ownerId: string | null;
  pinnedIds: string[];
  pinnedEntities: PinnedEntity[];
  syncOwner: (userId?: number | string | null) => void;
  refreshOwner: () => void;
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
      pinnedIds: loadTasks(key),
      pinnedEntities: loadEntities(key),
    });
  },
  refreshOwner: () => {
    const key = get().ownerId;
    set({ pinnedIds: loadTasks(key), pinnedEntities: loadEntities(key) });
  },
  togglePin: (taskId, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    get().syncOwner(key);
    const current = get().pinnedIds;
    const next = current.includes(taskId) ? current.filter(id => id !== taskId) : [taskId, ...current];
    userCache.set(key, 'pinnedTasks', next);
    set({ ownerId: key, pinnedIds: next });
  },
  isPinned: (taskId) => get().pinnedIds.includes(taskId),
  toggleEntityPin: (entity, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    get().syncOwner(key);
    const current = get().pinnedEntities;
    const exists = current.some(e => e.kind === entity.kind && e.id === entity.id);
    const next = exists
      ? current.filter(e => !(e.kind === entity.kind && e.id === entity.id))
      : [entity, ...current];
    userCache.set(key, 'pinnedEntities', next);
    set({ ownerId: key, pinnedEntities: next });
  },
  unpinEntity: (kind, id) => {
    const key = get().ownerId;
    const next = get().pinnedEntities.filter(e => !(e.kind === kind && e.id === id));
    userCache.set(key, 'pinnedEntities', next);
    set({ pinnedEntities: next });
  },
}));

let releasePins = () => {};
function bindPins(userId?: number | null) {
  releasePins();
  useSidebarPinStore.getState().syncOwner(userId);
  if (userId == null) { releasePins = () => {}; return; }
  const refresh = () => useSidebarPinStore.getState().refreshOwner();
  const releaseTasks = userCache.subscribe(userId, 'pinnedTasks', refresh);
  const releaseEntities = userCache.subscribe(userId, 'pinnedEntities', refresh);
  releasePins = () => { releaseTasks(); releaseEntities(); };
}
bindPins(useAuthStore.getState().profile?.id);
useAuthStore.subscribe((state, previous) => {
  if (state.profile?.id !== previous.profile?.id) bindPins(state.profile?.id);
});
