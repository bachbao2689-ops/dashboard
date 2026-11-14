/**
 * App Update Detection & Notification Service
 */

export const SOFTWARE_RELEASE_LABEL = 'Ver 1.02';

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
  private buildTime: string | null =
    typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : null;
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

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  public getBuildTime(): string | null {
    return this.buildTime;
  }

  public getReleaseLabel(): string {
    return SOFTWARE_RELEASE_LABEL;
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
   * Marks an update as available so staff are notified politely via menu badges
   * without blocking their workspace with forced popups.
   */
  public triggerUpdate(info?: Partial<UpdateInfo>) {
    this.isDismissedForSession = false;
    this.updateInfo = {
      version: info?.version || `v${Date.now().toString().slice(-4)}`,
      builtAt: info?.builtAt || new Date().toISOString(),
      title: info?.title || 'Có bản cập nhật mới',
      message:
        info?.message ||
        'Đã có bản cập nhật mới. Mở mục Software Update và bấm Update now để cập nhật.',
    };
    this.notify();
  }

  /**
   * User chooses to clear the pending indicator badge for the session
   */
  public dismissUpdate() {
    this.isDismissedForSession = true;
    this.updateInfo = null;
    this.notify();
  }

  /**
   * Checks whether any Service Worker already has a waiting update ready
   */
  public async hasWaitingServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.some(reg => Boolean(reg.waiting));
    } catch {
      return false;
    }
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
      window.location.reload();
    }
  }

  /**
   * Check /version.json and Service Worker registrations for a newer build
   */
  public async checkForUpdates(force = false): Promise<boolean> {
    if (this.isChecking) return Boolean(this.updateInfo);
    this.isChecking = true;
    if (force) {
      this.isDismissedForSession = false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
        if (reg) {
          await reg.update().catch(() => {});
          if (reg.waiting && (!this.isDismissedForSession || force)) {
            this.triggerUpdate();
            return true;
          }
        }
      }

      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (!res.ok) return Boolean(this.updateInfo);

      const data = await res.json();
      if (!data?.version) return Boolean(this.updateInfo);

      if (
        this.currentVersion &&
        this.currentVersion !== 'dev' &&
        data.version !== this.currentVersion &&
        (!this.isDismissedForSession || force)
      ) {
        this.triggerUpdate({
          version: data.version,
          builtAt: data.builtAt,
        });
        return true;
      }

      return Boolean(this.updateInfo);
    } catch {
      return Boolean(this.updateInfo);
    } finally {
      this.isChecking = false;
    }
  }

  private initServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
      if (registration.waiting) {
        this.triggerUpdate();
      }
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
    setTimeout(() => void this.checkForUpdates(), 2000);
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

if (typeof window !== 'undefined') {
  window.triggerAppUpdate = (info?: Partial<UpdateInfo>) => appUpdateService.triggerUpdate(info);
  window.checkForAppUpdate = () => appUpdateService.checkForUpdates(true);
}
