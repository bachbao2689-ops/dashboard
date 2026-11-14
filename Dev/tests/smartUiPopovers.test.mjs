import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  captureAnchorRect,
  createAnchorTarget,
  computeAnchoredPopoverCoords,
} from '../src/lib/anchoredPopoverPosition.ts';
import {
  isInteractiveUiTarget,
  isTopMostVisibleDrawer,
  shouldDismissDrawerOnOutsideClick,
} from '../src/lib/smartOutsideClick.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SRC_ROOT = path.resolve(__dirname, '../src');

function matchesSingleToken(el, token) {
  const trimmed = token.trim();
  if (!trimmed) return false;

  // Handle simple :not(...) negation used in NATIVE_INTERACTIVE_SELECTOR / INTERACTIVE_CONTAINER_SELECTOR
  const notIdx = trimmed.indexOf(':not(');
  if (notIdx > 0 && trimmed.endsWith(')')) {
    const base = trimmed.slice(0, notIdx);
    const negated = trimmed.slice(notIdx + 5, -1);
    return matchesSingleToken(el, base) && !matchesSingleToken(el, negated);
  }

  if (trimmed.startsWith('#')) {
    return el.id === trimmed.slice(1);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1);
    const eqIdx = inner.indexOf('=');
    if (eqIdx === -1) {
      return Boolean(el.attrs && inner in el.attrs);
    }
    const attrName = inner.slice(0, eqIdx).trim();
    const attrVal = inner.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    return el.attrs?.[attrName] === attrVal;
  }

  // Combined selector like .dashboard-detail-drawer.opacity-100
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.').filter(Boolean);
    const hasTag = !trimmed.startsWith('.');
    const tagPart = hasTag ? parts.shift() : null;
    if (tagPart && (el.tagName || '').toLowerCase() !== tagPart.toLowerCase()) {
      return false;
    }
    return parts.every((cls) => el.classes?.has(cls));
  }

  // Selector like a[href] or audio[controls]
  const attrStart = trimmed.indexOf('[');
  if (attrStart > 0 && trimmed.endsWith(']')) {
    const tag = trimmed.slice(0, attrStart);
    const bracket = trimmed.slice(attrStart);
    return (el.tagName || '').toLowerCase() === tag.toLowerCase() && matchesSingleToken(el, bracket);
  }

  return (el.tagName || '').toLowerCase() === trimmed.toLowerCase();
}

function makeMockEl({
  tagName = 'DIV',
  id = undefined,
  classes = [],
  attrs = {},
  parentElement = null,
  nodeType = 1,
} = {}) {
  const classSet = new Set(classes);
  const el = {
    tagName,
    id,
    nodeType,
    parentElement,
    classes: classSet,
    attrs,
    children: [],
    classList: {
      contains: (token) => classSet.has(token),
    },
    matches(selector) {
      return selector
        .split(',')
        .map((s) => s.trim())
        .some((part) => matchesSingleToken(el, part));
    },
    closest(selector) {
      let cursor = el;
      while (cursor) {
        if (cursor.nodeType === 1 && cursor.matches(selector)) {
          return cursor;
        }
        cursor = cursor.parentElement ?? null;
      }
      return null;
    },
    contains(other) {
      let cursor = other;
      while (cursor) {
        if (cursor === el) return true;
        cursor = cursor.parentElement ?? null;
      }
      return false;
    },
  };
  return el;
}

function makeMockDoc({ openPopover = null, visibleDrawers = [] } = {}) {
  return {
    querySelector(selector) {
      if (openPopover && openPopover.matches(selector)) {
        return openPopover;
      }
      return null;
    },
    querySelectorAll(selector) {
      return visibleDrawers.filter((d) => d.matches(selector));
    },
  };
}

test('captureAnchorRect & createAnchorTarget safely snapshot trigger bounds', () => {
  assert.equal(captureAnchorRect(null), null);
  assert.equal(
    captureAnchorRect({
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    }),
    null
  );

  const mockTrigger = {
    getBoundingClientRect: () => ({
      top: 120,
      left: 640,
      right: 668,
      bottom: 148,
      width: 28,
      height: 28,
    }),
  };
  const snap = captureAnchorRect(mockTrigger);
  assert.deepEqual(snap, {
    top: 120,
    left: 640,
    right: 668,
    bottom: 148,
    width: 28,
    height: 28,
  });

  const target = createAnchorTarget({ id: 'p-1' }, mockTrigger);
  assert.deepEqual(target.item, { id: 'p-1' });
  assert.equal(target.anchorEl, mockTrigger);
  assert.deepEqual(target.anchorRect, snap);
});

test('computeAnchoredPopoverCoords keeps popover adjacent to clicked trigger and avoids viewport collisions', () => {
  // 1. Plenty of room below and to the right -> align bottom-left of trigger
  const normal = computeAnchoredPopoverCoords(
    { top: 200, left: 300, right: 328, bottom: 228, width: 28, height: 28 },
    300,
    180,
    1440,
    900
  );
  assert.equal(normal.placeAbove, false);
  assert.equal(normal.top, 236); // 228 + gap(8)
  assert.equal(normal.left, 300);

  // 2. Right edge of drawer/viewport -> flip left so popover stays anchored to trigger right edge
  const rightEdge = computeAnchoredPopoverCoords(
    { top: 180, left: 1370, right: 1398, bottom: 208, width: 28, height: 28 },
    300,
    180,
    1440,
    900
  );
  assert.equal(rightEdge.placeAbove, false);
  assert.equal(rightEdge.left, 1098); // 1398 - 300
  assert.ok(rightEdge.left + 300 <= 1440 - 12);

  // 3. Bottom comment delete button -> flip above trigger
  const bottomEdge = computeAnchoredPopoverCoords(
    { top: 790, left: 1260, right: 1288, bottom: 818, width: 28, height: 28 },
    300,
    180,
    1440,
    900
  );
  assert.equal(bottomEdge.placeAbove, true);
  assert.equal(bottomEdge.top, 790 - 8 - 180);
  assert.equal(bottomEdge.left, 988);

  // 4. Mobile 375px viewport -> clamps cleanly within 12px horizontal margin
  const mobile = computeAnchoredPopoverCoords(
    { top: 420, left: 330, right: 358, bottom: 448, width: 28, height: 28 },
    300,
    180,
    375,
    667
  );
  assert.ok(mobile.left >= 12);
  assert.ok(mobile.left + 300 <= 375 - 12);
});

test('shouldDismissDrawerOnOutsideClick closes ONLY on blank background whitespace outside topmost drawer', () => {
  const drawer = makeMockEl({
    tagName: 'ASIDE',
    classes: ['dashboard-detail-drawer', 'opacity-100'],
  });
  const doc = makeMockDoc({ visibleDrawers: [drawer] });

  // Inside drawer -> keep open
  const insideSpan = makeMockEl({ tagName: 'SPAN', parentElement: drawer });
  assert.equal(shouldDismissDrawerOnOutsideClick({ target: insideSpan, drawerEl: drawer, doc }), false);

  // Blank main/body/canvas whitespace -> dismiss
  const mainBlank = makeMockEl({ tagName: 'MAIN' });
  const emptyDiv = makeMockEl({ tagName: 'DIV', parentElement: mainBlank });
  const textNode = makeMockEl({ nodeType: 3, parentElement: emptyDiv });
  assert.equal(shouldDismissDrawerOnOutsideClick({ target: mainBlank, drawerEl: drawer, doc }), true);
  assert.equal(shouldDismissDrawerOnOutsideClick({ target: emptyDiv, drawerEl: drawer, doc }), true);
  assert.equal(shouldDismissDrawerOnOutsideClick({ target: textNode, drawerEl: drawer, doc }), true);

  // Native & ARIA interactive controls outside drawer -> keep drawer open
  const outerBtn = makeMockEl({ tagName: 'BUTTON', parentElement: mainBlank });
  const outerBtnIcon = makeMockEl({ tagName: 'SVG', parentElement: outerBtn });
  const outerLink = makeMockEl({ tagName: 'A', attrs: { href: '/tasks' }, parentElement: mainBlank });
  const outerInput = makeMockEl({ tagName: 'INPUT', parentElement: mainBlank });
  const ariaTab = makeMockEl({ tagName: 'DIV', attrs: { role: 'tab' }, parentElement: mainBlank });
  const ariaSwitch = makeMockEl({ tagName: 'DIV', attrs: { role: 'switch' }, parentElement: mainBlank });

  for (const interactiveTarget of [outerBtn, outerBtnIcon, outerLink, outerInput, ariaTab, ariaSwitch]) {
    assert.equal(isInteractiveUiTarget(interactiveTarget), true);
    assert.equal(
      shouldDismissDrawerOnOutsideClick({ target: interactiveTarget, drawerEl: drawer, doc }),
      false
    );
  }

  // Clickable Dashboard rows / Kanban cards / cursor-pointer wrappers -> keep drawer open
  const hoverProjectRow = makeMockEl({ tagName: 'TR', classes: ['hover-row-project'], parentElement: mainBlank });
  const rowCell = makeMockEl({ tagName: 'TD', parentElement: hoverProjectRow });
  const kanbanCard = makeMockEl({ tagName: 'DIV', attrs: { 'data-board-card': '' }, parentElement: mainBlank });
  const pointerCard = makeMockEl({ tagName: 'DIV', classes: ['cursor-pointer'], parentElement: mainBlank });

  for (const clickableItem of [rowCell, kanbanCard, pointerCard]) {
    assert.equal(
      shouldDismissDrawerOnOutsideClick({ target: clickableItem, drawerEl: drawer, doc }),
      false
    );
  }

  // Mobile backdrop handled by its own onClick (skip mousedown/touchstart race)
  const backdrop = makeMockEl({
    tagName: 'DIV',
    attrs: { 'data-drawer-backdrop': 'true' },
  });
  assert.equal(shouldDismissDrawerOnOutsideClick({ target: backdrop, drawerEl: drawer, doc }), false);
});

test('shouldDismissDrawerOnOutsideClick respects layered blocking popovers and stacked drawers', () => {
  const lowerDrawer = makeMockEl({
    tagName: 'DIV',
    classes: ['dashboard-detail-drawer', 'opacity-100'],
  });
  const topDrawer = makeMockEl({
    tagName: 'DIV',
    classes: ['dashboard-detail-drawer', 'opacity-100'],
  });
  const openPopover = makeMockEl({
    tagName: 'DIV',
    attrs: { 'data-anchored-popover': 'true' },
  });

  // 1. Open blocking popover prevents outside blank click from closing drawer underneath
  const blankCanvas = makeMockEl({ tagName: 'MAIN' });
  const docWithPopover = makeMockDoc({ openPopover, visibleDrawers: [topDrawer] });
  assert.equal(
    shouldDismissDrawerOnOutsideClick({ target: blankCanvas, drawerEl: topDrawer, doc: docWithPopover }),
    false
  );

  // 2. Lower stacked drawer ignores outside click while topDrawer is topmost
  const docStacked = makeMockDoc({ visibleDrawers: [lowerDrawer, topDrawer] });
  assert.equal(isTopMostVisibleDrawer(lowerDrawer, docStacked), false);
  assert.equal(isTopMostVisibleDrawer(topDrawer, docStacked), true);
  assert.equal(
    shouldDismissDrawerOnOutsideClick({ target: blankCanvas, drawerEl: lowerDrawer, doc: docStacked }),
    false
  );
  assert.equal(
    shouldDismissDrawerOnOutsideClick({ target: blankCanvas, drawerEl: topDrawer, doc: docStacked }),
    true
  );
});

test('Confirm popover components maintain zero Flexbox usage (GUIDELINE/style.md)', () => {
  const filesToCheck = [
    'components/common/AnchoredConfirmPopover.tsx',
    'components/common/ConfirmDeleteModal.tsx',
    'components/common/ConfirmHideModal.tsx',
  ];

  for (const relPath of filesToCheck) {
    const src = fs.readFileSync(path.join(DEV_SRC_ROOT, relPath), 'utf8');
    assert.equal(
      /\b(?:inline-)?flex\b/.test(src),
      false,
      `${relPath} must use CSS Grid / normal flow without flex/inline-flex`
    );
  }
});
