export interface ElementLike {
  tagName?: string;
  nodeType?: number;
  parentElement?: ElementLike | null;
  classList?: { contains(token: string): boolean };
  closest?(selector: string): ElementLike | null;
  matches?(selector: string): boolean;
  contains?(other: ElementLike | null): boolean;
}

export interface DocumentLike {
  body?: ElementLike | null;
  documentElement?: ElementLike | null;
  querySelector?(selector: string): ElementLike | null;
  querySelectorAll?(selector: string): Iterable<ElementLike> | ArrayLike<ElementLike>;
}

/**
 * Floating UI portals, dialogs, menus, calendars and tooltips that belong to
 * active interactive UI workflows and must never dismiss an open detail drawer.
 */
export const FLOATING_UI_SELECTOR = [
  '.dashboard-detail-drawer',
  '[data-anchored-popover="true"]',
  '[data-popover-open="true"]',
  '[data-filter-popover="true"]',
  '[data-filter-popover]',
  '[data-workflow-popover="true"]',
  '.tw-calendar-popover',
  '.tw-calendar-modal',
  '.vanilla-calendar',
  '.smart-mention-popup',
  '.modal-backdrop',
  '.toast',
  '#headlessui-portal-root',
  '[data-hot-toast]',
  '[data-sonner-toast]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
].join(', ');

/** Native HTML interactive controls. */
export const NATIVE_INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'option',
  'optgroup',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  'audio[controls]',
  'video[controls]',
].join(', ');

/** WAI-ARIA interactive widget roles. */
export const ARIA_INTERACTIVE_SELECTOR = [
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="searchbox"]',
  '[role="textbox"]',
].join(', ');

/** Dashboard-specific clickable rows, cards, handles and interactive wrappers. */
export const INTERACTIVE_CONTAINER_SELECTOR = [
  '[tabindex]:not([tabindex="-1"])',
  '[data-interactive="true"]',
  '[data-ui-action="true"]',
  '[data-board-card]',
  '[data-task-card]',
  '[data-entity-card]',
  '[data-task-row]',
  '.hover-row-effect',
  '.hover-row-campaign',
  '.hover-row-project',
  '.task-list-row',
  '.task-list-group-header',
  '.cursor-col-resize',
].join(', ');

/** Open transient sub-popovers that swallow an outside click first before any drawer closes. */
export const BLOCKING_POPOVER_SELECTOR =
  '[data-anchored-popover="true"], [data-popover-open="true"], [data-filter-popover="true"]';

const STRUCTURAL_CONTAINER_TAGS = new Set([
  'HTML',
  'BODY',
  'MAIN',
  'SECTION',
  'ARTICLE',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'NAV',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'UL',
  'OL',
]);

function resolveElement(target: EventTarget | ElementLike | null): ElementLike | null {
  if (!target || typeof target !== 'object') return null;
  const candidate = target as ElementLike;
  if (candidate.nodeType === 3) {
    return candidate.parentElement ?? null;
  }
  if (typeof candidate.closest === 'function' || typeof candidate.tagName === 'string') {
    return candidate;
  }
  return candidate.parentElement ?? null;
}

function closestMatch(el: ElementLike | null, selector: string): ElementLike | null {
  if (!el || typeof el.closest !== 'function') return null;
  try {
    return el.closest(selector);
  } catch {
    return null;
  }
}

function matchesSelector(el: ElementLike | null, selector: string): boolean {
  if (!el || typeof el.matches !== 'function') return false;
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

export function isDrawerBackdropTarget(target: EventTarget | ElementLike | null): boolean {
  const el = resolveElement(target);
  return Boolean(closestMatch(el, '[data-drawer-backdrop="true"]'));
}

export function hasBlockingOpenPopover(doc: DocumentLike | null | undefined): boolean {
  if (!doc || typeof doc.querySelector !== 'function') return false;
  return Boolean(doc.querySelector(BLOCKING_POPOVER_SELECTOR));
}

export function isFloatingOverlayTarget(target: EventTarget | ElementLike | null): boolean {
  const el = resolveElement(target);
  return Boolean(closestMatch(el, FLOATING_UI_SELECTOR));
}

/**
 * Returns true if the click target belongs to an interactive UI control or clickable
 * item (buttons, links, inputs, tabs, toggles, popovers, table rows, cards), rather
 * than genuine empty background whitespace.
 */
export function isInteractiveUiTarget(target: EventTarget | ElementLike | null): boolean {
  const el = resolveElement(target);
  if (!el) return false;

  if (
    closestMatch(el, NATIVE_INTERACTIVE_SELECTOR) ||
    closestMatch(el, ARIA_INTERACTIVE_SELECTOR) ||
    closestMatch(el, INTERACTIVE_CONTAINER_SELECTOR) ||
    closestMatch(el, FLOATING_UI_SELECTOR)
  ) {
    return true;
  }

  let current: ElementLike | null = el;
  let depth = 0;
  while (current && depth < 6) {
    if (matchesSelector(current, '[data-drawer-backdrop="true"]')) return false;

    const tag = (current.tagName || '').toUpperCase();
    if (tag === 'HTML' || tag === 'BODY') break;

    if (!STRUCTURAL_CONTAINER_TAGS.has(tag)) {
      if (current.classList?.contains('cursor-pointer')) {
        return true;
      }
      if (
        typeof window !== 'undefined' &&
        typeof window.getComputedStyle === 'function' &&
        typeof Element !== 'undefined' &&
        (current as unknown) instanceof Element
      ) {
        const cursor = window.getComputedStyle(current as unknown as Element).cursor;
        if (cursor === 'pointer' || cursor === 'grab' || cursor === 'col-resize') {
          return true;
        }
      }
    }

    current = current.parentElement ?? null;
    depth += 1;
  }

  return false;
}

export function isTopMostVisibleDrawer(
  drawerEl: ElementLike | null | undefined,
  doc: DocumentLike | null | undefined
): boolean {
  if (!drawerEl || !doc || typeof doc.querySelectorAll !== 'function') return true;
  const visibleDrawers = Array.from(doc.querySelectorAll('.dashboard-detail-drawer.opacity-100'));
  if (visibleDrawers.length <= 1) return true;
  return visibleDrawers[visibleDrawers.length - 1] === drawerEl;
}

export interface OutsideDrawerCheckInput {
  target: EventTarget | ElementLike | null;
  drawerEl?: ElementLike | null;
  doc?: DocumentLike | null;
}

/**
 * Smart outside-click rule for sliding Dashboard detail drawers:
 * Close/collapse ONLY when clicking genuine empty whitespace outside the drawer.
 * Keep the drawer open when interacting with buttons, UI controls, cards, rows,
 * popovers, calendars or layered sub-dialogs.
 */
export function shouldDismissDrawerOnOutsideClick({
  target,
  drawerEl = null,
  doc = typeof document !== 'undefined' ? (document as unknown as DocumentLike) : null,
}: OutsideDrawerCheckInput): boolean {
  const el = resolveElement(target);
  if (!el) return false;

  if (drawerEl && typeof drawerEl.contains === 'function' && drawerEl.contains(el)) {
    return false;
  }

  if (!isTopMostVisibleDrawer(drawerEl, doc)) {
    return false;
  }

  // Mobile/tablet backdrop dismisses cleanly on its own `onClick` to avoid touch ghost-clicks.
  if (isDrawerBackdropTarget(el)) {
    return false;
  }

  // Dismiss any open transient popover first instead of collapsing the drawer on the same click.
  if (hasBlockingOpenPopover(doc)) {
    return false;
  }

  if (isInteractiveUiTarget(el)) {
    return false;
  }

  return true;
}
