import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

// Each consumer subscribes to its actual source tables. Debounce transaction bursts,
// refresh after reconnect/focus and keep a fallback for suspended mobile browsers.
export function useWorkspaceRealtime(tables: readonly string[], refresh: () => unknown, actor?: number) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [connected, setConnected] = useState(false);
  const key = [...tables].sort().join(',');
  useEffect(() => {
    setConnected(false);
    if (!actor) return;
    let disposed = false;
    let connectedOnce=false;
    let debounce: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(debounce);
      if(document.visibilityState==='hidden')return;
      debounce = setTimeout(() => { if (!disposed) void refreshRef.current(); }, 300);
    };
    let channel = supabase.channel(`workspace-${actor}-${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(',')) channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    channel.subscribe(status => {
      if (disposed) return;
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {if(connectedOnce)schedule();connectedOnce=true;}
    });
    const visible = () => { if (document.visibilityState === 'visible') schedule(); };
    const events = ['tasks:changed', 'projects:changed', 'campaigns:changed', 'workspace:changed'];
    events.forEach(event => window.addEventListener(event, schedule));
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    const fallback = setInterval(visible, 60000);
    return () => {
      disposed = true; clearTimeout(debounce); clearInterval(fallback);
      events.forEach(event => window.removeEventListener(event, schedule));
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
      void supabase.removeChannel(channel);
    };
  }, [key, actor]);
  return connected;
}
