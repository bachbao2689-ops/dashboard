import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseResizableColumnsOptions {
  tableKey: string;
  initialWidths: number[];
  minWidth?: number;
}

export function useResizableColumns({
  tableKey,
  initialWidths,
  minWidth = 50,
}: UseResizableColumnsOptions) {
  const storageKey = `table_col_widths_${tableKey}`;
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
  const startWidthRef = useRef(0);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  // On first mount without saved widths, if initial total < container width, scale once to fill container
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved && tableRef.current?.parentElement) {
        const containerWidth = tableRef.current.parentElement.clientWidth;
        const currentTotal = widthsRef.current.reduce((a, b) => a + b, 0);
        if (containerWidth > currentTotal && currentTotal > 0) {
          const ratio = containerWidth / currentTotal;
          const scaled = widthsRef.current.map((w, idx) => {
            if (idx === widthsRef.current.length - 1) {
              const sumOthers = widthsRef.current
                .slice(0, -1)
                .reduce((acc, curr) => acc + Math.round(curr * ratio), 0);
              return Math.max(minWidth, containerWidth - sumOthers);
            }
            return Math.max(minWidth, Math.round(w * ratio));
          });
          setWidths(scaled);
          widthsRef.current = scaled;
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey, minWidth]);

  const startResize = useCallback(
    (colIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isResizingRef.current = true;
      activeColRef.current = colIndex;

      // Lock current DOM widths to avoid any layout shifts or proportion jumps
      const target = e.currentTarget as HTMLElement;
      const row = target.closest('tr');
      const ths = row ? Array.from(row.querySelectorAll('th')) : [];

      let currentActualWidths = widthsRef.current;
      if (ths.length === widthsRef.current.length) {
        const domWidths = ths.map((th) => Math.round(th.getBoundingClientRect().width));
        if (domWidths.every((w) => w > 0)) {
          currentActualWidths = domWidths;
          widthsRef.current = domWidths;
          setWidths(domWidths);
        }
      }

      startXRef.current = e.clientX;
      startWidthRef.current = currentActualWidths[colIndex];

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current || activeColRef.current === null) return;
        const delta = moveEvent.clientX - startXRef.current;
        const newWidth = Math.max(minWidth, Math.round(startWidthRef.current + delta));

        setWidths((prev) => {
          const next = [...prev];
          next[activeColRef.current!] = newWidth;
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
    totalTableWidth,
  };
}
