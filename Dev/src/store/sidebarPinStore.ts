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
const loadNavIds = (userId?: number | string | null) => {
  const value = userCache.get<unknown>(userId, 'pinnedNavIds', []);
  return Array.isArray(value) ? value.map(String) : [];
};

interface SidebarPinState {
  ownerId: string | null;
  pinnedIds: string[];
  pinnedEntities: PinnedEntity[];
  pinnedNavIds: string[];
  syncOwner: (userId?: number | string | null) => void;
  refreshOwner: () => void;
  togglePin: (taskId: string, userId?: number | string | null) => void;
  isPinned: (taskId: string) => boolean;
  reorderPinnedTasks: (nextIds: string[], userId?: number | string | null) => void;
  toggleEntityPin: (entity: PinnedEntity, userId?: number | string | null) => void;
  unpinEntity: (kind: string, id: string) => void;
  reorderPinnedEntities: (nextEntities: PinnedEntity[], userId?: number | string | null) => void;
  toggleNavPin: (navId: string, userId?: number | string | null) => boolean;
  isNavPinned: (navId: string) => boolean;
  reorderPinnedNavs: (nextNavIds: string[], userId?: number | string | null) => void;
}

export const useSidebarPinStore = create<SidebarPinState>((set, get) => ({
  ownerId: null,
  pinnedIds: [],
  pinnedEntities: [],
  pinnedNavIds: [],
  syncOwner: (userId) => {
    const key = userId != null ? String(userId) : null;
    if (get().ownerId === key) return;
    set({
      ownerId: key,
      pinnedIds: loadTasks(key),
      pinnedEntities: loadEntities(key),
      pinnedNavIds: loadNavIds(key),
    });
  },
  refreshOwner: () => {
    const key = get().ownerId;
    set({
      pinnedIds: loadTasks(key),
      pinnedEntities: loadEntities(key),
      pinnedNavIds: loadNavIds(key),
    });
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
  reorderPinnedTasks: (nextIds, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    get().syncOwner(key);
    userCache.set(key, 'pinnedTasks', nextIds);
    set({ ownerId: key, pinnedIds: nextIds });
  },
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
  reorderPinnedEntities: (nextEntities, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    get().syncOwner(key);
    userCache.set(key, 'pinnedEntities', nextEntities);
    set({ ownerId: key, pinnedEntities: nextEntities });
  },
  toggleNavPin: (navId, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    get().syncOwner(key);
    const current = get().pinnedNavIds;
    const exists = current.includes(navId);
    const next = exists ? current.filter(id => id !== navId) : [navId, ...current];
    userCache.set(key, 'pinnedNavIds', next);
    set({ ownerId: key, pinnedNavIds: next });
    return !exists;
  },
  isNavPinned: (navId) => get().pinnedNavIds.includes(navId),
  reorderPinnedNavs: (nextNavIds, userId) => {
    const key = userId != null ? String(userId) : get().ownerId;
    get().syncOwner(key);
    userCache.set(key, 'pinnedNavIds', nextNavIds);
    set({ ownerId: key, pinnedNavIds: nextNavIds });
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
  const releaseNavs = userCache.subscribe(userId, 'pinnedNavIds', refresh);
  releasePins = () => { releaseTasks(); releaseEntities(); releaseNavs(); };
}
bindPins(useAuthStore.getState().profile?.id);
useAuthStore.subscribe((state, previous) => {
  if (state.profile?.id !== previous.profile?.id) bindPins(state.profile?.id);
});

