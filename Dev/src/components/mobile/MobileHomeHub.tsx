import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Search,
  Plus,
  Clock,
  Pin,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  CheckSquare,
  Layers,
  Sparkles
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { useRecentItemsStore } from '../../store/recentItemsStore';
import { useVisibleSidebarPins } from '../../hooks/useVisibleSidebarPins';
import toast from 'react-hot-toast';
import { cn } from '../common/KpiCard';

export interface MobileHomeHubItem {
  id: string;
  title: string;
  type: 'project' | 'campaign' | 'task' | 'subtask';
  dept?: string;
  updatedAt?: string;
  isPinned?: boolean;
  url?: string;
}

export interface MobileHomeHubProps {
  onNavigateProfile?: () => void;
  onOpenSearch?: () => void;
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  onOpenNotifications?: () => void;
  recentItems?: MobileHomeHubItem[];
  pinnedItems?: MobileHomeHubItem[];
}

export const MobileHomeHub: React.FC<MobileHomeHubProps> = ({
  onNavigateProfile,
  onOpenSearch,
  onCreateTask,
  onCreateProject,
  onOpenNotifications,
  recentItems,
  pinnedItems
}) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const { unread: unreadCount } = useNotificationCenter();
  const storeRecents = useRecentItemsStore((s) => s.items);
  const isEn = lang === 'en';

  const [recentsOpen, setRecentsOpen] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const defaultPinned: MobileHomeHubItem[] = [
    { id: 'pin-1', title: isEn ? 'K COFFEE R&D Lab - Product Trial' : 'Dự án Nghiên cứu Sản phẩm K COFFEE mới', type: 'project', dept: 'R&D', isPinned: true },
    { id: 'pin-2', title: isEn ? 'Key Deliverables Verification' : 'Nghiệm thu khối lượng chỉ tiêu tháng 11', type: 'task', dept: 'QA/QC', isPinned: true },
    { id: 'pin-3', title: isEn ? 'Specialty Cascara Launch' : 'Chiến dịch Ra mắt Dòng Trà Cascara Đặc biệt', type: 'campaign', dept: 'Marketing', isPinned: true },
  ];

  const displayRecents: MobileHomeHubItem[] = (recentItems && recentItems.length > 0)
    ? recentItems.slice(0, 10)
    : storeRecents.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.kind,
        dept: r.parentName,
        url: r.path,
      }));
  const livePins = useVisibleSidebarPins();
  const displayPinned: MobileHomeHubItem[] = (pinnedItems && pinnedItems.length > 0)
    ? pinnedItems
    : livePins.length > 0
      ? livePins.map((p) => ({
          id: String(p.id),
          title: p.name || "Pinned Item",
          type: (p.kind === "campaign" ? "campaign" : "project") as MobileHomeHubItem["type"],
          isPinned: true,
          url: `/projects?${p.kind}=${p.id}`,
        }))
      : defaultPinned;

  const handleProfileClick = () => {
    if (onNavigateProfile) {
      onNavigateProfile();
    } else {
      navigate('/my-tasks');
    }
  };

  const handleCalendarClick = () => {
    toast(isEn ? 'Calendar coming soon' : 'Tính năng Lịch sắp ra mắt', {
      icon: '📅',
      duration: 2500,
      className: 'text-xs font-semibold'
    });
  };

  const handleBellClick = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      // Dispatches global notification toggle event
      window.dispatchEvent(new CustomEvent('app:toggle-notifications'));
    }
  };

  const handleItemClick = (item: MobileHomeHubItem) => {
    if (item.url) {
      navigate(item.url);
      return;
    }
    if (item.type === 'project' || item.type === 'campaign') {
      navigate(`/projects?id=${item.id}`);
    } else {
      navigate(`/tasks?task=${item.id}`);
    }
  };

  const getItemIcon = (type: MobileHomeHubItem['type']) => {
    switch (type) {
      case 'project':
        return <FolderKanban size={15} className="text-blue-600 dark:text-sky-400" />;
      case 'campaign':
        return <Layers size={15} className="text-amber-600 dark:text-amber-400" />;
      case 'task':
        return <CheckSquare size={15} className="text-emerald-600 dark:text-emerald-400" />;
      case 'subtask':
        return <CheckSquare size={15} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <Sparkles size={15} className="text-slate-500" />;
    }
  };

  const getItemTypeBadge = (type: MobileHomeHubItem['type']) => {
    switch (type) {
      case 'project':
        return isEn ? 'Project' : 'Dự án';
      case 'campaign':
        return isEn ? 'Campaign' : 'Chiến dịch';
      case 'task':
        return isEn ? 'Task' : 'Đầu việc';
      case 'subtask':
        return isEn ? 'Subtask' : 'Đầu việc con';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#071325] text-slate-800 dark:text-slate-100 pb-28">
      {/* 1. TOP HEADER (Ref specs) */}
      <header className="sticky top-0 z-30 px-3.5 py-2.5 bg-white/85 dark:bg-[#0a192f]/90 backdrop-blur-xl border-b border-gray-200/70 dark:border-slate-800/80 shadow-2xs">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 max-w-lg mx-auto">
          {/* Left: Avatar nhân sự tròn */}
          <button
            type="button"
            onClick={handleProfileClick}
            aria-label={t('nav.profile')}
            className="w-9 h-9 rounded-full ring-2 ring-[#002e6d]/20 dark:ring-sky-400/30 overflow-hidden cursor-pointer shadow-2xs grid place-items-center active:scale-95 transition-transform"
          >
            <Avatar name={profile?.name || 'Staff'} src={profile?.avatar_url || undefined} className="w-full h-full text-xs font-bold" />
          </button>

          {/* Center: Pill card chứa Logo Phúc Sinh + chữ in đậm PHUC SINH CONSUMERS */}
          <div className="grid grid-flow-col auto-cols-max items-center justify-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#0a192f] border border-gray-200/90 dark:border-slate-700/80 shadow-2xs mx-auto">
            <img src="/logo-light.svg" alt="Phúc Sinh" className="h-4.5 w-auto block dark:hidden" />
            <img src="/logo-dark.svg" alt="Phúc Sinh" className="h-4.5 w-auto hidden dark:block" />
            <span className="font-extrabold text-[10px] sm:text-[11px] tracking-wider text-[#002e6d] dark:text-sky-300 uppercase select-none">
              PHUC SINH CONSUMERS
            </span>
          </div>

          {/* Right: Nút Calendar tròn + Nút Bell tròn */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <button
              type="button"
              onClick={handleCalendarClick}
              title={isEn ? 'Calendar' : 'Lịch làm việc'}
              className="w-9 h-9 rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-100 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer active:scale-95"
            >
              <Calendar size={16} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={handleBellClick}
              title={isEn ? 'Notifications' : 'Thông báo'}
              className="w-9 h-9 relative rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-100 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer active:scale-95"
            >
              <Bell size={16} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center ring-2 ring-white dark:ring-[#0a192f]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT (Recents & Favorites/Pins) */}
      <main className="px-3.5 py-4 space-y-4 max-w-lg mx-auto">
        {/* SECTION 1: Recents (Gần đây) */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setRecentsOpen(!recentsOpen)}
            className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 rounded-[8px] bg-slate-100/70 dark:bg-[#0a192f]/70 border border-gray-200/60 dark:border-slate-800 hover:bg-slate-200/60 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer"
          >
            <Clock size={15} className="text-[#002e6d] dark:text-sky-400 shrink-0" />
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 justify-start text-left">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                {isEn ? 'Recents' : 'Gần đây'}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">({displayRecents.length})</span>
            </div>
            <ChevronDown
              size={15}
              className={cn('text-gray-400 transition-transform duration-200', !recentsOpen && '-rotate-90')}
            />
          </button>

          {recentsOpen && (
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              {displayRecents.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 p-2.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-[#002e6d]/40 dark:hover:border-sky-500/40 hover:bg-blue-50/20 dark:hover:bg-[#0f1e36] transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="w-8 h-8 rounded-[6px] bg-slate-100 dark:bg-slate-800/80 grid place-items-center shrink-0">
                    {getItemIcon(item.type)}
                  </div>

                  <div className="grid grid-cols-1 min-w-0 text-left">
                    <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {getItemTypeBadge(item.type)}
                      </span>
                      {item.dept && (
                        <span className="text-[10px] text-slate-400 truncate">
                          • {item.dept}
                        </span>
                      )}
                      {item.updatedAt && (
                        <span className="text-[10px] text-slate-400">
                          • {item.updatedAt}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={15} className="text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: Đã ghim (Favorites / Pins) */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setPinnedOpen(!pinnedOpen)}
            className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 rounded-[8px] bg-slate-100/70 dark:bg-[#0a192f]/70 border border-gray-200/60 dark:border-slate-800 hover:bg-slate-200/60 dark:hover:bg-[#0f1e36] transition-colors cursor-pointer"
          >
            <Pin size={15} className="text-amber-500 fill-amber-500/30 shrink-0" />
            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 justify-start text-left">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                {isEn ? 'Favorites & Pins' : 'Đã ghim'}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">({displayPinned.length})</span>
            </div>
            <ChevronDown
              size={15}
              className={cn('text-gray-400 transition-transform duration-200', !pinnedOpen && '-rotate-90')}
            />
          </button>

          {pinnedOpen && (
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              {displayPinned.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 p-2.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-amber-400/50 dark:hover:border-amber-500/40 hover:bg-amber-50/20 dark:hover:bg-[#0f1e36] transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="w-8 h-8 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 grid place-items-center shrink-0">
                    <Pin size={14} className="text-amber-600 dark:text-amber-400 fill-amber-500/20" />
                  </div>

                  <div className="grid grid-cols-1 min-w-0 text-left">
                    <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-semibold bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                        {getItemTypeBadge(item.type)}
                      </span>
                      {item.dept && (
                        <span className="text-[10px] text-slate-400 truncate">
                          • {item.dept}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={15} className="text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 3. BOTTOM BAR MOBILE HUB (Search Icon Button + Quick Create (+) Button) */}
      <div className="fixed left-4 right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 max-w-sm mx-auto">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 p-1.5 rounded-full mobile-liquid-glass backdrop-blur-2xl shadow-xl border border-white/60 dark:border-slate-700/60 bg-white/85 dark:bg-[#0b1329]/90">
          {/* Nút tròn Search (chỉ có icon tròn) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
              else navigate('/tasks?action=search');
            }}
            aria-label={t('header.search')}
            title={t('header.search')}
            className="w-11 h-11 rounded-full grid place-items-center bg-slate-100/90 dark:bg-[#0a192f] border border-transparent dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#0f1e36] transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          >
            <Search size={18} strokeWidth={2.2} />
          </button>

          {/* Center visual spacer */}
          <div className="grid place-items-center min-w-0">
            <span className="text-[10px] font-bold text-slate-400/80 dark:text-slate-500 tracking-wide select-none">
              K COFFEE HUB
            </span>
          </div>

          {/* Nút tròn Tạo mới nhanh (+) bên phải mở popup */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              aria-label={isEn ? 'Quick Create' : 'Tạo mới nhanh'}
              className="w-11 h-11 rounded-full grid place-items-center bg-gradient-to-tr from-[#002e6d] to-[#0055b8] text-white shadow-md shadow-blue-900/30 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus
                size={20}
                strokeWidth={2.4}
                className={cn('transition-transform duration-200', quickCreateOpen && 'rotate-45')}
              />
            </button>

            {/* Quick Create Popup Menu */}
            {quickCreateOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]"
                  onClick={() => setQuickCreateOpen(false)}
                />
                <div className="absolute right-0 bottom-full mb-3 w-56 p-1.5 rounded-[8px] bg-white dark:bg-[#0a192f] border border-gray-200/90 dark:border-slate-700 shadow-2xl z-50 grid grid-cols-1 gap-1 animate-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateOpen(false);
                      if (onCreateTask) onCreateTask();
                      else navigate('/tasks?action=new');
                    }}
                    className="w-full text-left p-2 rounded-[6px] hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-white grid grid-cols-[auto_1fr] items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckSquare size={14} className="text-emerald-500" />
                    <span>+ {isEn ? 'New Task' : 'Tạo Task mới'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateOpen(false);
                      if (onCreateProject) onCreateProject();
                      else navigate('/projects?action=new');
                    }}
                    className="w-full text-left p-2 rounded-[6px] hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-white grid grid-cols-[auto_1fr] items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderKanban size={14} className="text-blue-500" />
                    <span>+ {isEn ? 'New Project / Campaign' : 'Tạo Project / Campaign mới'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHomeHub;
