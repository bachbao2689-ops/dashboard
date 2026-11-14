export interface AnchorRectSnapshot {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface AnchoredPopoverCoords {
  top: number;
  left: number;
  placeAbove: boolean;
}

export interface AnchorTarget<T> {
  item: T;
  anchorEl: HTMLElement | null;
  anchorRect: AnchorRectSnapshot | null;
}

export function captureAnchorRect(
  el: { getBoundingClientRect: () => DOMRect } | null | undefined
): AnchorRectSnapshot | null {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const rect = el.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0)) {
    return null;
  }
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function createAnchorTarget<T>(item: T, anchorEl?: HTMLElement | null): AnchorTarget<T> {
  return {
    item,
    anchorEl: anchorEl ?? null,
    anchorRect: captureAnchorRect(anchorEl),
  };
}

export function computeAnchoredPopoverCoords(
  anchorRect: AnchorRectSnapshot,
  popoverWidth: number,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  gap = 8,
  margin = 12
): AnchoredPopoverCoords {
  const safeWidth = Math.min(popoverWidth, Math.max(200, viewportWidth - margin * 2));
  const safeHeight = Math.max(120, popoverHeight);

  // Align left edge with trigger; if it overflows the right edge (common in drawers/row hover pills),
  // align popover right edge cleanly with trigger right edge, then clamp within viewport margins.
  let left = anchorRect.left;
  if (left + safeWidth > viewportWidth - margin) {
    left = anchorRect.right - safeWidth;
  }
  const maxLeft = Math.max(margin, viewportWidth - safeWidth - margin);
  left = Math.max(margin, Math.min(left, maxLeft));

  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  const placeAbove = spaceBelow < safeHeight + gap + margin && spaceAbove > spaceBelow;

  let top = placeAbove ? anchorRect.top - gap - safeHeight : anchorRect.bottom + gap;
  const maxTop = Math.max(margin, viewportHeight - safeHeight - margin);
  top = Math.max(margin, Math.min(top, maxTop));

  return { top, left, placeAbove };
}
