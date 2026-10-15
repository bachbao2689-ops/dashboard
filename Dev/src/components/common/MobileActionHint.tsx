import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

type Hint = {label: string; left: number; top: number};
export function MobileActionHint() {
  const [hint, setHint] = useState<Hint | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const clear = () => {clearTimeout(timer); setHint(null);};
    const show = (event: MouseEvent) => {
      if (!window.matchMedia('(max-width: 767px)').matches || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>('[data-mobile-label], .mobile-nav-container a, .dashboard-top-chrome button');
      if (!button || button.matches(':disabled') || button.closest('[inert]')) return;
      const label = button.dataset.mobileLabel || button.getAttribute('aria-label') || button.getAttribute('title');
      if (!label) return;
      const rect = button.getBoundingClientRect();
      clearTimeout(timer);
      setHint({label, left: Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2)),
        top: rect.top > 80 ? rect.top - 48 : rect.bottom + 8});
      timer = setTimeout(clear, 1800);
    };
    document.addEventListener('click', show, true);
    document.addEventListener('scroll', clear, {capture: true, passive: true});
    window.addEventListener('resize', clear);
    return () => {clearTimeout(timer); document.removeEventListener('click', show, true); document.removeEventListener('scroll', clear, true); window.removeEventListener('resize', clear);};
  }, []);
  return hint ? createPortal(<div role="status" className="mobile-action-hint" style={{left: hint.left, top: hint.top}}>{hint.label}</div>, document.body) : null;
}
