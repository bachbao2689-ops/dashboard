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

const DEFAULT_RECENT_ITEMS: RecentItem[] = [
  { id: 'rec-1', title: 'Wedding set up', kind: 'project', path: '/projects?project=wedding-setup', timestamp: Date.now() - 1000 * 60 * 5 },
  { id: 'rec-2', title: '39: BART SPACE', kind: 'task', path: '/tasks?task=39', timestamp: Date.now() - 1000 * 60 * 15 },
  { id: 'rec-3', title: 'BCM X MENTOS GUM - PROPOSAL', kind: 'campaign', path: '/projects?campaign=bcm-mentos', timestamp: Date.now() - 1000 * 60 * 30 },
  { id: 'rec-4', title: 'Execution Plan 23Apr (Cozy)', kind: 'project', path: '/projects?project=execution-plan', timestamp: Date.now() - 1000 * 60 * 60 },
  { id: 'rec-5', title: 'MOONY', kind: 'project', path: '/projects?project=moony', timestamp: Date.now() - 1000 * 60 * 120 },
  { id: 'rec-6', title: 'Ecommerce Quotation Shopee', kind: 'task', path: '/tasks?task=shopee-quote', timestamp: Date.now() - 1000 * 60 * 180 },
  { id: 'rec-7', title: 'identity spa', kind: 'project', path: '/projects?project=identity-spa', timestamp: Date.now() - 1000 * 60 * 240 },
  { id: 'rec-8', title: 'Sprint board', kind: 'task', path: '/workflow', timestamp: Date.now() - 1000 * 60 * 300 },
];

const loadRecents = (userId?: number | string | null): RecentItem[] => {
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
  return DEFAULT_RECENT_ITEMS;
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
  items: DEFAULT_RECENT_ITEMS,

  syncOwner: (userId) => {
    const key = userId != null ? String(userId) : null;
    if (get().ownerId === key) return;
    set({
      ownerId: key,
      items: loadRecents(key),
    });
  },

  addItem: (item) => {
    const key = get().ownerId;
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
    set({ items: updated });
  },

  clearItems: () => {
    const key = get().ownerId;
    userCache.set(key, 'recentItems', []);
    set({ items: [] });
  },
}));

// Auto-sync owner with authStore
useAuthStore.subscribe((state) => {
  useRecentItemsStore.getState().syncOwner(state.profile?.id);
});
