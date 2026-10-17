import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

type Entry = { value: unknown; updatedAt: number };
type Snapshot = Record<string, Entry>;
type Listener = () => void;

const PREFIX = 'kcoffee_preferences_v2_';
const snapshots = new Map<string, Snapshot>();
const listeners = new Map<string, Set<Listener>>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const validKey = (key: string) => /^[a-z][a-z0-9._:-]{0,79}$/.test(key);
const ownerKey = (userId: string | number) => String(userId);
const listenerKey = (userId: string | number, key: string) => `${userId}:${key}`;

function isEntry(value: unknown): value is Entry {
  return Boolean(value && typeof value === 'object' && 'value' in value && Number.isFinite((value as Entry).updatedAt));
}

function read(userId: string | number): Snapshot {
  if (typeof window === 'undefined') return {};
  const owner = ownerKey(userId);
  const cached = snapshots.get(owner);
  if (cached) return cached;
  let snapshot: Snapshot = {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${PREFIX}${owner}`) || '{}') as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      snapshot = Object.fromEntries(Object.entries(parsed).filter(([key, value]) => validKey(key) && isEntry(value))) as Snapshot;
    }
  } catch { /* Corrupt cache should not block login. */ }

  // Migrate only values that already belonged to this staff account.
  for (const key of ['theme', 'lang', 'sidebar']) {
    if (snapshot[key]) continue;
    try {
      const raw = window.localStorage.getItem(`cache_${owner}_${key}`);
      if (raw !== null) snapshot[key] = { value: JSON.parse(raw), updatedAt: 1 };
    } catch { /* Ignore an old malformed value. */ }
  }
  for (const [key, prefix] of [
    ['pinnedTasks', 'kcoffee_sidebar_pinned_tasks_'],
    ['pinnedEntities', 'kcoffee_sidebar_pinned_entities_'],
  ]) {
    if (snapshot[key]) continue;
    try {
      const raw = window.localStorage.getItem(`${prefix}${owner}`);
      if (raw !== null) snapshot[key] = { value: JSON.parse(raw), updatedAt: 1 };
    } catch { /* Ignore an old malformed value. */ }
  }
  snapshots.set(owner, snapshot);
  return snapshot;
}

function write(userId: string | number, snapshot: Snapshot) {
  if (typeof window === 'undefined') return;
  snapshots.set(ownerKey(userId), snapshot);
  try { window.localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify(snapshot)); }
  catch { /* Local storage may be disabled or full; the live UI still works. */ }
}

function notify(userId: string | number, key: string) {
  listeners.get(listenerKey(userId, key))?.forEach(listener => listener());
}

function queueRemote(userId: string | number, key: string, entry: Entry, delay = 700) {
  const id = listenerKey(userId, key);
  const timer = pending.get(id);
  if (timer) clearTimeout(timer);
  pending.set(id, setTimeout(async () => {
    pending.delete(id);
    if (String(useAuthStore.getState().profile?.id ?? '') !== String(userId)) return;
    const { error } = await supabase.rpc('dashboard_set_ui_preference', {
      p_user_id: Number(userId), p_key: key, p_value: entry.value, p_changed_ms: entry.updatedAt,
    });
    if (error) console.warn('Could not sync a dashboard preference:', error.message);
  }, delay));
}

export const userCache = {
  get<T>(userId: string | number | null | undefined, key: string, defaultValue: T): T {
    if (userId == null || !validKey(key)) return defaultValue;
    const entry = read(ownerKey(userId))[key];
    return entry && entry.value !== null ? entry.value as T : defaultValue;
  },
  set<T>(userId: string | number | null | undefined, key: string, value: T): void {
    if (userId == null || !validKey(key)) return;
    let encoded: string;
    try { encoded = JSON.stringify(value); } catch { return; }
    if (!encoded || encoded.length > 16000) return;
    const owner = ownerKey(userId), snapshot = { ...read(owner) };
    const entry = { value, updatedAt: Date.now() };
    snapshot[key] = entry;
    write(owner, snapshot);
    notify(owner, key);
    queueRemote(owner, key, entry);
  },
  remove(userId: string | number | null | undefined, key: string): void {
    if (userId == null || !validKey(key)) return;
    const owner = ownerKey(userId), snapshot = { ...read(owner) };
    const entry = { value: null, updatedAt: Date.now() };
    snapshot[key] = entry;
    write(owner, snapshot);
    notify(owner, key);
    queueRemote(owner, key, entry);
  },
  subscribe(userId: string | number | null | undefined, key: string, listener: Listener): () => void {
    if (userId == null || !validKey(key)) return () => {};
    const id = listenerKey(ownerKey(userId), key), set = listeners.get(id) || new Set<Listener>();
    set.add(listener); listeners.set(id, set);
    return () => { set.delete(listener); if (!set.size) listeners.delete(id); };
  },
  async sync(userId: string | number): Promise<void> {
    const owner = ownerKey(userId);
    if (String(useAuthStore.getState().profile?.id ?? '') !== owner) return;
    const { data, error } = await supabase.from('user_preferences').select('ui_state,language').eq('user_id', userId).maybeSingle();
    if (String(useAuthStore.getState().profile?.id ?? '') !== owner) return;
    if (error) { console.warn('Could not load dashboard preferences:', error.message); return; }
    const remote = data?.ui_state && typeof data.ui_state === 'object' && !Array.isArray(data.ui_state)
      ? Object.fromEntries(Object.entries(data.ui_state).filter(([key, value]) => validKey(key) && isEntry(value))) as Snapshot
      : {};
    if (!remote.lang && (data?.language === 'vi' || data?.language === 'en')) remote.lang = { value: data.language, updatedAt: 0 };
    const local = read(owner), merged: Snapshot = { ...remote };
    for (const [key, entry] of Object.entries(local)) {
      if (!remote[key] || entry.updatedAt > remote[key].updatedAt) {
        merged[key] = entry;
        queueRemote(owner, key, entry);
      }
    }
    write(owner, merged);
    for (const key of Object.keys(merged)) if (merged[key] !== local[key]) notify(owner, key);
  },
  cancelPending(userId: string | number): void {
    const prefix = `${userId}:`;
    for (const [key, timer] of pending) if (key.startsWith(prefix)) { clearTimeout(timer); pending.delete(key); }
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (!event.key?.startsWith(PREFIX)) return;
    const userId = event.key.slice(PREFIX.length);
    const oldKeys = Object.keys(snapshots.get(userId) || {});
    snapshots.delete(userId);
    for (const key of new Set([...oldKeys, ...Object.keys(read(userId))])) notify(userId, key);
  });
}
