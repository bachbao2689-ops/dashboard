import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface SlidingToolbarGroupProps {
  children: React.ReactNode;
  className?: string;
  activeKey?: string | number | null;
  activeSelector?: string;
  hoverSelector?: string;
  showHoverPill?: boolean;
  showActivePill?: boolean;
  pillRadiusClass?: string;
}

export const SlidingToolbarGroup: React.FC<SlidingToolbarGroupProps> = ({
  children,
  className = '',
  activeKey,
  activeSelector = '[data-active="true"]',
  hoverSelector = 'button, a, [role="button"], .sliding-btn-target',
  showHoverPill = true,
  showActivePill = false,
  pillRadiusClass = 'rounded-[8px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hover Pill State
  const [hoverPill, setHoverPill] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const [isHoverInstant, setIsHoverInstant] = useState(true);
  const hadHoverRef = useRef(false);

  // Active Pill State
  const [activePill, setActivePill] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const [isActiveInstant, setIsActiveInstant] = useState(true);
  const hadActiveInitRef = useRef(false);

  // Update Active Pill position
  const updateActivePill = useCallback(() => {
    if (!showActivePill) return;
    const container = containerRef.current;
    if (!container) return;

    const targetEl = container.querySelector<HTMLElement>(activeSelector);
    if (!targetEl) {
      setActivePill(prev => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const cRect = container.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    if (tRect.width === 0 || tRect.height === 0) {
      setActivePill(prev => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const x = Math.round(tRect.left - cRect.left);
    const y = Math.round(tRect.top - cRect.top);
    const width = Math.round(tRect.width);
    const height = Math.round(tRect.height);

    if (!hadActiveInitRef.current) {
      hadActiveInitRef.current = true;
      setIsActiveInstant(true);
      setActivePill({ x, y, width, height, visible: true });
      requestAnimationFrame(() => setIsActiveInstant(false));
    } else {
      setIsActiveInstant(false);
      setActivePill({ x, y, width, height, visible: true });
    }
  }, [showActivePill, activeSelector]);

  useEffect(() => {
    updateActivePill();
  }, [updateActivePill, activeKey, children]);

  // Handle Mouse Over / Move on container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showHoverPill) return;
    const container = containerRef.current;
    if (!container) return;

    const target = (e.target as HTMLElement).closest<HTMLElement>(hoverSelector);
    if (!target || !container.contains(target)) {
      setHoverPill(prev => (prev.visible ? { ...prev, visible: false } : prev));
      hadHoverRef.current = false;
      return;
    }

    // Exclude buttons inside open dropdown popovers or modals
    if (target.closest('[data-filter-popover="true"], [data-workflow-popover="true"] .absolute, [role="dialog"], [role="listbox"], .absolute.top-full, .absolute.top-\\[calc\\(100\\%\\+8px\\)\\]')) {
      return;
    }

    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    if (tRect.width === 0 || tRect.height === 0) return;

    const x = Math.round(tRect.left - cRect.left);
    const y = Math.round(tRect.top - cRect.top);
    const width = Math.round(tRect.width);
    const height = Math.round(tRect.height);

    if (!hadHoverRef.current) {
      hadHoverRef.current = true;
      setIsHoverInstant(true);
      setHoverPill({ x, y, width, height, visible: true });
      requestAnimationFrame(() => setIsHoverInstant(false));
    } else {
      setIsHoverInstant(false);
      setHoverPill({ x, y, width, height, visible: true });
    }
  };

  const handleMouseLeave = () => {
    if (!showHoverPill) return;
    setHoverPill(prev => (prev.visible ? { ...prev, visible: false } : prev));
    hadHoverRef.current = false;
    setIsHoverInstant(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`has-sliding-pill relative inline-grid grid-flow-col auto-cols-max items-center ${className}`}
    >
      {/* Active Sliding Pill */}
      {showActivePill && (
        <div
          aria-hidden="true"
          className={`sliding-active-pill ${pillRadiusClass} ${isActiveInstant ? 'is-instant' : ''}`}
          style={{
            transform: `translate3d(${activePill.x}px, ${activePill.y}px, 0)`,
            width: activePill.width,
            height: activePill.height,
            opacity: activePill.visible ? 1 : 0,
          }}
        />
      )}

      {/* Hover Sliding Pill */}
      {showHoverPill && (
        <div
          aria-hidden="true"
          className={`sliding-hover-pill ${pillRadiusClass} ${isHoverInstant ? 'is-instant' : ''}`}
          style={{
            transform: `translate3d(${hoverPill.x}px, ${hoverPill.y}px, 0)`,
            width: hoverPill.width,
            height: hoverPill.height,
            opacity: hoverPill.visible ? 1 : 0,
          }}
        />
      )}

      {children}
    </div>
  );
};
