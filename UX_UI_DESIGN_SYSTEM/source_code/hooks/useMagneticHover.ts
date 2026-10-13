import { useRef, useCallback } from 'react';

/**
 * Hook for smooth magnetic hover physics and cursor lighting spotlight
 */
export function useMagneticHover<T extends HTMLElement = HTMLDivElement>(strength: number = 0.15) {
  const ref = useRef<T>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Percent for spotlight gradient
    const px = Math.round((x / rect.width) * 100);
    const py = Math.round((y / rect.height) * 100);

    // Delta from center for subtle tilt / translate
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const deltaX = (x - centerX) * strength;
    const deltaY = (y - centerY) * strength;

    el.style.setProperty('--mouse-x', `${px}%`);
    el.style.setProperty('--mouse-y', `${py}%`);
    el.style.setProperty('--mag-x', `${deltaX.toFixed(2)}px`);
    el.style.setProperty('--mag-y', `${deltaY.toFixed(2)}px`);
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    el.style.removeProperty('--mouse-x');
    el.style.removeProperty('--mouse-y');
    el.style.removeProperty('--mag-x');
    el.style.removeProperty('--mag-y');
  }, []);

  return {
    ref,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}
