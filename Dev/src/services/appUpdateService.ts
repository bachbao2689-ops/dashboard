/**
 * App Update Detection & Notification Service
 */

export interface UpdateInfo {
  version: string;
  builtAt?: string;
  title?: string;
  message?: string;
}

type UpdateListener = (info: UpdateInfo | null) => void;

class AppUpdateService {
  private currentVersion: string =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  private updateInfo: UpdateInfo | null = null;
  private listeners: Set<UpdateListener> = new Set();
  private isChecking = false;
  private checkInterval: number | null = null;
  private isDismissedForSession = false;

  constructor() {
    this.initServiceWorker();
    this.startPolling();
    this.initVisibilityListeners();
  }

  public getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.updateInfo);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.updateInfo));
  }

  /**
   * Triggers the update notification popup manually or programmatically
   */
  public triggerUpdate(info?: Partial<UpdateInfo>) {
    this.isDismissedForSession = false;
    this.updateInfo = {
      version: info?.version || `v${Date.now().toString().slice(-4)}`,
      builtAt: info?.builtAt || new Date().toISOString(),
      title: info?.title || 'Bản cập nhật mới có sẵn',
      message:
        info?.message ||
        'Đã có bản cập nhật mới cho Dashboard. Bấm vào đây để tải lại và trải nghiệm ngay!',
    };
    this.notify();
  }

  /**
   * User chooses to dismiss/snooze the notification
   */
  public dismissUpdate() {
    this.isDismissedForSession = true;
    this.updateInfo = null;
    this.notify();
  }

  /**
   * Reload dashboard and activate latest deployment
   */
  public async reloadApp(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // Ignore cache clearing errors
    } finally {
      // Hard reload
      window.location.reload();
    }
  }

  /**
   * Check /version.json for newer build deployment
   */
  public async checkForUpdates(): Promise<boolean> {
    if (this.isChecking) return false;
    this.isChecking = true;

    try {
      // Check SW update
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => reg?.update()).catch(() => {});
      }

      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (!data?.version) return false;

      // In production (or if version changed from running version)
      if (
        this.currentVersion &&
        this.currentVersion !== 'dev' &&
        data.version !== this.currentVersion &&
        !this.isDismissedForSession
      ) {
        this.triggerUpdate({
          version: data.version,
          builtAt: data.builtAt,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  private initServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.triggerUpdate();
          }
        });
      });
    }).catch(() => {});
  }

  private startPolling() {
    if (typeof window === 'undefined') return;
    // Initial check after 12s
    setTimeout(() => void this.checkForUpdates(), 12000);
    // Poll every 90s
    this.checkInterval = window.setInterval(() => {
      void this.checkForUpdates();
    }, 90000);
  }

  public stopPolling() {
    if (this.checkInterval != null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private initVisibilityListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('focus', () => void this.checkForUpdates());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdates();
      }
    });
  }
}

export const appUpdateService = new AppUpdateService();

// Expose on global window object so it can be triggered from anywhere (console, buttons, scripts)
if (typeof window !== 'undefined') {
  window.triggerAppUpdate = (info?: Partial<UpdateInfo>) => appUpdateService.triggerUpdate(info);
  window.checkForAppUpdate = () => appUpdateService.checkForUpdates();
}
