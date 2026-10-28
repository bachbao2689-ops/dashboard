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

  const startResize = useCallback(
    (colIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isResizingRef.current = true;
      activeColRef.current = colIndex;
      startXRef.current = e.clientX;
      startWidthRef.current = widthsRef.current[colIndex];

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current || activeColRef.current === null) return;
        const delta = moveEvent.clientX - startXRef.current;
        const newWidth = Math.max(minWidth, Math.round(startWidthRef.current + delta));
        setWidths((prev) => {
          const next = [...prev];
          next[activeColRef.current!] = newWidth;
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
    widths,
    startResize,
    totalTableWidth,
  };
}
