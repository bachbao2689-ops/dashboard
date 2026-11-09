import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  CheckSquare, 
  FolderKanban, 
  Users, 
  Package, 
  Compass 
} from 'lucide-react';
import { useTranslation } from '../../i18n/translations';
import type { EnrichedSidebarTask, EnrichedProjectTrack } from '../../hooks/useSidebarTrackingData';
import { cn } from '../common/KpiCard';

export interface SidebarUniversalSearchProps {
  query: string;
  onClose: () => void;
  onClearQuery: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  anchorPosition?: 'bottom' | 'side';
  enrichedTasks: EnrichedSidebarTask[];
  enrichedTracks: EnrichedProjectTrack[];
  users: Array<{
    id: string;
    name: string;
    email?: string | null;
    department?: string | { name: string } | null;
    avatar_url?: string | null;
    job_title?: string | null;
    role?: string | null;
  }>;
  assets: Array<{
    id: string;
    name: string;
    asset_code?: string;
    code?: string;
    category?: string | { name: string } | null;
    is_available?: boolean;
  }>;
  navItems: Array<{ id: string; label: string; icon?: React.ReactNode; path: string }>;
}

interface SearchItem {
  id: string;
  category: 'nav' | 'track' | 'task' | 'user' | 'asset';
  categoryLabel: string;
  categoryIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  icon?: React.ReactNode;
  avatarUrl?: string;
  onSelect: () => void;
}

export const SidebarUniversalSearch: React.FC<SidebarUniversalSearchProps> = ({
  query,
  onClose,
  onClearQuery,
  anchorRef,
  anchorPosition = 'bottom',
  enrichedTasks,
  enrichedTracks,
  users,
  assets,
  navItems,
}) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cleanQuery = query.trim().toLowerCase();

  // Search and group items
  const { categorizedResults, flatList, totalCount } = useMemo(() => {
    if (!cleanQuery) return { categorizedResults: [], flatList: [], totalCount: 0 };

    const navCat: SearchItem[] = navItems
      .filter(item => item.label.toLowerCase().includes(cleanQuery) || item.path.toLowerCase().includes(cleanQuery))
      .slice(0, 3)
      .map(item => ({
        id: `nav-${item.id}`,
        category: 'nav',
        categoryLabel: isEn ? 'Navigation' : 'Trang điều hướng',
        categoryIcon: <Compass size={12} className="text-blue-500" />,
        title: item.label,
        subtitle: item.path,
        icon: item.icon || <Compass size={14} />,
        onSelect: () => {
          navigate(item.path);
          onClose();
          onClearQuery();
        }
      }));

    const trackCat: SearchItem[] = enrichedTracks
      .filter(track => 
        track.name.toLowerCase().includes(cleanQuery) || 
        (track.kind === 'campaign' ? 'chiến dịch campaign' : 'dự án project').includes(cleanQuery)
      )
      .slice(0, 4)
      .map(track => {
        const isCamp = track.kind === 'campaign';
        return {
          id: `track-${track.key}`,
          category: 'track',
          categoryLabel: isEn ? 'Projects & Campaigns' : 'Dự án & Chiến dịch',
          categoryIcon: <FolderKanban size={12} className="text-amber-500" />,
          title: track.name,
          subtitle: `${isCamp ? (isEn ? 'Campaign' : 'Chiến dịch') : (isEn ? 'Project' : 'Dự án')} · ${track.openCount} ${isEn ? 'in progress' : 'đang làm'}`,
          badge: isCamp ? (isEn ? 'Campaign' : 'Chiến dịch') : (isEn ? 'Project' : 'Dự án'),
          badgeClass: isCamp 
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' 
            : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
          icon: <FolderKanban size={14} />,
          onSelect: () => {
            navigate(track.workflowHref || track.projectsHref);
            onClose();
            onClearQuery();
          }
        };
      });

    const taskCat: SearchItem[] = enrichedTasks
      .filter(task => {
        const pic = (task.task as any)?.assignee?.name || (task.task as any)?.assignee_name || '';
        return (
          task.title.toLowerCase().includes(cleanQuery) ||
          (task.contextLabel && task.contextLabel.toLowerCase().includes(cleanQuery)) ||
          pic.toLowerCase().includes(cleanQuery)
        );
      })
      .slice(0, 5)
      .map(task => {
        const pic = (task.task as any)?.assignee?.name || (task.task as any)?.assignee_name || '';
        const statusLabel = task.isDone 
          ? (isEn ? 'Done' : 'Hoàn thành')
          : task.isOverdue
            ? (isEn ? 'Overdue' : 'Quá hạn')
            : (isEn ? 'In progress' : 'Đang làm');
        const statusClass = task.isDone
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          : task.isOverdue
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';

        return {
          id: `task-${task.id}`,
          category: 'task',
          categoryLabel: isEn ? 'Tasks & Subtasks' : 'Công việc & Đầu việc',
          categoryIcon: <CheckSquare size={12} className="text-emerald-500" />,
          title: task.title,
          subtitle: `${task.contextLabel || (isEn ? 'Task' : 'Đầu việc')}${pic ? ` · PIC: ${pic}` : ''}`,
          badge: statusLabel,
          badgeClass: statusClass,
          icon: <CheckSquare size={14} />,
          onSelect: () => {
            navigate(task.href);
            onClose();
            onClearQuery();
          }
        };
      });

    const userCat: SearchItem[] = users
      .filter(u => {
        const dept = typeof u.department === 'string' ? u.department : u.department?.name || u.job_title || '';
        return (
          u.name.toLowerCase().includes(cleanQuery) ||
          (u.email && u.email.toLowerCase().includes(cleanQuery)) ||
          dept.toLowerCase().includes(cleanQuery)
        );
      })
      .slice(0, 4)
      .map(u => {
        const dept = typeof u.department === 'string' ? u.department : u.department?.name || u.job_title || (isEn ? 'Team' : 'Phòng ban');
        return {
          id: `user-${u.id}`,
          category: 'user',
          categoryLabel: isEn ? 'Team Members' : 'Nhân sự',
          categoryIcon: <Users size={12} className="text-sky-500" />,
          title: u.name,
          subtitle: `${dept}${u.email ? ` · ${u.email}` : ''}`,
          avatarUrl: u.avatar_url || undefined,
          icon: <Users size={14} />,
          onSelect: () => {
            navigate('/team');
            onClose();
            onClearQuery();
          }
        };
      });

    const assetCat: SearchItem[] = assets
      .filter(a => {
        const code = a.asset_code || a.code || '';
        const cat = typeof a.category === 'string' ? a.category : a.category?.name || '';
        return (
          a.name.toLowerCase().includes(cleanQuery) ||
          code.toLowerCase().includes(cleanQuery) ||
          cat.toLowerCase().includes(cleanQuery)
        );
      })
      .slice(0, 4)
      .map(a => {
        const code = a.asset_code || a.code || '';
        const cat = typeof a.category === 'string' ? a.category : a.category?.name || (isEn ? 'Equipment' : 'Thiết bị');
        return {
          id: `asset-${a.id}`,
          category: 'asset',
          categoryLabel: isEn ? 'Equipment & Assets' : 'Thiết bị & Tài sản',
          categoryIcon: <Package size={12} className="text-indigo-500" />,
          title: `${a.name}${code ? ` (${code})` : ''}`,
          subtitle: `${cat} · ${a.is_available ? (isEn ? 'Available' : 'Sẵn sàng') : (isEn ? 'In use' : 'Đang mượn')}`,
          badge: a.is_available ? (isEn ? 'Available' : 'Sẵn sàng') : (isEn ? 'In use' : 'Đang mượn'),
          badgeClass: a.is_available 
            ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300' 
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
          icon: <Package size={14} />,
          onSelect: () => {
            navigate('/assets');
            onClose();
            onClearQuery();
          }
        };
      });

    const groups = [
      { key: 'nav', label: isEn ? 'Pages' : 'Trang điều hướng', icon: <Compass size={12} className="text-blue-500" />, items: navCat },
      { key: 'tracks', label: isEn ? 'Projects & Campaigns' : 'Dự án & Chiến dịch', icon: <FolderKanban size={12} className="text-amber-500" />, items: trackCat },
      { key: 'tasks', label: isEn ? 'Tasks & Subtasks' : 'Công việc', icon: <CheckSquare size={12} className="text-emerald-500" />, items: taskCat },
      { key: 'users', label: isEn ? 'Team' : 'Nhân sự', icon: <Users size={12} className="text-sky-500" />, items: userCat },
      { key: 'assets', label: isEn ? 'Assets' : 'Tài sản', icon: <Package size={12} className="text-indigo-500" />, items: assetCat },
    ].filter(g => g.items.length > 0);

    const flat: SearchItem[] = [];
    groups.forEach(g => flat.push(...g.items));

    return {
      categorizedResults: groups,
      flatList: flat,
      totalCount: flat.length
    };
  }, [cleanQuery, navItems, enrichedTracks, enrichedTasks, users, assets, isEn, navigate, onClose, onClearQuery]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery]);

  // Keyboard navigation & escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatList.length > 0 && flatList[selectedIndex]) {
          flatList[selectedIndex].onSelect();
        } else if (query.trim()) {
          navigate(`/tasks?search=${encodeURIComponent(query.trim())}`);
          onClose();
          onClearQuery();
        }
        return;
      }

      if (flatList.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flatList.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatList.length) % flatList.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatList, selectedIndex, onClose, navigate, query, onClearQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && 
        !panelRef.current.contains(target) &&
        anchorRef.current && 
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  if (!cleanQuery) return null;

  // Calculate position
  const getPositionStyle = (): React.CSSProperties => {
    if (!anchorRef.current) return { top: 60, left: 20 };
    const rect = anchorRef.current.getBoundingClientRect();

    if (anchorPosition === 'side') {
      return {
        top: Math.max(12, Math.min(rect.top, window.innerHeight - 460)),
        left: Math.min(rect.right + 8, window.innerWidth - 350),
        width: 330,
        maxHeight: 'min(500px, calc(100vh - 24px))',
      };
    }

    // Default: 'bottom' (Expanded sidebar or underneath collapsed panel)
    return {
      top: rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 372)),
      width: Math.min(360, Math.max(280, rect.width + 40)),
      maxHeight: `min(480px, calc(100vh - ${rect.bottom + 20}px))`,
    };
  };

  let globalItemIndex = 0;

  return createPortal(
    <div
      ref={panelRef}
      style={getPositionStyle()}
      role="listbox"
      aria-label={isEn ? 'Search Results' : 'Kết quả tìm kiếm'}
      className="fixed z-[10000] bg-white dark:bg-[#0a192f] border border-slate-200/90 dark:border-slate-700/80 rounded-[8px] shadow-2xl overflow-hidden grid grid-rows-[1fr_auto] animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
    >
      {/* Scrollable Results List: Zero Flexbox (100% CSS Grid) */}
      <div className="overflow-y-auto p-2 grid grid-cols-1 gap-2.5 max-h-[420px] custom-scrollbar">
        {categorizedResults.length === 0 ? (
          <div className="py-8 text-center grid justify-items-center gap-1.5 text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-400">
              <Search size={15} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isEn ? 'No results found' : 'Không tìm thấy kết quả phù hợp'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isEn ? 'Press Enter to search all tasks' : 'Nhấn Enter để tìm trong tất cả công việc'}
            </p>
          </div>
        ) : (
          categorizedResults.map(group => (
            <div key={group.key} className="grid grid-cols-1 gap-1">
              {/* Category Header */}
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-[6px] border border-slate-100 dark:border-slate-800/80">
                <span className="grid place-items-center shrink-0">{group.icon}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {group.label}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {group.items.length}
                </span>
              </div>

              {/* Items */}
              <div className="grid grid-cols-1 gap-0.5">
                {group.items.map(item => {
                  const currentIndex = globalItemIndex++;
                  const isHighlighted = currentIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onSelect}
                      className={cn(
                        "w-full text-left p-2 rounded-[6px] grid grid-cols-[auto_1fr_auto] items-center gap-2.5 transition-all cursor-pointer border",
                        isHighlighted
                          ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/70"
                          : "border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                      )}
                    >
                      {/* Leading icon / avatar */}
                      {item.avatarUrl ? (
                        <img 
                          src={item.avatarUrl} 
                          alt="" 
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-[6px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 grid place-items-center shrink-0">
                          {item.icon}
                        </div>
                      )}

                      {/* Content */}
                      <div className="min-w-0 grid grid-cols-1">
                        <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                            {item.subtitle}
                          </span>
                        )}
                      </div>

                      {/* Badge / action */}
                      {item.badge && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold shrink-0",
                          item.badgeClass
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer bar: Zero Flexbox (100% CSS Grid) */}
      <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 grid grid-cols-[1fr_auto] items-center text-[10px] text-slate-500 dark:text-slate-400">
        <span className="font-medium">
          {totalCount} {isEn ? 'results' : 'kết quả'}
        </span>
        <span className="grid grid-flow-col auto-cols-max items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <span>↑↓ {isEn ? 'navigate' : 'di chuyển'}</span>
          <span>·</span>
          <span>↵ {isEn ? 'select' : 'chọn'}</span>
          <span>·</span>
          <span>Esc {isEn ? 'close' : 'đóng'}</span>
        </span>
      </div>
    </div>,
    document.body
  );
};
