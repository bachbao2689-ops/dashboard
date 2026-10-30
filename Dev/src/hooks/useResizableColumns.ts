import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseResizableColumnsOptions {
  tableKey: string;
  initialWidths: number[];
  minWidth?: number;
}

export function useResizableColumns({
  tableKey,
  initialWidths,
  minWidth = 95,
}: UseResizableColumnsOptions) {
  const storageKey = `table_col_widths_v4_${tableKey}`;
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [widths, setWidths] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === initialWidths.length &&
          parsed.every((n) => typeof n === 'number' && !Number.isNaN(n) && n >= minWidth)
        ) {
          return parsed;
        }
      }
    } catch {
      // ignore storage access error
    }
    return initialWidths;
  });

  const isResizingRef = useRef(false);
  const activeColRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startWidthIRef = useRef(0);
  const startWidthNextRef = useRef(0);
  const snapshotWidthsRef = useRef<number[]>(widths);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const resetWidths = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    const parent = tableRef.current?.parentElement;
    const containerWidth = parent?.clientWidth || 0;
    const initialTotal = initialWidths.reduce((a, b) => a + b, 0);
    if (containerWidth > 0 && initialTotal > 0) {
      const ratio = containerWidth / initialTotal;
      let accumulated = 0;
      const scaled = initialWidths.map((w, idx) => {
        if (idx === initialWidths.length - 1) {
          return Math.max(minWidth, containerWidth - accumulated);
        }
        const nw = Math.max(minWidth, Math.round(w * ratio));
        accumulated += nw;
        return nw;
      });
      setWidths(scaled);
      widthsRef.current = scaled;
    } else {
      setWidths(initialWidths);
      widthsRef.current = initialWidths;
    }
  }, [storageKey, initialWidths, minWidth]);

  // Adapt widths to container proportionally so both table edges remain locked to the card
  useEffect(() => {
    const parent = tableRef.current?.parentElement;
    if (!parent) return;

    const adaptToContainer = () => {
      if (isResizingRef.current) return;
      const containerWidth = parent.clientWidth;
      if (!containerWidth) return;
      const baseWidths = widthsRef.current.length === initialWidths.length ? widthsRef.current : initialWidths;
      const currentTotal = baseWidths.reduce((a, b) => a + b, 0);
      if (currentTotal > 0 && Math.abs(containerWidth - currentTotal) > 1) {
        const ratio = containerWidth / currentTotal;
        let accumulated = 0;
        const scaled = baseWidths.map((w, idx) => {
          if (idx === baseWidths.length - 1) {
            return Math.max(minWidth, containerWidth - accumulated);
          }
          const nw = Math.max(minWidth, Math.round(w * ratio));
          accumulated += nw;
          return nw;
        });
        const hasChanged = scaled.some((val, i) => Math.abs(val - (widthsRef.current[i] ?? 0)) > 1);
        if (hasChanged) {
          setWidths(scaled);
          widthsRef.current = scaled;
        }
      }
    };

    adaptToContainer();

    const ro = new ResizeObserver(() => {
      adaptToContainer();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [minWidth, initialWidths.join(',')]);

  const startResize = useCallback(
    (colIndex: number, e: React.MouseEvent) => {
      // The last column cannot be resized since it has no right divider
      if (colIndex < 0 || colIndex >= widthsRef.current.length - 1) return;

      e.preventDefault();
      e.stopPropagation();

      isResizingRef.current = true;
      activeColRef.current = colIndex;

      // Lock current DOM widths of th elements to avoid any initial shift
      const target = e.currentTarget as HTMLElement;
      const row = target.closest('tr');
      const ths = row ? Array.from(row.querySelectorAll('th')) : [];

      let currentActualWidths = [...widthsRef.current];
      if (ths.length === widthsRef.current.length) {
        const domWidths = ths.map((th) => Math.round(th.getBoundingClientRect().width));
        if (domWidths.every((w) => w > 0)) {
          currentActualWidths = domWidths;
          widthsRef.current = domWidths;
          setWidths(domWidths);
        }
      }

      startXRef.current = e.clientX;
      startWidthIRef.current = currentActualWidths[colIndex];
      startWidthNextRef.current = currentActualWidths[colIndex + 1];
      snapshotWidthsRef.current = [...currentActualWidths];

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current || activeColRef.current === null) return;
        const idx = activeColRef.current;
        const delta = moveEvent.clientX - startXRef.current;
        const startI = startWidthIRef.current;
        const startNext = startWidthNextRef.current;

        const minDelta = minWidth - startI;
        const maxDelta = startNext - minWidth;
        const clampedDelta = Math.max(minDelta, Math.min(delta, maxDelta));

        const newI = Math.round(startI + clampedDelta);
        const newNext = Math.round(startNext - clampedDelta);

        setWidths(() => {
          const next = [...snapshotWidthsRef.current];
          next[idx] = newI;
          next[idx + 1] = newNext;
          widthsRef.current = next;
          return next;
        });
      };

      const handleMouseUp = () => {
        if (isResizingRef.current) {
          isResizingRef.current = false;
          activeColRef.current = null;
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          try {
            localStorage.setItem(storageKey, JSON.stringify(widthsRef.current));
          } catch {
            // ignore storage error
          }
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [minWidth, storageKey],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resetWidths();
    },
    [resetWidths],
  );

  useEffect(() => {
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const totalTableWidth = widths.reduce((acc, w) => acc + w, 0);

  return {
    tableRef,
    widths,
    startResize,
    resetWidths,
    handleDoubleClick,
    totalTableWidth,
  };
}
