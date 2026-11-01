import { create } from 'zustand';
import { userCache } from '../lib/userCache';
import { useAuthStore } from './authStore';

export type RecentItemKind = 'project' | 'campaign' | 'task' | 'subtask';

export interface RecentItem {
  id: string;
  title: string;
  kind: RecentItemKind;
  path: string;
  timestamp: number;
  parentName?: string;
}

const loadRecents = (userId?: number | string | null): RecentItem[] => {
  if (!userId) return [];
  const value = userCache.get<unknown>(userId, 'recentItems', null);
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((entry): entry is RecentItem =>
      Boolean(
        entry &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        ['project', 'campaign', 'task', 'subtask'].includes(entry.kind) &&
        typeof entry.path === 'string'
      )
    ).slice(0, 10);
  }
  return [];
};

interface RecentItemsState {
  ownerId: string | null;
  items: RecentItem[];
  syncOwner: (userId?: number | string | null) => void;
  addItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  clearItems: () => void;
}

export const useRecentItemsStore = create<RecentItemsState>((set, get) => ({
  ownerId: null,
  items: [],

  syncOwner: (userId) => {
    const key = userId != null ? String(userId) : null;
    if (get().ownerId === key) return;
    set({
      ownerId: key,
      items: loadRecents(key),
    });
  },

  addItem: (item) => {
    const key = get().ownerId || (useAuthStore.getState().profile?.id ? String(useAuthStore.getState().profile?.id) : null);
    if (!key) return;
    const current = get().items;
    // Deduplicate by id or path
    const filtered = current.filter((i) => i.id !== item.id && i.path !== item.path);
    const updated: RecentItem[] = [
      {
        ...item,
        timestamp: Date.now(),
      },
      ...filtered,
    ].slice(0, 10);

    userCache.set(key, 'recentItems', updated);
    set({ ownerId: key, items: updated });
  },

  clearItems: () => {
    const key = get().ownerId;
    if (key) userCache.set(key, 'recentItems', []);
    set({ items: [] });
  },
}));

// Auto-sync owner with authStore
useAuthStore.subscribe((state) => {
  useRecentItemsStore.getState().syncOwner(state.profile?.id);
});
