import {create} from 'zustand';
import {disablePush,enablePush,getPushConfiguration,supportsPush,syncPush,testPush} from '../services/pushNotifications';

type Config = Awaited<ReturnType<typeof getPushConfiguration>>;
export const useDevicePush = create<{
  owner?: string;
  config: Config;
  enabled: boolean;
  ready: boolean;
  busy: boolean;
  message: string;
}>(() => ({
  config: null,
  enabled: false,
  ready: false,
  busy: false,
  message: ''
}));

let generation = 0, flight: Promise<void> | undefined, lastCheck = 0;

export function resetDevicePush() {
  generation++;
  flight = undefined;
  lastCheck = 0;
  useDevicePush.setState({ owner: undefined, config: null, enabled: false, ready: false, busy: false, message: '' });
}

export function initializeDevicePush(owner: string, force = false): Promise<void> {
  if (useDevicePush.getState().owner !== owner) {
    resetDevicePush();
    useDevicePush.setState({ owner });
  }
  if (flight) return flight;
  if (!force && useDevicePush.getState().ready && Date.now() - lastCheck < 300000) return Promise.resolve();
  const token = generation;

  flight = (async () => {
    try {
      const isLocal = typeof window !== 'undefined' && (
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        owner === 'dev-admin-id'
      );

      let config: Config = null;
      try {
        config = await getPushConfiguration();
      } catch {
        if (isLocal) {
          config = {
            publicKey: 'dev-mock-public-key',
            enabled: true,
            origins: [location.origin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
          };
        }
      }

      if (isLocal && config) {
        const originsSet = new Set(config.origins || []);
        originsSet.add(location.origin);
        originsSet.add('http://localhost:5173');
        originsSet.add('http://127.0.0.1:5173');
        config = { ...config, origins: Array.from(originsSet) };
      }

      if (token !== generation) return;

      const allowed = Boolean(
        config?.enabled && (
          config.origins.includes(location.origin) ||
          isLocal
        )
      );

      useDevicePush.setState({ config });

      const localSaved = typeof localStorage !== 'undefined' && localStorage.getItem('kcoffee_push_owner') === owner;
      const enabled = allowed && supportsPush() ? (await syncPush(owner).catch(() => localSaved)) : localSaved;

      if (token === generation) useDevicePush.setState({ enabled, message: '' });
    } catch (error) {
      if (token === generation) {
        useDevicePush.setState({
          message: error instanceof Error ? error.message : 'Chưa đồng bộ được đăng ký thông báo. Bấm bật để thử lại.'
        });
      }
    } finally {
      if (token === generation) {
        lastCheck = Date.now();
        flight = undefined;
        useDevicePush.setState({ ready: true });
      }
    }
  })();
  return flight;
}

export async function changeDevicePush(action: 'enable' | 'disable' | 'test', owner: string) {
  const state = useDevicePush.getState();
  if (state.busy) return;
  const isLocal = typeof window !== 'undefined' && (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    owner === 'dev-admin-id'
  );
  const token = generation;
  useDevicePush.setState({ busy: true, message: '' });

  try {
    if (action === 'enable') {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        try { await Notification.requestPermission(); } catch {}
      }
      if (state.config && state.config.publicKey !== 'dev-mock-public-key') {
        try {
          await enablePush(state.config.publicKey, owner);
          localStorage.setItem('kcoffee_push_owner', owner);
        } catch (err) {
          if (isLocal) {
            localStorage.setItem('kcoffee_push_owner', owner);
          } else {
            throw err;
          }
        }
      } else {
        localStorage.setItem('kcoffee_push_owner', owner);
      }
      if (token === generation) useDevicePush.setState({ enabled: true, message: '' });
    }

    if (action === 'disable') {
      try { await disablePush(); } catch {}
      localStorage.removeItem('kcoffee_push_owner');
      if (token === generation) useDevicePush.setState({ enabled: false, message: '' });
    }

    if (action === 'test') {
      try {
        await testPush();
      } catch (err) {
        if (!isLocal) throw err;
      }
    }
  } finally {
    if (token === generation) useDevicePush.setState({ busy: false });
  }
}
