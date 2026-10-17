import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  MessageSquare,
} from 'lucide-react';
import { StylizedPinIcon } from '../common/StylizedPinIcon';
import { useSidebarPinStore } from '../../store/sidebarPinStore';
import { useVisibleSidebarPins } from '../../hooks/useVisibleSidebarPins';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useSidebarTrackingData } from '../../hooks/useSidebarTrackingData';
import {canSubmitAssetRequest,canViewTeamManagement,isAssetApprover} from '../../lib/roleScope';
import {
  buildSidebarGroups,
  type DrillMenuItem,
  type DrillNode,
  type SidebarGroupModel,
} from './sidebarDrillTree';
import '../../styles/sidebar-drilldown.css';

const SIDEBAR_WIDTH_KEY = 'kcoffee_sidebar_width';
const DEFAULT_SIDEBAR_WIDTH = 272;
const MIN_SIDEBAR_WIDTH = 236;
const MAX_SIDEBAR_WIDTH = 520;

interface StackEntry {
  nodeId: string;
  focusedIndex: number;
}

/**
 * In-place Multi-level Drill-down Drawer anchored directly underneath its fixed parent button.
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
      setPanelHeight(el.offsetHeight);
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
                    // Clicking the item row navigates to its board/task;
                    // if it has no path (pure branch), it drills down.
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

const SidebarGroupSection: React.FC<{
  group: SidebarGroupModel;
  currentPath: string;
  currentSearch: string;
  openDropdownItemId: string | null;
  onToggleItemDropdown: (itemId: string) => void;
  onNavigate: (path: string) => void;
  onTogglePin: (taskId: string) => void;
}> = ({
  group,
  currentPath,
  currentSearch,
  openDropdownItemId,
  onToggleItemDropdown,
  onNavigate,
  onTogglePin,
}) => {
  const [isGroupCollapsed, setIsGroupCollapsed] = useState(false);
  const rootNode = group.nodes[group.rootNodeId];
  if (!rootNode || rootNode.items.length === 0) return null;

  const isRouteActive = (itemPath?: string) => {
    if (!itemPath) return false;
    const [basePath, query] = itemPath.split('?');
    if (currentPath !== basePath) return false;
    if (!query) return true;
    return currentSearch.includes(query);
  };

  return (
    <div className={cn('transition-all duration-200', isGroupCollapsed ? 'mb-1.5' : 'mb-3.5')}>
      {/* Group Title Header with Dropdown Toggle */}
      <button
        type="button"
        onClick={() => setIsGroupCollapsed(prev => !prev)}
        aria-expanded={!isGroupCollapsed}
        className={cn('sb-group-header', isGroupCollapsed && 'is-collapsed')}
      >
        <span className="flex items-center gap-1.5 min-w-0">
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

        <ChevronDown
          size={14}
          className={cn('sb-group-chevron', isGroupCollapsed && 'is-collapsed')}
        />
      </button>

      {/* Group Buttons List */}
      <div
        style={{ maxHeight: isGroupCollapsed ? '0px' : '1800px' }}
        className={cn('sb-group-body', isGroupCollapsed && 'is-collapsed')}
      >
        <ul className="space-y-1.5">
          {rootNode.items.map(item => {
            const active = isRouteActive(item.path);
            const hasDrill = Boolean(item.targetNodeId && group.nodes[item.targetNodeId]);
            const isDropdownOpen = hasDrill && openDropdownItemId === item.id;

            return (
              <li key={item.id}>
                {/* Fixed Navigation Button: clicking the button opens its board; clicking the chevron toggles its detail drill-down */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (item.path) onNavigate(item.path);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (item.path) onNavigate(item.path);
                    }
                  }}
                  className={cn(
                    'sidebar-link sb-root-row flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer select-none',
                    hasDrill && 'has-drill',
                    isDropdownOpen && 'is-dropdown-open',
                    active ? 'sidebar-link-active font-semibold' : 'sidebar-link-idle'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.inlineBadge}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {item.rightBadge}
                    {hasDrill && (
                      <button
                        type="button"
                        aria-expanded={isDropdownOpen}
                        title={
                          isDropdownOpen
                            ? `Thu gọn chi tiết ${item.label}`
                            : `Xổ chi tiết ${item.label}`
                        }
                        aria-label={
                          isDropdownOpen
                            ? `Thu gọn chi tiết ${item.label}`
                            : `Xổ chi tiết ${item.label}`
                        }
                        onClick={e => {
                          e.stopPropagation();
                          onToggleItemDropdown(item.id);
                        }}
                        className={cn('sb-drop-icon-btn', isDropdownOpen && 'is-open')}
                      >
                        <ChevronDown size={15} />
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
                    onTogglePin={onTogglePin}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, enrichedTasks, enrichedTracks, summary, togglePin } =
    useSidebarTrackingData();

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(saved) && saved >= MIN_SIDEBAR_WIDTH && saved <= MAX_SIDEBAR_WIDTH
      ? saved
      : DEFAULT_SIDEBAR_WIDTH;
  });
  const [resizing, setResizing] = useState(false);
  const [openDropdownItemId, setOpenDropdownItemId] = useState<string | null>(null);
  const pinnedEntities = useVisibleSidebarPins();
  const unpinEntity = useSidebarPinStore(s => s.unpinEntity);
  const pinnedTaskItems = useMemo(() => enrichedTasks.filter(task => task.isPinned), [enrichedTasks]);

  const handleToggleItemDropdown = (itemId: string) => {
    setOpenDropdownItemId(prev => (prev === itemId ? null : itemId));
  };

  // Sync --sidebar-width CSS variable to html element so layout wrapper scales smoothly
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // Ignore storage errors
    }
  }, [sidebarWidth]);

  // Drag resize handler (same mechanics as TaskDetailPanel / SubtaskDetailPanel)
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
  }, [resizing]);

  const role = profile?.role || 'member';
  const isLeader = canViewTeamManagement(profile);
  const canManageBorrow=isAssetApprover(profile),canBorrow=canSubmitAssetRequest(profile);

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
      }),
    [t, role, isLeader, canManageBorrow, canBorrow, enrichedTasks, enrichedTracks, summary, togglePin]
  );

  return (
    <aside className="app-sidebar w-full h-full card-hub flex flex-col pt-6 pb-4 flex-shrink-0 rounded-3xl z-10 relative shadow-sm">
      {/* Right-edge Drag Resize Handle (scales like Detail Tasks) */}
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
        className="mb-6 flex items-center justify-center bg-white dark:bg-slate-800 mx-6 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105"
      >
        <img
          src="/logo-light.svg"
          alt="K COFFEE Logo"
          className="h-11 w-auto filter drop-shadow-md block dark:hidden"
        />
        <img
          src="/logo-dark.svg"
          alt="K COFFEE Logo"
          className="h-11 w-auto filter drop-shadow-md hidden dark:block"
        />
      </NavLink>

      <div className="flex-1 overflow-y-auto px-3.5 custom-scrollbar">
        {groups.map(group => (
          <SidebarGroupSection
            key={group.id}
            group={group}
            currentPath={location.pathname}
            currentSearch={location.search}
            openDropdownItemId={openDropdownItemId}
            onToggleItemDropdown={handleToggleItemDropdown}
            onNavigate={path => navigate(path)}
            onTogglePin={togglePin}
          />
        ))}

        {(pinnedEntities.length > 0 || pinnedTaskItems.length > 0) && (
          <div className="mb-3 pt-3 border-t border-gray-200/70 dark:border-slate-700/70">
            <div className="px-2.5 mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <StylizedPinIcon size={12} pinned className="text-slate-500 dark:text-slate-400" /> Đã ghim
            </div>
            <ul className="space-y-1">
              {pinnedEntities.map(entity => {
                const href = entity.kind === 'campaign' ? `/projects?campaign=${encodeURIComponent(entity.id)}` : `/projects?project=${encodeURIComponent(entity.id)}`;
                const active = location.pathname === '/projects' && location.search.includes(`${entity.kind}=${entity.id}`);
                return (
                  <li key={`${entity.kind}:${entity.id}`} className="group">
                    <div role="button" tabIndex={0} onClick={() => navigate(href)} onKeyDown={e => { if (e.key === 'Enter') navigate(href); }}
                      className={cn('sidebar-link flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-medium cursor-pointer select-none', active ? 'sidebar-link-active font-semibold' : 'sidebar-link-idle')}>
                      <span className="flex items-center gap-2 min-w-0">
                        <FolderKanban size={15} className={entity.kind === 'campaign' ? 'text-amber-500 shrink-0' : 'text-violet-500 shrink-0'} />
                        <span className="truncate">{entity.name}</span>
                      </span>
                      <button type="button" title="Bỏ ghim" aria-label="Bỏ ghim" onClick={e => { e.stopPropagation(); unpinEntity(entity.kind, entity.id); }}
                        className="sb-pin-btn is-pinned shrink-0"><StylizedPinIcon size={13} pinned className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" /></button>
                    </div>
                  </li>
                );
              })}
              {pinnedTaskItems.map(task => {
                const active = location.pathname === '/tasks' && location.search.includes(encodeURIComponent(task.id));
                return (
                  <li key={`task:${task.id}`} className="group">
                    <div role="button" tabIndex={0} onClick={() => navigate(task.href)} onKeyDown={e => { if (e.key === 'Enter') navigate(task.href); }}
                      className={cn('sidebar-link flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-medium cursor-pointer select-none', active ? 'sidebar-link-active font-semibold' : 'sidebar-link-idle')}>
                      <span className="flex items-center gap-2 min-w-0">
                        <CheckSquare size={15} className="text-sky-500 shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </span>
                      <button type="button" title="Bỏ ghim" aria-label="Bỏ ghim" onClick={e => { e.stopPropagation(); togglePin(task.id); }}
                        className="sb-pin-btn is-pinned shrink-0"><StylizedPinIcon size={13} pinned className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 px-6 text-center">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
          Making by <span className="text-primary dark:text-blue-400 font-bold">BART</span>
        </p>
      </div>
    </aside>
  );
};
