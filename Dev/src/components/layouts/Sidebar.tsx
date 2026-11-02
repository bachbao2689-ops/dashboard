import { entityLink } from '../../lib/taskTracking';
import { type NotificationItem } from '../../store/notificationStore';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from "react-dom";
import {
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  Sun,
  Moon,
  Globe,
  Check,
  X,
  Sparkles,
  RefreshCw,
  User,
} from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import { markNotificationsRead } from "../../store/notificationStore";
import { PushNotificationSettings } from "../features/notifications/PushNotificationSettings";
import {
  NotificationIcon,
  TONES,
  toneOf,
  toneStyle,
  PicText,
  formatNotificationTimestamp,
} from "../features/notifications/notificationVisual";
import toast from "react-hot-toast";
import { appUpdateService, type UpdateInfo } from "../../services/appUpdateService";

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
import { useSidebarNotificationDismissStore } from '../../store/sidebarNotificationDismissStore';
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
  onItemCheck?: (item: DrillMenuItem) => void;
}> = ({ isOpen, rootDetailNodeId, nodes, onNavigate, onTogglePin: _onTogglePin, onItemCheck }) => {
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
                onClick={() => {
                  if (interactive && node.headerPath) {
                    const firstItem = node.items[0];
                    if (onItemCheck && firstItem && (firstItem.entityKind || firstItem.pinTaskId)) {
                      onItemCheck(firstItem);
                    }
                    onNavigate(node.headerPath);
                  }
                }}
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
                    if (onItemCheck && (item.entityKind || item.pinTaskId)) {
                      onItemCheck(item);
                    }
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
                      if (onItemCheck && (item.entityKind || item.pinTaskId)) {
                        onItemCheck(item);
                      }
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
  onItemCheck?: (item: DrillMenuItem) => void;
}> = ({
  item,
  group,
  active,
  isNavPinned: _isNavPinned,
  hasDrill,
  isDropdownOpen,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
  onToggleItemDropdown,
  onToggleNavPin: _onToggleNavPin,
  onToggleTaskPin,
  onItemCheck,
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
  const subItemCount = subNode ? subNode.items.filter(it => !it.id.endsWith(':empty')).length : 0;

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
          'sidebar-link sb-root-row flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300 cursor-pointer select-none border border-transparent',
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

          {/* Clean compact pill trigger for multi-level sub-drawer */}
          {hasDrill && (subItemCount > 0 || isDropdownOpen) && (
            <button
              type="button"
              aria-expanded={isDropdownOpen}
              title={
                isDropdownOpen
                  ? `Thu gọn thông báo ${item.label}`
                  : `Mở thông báo ${item.label} (${subItemCount})`
              }
              aria-label={
                isDropdownOpen
                  ? `Thu gọn thông báo ${item.label}`
                  : `Mở thông báo ${item.label}`
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
          onItemCheck={onItemCheck}
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
  onItemCheck?: (item: DrillMenuItem) => void;
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
  onItemCheck,
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
                  onItemCheck={onItemCheck}
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
  const { isSidebarCollapsed, toggleSidebarCollapsed, setSidebarCollapsed, theme, toggleTheme, lang, setLang } = useUiStore();
  const { items: notifications, unread } = useNotificationCenter();
  const [markingRead, setMarkingRead] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [showCollapsedSearch, setShowCollapsedSearch] = useState(false);
  const [floatingTooltip, setFloatingTooltip] = useState<{ text: string; top: number; left: number } | null>(null);

  const showTooltip = (text: string, e: React.MouseEvent<HTMLElement>) => {
    if (!isSidebarCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setFloatingTooltip({
      text,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => {
    setFloatingTooltip(null);
  };

  useEffect(() => {
    setFloatingTooltip(null);
  }, [isSidebarCollapsed]);
  const collapsedSearchBtnRef = useRef<HTMLButtonElement>(null);
  const collapsedSearchPanelRef = useRef<HTMLDivElement>(null);
  const [collapsedSearchQuery, setCollapsedSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<any>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => appUpdateService.getUpdateInfo());

  useEffect(() => {
    return appUpdateService.subscribe(setUpdateInfo);
  }, []);

  const markAllNotificationsRead = async () => {
    if (markingRead || !unread) return;
    setMarkingRead(true);
    try {
      await markNotificationsRead();
    } catch {
      toast.error('Chưa đánh dấu đã đọc được. Vui lòng thử lại.');
    } finally {
      setMarkingRead(false);
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    void markNotificationsRead([notification.id]).catch(() =>
      toast.error('Chưa đồng bộ trạng thái đã đọc.')
    );
    setShowNotifs(false);
    const href = entityLink(
      notification.entity_type,
      notification.entity_id,
      notification.metadata
    );
    if (href) navigate(href);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showCollapsedSearch &&
        collapsedSearchBtnRef.current &&
        !collapsedSearchBtnRef.current.contains(target) &&
        !collapsedSearchPanelRef.current?.contains(target)
      ) {
        setShowCollapsedSearch(false);
      }
      if (
        showNotifs &&
        notifRef.current &&
        !notifRef.current.contains(target) &&
        !notifPanelRef.current?.contains(target)
      ) {
        setShowNotifs(false);
      }
      if (
        showSettings &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(target) &&
        !settingsPanelRef.current?.contains(target)
      ) {
        setShowSettings(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifs(false);
        setShowSettings(false);
      }
    };
    if (showNotifs || showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifs, showSettings]);

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

  const currentDragWidthRef = useRef<number>(DEFAULT_SIDEBAR_WIDTH);

  // Drag resize handler with Smooth Tracking & Midpoint Snap:
  // - While dragging: continuous live width tracking (clamped 80..MAX_SIDEBAR_WIDTH)
  // - On mouseUp:
  //   * If dragged < 176px (more than half towards crop) -> auto-snap to collapsed (80px)
  //   * If dragged >= 176px (more than half towards expand) -> auto-snap to expanded (272px or dragged width)
  useEffect(() => {
    if (!resizing) {
      document.documentElement.removeAttribute('data-sidebar-resizing');
      return;
    }
    document.documentElement.setAttribute('data-sidebar-resizing', 'true');
    const handleMouseMove = (event: MouseEvent) => {
      const next = Math.round(event.clientX);
      const clamped = Math.max(80, Math.min(MAX_SIDEBAR_WIDTH, next));
      currentDragWidthRef.current = clamped;
      document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
    };
    const handleMouseUp = () => {
      setResizing(false);
      document.documentElement.removeAttribute('data-sidebar-resizing');
      const finalWidth = currentDragWidthRef.current;
      const MIDPOINT = 176; // (80 + 272) / 2
      if (finalWidth < MIDPOINT) {
        setSidebarCollapsed(true);
        document.documentElement.style.setProperty('--sidebar-width', `${DEFAULT_SIDEBAR_WIDTH}px`);
        setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
      } else {
        setSidebarCollapsed(false);
        const resolvedWidth = finalWidth >= MIN_SIDEBAR_WIDTH ? finalWidth : DEFAULT_SIDEBAR_WIDTH;
        document.documentElement.style.setProperty('--sidebar-width', `${resolvedWidth}px`);
        setSidebarWidth(resolvedWidth);
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.removeAttribute('data-sidebar-resizing');
    };
  }, [resizing, setSidebarWidth, setSidebarCollapsed]);

  const role = profile?.role || 'member';
  const isLeader = canViewTeamManagement(profile);
  const canManageBorrow = isAssetApprover(profile);
  const canBorrow = canSubmitAssetRequest(profile);

  const { syncOwner: syncDismissOwner, isDismissed, dismissEntity } = useSidebarNotificationDismissStore();

  useEffect(() => {
    syncDismissOwner(profile?.id);
  }, [profile?.id, syncDismissOwner]);

  const handleItemCheck = useCallback(
    (item: DrillMenuItem) => {
      const kind = item.entityKind;
      const id = item.entityId || item.pinTaskId;
      if (kind && id) {
        dismissEntity(kind, id);
      } else if (item.pinTaskId) {
        dismissEntity('task', item.pinTaskId);
      }
    },
    [dismissEntity]
  );

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
        isDismissed,
      }),
    [t, role, isLeader, canManageBorrow, canBorrow, enrichedTasks, enrichedTracks, summary, togglePin, isDismissed]
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
  const collapsedNavItems = useMemo(() => {
    const list: Array<{ id: string; label: string; icon: React.ReactNode; path: string }> = [];
    const seenPaths = new Set<string>();
    groups.forEach(g => {
      const rootNode = g.nodes[g.rootNodeId];
      if (rootNode?.items) {
        rootNode.items.forEach(it => {
          if (it.path && !seenPaths.has(it.path)) {
            seenPaths.add(it.path);
            list.push({
              id: it.id,
              label: it.label,
              icon: it.icon,
              path: it.path,
            });
          }
        });
      }
    });
    return list;
  }, [groups]);

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
      <aside className={cn(
        'app-sidebar app-sidebar-inner w-full h-full card-hub flex flex-col flex-shrink-0 z-10 relative shadow-sm',
        isSidebarCollapsed ? 'items-center py-2.5 px-0' : 'pt-2.5 pb-2.5'
      )}>
        {/* Right-edge Drag Resize Handle */}
        <div
          onMouseDown={e => {
            e.preventDefault();
            setResizing(true);
          }}
          onDoubleClick={() => {
            setSidebarCollapsed(false);
            setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
          }}
          title={lang === 'en' ? 'Drag to resize sidebar (Double click to reset)' : 'Kéo để thay đổi độ rộng Sidebar (Nhấp đúp để đặt lại)'}
          className={cn('sb-resize-handle hidden xl:flex', resizing && 'is-resizing')}
        >
          <span className="sb-resize-grip" />
        </div>

        {/* ==========================================
            ROW 1 (TOP): LOGO + PHUC SINH CONSUMERS (Centered & scaled +20%)
           ========================================== */}
        {isSidebarCollapsed ? (
          <div className="w-full flex flex-col items-center gap-1.5 pb-[0.7rem] mb-1.5 shrink-0">
            <NavLink
              to="/"
              onMouseEnter={(e) => showTooltip("Phuc Sinh Consumers", e)}
              onMouseLeave={hideTooltip}
              className="w-9 h-9 flex items-center justify-center shrink-0 group relative"
              title="Phuc Sinh Consumers"
            >
              <img src="/logo-ps-square.svg" alt="PS" className="h-6 w-6 object-contain" />
            </NavLink>
            <button
              type="button"
              onClick={() => toggleSidebarCollapsed()}
              onMouseEnter={(e) => showTooltip(lang === "en" ? "Expand sidebar" : "Mở rộng thanh bên", e)}
              onMouseLeave={hideTooltip}
              title={lang === "en" ? "Expand sidebar" : "Mở rộng thanh bên"}
              aria-label={lang === "en" ? "Expand sidebar" : "Mở rộng thanh bên"}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer shrink-0"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full px-3 pt-1 pb-[0.7rem] mb-2.5">
            <NavLink
              to="/"
              className="flex items-center justify-center min-w-0 group"
              title="Phuc Sinh Consumers"
            >
              <img
                src="/logo-phuc-sinh-consumer-text.svg"
                alt="Phuc Sinh Consumers"
                className="h-[38px] w-auto max-w-[228px] object-contain block dark:brightness-125 transition-transform"
              />
            </NavLink>
          </div>
        )}

        {/* ==========================================
            ROW 2: SEARCH INPUT + COLLAPSE + NOTIFICATION BELL
           ========================================== */}
        {isSidebarCollapsed ? (
          <div className="w-full flex flex-col items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-slate-800/80 mb-1.5 shrink-0">
            <div className="relative shrink-0 flex items-center justify-center group/nav">
              <button
                ref={collapsedSearchBtnRef}
                type="button"
                onClick={() => {
                  setShowNotifs(false);
                  setShowSettings(false);
                  setShowCollapsedSearch(!showCollapsedSearch);
                }}
                onMouseEnter={(e) => showTooltip(lang === "en" ? "Search" : "Tìm kiếm", e)}
                onMouseLeave={hideTooltip}
                title={lang === "en" ? "Search" : "Tìm kiếm"}
                aria-label={lang === "en" ? "Search" : "Tìm kiếm"}
                aria-expanded={showCollapsedSearch}
                className={cn(
                  "w-9 h-9 rounded-[8px] flex items-center justify-center transition-colors cursor-pointer shrink-0",
                  showCollapsedSearch
                    ? "bg-primary/10 text-primary dark:bg-slate-800 dark:text-blue-300"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/70"
                )}
              >
                <Search size={16} />
              </button>
            </div>
            <div className="relative shrink-0 flex items-center justify-center group/nav" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setShowCollapsedSearch(false);
                  setShowSettings(false);
                  setShowNotifs(!showNotifs);
                }}
                onMouseEnter={(e) => showTooltip(lang === "en" ? "Notifications" : "Thông báo", e)}
                onMouseLeave={hideTooltip}
                title={lang === "en" ? "Notifications" : "Thông báo"}
                aria-label={lang === "en" ? "Notifications" : "Thông báo"}
                aria-expanded={showNotifs}
                className={cn(
                  "w-9 h-9 rounded-[8px] flex items-center justify-center transition-colors relative cursor-pointer shrink-0",
                  showNotifs
                    ? "bg-primary/10 text-primary dark:bg-slate-800 dark:text-blue-300"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/70"
                )}
              >
                <span className={unread > 0 ? "notif-bell" : undefined}><Bell size={16} /></span>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1.5 px-3 mb-2.5">
            <div className="relative min-w-0">
              <input
                type="text"
                value={sidebarSearchQuery}
                onChange={e => setSidebarSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && sidebarSearchQuery.trim()) {
                    navigate(`/tasks?search=${encodeURIComponent(sidebarSearchQuery.trim())}`);
                  }
                }}
                placeholder={lang === "en" ? "Search..." : "Tìm kiếm..."}
                className="w-full h-8 pl-8 pr-2.5 text-xs rounded-[8px] bg-transparent text-gray-900 dark:text-white border border-slate-200/90 dark:border-slate-700/80 focus:outline-none focus:border-blue-500/60 dark:focus:border-blue-400/60 transition-colors"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Collapse sidebar button (to the left of notification button) */}
            <button
              type="button"
              onClick={() => toggleSidebarCollapsed()}
              title={lang === "en" ? "Collapse sidebar" : "Thu gọn thanh bên"}
              aria-label={lang === "en" ? "Collapse sidebar" : "Thu gọn thanh bên"}
              className="w-8 h-8 rounded-[8px] grid place-items-center text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose size={16} />
            </button>
            {/* Notification button */}
            <div className="relative shrink-0" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifs(!showNotifs)}
                title={lang === "en" ? "Notifications" : "Thông báo"}
                aria-label={lang === "en" ? "Notifications" : "Thông báo"}
                aria-expanded={showNotifs}
                className={cn(
                  "w-8 h-8 rounded-[8px] grid place-items-center transition-colors relative cursor-pointer",
                  showNotifs
                    ? "bg-primary/10 text-primary dark:bg-slate-800 dark:text-blue-300"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/70"
                )}
              >
                <span className={unread > 0 ? "notif-bell" : undefined}><Bell size={16} /></span>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            MIDDLE NAVIGATION: COLLAPSED OR FULL DND
           ========================================== */}
        {isSidebarCollapsed ? (
          <div className="flex-1 w-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center gap-1.5 py-1">
            {/* Pinned Tasks and Entities when Sidebar is Collapsed / Cropped */}
            {(pinnedTaskItems.length > 0 || pinnedEntities.length > 0) && (
              <div className="w-full flex flex-col items-center gap-1.5 pb-1.5 border-b border-gray-200/80 dark:border-slate-800/80 mb-1 shrink-0">
                {pinnedTaskItems.map(task => {
                  const href = `/workflow?task=${encodeURIComponent(task.id)}`;
                  const active =
                    location.pathname === '/workflow' &&
                    location.search.includes(`task=${task.id}`);

                  return (
                    <div key={`col-pinned-task-${task.id}`} className="group/nav relative flex items-center justify-center shrink-0 w-full">
                      <button
                        type="button"
                        onClick={() => navigate(href)}
                        className={cn(
                          'sidebar-link w-9 h-9 rounded-[8px] flex items-center justify-center transition-all cursor-pointer relative shrink-0',
                          active
                            ? 'sidebar-link-active'
                            : 'sidebar-link-idle hover:bg-blue-50 dark:hover:bg-[#002e6d]/30 text-blue-600 dark:text-sky-400'
                        )}
                        title={task.title}
                      >
                        <CheckSquare size={17} strokeWidth={2.2} />
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-white dark:ring-[#0a192f]" />
                      </button>
                      <div className="pointer-events-none absolute left-full ml-3 z-[9999] hidden group-hover/nav:flex items-center whitespace-nowrap rounded-[6px] bg-gray-900 dark:bg-[#0a192f] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-gray-800 dark:border-slate-700">
                        <span className="text-blue-400 mr-1.5 font-bold">📌 {lang === 'en' ? 'Task:' : 'Công việc:'}</span> {task.title}
                      </div>
                    </div>
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

                  return (
                    <div key={`col-pinned-ent-${entity.kind}-${entity.id}`} className="group/nav relative flex items-center justify-center shrink-0 w-full">
                      <button
                        type="button"
                        onClick={() => navigate(href)}
                        className={cn(
                          'sidebar-link w-9 h-9 rounded-[8px] flex items-center justify-center transition-all cursor-pointer relative shrink-0',
                          active
                            ? 'sidebar-link-active'
                            : 'sidebar-link-idle hover:bg-gray-100 dark:hover:bg-[#0a192f]'
                        )}
                        title={entity.name}
                      >
                        {entity.kind === 'campaign' ? (
                          <Megaphone size={16} className="text-amber-500" />
                        ) : (
                          <FolderKanban size={16} className="text-violet-500" />
                        )}
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white dark:ring-[#0a192f]" />
                      </button>
                      <div className="pointer-events-none absolute left-full ml-3 z-[9999] hidden group-hover/nav:flex items-center whitespace-nowrap rounded-[6px] bg-gray-900 dark:bg-[#0a192f] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-gray-800 dark:border-slate-700">
                        <span className="text-amber-400 mr-1.5 font-bold">📌 {entity.kind === 'campaign' ? 'Campaign:' : 'Project:'}</span> {entity.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {collapsedNavItems.map(item => {
              const [basePath, query] = (item.path || '').split('?');
              const active =
                Boolean(item.path) &&
                location.pathname === basePath &&
                (!query || location.search.includes(query));

              return (
                <div key={item.id} className="group/nav relative flex items-center justify-center shrink-0 w-full">
                  <NavLink
                    to={item.path}
                    onMouseEnter={(e) => showTooltip(item.label, e)}
                    onMouseLeave={hideTooltip}
                    className={cn(
                      'sidebar-link w-9 h-9 rounded-[8px] flex items-center justify-center transition-all cursor-pointer relative shrink-0',
                      active
                        ? 'sidebar-link-active'
                        : 'sidebar-link-idle hover:bg-gray-100 dark:hover:bg-[#0a192f]'
                    )}
                    title={item.label}
                  >
                    <span className="[&>svg]:w-[18px] [&>svg]:h-[18px] flex items-center justify-center">{item.icon}</span>
                  </NavLink>
                  {/* Floating tooltip on hover */}
                  <div className="pointer-events-none absolute left-full ml-3 z-[9999] hidden group-hover/nav:flex items-center whitespace-nowrap rounded-[6px] bg-gray-900 dark:bg-[#0a192f] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-gray-800 dark:border-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDrag(null)}
          >
            <div className="flex-1 overflow-y-auto px-3.5 custom-scrollbar">
              {/* ZONE 1: PINNED (ĐÃ GHIM - Sortable & Drop-to-Pin) */}
              {(totalPinnedCount > 0 || activeDrag?.source === 'workspace-nav') && (
                <div className="mb-3">
                  <div className="sb-section-divider">
                    <span className="flex items-center gap-1.5">
                      <StylizedPinIcon size={11.5} pinned className="text-blue-600 dark:text-emerald-400" />
                      <span>{lang === 'en' ? 'Pinned' : 'Đã ghim'}</span>
                    </span>
                    <span className="text-[10px] font-bold opacity-75">{totalPinnedCount}</span>
                  </div>

                  <PinnedDropZone isDraggingAny={Boolean(activeDrag)}>
                    {totalPinnedCount === 0 ? (
                      <div className="py-2.5 px-3 text-center text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                        {lang === 'en' ? 'Drop items here to pin to top' : 'Thả mục vào đây để ghim lên đầu'}
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
                            const href = `/workflow?task=${encodeURIComponent(task.id)}`;
                            const active =
                              location.pathname === '/workflow' &&
                              location.search.includes(`task=${task.id}`);
                            const sortableId = `pinned-task:${task.id}`;

                            return (
                              <SortablePinnedItemRow
                                key={sortableId}
                                sortableId={sortableId}
                                dragPayload={{
                                  id: sortableId,
                                  source: 'pinned-task',
                                  label: task.title,
                                  accentColor: '#3B82F6',
                                  taskId: task.id,
                                }}
                                label={task.title}
                                icon={<CheckSquare size={16} className="text-blue-500" />}
                                active={active}
                                onClick={() => navigate(href)}
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

              {/* ZONE 2: WORKSPACE ACCORDION GROUPS */}
              <div className="relative space-y-1">
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
                    onItemCheck={handleItemCheck}
                  />
                ))}
              </div>
            </div>

            {/* Floating Drag Overlay */}
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
        )}

        {/* Floating Toast Pill Feedback when pinning */}
        {pinToastMessage && (
          <div role="status" aria-live="polite" className="sb-pin-toast-pill">
            <span>{pinToastMessage}</span>
          </div>
        )}

        {/* ==========================================
            ZONE 3: BOTTOM STAFF PROFILE CARD (Settings merged into Avatar)
           ========================================== */}
        {isSidebarCollapsed ? (
          <div className="mt-auto w-full pt-2 border-t border-gray-100 dark:border-slate-800/80 flex flex-col items-center gap-2 pb-1 shrink-0">
            <button
              ref={settingsBtnRef}
              type="button"
              onClick={() => {
                setShowNotifs(false);
                setShowCollapsedSearch(false);
                setShowSettings(!showSettings);
              }}
              title={`${staffName} (${lang === "en" ? "Account & Settings" : "Tài khoản & Cài đặt"})`}
              onMouseEnter={(e) => showTooltip(`${staffName} · ${lang === "en" ? "Account & Settings" : "Tài khoản & Cài đặt"}`, e)}
              onMouseLeave={hideTooltip}
              className="group/avatar relative flex items-center justify-center shrink-0 cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-emerald-500 dark:to-teal-600 text-white font-bold text-xs shadow-xs ring-2 ring-white/80 dark:ring-slate-800/80 shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={staffName} className="w-full h-full object-cover" />
                ) : (
                  <span>{staffInitials}</span>
                )}
              </div>
              <div className="pointer-events-none absolute left-full ml-3 z-[9999] hidden group-hover/avatar:flex items-center whitespace-nowrap rounded-[6px] bg-gray-900 dark:bg-[#0a192f] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-gray-800 dark:border-slate-700">
                {staffName} · {lang === "en" ? "Account & Settings" : "Tài khoản & Cài đặt"}
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-auto px-3 pt-2 border-t border-gray-100 dark:border-slate-800/80 space-y-2">
            <div
              ref={settingsBtnRef}
              onClick={() => {
                setShowNotifs(false);
                setShowCollapsedSearch(false);
                setShowSettings(!showSettings);
              }}
              className={cn(
                'sidebar-link sb-profile-footer-card grid grid-cols-[auto_1fr] items-center gap-2.5 w-full p-2 rounded-[8px] select-none transition-colors border cursor-pointer',
                showSettings
                  ? 'bg-blue-50/80 dark:bg-[#002e6d]/30 border-blue-200 dark:border-blue-700/60 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0a192f] border-slate-200/80 dark:border-slate-700/80 hover:bg-gray-100 dark:hover:bg-slate-800/60'
              )}
              title={lang === "en" ? "Account & Settings" : "Tài khoản & Cài đặt"}
            >
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-emerald-500 dark:to-teal-600 text-white font-bold text-xs shadow-xs ring-2 ring-white/80 dark:ring-slate-800/80">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={staffName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{staffInitials}</span>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                />
              </div>

              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-bold leading-tight text-gray-900 dark:text-white">
                  {staffName}
                </p>
                <p className="truncate text-[11px] font-medium leading-tight text-gray-500 dark:text-slate-400 mt-0.5">
                  {staffPositionLabel}
                </p>
              </div>
            </div>

            {officialReadEnabled && (
              <NavLink
                to="/main-view"
                className={({ isActive }) =>
                  cn(
                    'sidebar-link flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-xs font-medium border border-transparent',
                    isActive ? 'sidebar-link-active' : 'sidebar-link-idle'
                  )
                }
              >
                <ExternalLink size={13} />
                <span className="truncate">Theo dõi Main · Chỉ đọc</span>
              </NavLink>
            )}
          </div>
        )}

        {/* PORTAL 0: FLOATING SEARCH POPOVER WHEN COLLAPSED */}
        {showCollapsedSearch && isSidebarCollapsed &&
          createPortal(
            <>
              {/* Transparent full-screen backdrop to dismiss on click outside */}
              <div
                className="fixed inset-0 z-[9998] bg-transparent cursor-default"
                onClick={() => setShowCollapsedSearch(false)}
              />
              <div
                ref={collapsedSearchPanelRef}
                style={(() => {
                  const r = collapsedSearchBtnRef.current?.getBoundingClientRect();
                  return r
                    ? {
                        top: Math.max(12, r.top),
                        left: Math.min(r.right + 12, window.innerWidth - 300),
                      }
                    : { top: 60, left: 84 };
                })()}
                className="fixed w-[280px] p-2 bg-white dark:bg-[#0a192f] rounded-[8px] shadow-2xl border border-gray-200 dark:border-slate-700 z-[9999] animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (collapsedSearchQuery.trim()) {
                      navigate(`/tasks?search=${encodeURIComponent(collapsedSearchQuery.trim())}`);
                      setShowCollapsedSearch(false);
                      setCollapsedSearchQuery('');
                    }
                  }}
                  className="relative"
                >
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    autoFocus
                    value={collapsedSearchQuery}
                    onChange={(e) => setCollapsedSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowCollapsedSearch(false);
                    }}
                    placeholder={lang === "en" ? "Search tasks, projects..." : "Tìm việc, dự án..."}
                    className="w-full text-xs pl-8 pr-7 py-1.5 rounded-[6px] bg-slate-100 dark:bg-[#071325] border border-slate-200/80 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  {collapsedSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCollapsedSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </form>
              </div>
            </>,
            document.body
          )}

        {/* PORTAL TOOLTIP FOR COLLAPSED SIDEBAR ITEMS */}
        {floatingTooltip && isSidebarCollapsed &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: floatingTooltip.top,
                left: floatingTooltip.left,
                transform: "translateY(-50%)",
                zIndex: 999999,
                pointerEvents: "none",
              }}
              className="flex items-center whitespace-nowrap rounded-[6px] bg-gray-900/95 dark:bg-[#0a192f]/95 px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xl border border-gray-800 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100"
            >
              {floatingTooltip.text}
            </div>,
            document.body
          )}

        {/* ==========================================
            PORTAL 1: NOTIFICATION POPOVER PANEL
           ========================================== */}
        {showNotifs &&
          createPortal(
            <div
              ref={notifPanelRef}
              style={(() => {
                const r = notifRef.current?.getBoundingClientRect();
                return r
                  ? {
                      top: isSidebarCollapsed ? Math.max(12, r.top) : r.bottom + 8,
                      left: isSidebarCollapsed
                        ? Math.min(r.right + 12, window.innerWidth - 372)
                        : Math.max(12, Math.min(r.left, window.innerWidth - 372)),
                    }
                  : { top: 60, left: 12 };
              })()}
              className="notif-glass fixed w-[min(360px,calc(100vw-24px))] bg-white dark:bg-[#0a192f] rounded-[8px] shadow-2xl border border-gray-200 dark:border-slate-700 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/80 font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold">
                  {lang === 'en' ? 'Notifications' : 'Thông báo'}
                  {unread > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-300">
                      {unread}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={markingRead || !unread}
                    title={lang === 'en' ? 'Mark all as read' : 'Đã đọc tất cả'}
                    aria-label={lang === 'en' ? 'Mark all as read' : 'Đã đọc tất cả'}
                    className="p-1.5 rounded-[6px] text-primary hover:bg-primary/10 dark:text-blue-400 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    onClick={() => void markAllNotificationsRead()}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotifs(false)}
                    title={lang === 'en' ? 'Collapse' : 'Thu gọn'}
                    aria-label={lang === 'en' ? 'Collapse' : 'Thu gọn'}
                    className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="max-h-[min(60vh,420px)] overflow-y-auto">
                <PushNotificationSettings hideWhenEnabled />
                {updateInfo && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => void appUpdateService.reloadApp()}
                    className="m-3 p-3 rounded-[8px] bg-gradient-to-r from-blue-500/12 via-cyan-500/10 to-emerald-500/10 border border-blue-500/30 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-500/60 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-[8px] bg-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="animate-pulse" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {updateInfo.title || 'Cập nhật phiên bản mới'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                          {updateInfo.message || 'Bấm để tải lại và trải nghiệm ngay'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        void appUpdateService.reloadApp();
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] shrink-0 shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      <span>{lang === 'en' ? 'Reload' : 'Tải lại'}</span>
                    </button>
                  </div>
                )}
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">{lang === 'en' ? 'No notifications yet.' : 'Chưa có thông báo.'}</p>
                ) : (
                  notifications.map((notification: NotificationItem) => (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void openNotification(notification)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void openNotification(notification);
                      }}
                      style={toneStyle(notification)}
                      className="notif-row group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    >
                      <NotificationIcon dim={notification.is_read} message={notification.message} metadata={notification.metadata} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <b className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{notification.title}</b>
                          <span className="notif-chip rounded-full px-1.5 py-px text-[10px] font-semibold">{TONES[toneOf(notification)].label}</span>
                        </span>
                        <span className="notif-msg mt-0.5 block text-xs leading-4">
                          <PicText message={notification.message} metadata={notification.metadata} />
                        </span>
                        <time className="mt-1 block text-[10px] text-gray-400 dark:text-slate-500" dateTime={notification.created_at}>
                          {formatNotificationTimestamp(notification.created_at, lang)}
                        </time>
                      </span>
                      {!notification.is_read && (
                        <button
                          type="button"
                          aria-label={lang === 'en' ? 'Mark as read' : 'Đánh dấu đã đọc'}
                          onClick={e => {
                            e.stopPropagation();
                            void markNotificationsRead([notification.id]).catch(() => toast.error('Chưa đồng bộ trạng thái đã đọc.'));
                          }}
                          className="notif-x notif-x-static"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}

        {/* ==========================================
            PORTAL 2: SETTINGS (LANGUAGE + THEME)
           ========================================== */}
        {showSettings &&
          createPortal(
            <div
              ref={settingsPanelRef}
              style={(() => {
                const r = settingsBtnRef.current?.getBoundingClientRect();
                if (!r) return { bottom: 24, left: isSidebarCollapsed ? 84 : 280 };
                return {
                  bottom: isSidebarCollapsed
                    ? Math.max(16, window.innerHeight - r.bottom)
                    : Math.max(16, window.innerHeight - r.top + 8),
                  left: isSidebarCollapsed
                    ? Math.min(r.right + 12, window.innerWidth - 260)
                    : Math.min(Math.max(12, r.left), window.innerWidth - 260),
                };
              })()}
              className="fixed z-[9999] w-[240px] p-3 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3 pointer-events-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {lang === 'en' ? 'Account & Settings' : 'Tài khoản & Cài đặt'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Profile Jump Link */}
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  navigate('/my-tasks');
                }}
                className="w-full text-left p-2 rounded-[6px] hover:bg-slate-100 dark:hover:bg-[#0f1e36] text-xs font-semibold text-gray-800 dark:text-slate-200 flex items-center justify-between transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <span className="flex items-center gap-2">
                  <User size={14} className="text-[#002e6d] dark:text-sky-400" />
                  <span>{lang === 'en' ? 'Personal Profile' : 'Hồ sơ cá nhân'}</span>
                </span>
                <ChevronRight size={13} className="text-gray-400" />
              </button>

              {/* 1. Language switcher */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Globe size={13} className="text-primary dark:text-blue-400" />
                  <span>{lang === 'en' ? 'Language' : 'Ngôn ngữ'}</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[6px] bg-slate-100 dark:bg-[#071325] border border-slate-200/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLang('vi')}
                    className={cn(
                      'py-1 px-2 text-xs font-bold rounded-[6px] transition-all cursor-pointer',
                      lang === 'vi'
                        ? 'bg-white dark:bg-[#002e6d] text-[#002e6d] dark:text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={cn(
                      'py-1 px-2 text-xs font-bold rounded-[6px] transition-all cursor-pointer',
                      lang === 'en'
                        ? 'bg-white dark:bg-[#002e6d] text-[#002e6d] dark:text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* 2. Theme switcher */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  {theme === 'dark' ? <Moon size={13} className="text-amber-400" /> : <Sun size={13} className="text-amber-500" />}
                  <span>{lang === 'en' ? 'Appearance' : 'Giao diện'}</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[6px] bg-slate-100 dark:bg-[#071325] border border-slate-200/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    className={cn(
                      'py-1 px-2 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      theme === 'light'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <Sun size={13} />
                    <span>{lang === 'en' ? 'Light' : 'Sáng'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    className={cn(
                      'py-1 px-2 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      theme === 'dark'
                        ? 'bg-[#002e6d] text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <Moon size={13} />
                    <span>{lang === 'en' ? 'Dark' : 'Tối'}</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </aside>
    </div>
  );
};
