/**
 * Global Magnetic Spotlight Hover Manager
 * 
 * Implements physics-based magnetic tracking with lerp interpolation:
 * - On hover: element slightly scales up, shadow deepens, border & glow highlight.
 * - On mousemove: mouse position relative to element is normalized and smoothly chased
 *   via requestAnimationFrame lerp (easing), giving an elastic magnetic feel.
 * - On mouseleave: coordinates, scale, and highlight smoothly tween back to center/default.
 */

export const MAGNETIC_SELECTOR = [
  '.btn-magnetic',
  '.btn-add-new',
  '.btn-new-task',
  '.hover-magnetic',
  '.hover-magnetic-btn',
  '.hover-magnetic-card',
  '.hover-row-effect',
  '[data-magnetic]',
].join(', ');

interface ActiveMagnetic {
  element: HTMLElement;
  rect: DOMRect;
  // Current interpolated values
  currX: number; // percentage (0 - 100)
  currY: number; // percentage (0 - 100)
  currMagX: number; // px
  currMagY: number; // px
  // Target values
  targetX: number;
  targetY: number;
  targetMagX: number;
  targetMagY: number;
  isLeaving: boolean;
  maxPull: number;
}

let active: ActiveMagnetic | null = null;
let rafId: number | null = null;

const LERP_FACTOR = 0.15; // Smooth trailing chase speed
const EPSILON = 0.1; // Settle threshold

function animate() {
  if (!active) {
    rafId = null;
    return;
  }

  const { element, isLeaving } = active;

  // Lerp interpolation: current += (target - current) * factor
  active.currX += (active.targetX - active.currX) * LERP_FACTOR;
  active.currY += (active.targetY - active.currY) * LERP_FACTOR;
  active.currMagX += (active.targetMagX - active.currMagX) * LERP_FACTOR;
  active.currMagY += (active.targetMagY - active.currMagY) * LERP_FACTOR;

  element.style.setProperty('--mouse-x', `${active.currX.toFixed(2)}%`);
  element.style.setProperty('--mouse-y', `${active.currY.toFixed(2)}%`);
  element.style.setProperty('--mag-x', `${active.currMagX.toFixed(2)}px`);
  element.style.setProperty('--mag-y', `${active.currMagY.toFixed(2)}px`);

  if (isLeaving) {
    const diffX = Math.abs(active.currX - 50);
    const diffY = Math.abs(active.currY - 50);
    const diffMag = Math.abs(active.currMagX) + Math.abs(active.currMagY);

    if (diffX < EPSILON && diffY < EPSILON && diffMag < EPSILON) {
      // Returned smoothly to center default!
      element.classList.remove('is-magnetic-active');
      element.style.removeProperty('--mouse-x');
      element.style.removeProperty('--mouse-y');
      element.style.removeProperty('--mag-x');
      element.style.removeProperty('--mag-y');
      element.style.removeProperty('--has-magnetic');
      active = null;
      rafId = null;
      return;
    }
  }

  rafId = requestAnimationFrame(animate);
}

function startLeaving() {
  if (active && !active.isLeaving) {
    active.isLeaving = true;
    active.targetX = 50;
    active.targetY = 50;
    active.targetMagX = 0;
    active.targetMagY = 0;
    if (!rafId) {
      rafId = requestAnimationFrame(animate);
    }
  }
}

export function initMagneticHover(): () => void {
  // Only activate on devices with true mouse/hover pointer support
  if (typeof window === 'undefined') return () => {};

  const hoverQuery = window.matchMedia('(hover: hover)');
  if (!hoverQuery.matches) return () => {};

  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;

    const rawTarget = e.target as Element | null;
    const magneticEl = rawTarget?.closest?.(MAGNETIC_SELECTOR) as HTMLElement | null;

    if (magneticEl) {
      const maxPull = parseFloat(magneticEl.dataset.magneticPull || '3.5');

      if (!active || active.element !== magneticEl) {
        // Switched to a new magnetic target
        if (active && active.element !== magneticEl) {
          active.element.classList.remove('is-magnetic-active');
          active.element.style.removeProperty('--mouse-x');
          active.element.style.removeProperty('--mouse-y');
          active.element.style.removeProperty('--mag-x');
          active.element.style.removeProperty('--mag-y');
          active.element.style.removeProperty('--has-magnetic');
        }

        const rect = magneticEl.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));

        magneticEl.classList.add('is-magnetic-active');
        magneticEl.style.setProperty('--has-magnetic', '1');

        active = {
          element: magneticEl,
          rect,
          currX: 50,
          currY: 50,
          currMagX: 0,
          currMagY: 0,
          targetX: normX * 100,
          targetY: normY * 100,
          targetMagX: (normX - 0.5) * maxPull * 2,
          targetMagY: (normY - 0.5) * maxPull * 2,
          isLeaving: false,
          maxPull,
        };

        if (!rafId) {
          rafId = requestAnimationFrame(animate);
        }
      } else {
        // Continuing on current magnetic element
        const rect = active.rect;
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));

        active.targetX = normX * 100;
        active.targetY = normY * 100;
        active.targetMagX = (normX - 0.5) * active.maxPull * 2;
        active.targetMagY = (normY - 0.5) * active.maxPull * 2;
        active.isLeaving = false;

        if (!rafId) {
          rafId = requestAnimationFrame(animate);
        }
      }
    } else {
      startLeaving();
    }
  };

  const handlePointerLeave = () => {
    startLeaving();
  };

  const handleScrollOrResize = () => {
    if (active && active.element && !active.isLeaving) {
      active.rect = active.element.getBoundingClientRect();
    }
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
  window.addEventListener('resize', handleScrollOrResize, { passive: true });

  return () => {
    window.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerleave', handlePointerLeave);
    window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    window.removeEventListener('resize', handleScrollOrResize);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}
