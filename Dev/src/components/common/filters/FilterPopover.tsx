import {useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type RefObject} from 'react';
import {createPortal} from 'react-dom';

type Props = ComponentPropsWithoutRef<'div'> & {
  anchorRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  align?: 'left' | 'right';
  onClose: () => void;
};
/** Portal keeps compact toolbar menus outside clipped cards and viewport edges. */
export function FilterPopover({anchorRef, panelRef, align = 'left', onClose, children, ...props}: Props) {
  const [position, setPosition] = useState({left: 12, top: 12, maxHeight: 400, ready: false});
  const frame = useRef(0);
  useLayoutEffect(() => {
    const place = () => {
      const anchor = anchorRef.current, panel = panelRef.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(panel.offsetWidth, window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const upwards = below < Math.min(panel.scrollHeight, 240) && above > below;
      const maxHeight = Math.max(100, upwards ? above : below);
      const height = Math.min(panel.offsetHeight, maxHeight);
      setPosition({left: Math.max(12, Math.min(window.innerWidth - width - 12, align === 'right' ? rect.right - width : rect.left)),
        top: Math.max(12, upwards ? rect.top - height - 8 : rect.bottom + 8), maxHeight, ready: true});
    };
    const update = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(place);
    };
    place(); window.addEventListener('resize', update); document.addEventListener('scroll', update, {capture: true, passive: true});
    return () => {cancelAnimationFrame(frame.current); window.removeEventListener('resize', update); document.removeEventListener('scroll', update, true);};
  }, [anchorRef, panelRef, align]);
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('input, button:not(:disabled)')?.focus();
  }, [panelRef]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation(); onClose(); anchorRef.current?.querySelector('button')?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose, anchorRef]);
  return createPortal(<div {...props} data-filter-popover="true" ref={panelRef} style={{position: 'fixed', left: position.left, right: 'auto', top: position.top,
    maxWidth: 'calc(100vw - 24px)', maxHeight: position.maxHeight, overflowY: 'auto', marginTop: 0, zIndex: 10010,
    visibility: position.ready ? 'visible' : 'hidden'}}>{children}</div>, document.body);
}
