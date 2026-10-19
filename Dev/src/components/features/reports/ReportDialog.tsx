import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function ReportDialog({ title, closeLabel, onClose, children, footer, busy = false }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode; footer?: ReactNode; busy?: boolean;
}) {
  const heading = useId(), panel = useRef<HTMLDivElement>(null), closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; panel.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[9999] flex justify-end">
    <div className="absolute inset-0 bg-slate-950/25 dark:bg-slate-950/60" onClick={() => { if (!busy) onClose(); }} aria-hidden="true" />
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={heading} tabIndex={-1}
      className="relative flex h-full w-full max-w-[680px] flex-col overflow-hidden border-l border-blue-100 bg-white shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 sm:rounded-l-3xl"
      onKeyDown={event => {
        if (event.key === 'Escape' && !busy) { event.stopPropagation(); closeRef.current(); }
        if (event.key !== 'Tab') return;
        const items = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || [])];
        const first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
        <h2 id={heading} className="min-w-0 truncate text-lg font-bold text-gray-900 dark:text-white" title={title}>{title}</h2>
        <button type="button" aria-label={closeLabel} disabled={busy} onClick={onClose} className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-slate-100 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-40"><X size={20} /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
      {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-700 dark:bg-slate-900">{footer}</footer>}
    </div>
  </div>, document.body);
}
