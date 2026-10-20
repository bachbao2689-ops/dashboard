import { create } from 'zustand';
import { userCache } from '../lib/userCache';
import { markNotificationsRead, useNotificationStore } from './notificationStore';

interface SidebarDismissState {
  ownerId: string | null;
  dismissedKeys: string[];
  syncOwner: (userId?: number | string | null) => void;
  isDismissed: (key: string) => boolean;
  dismissEntity: (kind: 'task' | 'project' | 'campaign', id: string, extraNotifIds?: string[]) => void;
  clearAll: () => void;
}

const loadDismissed = (userId?: number | string | null): string[] => {
  const value = userCache.get<unknown>(userId, 'dismissed_sidebar_notifs', []);
  return Array.isArray(value) ? value.map(String) : [];
};

export const useSidebarNotificationDismissStore = create<SidebarDismissState>((set, get) => ({
  ownerId: null,
  dismissedKeys: [],
  syncOwner: (userId) => {
    const key = userId != null ? String(userId) : null;
    if (get().ownerId === key) return;
    set({
      ownerId: key,
      dismissedKeys: loadDismissed(key),
    });
  },
  isDismissed: (key: string) => {
    return get().dismissedKeys.includes(key);
  },
  dismissEntity: (kind, id, extraNotifIds) => {
    const key = kind === 'task' ? `task:${id}` : `track:${kind}:${id}`;
    const ownerId = get().ownerId;
    const current = get().dismissedKeys;

    if (!current.includes(key)) {
      const next = [...current, key];
      set({ dismissedKeys: next });
      if (ownerId) {
        userCache.set(ownerId, 'dismissed_sidebar_notifs', next);
      }
    }

    // Collect and mark all matching unread notifications in Supabase & notificationStore
    try {
      const { history, sidebarUnread, items } = useNotificationStore.getState();
      const all = [...history, ...sidebarUnread, ...items];
      const idStr = String(id);
      const toMark = new Set<string>(extraNotifIds || []);

      for (const n of all) {
        if (n.is_read) continue;
        if (kind === 'task') {
          const isTask = ['task', 'project_subtask', 'campaign_subtask'].includes(n.entity_type || '');
          if ((isTask && String(n.entity_id) === idStr) || String(n.metadata?.task_id) === idStr) {
            toMark.add(n.id);
          }
        } else {
          // project or campaign
          if (
            (n.entity_type === kind && String(n.entity_id) === idStr) ||
            (n.metadata?.parent_kind === kind && String(n.metadata?.parent_id) === idStr) ||
            (kind === 'project' && String(n.metadata?.project_id) === idStr) ||
            (kind === 'campaign' && String(n.metadata?.campaign_id) === idStr)
          ) {
            toMark.add(n.id);
          }
        }
      }

      if (toMark.size > 0) {
        void markNotificationsRead(Array.from(toMark)).catch(err => {
          console.warn('Could not mark entity notifications read:', err);
        });
      }
    } catch (e) {
      console.warn('Error collecting entity notifications to mark read:', e);
    }
  },
  clearAll: () => {
    const ownerId = get().ownerId;
    set({ dismissedKeys: [] });
    if (ownerId) {
      userCache.remove(ownerId, 'dismissed_sidebar_notifs');
    }
  },
}));
