import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuthStore } from '../store/authStore';
import { userCache } from '../lib/userCache';

/** Persists meaningful UI state per staff account, locally first and then to Supabase. */
export function useRememberedState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const userId = useAuthStore(state => state.profile?.id);
  const [state, setState] = useState<{ owner: number | undefined; value: T }>(() => ({
    owner: userId, value: userCache.get(userId, key, defaultValue),
  }));
  // A new account must never render the previous account's saved selection.
  const value = state.owner === userId ? state.value : userCache.get(userId, key, defaultValue);
  const current = useRef(value);
  current.current = value;

  useEffect(() => {
    const restore = () => {
      const next = userCache.get(userId, key, defaultValue);
      current.current = next;
      setState({ owner: userId, value: next });
    };
    restore();
    return userCache.subscribe(userId, key, restore);
  }, [userId, key]);

  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const next = typeof action === 'function' ? (action as (previous: T) => T)(current.current) : action;
    current.current = next;
    setState({ owner: userId, value: next });
    userCache.set(userId, key, next);
  }, [userId, key]);

  return [value, update];
}
