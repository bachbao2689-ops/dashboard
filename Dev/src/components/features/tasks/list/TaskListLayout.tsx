import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Reserve the actual rendered panel width, including its viewport clamp. */
export function TaskListLayout({ panelKey, children }: { panelKey: string | null; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !panelKey) return;
    const panel = root.querySelector<HTMLElement>('.dashboard-detail-drawer:not([aria-hidden="true"])');
    if (!panel) return;
    const measure = () => {
      const reserved = Math.max(0, root.getBoundingClientRect().right - panel.getBoundingClientRect().left);
      root.style.setProperty('--task-list-panel-space', `${reserved}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(root);
    panel.addEventListener('animationend', measure);
    panel.addEventListener('transitionend', measure);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      panel.removeEventListener('animationend', measure);
      panel.removeEventListener('transitionend', measure);
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--task-list-panel-space');
    };
  }, [panelKey]);

  return <div ref={rootRef} className="all-tasks-page" data-panel-open={!!panelKey}>{children}</div>;
}
