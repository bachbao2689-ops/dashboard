import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ExternalLink,
  FolderKanban,
} from 'lucide-react';
import { StylizedPinIcon } from '../common/StylizedPinIcon';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useSidebarTrackingData } from '../../hooks/useSidebarTrackingData';
import { useSidebarPinStore } from '../../store/sidebarPinStore';
import { useVisibleSidebarPins } from '../../hooks/useVisibleSidebarPins';
import {
  buildSidebarGroups,
  type DrillMenuItem,
  type DrillNode,
  type SidebarGroupModel,
} from './sidebarDrillTree';
import '../../styles/sidebar-drilldown.css';

type DropdownTriggerKind =
  | 'workflow-btn'
  | 'projects-btn'
  | 'group-main'
  | 'group-tasksProj'
  | 'pinned-btn';

interface ActivePopoverTarget {
  triggerId: string;
  kind: DropdownTriggerKind;
  orderIndex: number;
  width: number;
}

interface PillRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Interactive tracked list inside the Morphing Popover.
 * Features:
 * - Vertical Sliding Pill (Effect 3)
 * - In-place Multi-level Drill-down (Level 1 -> Level 2 -> Level 3)
 * - 1-click Staff Pin/Unpin synced with Left Sidebar
 */
const TrackedDrilldownContent: React.FC<{
  rootNodeId: string;
  nodes: Record<string, DrillNode>;
  quickNavItems?: DrillMenuItem[];
  showPinnedEntities?: boolean;
  onNavigate: (path: string) => void;
  onToggleTaskPin: (taskId: string) => void;
}> = ({
  rootNodeId,
  nodes,
  quickNavItems,
  showPinnedEntities = false,
  onNavigate,
  onToggleTaskPin,
}) => {
  const pinnedEntities = useVisibleSidebarPins();
  const toggleEntityPin = useSidebarPinStore(s => s.toggleEntityPin);
  const isEntityPinned = (kind: 'project' | 'campaign', id: string) =>
    pinnedEntities.some(e => e.kind === kind && e.id === id);

  const [stack, setStack] = useState<Array<{ nodeId: string; focusedIndex: number }>>([
    { nodeId: rootNodeId, focusedIndex: 0 },
  ]);
  const [slideDir, setSlideDir] = useState<'forward' | 'backward' | null>(null);

  // Reset stack if rootNodeId changes
  useEffect(() => {
    setStack([{ nodeId: rootNodeId, focusedIndex: 0 }]);
    setSlideDir(null);
  }, [rootNodeId]);

  const currentEntry = stack[stack.length - 1] || { nodeId: rootNodeId, focusedIndex: 0 };
  const currentNode = nodes[currentEntry.nodeId] || nodes[rootNodeId];
  const isSubLevel = stack.length > 1;

  // Vertical sliding pill state (Effect 3)
  const listContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const [verticalPill, setVerticalPill] = useState<{ top: number; height: number } | null>(null);
  const [isVerticalInstant, setIsVerticalInstant] = useState(true);
  const hadVerticalHoverRef = useRef(false);

  const handleRowMouseEnter = (rowKey: string) => {
    const rowEl = rowRefs.current[rowKey];
    const containerEl = listContainerRef.current;
    if (!rowEl || !containerEl) return;

    const top = rowEl.offsetTop;
    const height = rowEl.offsetHeight;

    if (!hadVerticalHoverRef.current) {
      setIsVerticalInstant(true);
      hadVerticalHoverRef.current = true;
      requestAnimationFrame(() => {
        setIsVerticalInstant(false);
      });
    } else {
      setIsVerticalInstant(false);
    }

    setHoveredRowKey(rowKey);
    setVerticalPill({ top, height });
  };

  const handleListMouseLeave = () => {
    setHoveredRowKey(null);
    hadVerticalHoverRef.current = false;
    setIsVerticalInstant(true);
  };

  const drillInto = (targetNodeId: string, itemIdx: number) => {
    if (!nodes[targetNodeId]) return;
    setSlideDir('forward');
    setHoveredRowKey(null);
    hadVerticalHoverRef.current = false;
    setStack(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        focusedIndex: itemIdx,
      };
      return [...updated, { nodeId: targetNodeId, focusedIndex: 0 }];
    });
  };

  const drillBack = () => {
    if (stack.length <= 1) return;
    setSlideDir('backward');
    setHoveredRowKey(null);
    hadVerticalHoverRef.current = false;
    setStack(prev => prev.slice(0, -1));
  };

  if (!currentNode) return null;

  // Extract entity kind & id if an item represents a project/campaign track
  const parseTrackEntity = (item: DrillMenuItem): { kind: 'project' | 'campaign'; id: string } | null => {
    // e.g. id = "tp:proj:item:project:123" or "main:wf:item:campaign:456"
    const match = item.id.match(/:item:(project|campaign):(.+)$/);
    if (!match) return null;
    return { kind: match[1] as 'project' | 'campaign', id: match[2] };
  };

  return (
    <div className="p-2.5 select-none">
      {/* Optional Quick Group Navigation Bar when hovering a collapsed group */}
      {!isSubLevel && quickNavItems && quickNavItems.length > 0 && (
        <div className="mb-2 pb-2 border-b border-gray-200/70 dark:border-slate-700/70">
          <div className="px-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
            Điều hướng nhanh
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {quickNavItems.map(qItem => (
              <button
                key={qItem.id}
                type="button"
                onClick={() => {
                  if (qItem.path) onNavigate(qItem.path);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-200 hover:bg-blue-500/10 hover:text-primary dark:hover:bg-slate-700/70 dark:hover:text-white transition-colors cursor-pointer"
              >
                {qItem.icon}
                <span>{qItem.label}</span>
                {qItem.inlineBadge}
                {qItem.rightBadge}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header Row: Either "< Back" on sub-levels or Tracked Section Title on root */}
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5 mb-1 border-b border-gray-200/60 dark:border-slate-700/60">
        {isSubLevel ? (
          <button
            type="button"
            onClick={drillBack}
            className="inline-flex items-center gap-1.5 py-1 px-1.5 -ml-1 rounded-lg text-xs font-bold text-primary dark:text-sky-400 hover:bg-blue-500/10 transition-colors cursor-pointer min-w-0"
          >
            <ChevronLeft size={14} className="shrink-0" />
            <span className="truncate">{currentNode.title}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-300 truncate">
              {currentNode.title} — Đang theo dõi
            </span>
          </div>
        )}

        {currentNode.headerPath && (
          <button
            type="button"
            onClick={() => onNavigate(currentNode.headerPath!)}
            title={`Mở ${currentNode.title}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-primary dark:text-sky-400 hover:bg-blue-500/10 transition-colors shrink-0 cursor-pointer"
          >
            <span>Mở bảng</span>
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* Scrollable Tracked Items List with Vertical Sliding Pill (Effect 3) */}
      <div
        ref={listContainerRef}
        onMouseLeave={handleListMouseLeave}
        className={cn(
          'relative max-h-[340px] overflow-y-auto custom-scrollbar pr-0.5 space-y-1',
          slideDir === 'forward' && 'sb-drill-panel is-entering-forward',
          slideDir === 'backward' && 'sb-drill-panel is-entering-backward'
        )}
      >
        {/* Vertical Sliding Highlight Pill */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(0, ${verticalPill?.top ?? 0}px, 0)`,
            height: `${verticalPill?.height ?? 36}px`,
            opacity: hoveredRowKey && verticalPill ? 1 : 0,
          }}
          className={cn('top-nav-vertical-pill', isVerticalInstant && 'is-instant')}
        />

        {/* Pinned Projects/Campaigns at top of Projects dropdown */}
        {!isSubLevel && showPinnedEntities && pinnedEntities.length > 0 && (
          <div className="pb-1 mb-1 border-b border-gray-200/50 dark:border-slate-700/50 space-y-1">
            <div className="px-2 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-1">
              <StylizedPinIcon size={11} pinned className="text-slate-500 dark:text-slate-400" />
              Dự án / Chiến dịch đã ghim
            </div>
            {pinnedEntities.map(entity => {
              const rowKey = `pinned-entity:${entity.kind}:${entity.id}`;
              const href =
                entity.kind === 'campaign'
                  ? `/projects?campaign=${encodeURIComponent(entity.id)}`
                  : `/projects?project=${encodeURIComponent(entity.id)}`;
              return (
                <div
                  key={rowKey}
                  ref={el => {
                    rowRefs.current[rowKey] = el;
                  }}
                  onMouseEnter={() => handleRowMouseEnter(rowKey)}
                  onClick={() => onNavigate(href)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onNavigate(href);
                  }}
                  className="sb-item-row relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FolderKanban
                      size={15}
                      className={
                        entity.kind === 'campaign'
                          ? 'text-amber-500 shrink-0'
                          : 'text-violet-500 shrink-0'
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                        {entity.name}
                      </div>
                      <div className="text-[10.5px] text-gray-500 dark:text-slate-400 truncate">
                        {entity.kind === 'campaign' ? 'Chiến dịch đã ghim' : 'Dự án đã ghim'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Bỏ ghim"
                    onClick={e => {
                      e.stopPropagation();
                      toggleEntityPin({ kind: entity.kind, id: entity.id, name: entity.name });
                    }}
                    className="sb-pin-btn is-pinned shrink-0"
                  >
                    <StylizedPinIcon size={13} pinned className="text-slate-700 dark:text-slate-200" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Drilldown Items */}
        {currentNode.items.map((item, idx) => {
          const rowKey = item.id;
          const hasChildNode = Boolean(item.targetNodeId && nodes[item.targetNodeId]);
          const trackEntity = parseTrackEntity(item);
          const isTrackPinned = trackEntity
            ? isEntityPinned(trackEntity.kind, trackEntity.id)
            : false;

          return (
            <div
              key={rowKey}
              ref={el => {
                rowRefs.current[rowKey] = el;
              }}
              onMouseEnter={() => handleRowMouseEnter(rowKey)}
              onClick={() => {
                if (item.onAction) {
                  item.onAction();
                  return;
                }
                if (item.path) {
                  onNavigate(item.path);
                } else if (hasChildNode && item.targetNodeId) {
                  drillInto(item.targetNodeId, idx);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (item.onAction) item.onAction();
                  else if (item.path) onNavigate(item.path);
                  else if (hasChildNode && item.targetNodeId) drillInto(item.targetNodeId, idx);
                } else if (e.key === 'ArrowRight' && hasChildNode && item.targetNodeId) {
                  e.preventDefault();
                  drillInto(item.targetNodeId, idx);
                } else if (e.key === 'ArrowLeft' && isSubLevel) {
                  e.preventDefault();
                  drillBack();
                }
              }}
              className={cn(
                'sb-item-row relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer',
                item.variant === 'danger' && 'is-danger'
              )}
            >
              <div className="sb-item-main">
                <span className="sb-item-icon">{item.icon}</span>
                <div className="sb-item-text">
                  <div className="sb-item-label-row">
                    <span className="sb-item-label">{item.label}</span>
                    {item.inlineBadge}
                  </div>
                  {item.sublabel && <div className="sb-item-sublabel">{item.sublabel}</div>}
                </div>
              </div>

              <div className="sb-item-right">
                {item.rightBadge}
                {(item.pinTaskId || trackEntity || hasChildNode) && (
                  <div className="sb-item-hover-actions">
                    {item.pinTaskId && (
                      <button
                        type="button"
                        title={item.isPinned ? 'Bỏ ghim công việc' : 'Ghim công việc'}
                        onClick={e => {
                          e.stopPropagation();
                          onToggleTaskPin(item.pinTaskId!);
                        }}
                        className={cn('sb-pin-btn', item.isPinned && 'is-pinned')}
                      >
                        <StylizedPinIcon
                          size={13}
                          pinned={item.isPinned}
                          className={
                            item.isPinned
                              ? 'text-slate-800 dark:text-slate-100'
                              : 'text-gray-400 dark:text-slate-400'
                          }
                        />
                      </button>
                    )}

                    {trackEntity && (
                      <button
                        type="button"
                        title={isTrackPinned ? 'Bỏ ghim' : 'Ghim lên Sidebar'}
                        onClick={e => {
                          e.stopPropagation();
                          toggleEntityPin({
                            kind: trackEntity.kind,
                            id: trackEntity.id,
                            name: item.label,
                          });
                        }}
                        className={cn('sb-pin-btn', isTrackPinned && 'is-pinned')}
                      >
                        <StylizedPinIcon
                          size={13}
                          pinned={isTrackPinned}
                          className={
                            isTrackPinned
                              ? 'text-slate-800 dark:text-slate-100'
                              : 'text-gray-400 dark:text-slate-400'
                          }
                        />
                      </button>
                    )}

                    {hasChildNode && item.targetNodeId && (
                      <button
                        type="button"
                        title={`Xem chi tiết ${item.label}`}
                        onClick={e => {
                          e.stopPropagation();
                          drillInto(item.targetNodeId!, idx);
                        }}
                        className="sb-drill-trigger"
                      >
                        <ChevronRight size={14} className="sb-item-chevron" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Pinned Items Dropdown Content (synced with Left Sidebar's "Đã ghim" section).
 */
const PinnedPopoverContent: React.FC<{
  onNavigate: (path: string) => void;
  onToggleTaskPin: (taskId: string) => void;
  pinnedTaskItems: ReturnType<typeof useSidebarTrackingData>['enrichedTasks'];
}> = ({ onNavigate, onToggleTaskPin, pinnedTaskItems }) => {
  const pinnedEntities = useVisibleSidebarPins();
  const unpinEntity = useSidebarPinStore(s => s.unpinEntity);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const [verticalPill, setVerticalPill] = useState<{ top: number; height: number } | null>(null);
  const [isVerticalInstant, setIsVerticalInstant] = useState(true);
  const hadVerticalHoverRef = useRef(false);

  const handleRowMouseEnter = (rowKey: string) => {
    const rowEl = rowRefs.current[rowKey];
    if (!rowEl) return;
    if (!hadVerticalHoverRef.current) {
      setIsVerticalInstant(true);
      hadVerticalHoverRef.current = true;
      requestAnimationFrame(() => setIsVerticalInstant(false));
    } else {
      setIsVerticalInstant(false);
    }
    setHoveredRowKey(rowKey);
    setVerticalPill({ top: rowEl.offsetTop, height: rowEl.offsetHeight });
  };

  const handleListMouseLeave = () => {
    setHoveredRowKey(null);
    hadVerticalHoverRef.current = false;
    setIsVerticalInstant(true);
  };

  return (
    <div className="p-2.5 select-none">
      <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1 border-b border-gray-200/60 dark:border-slate-700/60">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-300">
          <StylizedPinIcon size={12} pinned className="text-slate-500 dark:text-slate-400" />
          Đã ghim trên Sidebar ({pinnedEntities.length + pinnedTaskItems.length})
        </span>
      </div>

      <div
        ref={listContainerRef}
        onMouseLeave={handleListMouseLeave}
        className="relative max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5 space-y-1"
      >
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(0, ${verticalPill?.top ?? 0}px, 0)`,
            height: `${verticalPill?.height ?? 36}px`,
            opacity: hoveredRowKey && verticalPill ? 1 : 0,
          }}
          className={cn('top-nav-vertical-pill', isVerticalInstant && 'is-instant')}
        />

        {pinnedEntities.map(entity => {
          const rowKey = `entity:${entity.kind}:${entity.id}`;
          const href =
            entity.kind === 'campaign'
              ? `/projects?campaign=${encodeURIComponent(entity.id)}`
              : `/projects?project=${encodeURIComponent(entity.id)}`;
          return (
            <div
              key={rowKey}
              ref={el => {
                rowRefs.current[rowKey] = el;
              }}
              onMouseEnter={() => handleRowMouseEnter(rowKey)}
              onClick={() => onNavigate(href)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') onNavigate(href);
              }}
              className="sb-item-row relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FolderKanban
                  size={15}
                  className={
                    entity.kind === 'campaign'
                      ? 'text-amber-500 shrink-0'
                      : 'text-violet-500 shrink-0'
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                    {entity.name}
                  </div>
                  <div className="text-[10.5px] text-gray-500 dark:text-slate-400 truncate">
                    {entity.kind === 'campaign' ? 'Chiến dịch' : 'Dự án'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                title="Bỏ ghim"
                onClick={e => {
                  e.stopPropagation();
                  unpinEntity(entity.kind, entity.id);
                }}
                className="sb-pin-btn is-pinned shrink-0"
              >
                <StylizedPinIcon size={13} pinned className="text-slate-700 dark:text-slate-200" />
              </button>
            </div>
          );
        })}

        {pinnedTaskItems.map(task => {
          const rowKey = `task:${task.id}`;
          return (
            <div
              key={rowKey}
              ref={el => {
                rowRefs.current[rowKey] = el;
              }}
              onMouseEnter={() => handleRowMouseEnter(rowKey)}
              onClick={() => onNavigate(task.href)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') onNavigate(task.href);
              }}
              className="sb-item-row relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CheckSquare size={15} className="text-sky-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                    {task.title}
                  </div>
                  <div className="text-[10.5px] text-gray-500 dark:text-slate-400 truncate">
                    {task.contextLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                title="Bỏ ghim"
                onClick={e => {
                  e.stopPropagation();
                  onToggleTaskPin(task.id);
                }}
                className="sb-pin-btn is-pinned shrink-0"
              >
                <StylizedPinIcon size={13} pinned className="text-slate-700 dark:text-slate-200" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TopCollapsedNavbar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const { profile, enrichedTasks, enrichedTracks, summary, togglePin } =
    useSidebarTrackingData();
  const pinnedEntities = useVisibleSidebarPins();
  const pinnedTaskItems = useMemo(
    () => enrichedTasks.filter(task => task.isPinned),
    [enrichedTasks]
  );
  const totalPinnedCount = pinnedEntities.length + pinnedTaskItems.length;

  const role = profile?.role || 'member';
  const isLeader =
    (profile?.employment_level || '').toLowerCase() === 'leader' ||
    ['leader', 'manager', 'admin'].includes(role.toLowerCase());

  const groups = useMemo<SidebarGroupModel[]>(
    () =>
      buildSidebarGroups({
        t,
        role,
        isLeader,
        enrichedTasks,
        enrichedTracks,
        summary,
        togglePin,
      }),
    [t, role, isLeader, enrichedTasks, enrichedTracks, summary, togglePin]
  );

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(() => {
    const activeGroup = groups.find(g => {
      const rootNode = g.nodes[g.rootNodeId];
      return rootNode?.items.some(i => i.path?.split('?')[0] === location.pathname);
    });
    return activeGroup ? activeGroup.id : null;
  });

  const userToggledRef = useRef(false);
  const lastPathnameRef = useRef(location.pathname);

  // Auto expand the group that contains the current active route ONLY on route change (existing flow)
  useEffect(() => {
    const isRouteChange = lastPathnameRef.current !== location.pathname;
    if (isRouteChange) {
      lastPathnameRef.current = location.pathname;
      userToggledRef.current = false;
    }

    if (isRouteChange || !userToggledRef.current) {
      const activeGroup = groups.find(g => {
        const rootNode = g.nodes[g.rootNodeId];
        return rootNode?.items.some(i => i.path?.split('?')[0] === location.pathname);
      });
      if (activeGroup && !userToggledRef.current) {
        setExpandedGroupId(activeGroup.id);
      }
    }
  }, [location.pathname, groups]);

  // Close popover on route change
  useEffect(() => {
    setActivePopover(null);
    setIsPopoverClosing(false);
    setHoveredNavId(null);
  }, [location.pathname, location.search]);

  const navContainerRef = useRef<HTMLDivElement>(null);
  const itemElementsRef = useRef<Record<string, HTMLElement | null>>({});

  // Effect 1: Horizontal Sliding Pill state
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const [navPillRect, setNavPillRect] = useState<PillRect | null>(null);
  const [isNavPillInstant, setIsNavPillInstant] = useState(true);
  const hadNavHoverRef = useRef(false);

  // Effect 2, 3, 4: Shared-Layout Morphing Popover state
  const [activePopover, setActivePopover] = useState<ActivePopoverTarget | null>(null);
  const [isPopoverClosing, setIsPopoverClosing] = useState(false);
  const [isPopoverInstantX, setIsPopoverInstantX] = useState(true);
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; top: number }>({
    left: 16,
    top: 64,
  });
  const [crossfadeOffset, setCrossfadeOffset] = useState<number>(10);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  const contentInnerRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = null;
    }
  };

  // Measure active popover content height for smooth height morphing
  useLayoutEffect(() => {
    const el = contentInnerRef.current;
    if (!el || !activePopover) return;
    const updateHeight = () => {
      if (contentInnerRef.current) {
        setViewportHeight(contentInnerRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activePopover, pinnedEntities.length, pinnedTaskItems.length, enrichedTasks.length]);

  // Update Horizontal Sliding Pill position when hoveredNavId or expandedGroup changes
  const updateNavPillPosition = (targetId: string) => {
    const container = navContainerRef.current;
    const el = itemElementsRef.current[targetId];
    if (!container || !el) return;

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    setNavPillRect({
      x: eRect.left - cRect.left + container.scrollLeft,
      y: eRect.top - cRect.top,
      width: eRect.width,
      height: eRect.height,
    });
  };

  // Compute Popover fixed coordinates anchored 8px below the trigger button
  const computePopoverCoords = (triggerId: string, width: number) => {
    const el = itemElementsRef.current[triggerId];
    const headerEl = navContainerRef.current?.closest('header');
    if (!el) return { left: 16, top: 64 };

    const rect = el.getBoundingClientRect();
    const headerRect = headerEl?.getBoundingClientRect();
    const top = Math.round((headerRect ? headerRect.bottom : rect.bottom) + 8);
    const left = Math.round(
      Math.max(12, Math.min(window.innerWidth - width - 12, rect.left))
    );
    return { left, top };
  };

  const triggerContextualDismiss = (delayMs = 80) => {
    clearTimers();
    dismissTimerRef.current = setTimeout(() => {
      setIsPopoverClosing(true);
      closeAnimTimerRef.current = setTimeout(() => {
        setActivePopover(null);
        setIsPopoverClosing(false);
        setIsPopoverInstantX(true);
      }, 190);
    }, delayMs);
  };

  const handleNavItemEnter = (
    navId: string,
    dropdownTarget?: Omit<ActivePopoverTarget, 'triggerId'>
  ) => {
    clearTimers();

    if (!hadNavHoverRef.current) {
      setIsNavPillInstant(true);
      hadNavHoverRef.current = true;
      requestAnimationFrame(() => {
        setIsNavPillInstant(false);
      });
    } else {
      setIsNavPillInstant(false);
    }

    setHoveredNavId(navId);
    updateNavPillPosition(navId);

    if (dropdownTarget) {
      const nextCoords = computePopoverCoords(navId, dropdownTarget.width);
      const wasOpen = Boolean(activePopover && !isPopoverClosing);

      if (!wasOpen) {
        setIsPopoverInstantX(true);
        setCrossfadeOffset(0);
        requestAnimationFrame(() => {
          setIsPopoverInstantX(false);
        });
      } else if (activePopover && activePopover.triggerId !== navId) {
        setIsPopoverInstantX(false);
        setCrossfadeOffset(
          dropdownTarget.orderIndex >= activePopover.orderIndex ? 12 : -12
        );
      }

      setIsPopoverClosing(false);
      setPopoverCoords(nextCoords);
      setActivePopover({
        triggerId: navId,
        ...dropdownTarget,
      });
    } else {
      // Effect 4: Contextual Dismiss when hovering a navbar item without a submenu
      if (activePopover) {
        triggerContextualDismiss(55);
      }
    }
  };

  const handleNavbarAreaLeave = () => {
    clearTimers();
    dismissTimerRef.current = setTimeout(() => {
      setHoveredNavId(null);
      hadNavHoverRef.current = false;
      setIsNavPillInstant(true);
      if (activePopover) {
        setIsPopoverClosing(true);
        closeAnimTimerRef.current = setTimeout(() => {
          setActivePopover(null);
          setIsPopoverClosing(false);
          setIsPopoverInstantX(true);
        }, 190);
      }
    }, 120);
  };

  const handlePopoverMouseEnter = () => {
    clearTimers();
    setIsPopoverClosing(false);
    // Effect 3: Parent Lock — keep the parent item highlighted on the navbar
    if (activePopover) {
      setHoveredNavId(activePopover.triggerId);
      updateNavPillPosition(activePopover.triggerId);
    }
  };

  const handlePopoverMouseLeave = () => {
    handleNavbarAreaLeave();
  };

  // Re-align on window resize
  useEffect(() => {
    if (!activePopover && !hoveredNavId) return;
    const onResize = () => {
      if (hoveredNavId) updateNavPillPosition(hoveredNavId);
      if (activePopover) {
        setPopoverCoords(computePopoverCoords(activePopover.triggerId, activePopover.width));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activePopover, hoveredNavId]);

  // Re-align horizontal pill when expandedGroupId changes
  useEffect(() => {
    if (hoveredNavId) {
      const timer = setTimeout(() => {
        if (hoveredNavId) updateNavPillPosition(hoveredNavId);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [expandedGroupId, hoveredNavId]);

  const mainGroup = groups.find(g => g.id === 'main');
  const tasksProjGroup = groups.find(g => g.id === 'tasksProj');

  const handleNavigateFromPopover = (path: string) => {
    clearTimers();
    setActivePopover(null);
    setIsPopoverClosing(false);
    setHoveredNavId(null);
    userToggledRef.current = false;
    navigate(path);
  };

  return (
    <>
      <div
        ref={navContainerRef}
        onMouseLeave={handleNavbarAreaLeave}
        className="top-pill-navbar hidden xl:flex items-center gap-1 overflow-x-auto scrollbar-hide w-full py-0.5"
      >
        {/* Effect 1: Shared Horizontal Sliding Highlight Pill */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${navPillRect?.x ?? 0}px, ${navPillRect?.y ?? 0}px, 0)`,
            width: `${navPillRect?.width ?? 0}px`,
            height: `${navPillRect?.height ?? 0}px`,
            opacity: hoveredNavId && navPillRect ? 1 : 0,
          }}
          className={cn('top-nav-hover-pill', isNavPillInstant && 'is-instant')}
        />

        {groups.map((group, groupIdx) => {
          const rootNode = group.nodes[group.rootNodeId];
          const visibleItems = rootNode?.items || [];
          const isExpanded = expandedGroupId === group.id;
          const groupTriggerId = `group:${group.id}`;

          // When MAIN or TASKS & PROJECTS is collapsed, hovering its group pill can preview its tracked items
          const collapsedGroupDropdownTarget:
            | Omit<ActivePopoverTarget, 'triggerId'>
            | undefined =
            !isExpanded && group.id === 'main'
              ? { kind: 'group-main', orderIndex: groupIdx * 10, width: 348 }
              : !isExpanded && group.id === 'tasksProj'
              ? { kind: 'group-tasksProj', orderIndex: groupIdx * 10, width: 364 }
              : undefined;

          return (
            <div
              key={group.id}
              className={cn(
                'relative z-10 flex items-center rounded-xl border transition-all duration-300 overflow-hidden flex-shrink-0',
                isExpanded
                  ? 'bg-gray-50/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 shadow-sm'
                  : 'border-transparent'
              )}
            >
              <button
                ref={el => {
                  itemElementsRef.current[groupTriggerId] = el;
                }}
                type="button"
                onMouseEnter={() =>
                  handleNavItemEnter(groupTriggerId, collapsedGroupDropdownTarget)
                }
                onClick={(e) => {
                  e.stopPropagation();
                  userToggledRef.current = true;
                  clearTimers();
                  setActivePopover(null);
                  setIsPopoverClosing(false);
                  const nextExpanded = isExpanded ? null : group.id;
                  setExpandedGroupId(nextExpanded);
                  requestAnimationFrame(() => {
                    updateNavPillPosition(groupTriggerId);
                  });
                }}
                className={cn(
                  'relative z-10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer',
                  isExpanded
                    ? 'text-primary dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  activePopover?.triggerId === groupTriggerId && 'top-nav-item-locked'
                )}
              >
                <span>{group.title}</span>
                {!isExpanded && group.hasUnreadSignal && (
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                )}
                <ChevronRight
                  size={14}
                  className={cn(
                    'transition-transform duration-300',
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>

              <div
                className={cn(
                  'flex items-center transition-all duration-500 ease-in-out',
                  isExpanded
                    ? 'max-w-[820px] opacity-100 pr-1 pl-0'
                    : 'max-w-0 opacity-0 px-0 pointer-events-none'
                )}
              >
                {visibleItems.map((item, itemIdx) => {
                  const itemNavId = `item:${item.id}`;
                  const isWorkflowBtn = item.id === 'main:root:workflow';
                  const isProjectsBtn = item.id === 'tp:root:projects';

                  const itemDropdownTarget:
                    | Omit<ActivePopoverTarget, 'triggerId'>
                    | undefined = isWorkflowBtn
                    ? {
                        kind: 'workflow-btn',
                        orderIndex: groupIdx * 10 + itemIdx + 1,
                        width: 344,
                      }
                    : isProjectsBtn
                    ? {
                        kind: 'projects-btn',
                        orderIndex: groupIdx * 10 + itemIdx + 1,
                        width: 360,
                      }
                    : undefined;

                  return (
                    <NavLink
                      key={item.id}
                      ref={el => {
                        itemElementsRef.current[itemNavId] = el;
                      }}
                      to={item.path || '/'}
                      onMouseEnter={() =>
                        handleNavItemEnter(itemNavId, itemDropdownTarget)
                      }
                      onClick={() => {
                        clearTimers();
                        setActivePopover(null);
                        setIsPopoverClosing(false);
                        userToggledRef.current = false;
                      }}
                      className={({ isActive }) =>
                        cn(
                          'sidebar-link relative z-10 px-3 py-1.5 mx-0.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap text-xs border border-transparent',
                          isActive
                            ? 'sidebar-link-active font-semibold'
                            : 'sidebar-link-idle',
                          activePopover?.triggerId === itemNavId &&
                            'top-nav-item-locked'
                        )
                      }
                    >
                      {item.icon}
                      <span className="text-xs">{item.label}</span>
                      {item.inlineBadge}
                      {item.rightBadge}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Pinned Quick Icon synced with Left Sidebar's "Đã ghim" section */}
        {totalPinnedCount > 0 && (
          <button
            ref={el => {
              itemElementsRef.current['pinned:root'] = el;
            }}
            type="button"
            onMouseEnter={() =>
              handleNavItemEnter('pinned:root', {
                kind: 'pinned-btn',
                orderIndex: 99,
                width: 320,
              })
            }
            onClick={() => {
              const firstEntity = pinnedEntities[0];
              if (firstEntity) {
                const href =
                  firstEntity.kind === 'campaign'
                    ? `/projects?campaign=${encodeURIComponent(firstEntity.id)}`
                    : `/projects?project=${encodeURIComponent(firstEntity.id)}`;
                navigate(href);
              } else if (pinnedTaskItems[0]) {
                navigate(pinnedTaskItems[0].href);
              }
            }}
            title={`Đã ghim (${totalPinnedCount})`}
            className={cn(
              'relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors flex-shrink-0 cursor-pointer',
              activePopover?.triggerId === 'pinned:root' && 'top-nav-item-locked'
            )}
          >
            <StylizedPinIcon size={13} pinned className="shrink-0" />
            <span>Đã ghim</span>
          </button>
        )}
      </div>

      {/* Effect 2, 3, 4: Shared-Layout Morphing Dropdown Popover */}
      {activePopover &&
        createPortal(
          <div
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
            style={{
              top: `${popoverCoords.top}px`,
              transform: `translate3d(${popoverCoords.left}px, 0, 0)`,
              width: `${activePopover.width}px`,
            }}
            className={cn(
              'top-nav-morph-popover hidden xl:block',
              isPopoverInstantX && 'is-instant-x',
              isPopoverClosing && 'is-closing'
            )}
          >
            {/* Invisible Hover Bridge across the ~8px gap between Navbar and Popover */}
            <div aria-hidden="true" className="top-nav-hover-bridge" />

            <div
              className={cn(
                'top-nav-morph-surface',
                isPopoverInstantX && !isPopoverClosing && 'is-opening'
              )}
            >
              <div
                style={{
                  height: viewportHeight ? `${viewportHeight}px` : undefined,
                }}
                className="top-nav-morph-viewport"
              >
                <div
                  key={activePopover.kind}
                  ref={contentInnerRef}
                  style={
                    {
                      '--cf-offset': `${crossfadeOffset}px`,
                    } as React.CSSProperties
                  }
                  className="top-nav-crossfade-panel"
                >
                  {(activePopover.kind === 'workflow-btn' ||
                    activePopover.kind === 'group-main') &&
                    mainGroup && (
                      <TrackedDrilldownContent
                        rootNodeId="main:workflow"
                        nodes={mainGroup.nodes}
                        quickNavItems={
                          activePopover.kind === 'group-main'
                            ? mainGroup.nodes[mainGroup.rootNodeId]?.items
                            : undefined
                        }
                        onNavigate={handleNavigateFromPopover}
                        onToggleTaskPin={togglePin}
                      />
                    )}

                  {(activePopover.kind === 'projects-btn' ||
                    activePopover.kind === 'group-tasksProj') &&
                    tasksProjGroup && (
                      <TrackedDrilldownContent
                        rootNodeId="tp:projects"
                        nodes={tasksProjGroup.nodes}
                        quickNavItems={
                          activePopover.kind === 'group-tasksProj'
                            ? tasksProjGroup.nodes[tasksProjGroup.rootNodeId]?.items
                            : undefined
                        }
                        showPinnedEntities
                        onNavigate={handleNavigateFromPopover}
                        onToggleTaskPin={togglePin}
                      />
                    )}

                  {activePopover.kind === 'pinned-btn' && (
                    <PinnedPopoverContent
                      onNavigate={handleNavigateFromPopover}
                      onToggleTaskPin={togglePin}
                      pinnedTaskItems={pinnedTaskItems}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
