import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  captureAnchorRect,
  computeAnchoredPopoverCoords,
  type AnchorRectSnapshot,
  type AnchoredPopoverCoords,
} from '../../lib/anchoredPopoverPosition';

export interface AnchoredConfirmPopoverProps {
  isOpen: boolean;
  tone: 'danger' | 'warning';
  icon: React.ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  anchorEl?: HTMLElement | null;
  anchorRect?: AnchorRectSnapshot | null;
  busy?: boolean;
  extraNotice?: React.ReactNode;
}

const POPOVER_MAX_WIDTH = 300;
const EST_POPOVER_HEIGHT = 188;

export const AnchoredConfirmPopover: React.FC<AnchoredConfirmPopoverProps> = ({
  isOpen,
  tone,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  anchorEl = null,
  anchorRect = null,
  busy = false,
  extraNotice,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const resolveCurrentRect = useCallback(() => {
    if (anchorEl && anchorEl.isConnected) {
      return captureAnchorRect(anchorEl) ?? anchorRect;
    }
    return anchorRect ?? captureAnchorRect(anchorEl);
  }, [anchorEl, anchorRect]);

  const computeFromRect = useCallback((rect: AnchorRectSnapshot | null): AnchoredPopoverCoords | null => {
    if (!rect || typeof window === 'undefined') return null;
    const measuredWidth =
      popoverRef.current?.offsetWidth || Math.min(POPOVER_MAX_WIDTH, window.innerWidth - 24);
    const measuredHeight = popoverRef.current?.offsetHeight || EST_POPOVER_HEIGHT;
    return computeAnchoredPopoverCoords(
      rect,
      measuredWidth,
      measuredHeight,
      window.innerWidth,
      window.innerHeight
    );
  }, []);

  const [coords, setCoords] = useState<AnchoredPopoverCoords | null>(() =>
    isOpen ? computeFromRect(resolveCurrentRect()) : null
  );

  const updatePosition = useCallback(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    setCoords(computeFromRect(resolveCurrentRect()));
  }, [isOpen, computeFromRect, resolveCurrentRect]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition, title, message, extraNotice]);

  // Synchronous fallback before layout measurement so first open never flashes centered modal.
  const activeCoords = coords ?? (isOpen ? computeFromRect(resolveCurrentRect()) : null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onCancel();
      }
    };

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (busy) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (anchorEl && anchorEl.contains(target)) return;
      onCancel();
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, busy, anchorEl, onCancel, updatePosition]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isDanger = tone === 'danger';
  const iconToneClass = isDanger
    ? 'bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200/70 dark:border-red-500/30'
    : 'bg-amber-500/12 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/30';
  const confirmButtonClass = isDanger
    ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs dark:bg-red-600 dark:hover:bg-red-500'
    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs dark:bg-amber-500 dark:hover:bg-amber-400';

  const cardSurfaceClass =
    'w-[300px] max-w-[calc(100vw-24px)] rounded-[12px] dark:rounded-[8px] border border-white/90 ring-1 ring-[#dce8fa] bg-gradient-to-br from-white/96 to-[#f5faff]/92 backdrop-blur-xl shadow-[inset_0_1.5px_1px_0_rgba(255,255,255,1),inset_0_0_14px_0_rgba(255,255,255,0.45),0_14px_30px_-6px_rgba(0,46,109,0.16),0_4px_10px_-2px_rgba(0,0,0,0.06)] text-gray-800 dark:ring-0 dark:bg-none dark:bg-[#0a192f] dark:border-slate-700/80 dark:text-slate-100 dark:shadow-2xl overflow-hidden';

  const cardContent = (
    <div
      ref={popoverRef}
      role="alertdialog"
      aria-modal={!activeCoords}
      aria-label={title}
      data-anchored-popover="true"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={
        activeCoords
          ? {
              position: 'fixed',
              top: `${activeCoords.top}px`,
              left: `${activeCoords.left}px`,
              zIndex: 10060,
              transformOrigin: activeCoords.placeAbove ? 'bottom center' : 'top center',
            }
          : undefined
      }
      className={`${cardSurfaceClass} animate-in fade-in zoom-in-95 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]`}
    >
      {/* Compact Header */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-3.5 pt-3 pb-2 border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#071325]/60">
        <div className={`w-7 h-7 rounded-[8px] grid place-items-center shrink-0 ${iconToneClass}`}>
          {icon}
        </div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-snug truncate">
          {title}
        </h3>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          aria-label={cancelLabel}
          className="p-1 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5 space-y-2">
        <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed break-words">
          {message}
        </p>
        {extraNotice}
      </div>

      {/* Compact Action Footer */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-3 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="w-full py-1.5 px-3 rounded-[8px] text-xs font-semibold text-gray-700 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`w-full py-1.5 px-3 rounded-[8px] text-xs font-bold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${confirmButtonClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );

  // If no trigger anchor was provided (programmatic fallback), center cleanly in viewport.
  if (!activeCoords) {
    return createPortal(
      <div
        className="fixed inset-0 z-[10060] grid place-items-center bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        onClick={() => !busy && onCancel()}
      >
        {cardContent}
      </div>,
      document.body
    );
  }

  return createPortal(cardContent, document.body);
};
