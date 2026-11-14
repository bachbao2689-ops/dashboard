import { useEffect, type RefObject } from 'react';
import { shouldDismissDrawerOnOutsideClick } from '../lib/smartOutsideClick';

interface UseSmartDrawerOutsideCloseOptions {
  isOpen: boolean;
  disabled?: boolean;
  drawerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  openDelayMs?: number;
}

/**
 * Smart auto-collapse for sliding detail drawers:
 * Closes ONLY when the user clicks/taps empty non-interactive whitespace, while
 * keeping the drawer open and preserving interactions when clicking any outside UI
 * control, button, dropdown, popover, card or row.
 */
export function useSmartDrawerOutsideClose({
  isOpen,
  disabled = false,
  drawerRef,
  onClose,
  openDelayMs = 60,
}: UseSmartDrawerOutsideCloseOptions) {
  useEffect(() => {
    if (!isOpen || disabled) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (event instanceof MouseEvent && event.button !== 0) return;
      if (
        shouldDismissDrawerOnOutsideClick({
          target: event.target,
          drawerEl: drawerRef.current,
          doc: document,
        })
      ) {
        onClose();
      }
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown, { passive: true });
    }, openDelayMs);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, disabled, drawerRef, onClose, openDelayMs]);
}
