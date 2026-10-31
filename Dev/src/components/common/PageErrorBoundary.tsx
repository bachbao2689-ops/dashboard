import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  errorMessage?: string;
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(error: any): State {
    return { failed: true, errorMessage: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, errorInfo);

    const msg = String(error?.message || error || '').toLowerCase();
    const isChunkLoadError =
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('is not a valid javascript mime type') ||
      msg.includes('unexpected token') ||
      msg.includes('loading chunk') ||
      msg.includes('importing a module script failed');

    if (isChunkLoadError) {
      const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');
      if (Date.now() - lastReload > 8000) {
        sessionStorage.setItem('last_chunk_reload', String(Date.now()));
        this.forceCleanReload();
      }
    }
  }

  forceCleanReload = () => {
    sessionStorage.removeItem('last_chunk_reload');
    if ('caches' in window) {
      try {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      } catch {
        // ignore cache delete error
      }
    }
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.set('_v', String(Date.now()));
    window.location.replace(cleanUrl.toString());
  };

  handleReload = () => {
    this.forceCleanReload();
  };

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className="card-hub rounded-2xl p-6 m-4 max-w-xl mx-auto text-center border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Chưa tải được trang. Có thể kết nối bị gián đoạn hoặc Dashboard vừa có bản cập nhật.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="push-settings-primary mt-4 min-h-[40px] px-5 py-2 text-sm font-semibold rounded-[8px] bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
          >
            Tải lại Dashboard
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
