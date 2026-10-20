import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Layers,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { StylizedPinIcon } from '../common/StylizedPinIcon';
import { useSidebarPinStore, type PinnedEntity } from '../../store/sidebarPinStore';
import { useVisibleSidebarPins } from '../../hooks/useVisibleSidebarPins';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useSidebarTrackingData, type EnrichedSidebarTask } from '../../hooks/useSidebarTrackingData';
import { useRememberedState } from '../../hooks/useRememberedState';
import { officialReadEnabled } from '../../services/officialReadOnly';
import { canSubmitAssetRequest, canViewTeamManagement, isAssetApprover } from '../../lib/roleScope';
import {
  buildSidebarGroups,
  type DrillMenuItem,
  type DrillNode,
  type SidebarGroupModel,
} from './sidebarDrillTree';
import '../../styles/sidebar-drilldown.css';

const DEFAULT_SIDEBAR_WIDTH = 272;
const MIN_SIDEBAR_WIDTH = 236;
const MAX_SIDEBAR_WIDTH = 520;

interface StackEntry {
  nodeId: string;
  focusedIndex: number;
}

interface ActiveDragPayload {
  id: string;
  source: 'workspace-nav' | 'pinned-nav' | 'pinned-entity' | 'pinned-task';
  label: string;
  accentColor: string;
  navId?: string;
  entity?: PinnedEntity;
  taskId?: string;
}

/**
 * In-place Multi-level Drill-down Drawer anchored directly underneath its parent item.
 */
export const ButtonDrilldownDrawer: React.FC<{
  isOpen: boolean;
  rootDetailNodeId: string;
  nodes: Record<string, DrillNode>;
  onNavigate: (path: string) => void;
  onTogglePin: (taskId: string) => void;
}> = ({ isOpen, rootDetailNodeId, nodes, onNavigate, onTogglePin }) => {
  const [stack, setStack] = useState<StackEntry[]>([
    { nodeId: rootDetailNodeId, focusedIndex: 0 },
  ]);
  const [direction, setDirection] = useState<'forward' | 'backward' | null>(null);
  const [exitingNode, setExitingNode] = useState<DrillNode | null>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);

  const activePanelRef = useRef<HTMLDivElement | null>(null);
  const backBtnRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const pendingFocusRef = useRef<number | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentEntry = stack[stack.length - 1] || {
    nodeId: rootDetailNodeId,
    focusedIndex: 0,
  };
  const currentNode = nodes[currentEntry.nodeId] || nodes[rootDetailNodeId];
  const isSubLevel = stack.length > 1;

  // Measure active panel height for Smooth Height Morphing
  useLayoutEffect(() => {
    const el = activePanelRef.current;
    if (!el) return;
    const updateHeight = () => {
      const nextH = el.offsetHeight;
      setPanelHeight(prev => (prev === nextH ? prev : nextH));
    };
    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [currentNode, isOpen, stack.length]);

  // Focus restoration when drilling forward or backward
  useEffect(() => {
    if (pendingFocusRef.current === null || !isOpen) return;
    const targetIdx = pendingFocusRef.current;
    pendingFocusRef.current = null;
    const raf = requestAnimationFrame(() => {
      if (targetIdx === -1) {
        backBtnRef.current?.focus();
      } else {
        itemRefs.current.get(targetIdx)?.focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [stack, isOpen]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const pushLevel = (targetNodeId: string, fromIndex: number) => {
    const nextNode = nodes[targetNodeId];
    if (!nextNode) return;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setExitingNode(currentNode);
    setDirection('forward');
    pendingFocusRef.current = 0;
    setStack(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          focusedIndex: fromIndex,
        };
      }
      return [...updated, { nodeId: targetNodeId, focusedIndex: 0 }];
    });
    exitTimerRef.current = setTimeout(() => setExitingNode(null), 290);
  };

  const popLevel = () => {
    if (stack.length <= 1) return;
    const parentEntry = stack[stack.length - 2];
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setExitingNode(currentNode);
    setDirection('backward');
    pendingFocusRef.current = parentEntry ? parentEntry.focusedIndex : 0;
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
    exitTimerRef.current = setTimeout(() => setExitingNode(null), 290);
  };

  const setFocusedIndex = (idx: number) => {
    setStack(prev => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], focusedIndex: idx };
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!currentNode) return;
    const items = currentNode.items;
    const minIdx = isSubLevel ? -1 : 0;
    const maxIdx = items.length - 1;
    const curIdx = currentEntry.focusedIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = curIdx + 1 > maxIdx ? minIdx : curIdx + 1;
      setFocusedIndex(nextIdx);
      if (nextIdx === -1) backBtnRef.current?.focus();
      else itemRefs.current.get(nextIdx)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = curIdx - 1 < minIdx ? maxIdx : curIdx - 1;
      setFocusedIndex(nextIdx);
      if (nextIdx === -1) backBtnRef.current?.focus();
      else itemRefs.current.get(nextIdx)?.focus();
    } else if (e.key === 'ArrowRight') {
      if (curIdx >= 0 && curIdx <= maxIdx) {
        const item = items[curIdx];
        if (item?.targetNodeId) {
          e.preventDefault();
          pushLevel(item.targetNodeId, curIdx);
        }
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      if (isSubLevel) {
        e.preventDefault();
        popLevel();
      }
    }
  };

  if (!currentNode) return null;

  const renderLevelItems = (node: DrillNode, interactive: boolean) => {
    const showBackHeader = node.id !== rootDetailNodeId;

    return (
      <div className="space-y-1">
        {showBackHeader && (
          <div className="flex items-center gap-1">
            <button
              ref={interactive ? backBtnRef : undefined}
              type="button"
              tabIndex={interactive && isOpen ? 0 : -1}
              onFocus={() => interactive && setFocusedIndex(-1)}
              onClick={() => interactive && popLevel()}
              className="sb-back-row flex-1 min-w-0"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <ChevronLeft size={14} className="shrink-0" />
                <span className="truncate">{node.title}</span>
              </span>
              <span className="text-[10px] font-semibold opacity-70 shrink-0">Quay lại</span>
            </button>
            {node.headerPath && (
              <button
                type="button"
                tabIndex={-1}
                title="Mở trang này"
                aria-label="Mở trang này"
                onClick={() => interactive && node.headerPath && onNavigate(node.headerPath)}
                className="p-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 transition-colors shrink-0 mb-1"
              >
                <ExternalLink size={13} />
              </button>
            )}
          </div>
        )}

        <ul className="space-y-1">
          {node.items.map((item: DrillMenuItem, idx: number) => {
            const hasChildren = Boolean(item.targetNodeId);
            return (
              <li key={item.id}>
                <div
                  ref={el => {
                    if (!interactive) return;
                    if (el) itemRefs.current.set(idx, el);
                    else itemRefs.current.delete(idx);
                  }}
                  role="button"
                  tabIndex={interactive && isOpen ? 0 : -1}
                  onFocus={() => interactive && setFocusedIndex(idx)}
                  onClick={() => {
                    if (!interactive) return;
                    if (item.onAction) {
                      item.onAction();
                      return;
                    }
                    if (item.path) {
                      onNavigate(item.path);
                    } else if (hasChildren && item.targetNodeId) {
                      pushLevel(item.targetNodeId, idx);
                    }
                  }}
                  onKeyDown={e => {
                    if (!interactive) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (item.onAction) {
                        item.onAction();
                        return;
                      }
                      if (hasChildren && item.targetNodeId && !item.path) {
                        pushLevel(item.targetNodeId, idx);
                      } else if (item.path) {
                        onNavigate(item.path);
                      } else if (hasChildren && item.targetNodeId) {
                        pushLevel(item.targetNodeId, idx);
                      }
                    }
                  }}
                  className={cn(
                    'sb-item-row select-none',
                    item.variant === 'danger' && 'is-danger',
                    item.variant === 'priority' && 'is-priority-task'
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="mt-0.5 shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate font-semibold leading-tight">
                          {item.label}
                        </span>
                        {item.inlineBadge}
                      </div>
                      {item.sublabel && (
                        <p className="truncate text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.pinTaskId && (
                      <button
                        type="button"
                        tabIndex={-1}
                        title={item.isPinned ? 'Bỏ ghim công việc' : 'Ghim công việc'}
                        aria-label={item.isPinned ? 'Bỏ ghim công việc' : 'Ghim công việc'}
                        onClick={e => {
                          e.stopPropagation();
                          if (interactive && item.pinTaskId) {
                            onTogglePin(item.pinTaskId);
                          }
                        }}
                        className={cn('sb-pin-btn', item.isPinned && 'is-pinned')}
                      >
                        <StylizedPinIcon
                          size={13}
                          pinned={item.isPinned}
                          className={
                            item.isPinned
                              ? 'text-slate-800 dark:text-slate-100'
                              : 'text-gray-400 hover:text-gray-700 dark:hover:text-slate-200'
                          }
                        />
                      </button>
                    )}
                    {item.rightBadge}
                    {hasChildren && (
                      <button
                        type="button"
                        tabIndex={-1}
                        title={`Xem chi tiết ${item.label}`}
                        aria-label={`Xem chi tiết ${item.label}`}
                        onClick={e => {
                          e.stopPropagation();
                          if (interactive && item.targetNodeId) {
                            pushLevel(item.targetNodeId, idx);
                          }
                        }}
                        className="sb-drill-trigger"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{ height: isOpen ? `${panelHeight}px` : '0px' }}
      className={cn('sb-drill-viewport', !isOpen && 'is-collapsed')}
    >
      <div className="sb-drill-stage">
        {exitingNode && (
          <div
            aria-hidden="true"
            className={cn(
              'sb-drill-panel-exit',
              direction === 'forward' ? 'anim-forward-out' : 'anim-backward-out'
            )}
          >
            {renderLevelItems(exitingNode, false)}
          </div>
        )}
        <div
          ref={activePanelRef}
          className={cn(
            'sb-drill-panel',
            direction === 'forward' && 'anim-forward-in',
            direction === 'backward' && 'anim-backward-in'
          )}
        >
          {renderLevelItems(currentNode, true)}
        </div>
      </div>
    </div>
  );
};

/**
 * Sortable Pinned Pill Item inside the top "Pinned" zone (Brief: UX_UI pin hover custom.docx)
 */
const SortablePinnedItemRow: React.FC<{
  sortableId: string;
  dragPayload: ActiveDragPayload;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onUnpin: () => void;
}> = ({ sortableId, dragPayload, label, icon, active, onClick, onUnpin }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: dragPayload,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.32 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="group">
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          'sidebar-link sb-pinned-pill-item',
          active ? 'sidebar-link-active font-semibold' : 'sidebar-link-idle'
        )}
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="shrink-0 inline-flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </span>

        <button
          type="button"
          title="Bỏ ghim khỏi thanh truy cập nhanh"
          aria-label="Bỏ ghim"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            onUnpin();
          }}
          className="sb-pin-btn is-pinned opacity-0 group-hover:opacity-100 shrink-0"
        >
          <StylizedPinIcon
            size={12.5}
            pinned
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          />
        </button>
      </div>
    </li>
  );
};

/**
 * Draggable Child Item inside the Tree Accordion ("Workspaces" zone)
 */
const TreeAccordionChildRow: React.FC<{
  item: DrillMenuItem;
  group: SidebarGroupModel;
  active: boolean;
  isHovered: boolean;
  isNavPinned: boolean;
  hasDrill: boolean;
  isDropdownOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: (path: string) => void;
  onToggleItemDropdown: (itemId: string) => void;
  onToggleNavPin: (item: DrillMenuItem, group: SidebarGroupModel) => void;
  onToggleTaskPin: (taskId: string) => void;
}> = ({
  item,
  group,
  active,
  isNavPinned,
  hasDrill,
  isDropdownOpen,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
  onToggleItemDropdown,
  onToggleNavPin,
  onToggleTaskPin,
}) => {
  const dragId = `workspace-nav:${item.id}`;
  const dragPayload = useMemo<ActiveDragPayload>(
    () => ({
      id: dragId,
      source: 'workspace-nav',
      label: item.label,
      accentColor: group.accentColor,
      navId: item.id,
    }),
    [dragId, item.label, item.id, group.accentColor]
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: dragPayload,
  });

  const subNode = hasDrill && item.targetNodeId ? group.nodes[item.targetNodeId] : undefined;
  const subItemCount = subNode ? subNode.items.length : 0;

  return (
    <li className="group/child">
      <div
        ref={setNodeRef}
        data-tree-item-id={item.id}
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={() => {
          if (item.path) onNavigate(item.path);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (item.path) onNavigate(item.path);
          }
        }}
        style={{ opacity: isDragging ? 0.4 : 1 }}
        className={cn(
          'sidebar-link sb-root-row flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer select-none border border-transparent',
          hasDrill && 'has-drill',
          isDropdownOpen && 'is-dropdown-open',
          active ? 'sidebar-link-active font-semibold' : 'sidebar-link-idle'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="shrink-0 inline-flex items-center justify-center">
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
          {item.inlineBadge}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {item.rightBadge}

          {/* Hover Pin / Unpin shortcut button */}
          <button
            type="button"
            tabIndex={-1}
            title={
              isNavPinned
                ? `Bỏ ghim ${item.label}`
                : `Ghim ${item.label} lên đầu Sidebar (hoặc kéo thả lên vùng Đã ghim)`
            }
            aria-label={isNavPinned ? `Bỏ ghim ${item.label}` : `Ghim ${item.label}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              onToggleNavPin(item, group);
            }}
            className={cn(
              'sb-pin-btn',
              isNavPinned
                ? 'is-pinned opacity-100'
                : 'opacity-0 group-hover/child:opacity-100'
            )}
          >
            <StylizedPinIcon
              size={12.5}
              pinned={isNavPinned}
              className={
                isNavPinned
                  ? 'text-slate-800 dark:text-slate-100'
                  : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }
            />
          </button>

          {/* Clean compact pill trigger for multi-level sub-drawer */}
          {hasDrill && (
            <button
              type="button"
              aria-expanded={isDropdownOpen}
              title={
                isDropdownOpen
                  ? `Thu gọn danh sách nhanh ${item.label}`
                  : `Mở danh sách nhanh ${item.label} (${subItemCount})`
              }
              aria-label={
                isDropdownOpen
                  ? `Thu gọn danh sách nhanh ${item.label}`
                  : `Mở danh sách nhanh ${item.label}`
              }
              onPointerDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                onToggleItemDropdown(item.id);
              }}
              className={cn('sb-subdrawer-pill-btn', isDropdownOpen && 'is-open')}
            >
              <span>{subItemCount}</span>
            </button>
          )}
        </div>
      </div>

      {hasDrill && item.targetNodeId && (
        <ButtonDrilldownDrawer
          isOpen={isDropdownOpen}
          rootDetailNodeId={item.targetNodeId}
          nodes={group.nodes}
          onNavigate={onNavigate}
          onTogglePin={onToggleTaskPin}
        />
      )}
    </li>
  );
};

/**
 * Single-Expand Tree Accordion Group with Dynamic SVG Branch (Unified Brand Theme)
 */
const SidebarTreeGroupSection: React.FC<{
  group: SidebarGroupModel;
  isOpen: boolean;
  onSelectGroup: (group: SidebarGroupModel) => void;
  currentPath: string;
  currentSearch: string;
  openDropdownItemId: string | null;
  onToggleItemDropdown: (itemId: string) => void;
  onNavigate: (path: string) => void;
  pinnedNavIds: string[];
  onToggleNavPin: (item: DrillMenuItem, group: SidebarGroupModel) => void;
  onToggleTaskPin: (taskId: string) => void;
}> = ({
  group,
  isOpen,
  onSelectGroup,
  currentPath,
  currentSearch,
  openDropdownItemId,
  onToggleItemDropdown,
  onNavigate,
  pinnedNavIds,
  onToggleNavPin,
  onToggleTaskPin,
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [childCenters, setChildCenters] = useState<Record<string, number>>({});
  const childrenWrapRef = useRef<HTMLDivElement | null>(null);

  const rootNode = group.nodes[group.rootNodeId];
  const items = rootNode?.items ?? [];

  const isRouteActive = useCallback(
    (itemPath?: string) => {
      if (!itemPath) return false;
      const [basePath, query] = itemPath.split('?');
      if (currentPath !== basePath) return false;
      if (!query) return true;
      return currentSearch.includes(query);
    },
    [currentPath, currentSearch]
  );

  const measureChildCenters = useCallback(() => {
    const wrap = childrenWrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const next: Record<string, number> = {};
    const rows = wrap.querySelectorAll<HTMLElement>('[data-tree-item-id]');
    rows.forEach(rowEl => {
      const id = rowEl.getAttribute('data-tree-item-id');
      if (!id) return;
      const rowRect = rowEl.getBoundingClientRect();
      next[id] = Math.round(rowRect.top - wrapRect.top + rowRect.height / 2);
    });
    setChildCenters(prev => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every(k => prev[k] === next[k])
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    measureChildCenters();
    const wrap = childrenWrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measureChildCenters());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [isOpen, items.length, openDropdownItemId, measureChildCenters]);

  if (!rootNode || items.length === 0) return null;

  const activeItem = items.find(it => isRouteActive(it.path)) || items[0];
  const targetItemId = hoveredItemId || activeItem?.id;
  const targetY = targetItemId ? childCenters[targetItemId] : undefined;
  const allYs = items
    .map(it => childCenters[it.id])
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const maxY = allYs.length > 0 ? Math.max(...allYs) : 0;

  return (
    <div className={cn('transition-all duration-200', isOpen ? 'mb-3' : 'mb-1')}>
      {/* Parent Group Header (Single-expand accordion trigger) */}
      <button
        type="button"
        data-tree-group-id={group.id}
        onClick={() => onSelectGroup(group)}
        aria-expanded={isOpen}
        className={cn('sb-group-header', isOpen && 'is-open')}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{group.title}</span>
          {group.hasUnreadSignal && (
            <span
              title="Có nhắc tên / bình luận mới"
              className="relative inline-flex items-center"
            >
              <MessageSquare size={11.5} className="text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </span>
          )}
        </span>

        {group.badgeCount > 0 && (
          <span className="sb-group-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
            {group.badgeCount > 99 ? '99+' : group.badgeCount}
          </span>
        )}
      </button>

      {/* Collapsible Children Container with Dynamic SVG Tree Branch */}
      <div
        style={{ maxHeight: isOpen ? '1800px' : '0px' }}
        className={cn('sb-group-body', !isOpen && 'is-collapsed')}
      >
        <div ref={childrenWrapRef} className="sb-tree-children-wrap">
          {/* Dynamic SVG Tree Branch Overlay */}
          {maxY > 0 && (
            <svg className="sb-tree-svg-overlay" aria-hidden="true">
              {/* Passive background trunk & branches */}
              <path
                d={`M 7 0 L 7 ${Math.max(0, maxY - 8)}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                className="text-blue-200/80 dark:text-slate-700/80"
              />
              {allYs.map((y, idx) => (
                <path
                  key={idx}
                  d={`M 7 ${Math.max(0, y - 8)} Q 7 ${y} 15 ${y} L 18 ${y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="text-blue-200/80 dark:text-slate-700/80"
                />
              ))}

              {/* Active / Hovered Animated Brand-Themed Branch Path */}
              {typeof targetY === 'number' && targetY > 0 && (
                <path
                  d={`M 7 0 L 7 ${Math.max(0, targetY - 8)} Q 7 ${targetY} 15 ${targetY} L 18 ${targetY}`}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="sb-tree-active-path"
                />
              )}
            </svg>
          )}

          <ul className="space-y-1.5">
            {items.map(item => {
              const active = isRouteActive(item.path);
              const hasDrill = Boolean(item.targetNodeId && group.nodes[item.targetNodeId]);
              const isDropdownOpen = hasDrill && openDropdownItemId === item.id;
              const isNavPinned = pinnedNavIds.includes(item.id);

              return (
                <TreeAccordionChildRow
                  key={item.id}
                  item={item}
                  group={group}
                  active={active}
                  isHovered={hoveredItemId === item.id}
                  isNavPinned={isNavPinned}
                  hasDrill={hasDrill}
                  isDropdownOpen={isDropdownOpen}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() =>
                    setHoveredItemId(prev => (prev === item.id ? null : prev))
                  }
                  onNavigate={onNavigate}
                  onToggleItemDropdown={onToggleItemDropdown}
                  onToggleNavPin={onToggleNavPin}
                  onToggleTaskPin={onToggleTaskPin}
                />
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Droppable Pinned Zone Container at the top of the Sidebar
 */
const PinnedDropZone: React.FC<{
  isDraggingAny: boolean;
  children: React.ReactNode;
}> = ({ isDraggingAny, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'sidebar-pinned-dropzone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('sb-pin-dropzone', (isOver || isDraggingAny) && isOver && 'is-drag-over')}
    >
      {children}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, enrichedTasks, enrichedTracks, summary, togglePin } =
    useSidebarTrackingData();

  const [sidebarWidth, setSidebarWidth] = useRememberedState<number>(
    'layout.sidebarWidth',
    DEFAULT_SIDEBAR_WIDTH
  );
  const [resizing, setResizing] = useState(false);
  const [openDropdownItemId, setOpenDropdownItemId] = useState<string | null>(null);
  const [pinToastMessage, setPinToastMessage] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragPayload | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pinnedEntities = useVisibleSidebarPins();
  const unpinEntity = useSidebarPinStore(s => s.unpinEntity);
  const reorderPinnedEntities = useSidebarPinStore(s => s.reorderPinnedEntities);
  const pinnedNavIds = useSidebarPinStore(s => s.pinnedNavIds);
  const toggleNavPinStore = useSidebarPinStore(s => s.toggleNavPin);
  const reorderPinnedNavs = useSidebarPinStore(s => s.reorderPinnedNavs);
  const pinnedTaskIds = useSidebarPinStore(s => s.pinnedIds);
  const reorderPinnedTasks = useSidebarPinStore(s => s.reorderPinnedTasks);

  const pinnedTaskItems = useMemo(() => {
    const byId = new Map<string, EnrichedSidebarTask>();
    enrichedTasks.forEach(task => {
      if (task.isPinned) byId.set(task.id, task);
    });
    const ordered: EnrichedSidebarTask[] = [];
    pinnedTaskIds.forEach(id => {
      const match = byId.get(id);
      if (match) {
        ordered.push(match);
        byId.delete(id);
      }
    });
    byId.forEach(task => ordered.push(task));
    return ordered;
  }, [enrichedTasks, pinnedTaskIds]);

  const showPinToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setPinToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setPinToastMessage(null);
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleToggleItemDropdown = useCallback((itemId: string) => {
    setOpenDropdownItemId(prev => (prev === itemId ? null : itemId));
  }, []);

  // Sync --sidebar-width CSS variable to html element so layout wrapper scales smoothly
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const width =
      Number.isFinite(sidebarWidth) &&
      sidebarWidth >= MIN_SIDEBAR_WIDTH &&
      sidebarWidth <= MAX_SIDEBAR_WIDTH
        ? sidebarWidth
        : DEFAULT_SIDEBAR_WIDTH;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, [sidebarWidth]);

  // Drag resize handler
  useEffect(() => {
    if (!resizing) {
      document.documentElement.removeAttribute('data-sidebar-resizing');
      return;
    }
    document.documentElement.setAttribute('data-sidebar-resizing', 'true');
    const handleMouseMove = (event: MouseEvent) => {
      const next = Math.round(event.clientX);
      if (next >= MIN_SIDEBAR_WIDTH && next <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(next);
      }
    };
    const handleMouseUp = () => setResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.removeAttribute('data-sidebar-resizing');
    };
  }, [resizing, setSidebarWidth]);

  const role = profile?.role || 'member';
  const isLeader = canViewTeamManagement(profile);
  const canManageBorrow = isAssetApprover(profile);
  const canBorrow = canSubmitAssetRequest(profile);

  const staffName = (profile?.name || 'Nhân viên').trim();
  const staffInitials =
    staffName
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NV';

  const staffPositionLabel = useMemo(() => {
    const dbRole = (profile?.role || 'member').toLowerCase();
    const roleLabel =
      dbRole === 'admin'
        ? 'Admin'
        : dbRole === 'manager'
        ? 'Manager'
        : dbRole === 'leader'
        ? 'Team Leader'
        : 'Nhân viên';
    const jobTitle = (profile?.job_title || profile?.employment_level || roleLabel).trim();
    const dept = (profile?.department_name || '').trim();
    const hasValidDept =
      Boolean(dept) &&
      dept !== 'Chưa phân team' &&
      dept !== 'Unassigned team' &&
      !jobTitle.toLowerCase().includes(dept.toLowerCase());
    return hasValidDept ? `${jobTitle} · ${dept}` : jobTitle;
  }, [profile]);

  const groups = useMemo(
    () =>
      buildSidebarGroups({
        t,
        role,
        isLeader,
        canManageBorrow,
        canBorrow,
        enrichedTasks,
        enrichedTracks,
        summary,
        togglePin,
        includeProfileInTree: false,
      }),
    [t, role, isLeader, canManageBorrow, canBorrow, enrichedTasks, enrichedTracks, summary, togglePin]
  );

  // Lookup map of all root nav items across groups for Pinned Nav shortcuts
  const navLookup = useMemo(() => {
    const map = new Map<string, { item: DrillMenuItem; group: SidebarGroupModel }>();
    groups.forEach(group => {
      const root = group.nodes[group.rootNodeId];
      root?.items.forEach(item => {
        if (item.id !== 'tp:root:profile') {
          map.set(item.id, { item, group });
        }
      });
    });
    return map;
  }, [groups]);

  const visiblePinnedNavs = useMemo(
    () =>
      pinnedNavIds
        .filter(id => id !== 'tp:root:profile')
        .map(id => navLookup.get(id))
        .filter((entry): entry is { item: DrillMenuItem; group: SidebarGroupModel } => Boolean(entry)),
    [pinnedNavIds, navLookup]
  );

  // Single-Expand Accordion State (Brief: UI_UX sidebar.docx)
  const findGroupForRoute = useCallback(
    (pathname: string, search: string): string | null => {
      if (pathname === '/my-tasks') return null;
      for (const group of groups) {
        const root = group.nodes[group.rootNodeId];
        if (!root) continue;
        for (const item of root.items) {
          if (!item.path) continue;
          const [basePath, query] = item.path.split('?');
          if (pathname === basePath && (!query || search.includes(query))) {
            return group.id;
          }
        }
      }
      return groups[0]?.id || 'main';
    },
    [groups]
  );

  const ALL_GROUP_IDS = useMemo(() => ['main', 'tasksProj', 'assets', 'teamRep'], []);
  const [openGroupIds, setOpenGroupIds] = useRememberedState<string[]>(
    'sidebar_open_groups',
    ALL_GROUP_IDS
  );
  const [activeGroupId, setActiveGroupId] = useState<string>(
    () => findGroupForRoute(location.pathname, location.search) || groups[0]?.id || 'main'
  );

  // Keep active group indicator and accordion synced ONLY when route actually changes
  const lastPathnameRef = useRef(location.pathname);
  useEffect(() => {
    const isRouteChange = lastPathnameRef.current !== location.pathname;
    if (isRouteChange) {
      lastPathnameRef.current = location.pathname;
      const matched = findGroupForRoute(location.pathname, location.search);
      if (matched) {
        setActiveGroupId(matched);
        setOpenGroupIds(prev => (prev.includes(matched) ? prev : [...prev, matched]));
      }
    }
  }, [location.pathname, location.search, findGroupForRoute, setOpenGroupIds]);

  // Measure active group header position for the Left Spine Active Indicator Bar
  const accordionRootRef = useRef<HTMLDivElement | null>(null);
  const [spineIndicator, setSpineIndicator] = useState<{
    top: number;
    height: number;
  }>({ top: 6, height: 22 });

  const updateSpineIndicator = useCallback(() => {
    const rootEl = accordionRootRef.current;
    const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
    if (!rootEl || !activeGroup) return;
    const headerEl = rootEl.querySelector<HTMLElement>(
      `[data-tree-group-id="${activeGroup.id}"]`
    );
    if (!headerEl) return;
    const rootRect = rootEl.getBoundingClientRect();
    const headerRect = headerEl.getBoundingClientRect();
    const nextTop = Math.max(4, Math.round(headerRect.top - rootRect.top + 5));
    const nextHeight = Math.max(18, Math.round(headerRect.height - 10));

    setSpineIndicator(prev => {
      if (prev.top === nextTop && prev.height === nextHeight) {
        return prev;
      }
      return { top: nextTop, height: nextHeight };
    });
  }, [activeGroupId, groups]);

  useLayoutEffect(() => {
    updateSpineIndicator();
    const timer = setTimeout(updateSpineIndicator, 330);
    return () => clearTimeout(timer);
  }, [activeGroupId, openGroupIds, openDropdownItemId, updateSpineIndicator]);

  const handleSelectGroup = useCallback(
    (group: SidebarGroupModel) => {
      setOpenGroupIds(prev => {
        if (prev.includes(group.id)) {
          return prev.filter(id => id !== group.id);
        }
        return [...prev, group.id];
      });
    },
    [setOpenGroupIds]
  );

  const handleToggleNavPin = useCallback(
    (item: DrillMenuItem, _group: SidebarGroupModel) => {
      const nowPinned = toggleNavPinStore(item.id, profile?.id);
      if (nowPinned) {
        showPinToast(`📌 Đã ghim "${item.label}"`);
      }
    },
    [toggleNavPinStore, profile?.id, showPinToast]
  );

  // @dnd-kit Sensors & Handlers (Brief: UX_UI pin hover custom.docx)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const payload = event.active.data.current as ActiveDragPayload | undefined;
    if (payload) setActiveDrag(payload);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const payload = event.active.data.current as ActiveDragPayload | undefined;
    setActiveDrag(null);
    if (!payload || !event.over) return;

    const overId = String(event.over.id);
    const activeId = String(event.active.id);

    // 1. Dragged a Workspace Nav Item onto the Pinned Zone -> Pin it!
    if (payload.source === 'workspace-nav' && payload.navId) {
      const isOverPinZone =
        overId === 'sidebar-pinned-dropzone' ||
        overId.startsWith('pinned-nav:') ||
        overId.startsWith('pinned-entity:') ||
        overId.startsWith('pinned-task:');
      if (isOverPinZone && !pinnedNavIds.includes(payload.navId)) {
        toggleNavPinStore(payload.navId, profile?.id);
        showPinToast(`📌 Đã ghim "${payload.label}"`);
      }
      return;
    }

    if (activeId === overId) return;

    // 2. Reordering Pinned Nav Items
    if (payload.source === 'pinned-nav' && overId.startsWith('pinned-nav:')) {
      const oldNavId = activeId.replace('pinned-nav:', '');
      const newNavId = overId.replace('pinned-nav:', '');
      const oldIndex = pinnedNavIds.indexOf(oldNavId);
      const newIndex = pinnedNavIds.indexOf(newNavId);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPinnedNavs(arrayMove(pinnedNavIds, oldIndex, newIndex), profile?.id);
      }
      return;
    }

    // 3. Reordering Pinned Entities (Projects / Campaigns)
    if (payload.source === 'pinned-entity' && overId.startsWith('pinned-entity:')) {
      const keys = pinnedEntities.map(e => `pinned-entity:${e.kind}:${e.id}`);
      const oldIndex = keys.indexOf(activeId);
      const newIndex = keys.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPinnedEntities(arrayMove(pinnedEntities, oldIndex, newIndex), profile?.id);
      }
      return;
    }

    // 4. Reordering Pinned Tasks
    if (payload.source === 'pinned-task' && overId.startsWith('pinned-task:')) {
      const taskIds = pinnedTaskItems.map(t => t.id);
      const oldTaskId = activeId.replace('pinned-task:', '');
      const newTaskId = overId.replace('pinned-task:', '');
      const oldIndex = taskIds.indexOf(oldTaskId);
      const newIndex = taskIds.indexOf(newTaskId);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPinnedTasks(arrayMove(taskIds, oldIndex, newIndex), profile?.id);
      }
    }
  };

  const totalPinnedCount =
    visiblePinnedNavs.length + pinnedEntities.length + pinnedTaskItems.length;

  const sortableIds = useMemo(
    () => [
      ...visiblePinnedNavs.map(({ item }) => `pinned-nav:${item.id}`),
      ...pinnedEntities.map(e => `pinned-entity:${e.kind}:${e.id}`),
      ...pinnedTaskItems.map(t => `pinned-task:${t.id}`),
    ],
    [visiblePinnedNavs, pinnedEntities, pinnedTaskItems]
  );

  const renderDragOverlayIcon = (drag: ActiveDragPayload) => {
    if (drag.navId) {
      const found = navLookup.get(drag.navId);
      if (found) return found.item.icon;
    }
    if (drag.source === 'pinned-entity') return <FolderKanban size={16} />;
    if (drag.source === 'pinned-task') return <CheckSquare size={16} />;
    return <Layers size={16} />;
  };

  return (
    <div className="app-sidebar-outer w-full h-full flex-shrink-0 z-10 relative">
      <aside className="app-sidebar app-sidebar-inner w-full h-full card-hub flex flex-col pt-3 pb-3 flex-shrink-0 z-10 relative shadow-sm">
        {/* Right-edge Drag Resize Handle */}
        <div
          onMouseDown={e => {
            e.preventDefault();
            setResizing(true);
          }}
          onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
          title="Kéo để thay đổi độ rộng Sidebar (Nhấp đúp để đặt lại)"
          className={cn('sb-resize-handle hidden xl:flex', resizing && 'is-resizing')}
        >
          <span className="sb-resize-grip" />
        </div>

        <NavLink
          to="/"
          className="sb-logo-card mb-3 flex items-center justify-center bg-[#FAFAFA] dark:bg-slate-800 mx-3 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs transition-transform hover:scale-[1.01]"
        >
          <img
            src="/logo-light.svg"
            alt="K COFFEE Logo"
            className="h-9 w-auto filter drop-shadow-xs block dark:hidden"
          />
          <img
            src="/logo-dark.svg"
            alt="K COFFEE Logo"
            className="h-9 w-auto filter drop-shadow-xs hidden dark:block"
          />
        </NavLink>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="flex-1 overflow-y-auto px-3.5 custom-scrollbar">
          {/* ==========================================
              ZONE 1: PINNED (ĐÃ GHIM - Sortable & Drop-to-Pin)
             ========================================== */}
          {(totalPinnedCount > 0 || activeDrag?.source === 'workspace-nav') && (
            <div className="mb-3">
              <div className="sb-section-divider">
                <span className="flex items-center gap-1.5">
                  <StylizedPinIcon size={11.5} pinned className="text-blue-600 dark:text-emerald-400" />
                  <span>Đã ghim</span>
                </span>
                <span className="text-[10px] font-bold opacity-75">{totalPinnedCount}</span>
              </div>

              <PinnedDropZone isDraggingAny={Boolean(activeDrag)}>
                {totalPinnedCount === 0 ? (
                  <div className="py-2.5 px-3 text-center text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                    Thả mục vào đây để ghim lên đầu Sidebar
                  </div>
                ) : (
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-1">
                      {visiblePinnedNavs.map(({ item, group }) => {
                        const [basePath, query] = (item.path || '').split('?');
                        const active =
                          Boolean(item.path) &&
                          location.pathname === basePath &&
                          (!query || location.search.includes(query));
                        const sortableId = `pinned-nav:${item.id}`;

                        return (
                          <SortablePinnedItemRow
                            key={sortableId}
                            sortableId={sortableId}
                            dragPayload={{
                              id: sortableId,
                              source: 'pinned-nav',
                              label: item.label,
                              accentColor: group.accentColor,
                              navId: item.id,
                            }}
                            label={item.label}
                            icon={item.icon}
                            active={active}
                            onClick={() => item.path && navigate(item.path)}
                            onUnpin={() => toggleNavPinStore(item.id, profile?.id)}
                          />
                        );
                      })}

                      {pinnedEntities.map(entity => {
                        const href =
                          entity.kind === 'campaign'
                            ? `/projects?campaign=${encodeURIComponent(entity.id)}`
                            : `/projects?project=${encodeURIComponent(entity.id)}`;
                        const active =
                          location.pathname === '/projects' &&
                          location.search.includes(`${entity.kind}=${entity.id}`);
                        const sortableId = `pinned-entity:${entity.kind}:${entity.id}`;
                        const icon =
                          entity.kind === 'campaign' ? (
                            <Megaphone size={16} className="text-amber-500" />
                          ) : (
                            <FolderKanban size={16} className="text-violet-500" />
                          );

                        return (
                          <SortablePinnedItemRow
                            key={sortableId}
                            sortableId={sortableId}
                            dragPayload={{
                              id: sortableId,
                              source: 'pinned-entity',
                              label: entity.name,
                              accentColor: entity.kind === 'campaign' ? '#F59E0B' : '#7C3AED',
                              entity,
                            }}
                            label={entity.name}
                            icon={icon}
                            active={active}
                            onClick={() => navigate(href)}
                            onUnpin={() => unpinEntity(entity.kind, entity.id)}
                          />
                        );
                      })}

                      {pinnedTaskItems.map(task => {
                        const active =
                          location.pathname === '/tasks' &&
                          location.search.includes(encodeURIComponent(task.id));
                        const sortableId = `pinned-task:${task.id}`;
                        const icon = <CheckSquare size={16} />;

                        return (
                          <SortablePinnedItemRow
                            key={sortableId}
                            sortableId={sortableId}
                            dragPayload={{
                              id: sortableId,
                              source: 'pinned-task',
                              label: task.title,
                              accentColor: '#2563EB',
                              taskId: task.id,
                            }}
                            label={task.title}
                            icon={icon}
                            active={active}
                            onClick={() => navigate(task.href)}
                            onUnpin={() => togglePin(task.id)}
                          />
                        );
                      })}
                    </ul>
                  </SortableContext>
                )}
              </PinnedDropZone>
            </div>
          )}

          {/* ==========================================
              ZONE 2: WORKSPACES (Tree Accordion with Dynamic SVG Branch)
             ========================================== */}
          <div className="sb-section-divider mt-1">
            <span>Không gian làm việc</span>
          </div>

          <div ref={accordionRootRef} className="sb-tree-accordion-root">
            {/* Left Vertical Spine Track */}
            <div className="sb-left-spine-track" aria-hidden="true" />

            {/* Sliding Active Group Bar on Left Spine */}
            <div
              aria-hidden="true"
              className="sb-spine-active-bar"
              style={{
                transform: `translateY(${spineIndicator.top}px)`,
                height: `${spineIndicator.height}px`,
              }}
            />

            {groups.map(group => (
              <SidebarTreeGroupSection
                key={group.id}
                group={group}
                isOpen={openGroupIds.includes(group.id)}
                onSelectGroup={handleSelectGroup}
                currentPath={location.pathname}
                currentSearch={location.search}
                openDropdownItemId={openDropdownItemId}
                onToggleItemDropdown={handleToggleItemDropdown}
                onNavigate={path => navigate(path)}
                pinnedNavIds={pinnedNavIds}
                onToggleNavPin={handleToggleNavPin}
                onToggleTaskPin={taskId => {
                  const wasPinned = pinnedTaskIds.includes(taskId);
                  togglePin(taskId);
                  if (!wasPinned) {
                    showPinToast('📌 Đã ghim công việc lên đầu danh sách');
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Floating Drag Overlay (#18181B solid black pill) */}
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="sb-dragging-floating-pill">
              <span className="shrink-0 inline-flex items-center justify-center text-blue-400">
                {renderDragOverlayIcon(activeDrag)}
              </span>
              <span className="truncate max-w-[180px]">{activeDrag.label}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Floating Toast Pill Feedback when pinning */}
      {pinToastMessage && (
        <div role="status" aria-live="polite" className="sb-pin-toast-pill">
          <span>{pinToastMessage}</span>
        </div>
      )}

      {/* ==========================================
          ZONE 3: BOTTOM STAFF PROFILE CARD (/my-tasks)
         ========================================== */}
      <div className="mt-auto px-3.5 pt-2 space-y-2">
        <NavLink
          to="/my-tasks"
          title={t('nav.profile')}
          className={({ isActive }) =>
            cn(
              'sidebar-link sb-profile-footer-card flex items-center gap-3 w-full cursor-pointer select-none',
              isActive ? 'sidebar-link-active' : 'sidebar-link-idle'
            )
          }
        >
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-emerald-500 dark:to-teal-600 text-white font-bold text-sm shadow-xs ring-2 ring-white/80 dark:ring-slate-800/80">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={staffName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{staffInitials}</span>
              )}
            </div>
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
            />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-bold leading-tight text-gray-900 dark:text-white">
              {staffName}
            </p>
            <p className="truncate text-xs font-medium leading-tight text-gray-500 dark:text-slate-400 mt-0.5">
              {staffPositionLabel}
            </p>
          </div>
        </NavLink>

        {officialReadEnabled && (
          <NavLink
            to="/main-view"
            className={({ isActive }) =>
              cn(
                'sidebar-link flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border border-transparent',
                isActive ? 'sidebar-link-active' : 'sidebar-link-idle'
              )
            }
          >
            <ExternalLink size={14} />
            <span className="truncate">Theo dõi Main · Chỉ đọc</span>
          </NavLink>
        )}

        <div className="pt-0.5 text-center">
          <p className="text-[11px] font-medium text-[#A1A1AA] tracking-wider">
            Making by <span className="text-primary dark:text-blue-400 font-bold">BART</span>
          </p>
        </div>
      </div>
    </aside>
  </div>
);
};
