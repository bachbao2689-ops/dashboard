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
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem('last_chunk_reload', String(Date.now()));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('last_chunk_reload');
    window.location.reload();
  };

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className="card-hub rounded-2xl p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Chưa tải được trang. Có thể kết nối bị gián đoạn hoặc Dashboard vừa có bản cập nhật.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="push-settings-primary mt-3 min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl"
          >
            Tải lại Dashboard
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

