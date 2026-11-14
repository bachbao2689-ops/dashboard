const SELECTOR = '.crop-blur-edge, .truncate, .grid-flow-col.overflow-hidden';
const SKIP_TAGS = new Set([
  'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'SVG', 'CANVAS', 'IMG',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
]);

let rafId = 0;

function updateAll() {
  rafId = 0;
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll<HTMLElement>(SELECTOR);
  nodes.forEach((el) => {
    if (SKIP_TAGS.has(el.tagName) || el.closest('.recharts-wrapper, .no-crop-blur')) {
      el.classList.remove('is-edge-cropped');
      return;
    }
    const clientW = el.clientWidth;
    if (clientW <= 0) {
      el.classList.remove('is-edge-cropped');
      return;
    }
    const isCropped = el.scrollWidth > clientW + 2;
    el.classList.toggle('is-edge-cropped', isCropped);
  });
}

function scheduleUpdate() {
  if (rafId || typeof window === 'undefined') return;
  rafId = window.requestAnimationFrame(updateAll);
}

export function initEdgeCropBlur(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let mutationObserver: MutationObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const start = () => {
    scheduleUpdate();

    if (typeof MutationObserver !== 'undefined' && document.body) {
      mutationObserver = new MutationObserver(() => {
        scheduleUpdate();
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

    if (typeof ResizeObserver !== 'undefined' && document.body) {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate();
      });
      resizeObserver.observe(document.body);
    }

    window.addEventListener('resize', scheduleUpdate, { passive: true });
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      void document.fonts.ready.then(() => scheduleUpdate());
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', scheduleUpdate);
  };
}
