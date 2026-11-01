import { useOverlayStore } from '../../store/overlayStore';
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Layers, 
  X, 
  CheckSquare, 
  Package, 
  User, 
  Users, 
  FolderKanban, 
  TrendingUp, 
  LayoutDashboard,
  Bot,
  Home,
  Clock,
} from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import { canViewTeamManagement } from '../../lib/roleScope';
import { useRecentItemsStore } from '../../store/recentItemsStore';

export const MobileNav: React.FC<{ scrollHidden?: boolean }> = ({ scrollHidden = false }) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const taskDetailsOpen = useOverlayStore(state => state.taskDetails > 0);
  const isHidden = scrollHidden || taskDetailsOpen;
  const profile = useAuthStore(s => s.profile);
  const isLeader = canViewTeamManagement(profile);
  const badges = useSidebarBadges();
  const storeRecents = useRecentItemsStore((s) => s.items);

  // Detail view mode detection for mobile (Task/Project/Campaign/Subtask/Profile)

    /\/(tasks|projects|campaigns|members)\/.+/.test(location.pathname);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close drawer on overlay click or route change
  const closeDrawer = () => setIsDrawerOpen(false);


  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setIsSearching(false);
      }
    };
    if (isDrawerOpen || isSearching) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isSearching]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const navTabs = [
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={20} strokeWidth={1.8} />, badgeCount: badges.projectCount, desc: lang === 'en' ? 'Manage projects and campaigns' : 'Quản lý dự án & chiến dịch' },
    { name: t('nav.home'), path: '/workflow', icon: <Layers size={20} strokeWidth={1.8} />, badgeCount: badges.workflowCount, desc: lang === 'en' ? 'Workflow tracks & gate milestones' : 'Tiến độ luồng công việc & gates' },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'All assigned task items' : 'Toàn bộ đầu việc được giao' },
    { name: t('nav.agent'), path: '/agents', icon: <Bot size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'Ask about work and create task proposals' : 'Hỏi đáp công việc và tạo đề xuất task' },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} />, badgeCount: badges.borrowCount, desc: lang === 'en' ? 'Equipment and inventory items' : 'Thiết bị & mượn trả tài sản' },
    { name: t('nav.team'), path: '/team', icon: <Users size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'Department members and workloads' : 'Nhân sự & khối lượng công việc' },
    { name: t('nav.profile'), path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'My profile and personal calendar' : 'Hồ sơ cá nhân & lịch làm việc' },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: lang === 'en' ? 'Performance analytics and capacity' : 'Báo cáo năng suất & tải công việc' },
    { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: lang === 'en' ? 'Executive overview cockpit' : 'Bảng điều khiển tổng quan' },
  ].filter(tab => !tab.hidden);

  if (location.pathname === '/mobile-home') return null;

  return (
    <>
      <style>{`
        html:not(.dark) .mobile-nav-mask {
          display: none !important;
        }
        .mobile-nav-mask {
          height: calc(110px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, rgba(237,246,255,0.76) 0%, rgba(237,246,255,0.50) 68%, transparent 100%);
          backdrop-filter: blur(32px) saturate(165%);
          -webkit-backdrop-filter: blur(32px) saturate(165%);
          mask-image: linear-gradient(to top, #000 0%, #000 68%, transparent 100%);
          -webkit-mask-image: linear-gradient(to top, #000 0%, #000 68%, transparent 100%);
          transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dark .mobile-nav-mask {
          background: linear-gradient(to top, rgba(5,18,38,0.84) 0%, rgba(5,18,38,0.58) 68%, transparent 100%);
        }
        .mobile-nav-container {
          max-width: 440px;
          margin: 0 auto;
          bottom: calc(16px + env(safe-area-inset-bottom));
          transform-origin: bottom center;
          will-change: transform, opacity;
          transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mobile-nav-container.nav-hidden {
          transform: translateY(calc(100% + 40px + env(safe-area-inset-bottom)));
          opacity: 0;
          pointer-events: none;
        }
        .mobile-nav-mask.nav-hidden {
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-nav-container, .mobile-nav-mask { transition-duration: 0.01ms; }
        }
      `}</style>
      
      {/* Background Mask (Dark mode only) */}
      <div 
        className={cn(
          "hidden dark:xl:hidden dark:fixed dark:bottom-0 dark:left-0 dark:right-0 pointer-events-none z-[98] mobile-nav-mask backdrop-blur-[32px] backdrop-saturate-[165%]",
          isHidden && "nav-hidden",
          taskDetailsOpen && "nav-detail-hidden"
        )}
      />

      {/* Modern 2-Part (Detail Mode) or 3-Part (List Mode) Mobile Bottom Bar */}
      <div 
        inert={isHidden}
        aria-hidden={isHidden}
        className={cn(
          "xl:hidden fixed left-3 right-3 z-[99] mobile-nav-container transition-all",
          isHidden && "nav-hidden",
          taskDetailsOpen && "nav-detail-hidden"
        )}
      >
        <div className={cn(
          "items-center gap-2 p-1.5 rounded-full mobile-liquid-glass backdrop-blur-2xl shadow-xl border border-white/60 dark:border-slate-700/60 bg-white/80 dark:bg-[#0b1329]/85",
          "grid grid-cols-[auto_1fr]"
        )}>
          {/* 1. Left: Hamburger Menu Button (Ref image1.png) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={lang === 'en' ? 'Open navigation menu' : 'Mở menu điều hướng'}
            aria-expanded={isDrawerOpen}
            className="w-11 h-11 rounded-full grid place-items-center bg-slate-100/90 dark:bg-[#0a192f] border border-transparent dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#0f1e36] transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {/* 2. Middle: Integrated Search Input (Thanh search dài) */}
          <form 
            onSubmit={handleSearchSubmit}
            className="h-11 rounded-full bg-slate-100/90 dark:bg-[#0a192f] border border-slate-200/60 dark:border-slate-700/80 grid grid-cols-[auto_1fr_auto] items-center px-3 gap-2 min-w-0 transition-all focus-within:ring-1 focus-within:ring-[#002e6d]/40 focus-within:border-[#002e6d]/50 dark:focus-within:border-slate-600"
          >
            <div className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-[#002e6d]/30 text-slate-600 dark:text-sky-300 grid place-items-center shrink-0">
              <Search size={13} strokeWidth={2.2} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'en' ? 'Search or ask...' : 'Tìm kiếm nhanh...'}
              aria-label={t('header.search')}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none border-none min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer grid place-items-center shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </form>

          
        </div>
      </div>

      {/* Floating Popover / Context Menu nhỏ gọn góc dưới (~270px, rounded-[14px], kính mờ, KHÔNG tràn 85vh) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-[120] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'en' ? 'Navigation Popover' : 'Menu điều hướng nhanh'}
        >
          {/* Backdrop Overlay mờ nhẹ */}
          <div 
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-[2px] transition-opacity"
          />

          {/* Floating Popover Card */}
          <div 
            className="absolute left-3 bottom-[calc(76px+env(safe-area-inset-bottom))] w-[270px] max-h-[75vh] bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-2xl rounded-[14px] border border-slate-200/90 dark:border-slate-700/80 shadow-2xl overflow-hidden grid grid-cols-1 grid-rows-[auto_1fr_auto] animate-in zoom-in-95 fade-in duration-200"
          >
            {/* Header: Tiêu đề Recents & nút đóng */}
            <div className="grid grid-cols-[1fr_auto] items-center px-3 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                <Clock size={12} className="text-[#002e6d] dark:text-sky-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {lang === 'en' ? 'Recents' : 'Gần đây'}
                </span>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={t('common.close')}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 grid place-items-center transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Scrollable Content: Recents (5 mục) + Shortcuts các tab */}
            <div className="overflow-y-auto px-2 py-1.5 space-y-2 max-h-[calc(75vh-120px)] custom-scrollbar">
              {/* Recents items */}
              <div className="grid grid-cols-1 gap-1">
                {storeRecents.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      navigate(item.path);
                    }}
                    className="w-full text-left p-1.5 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800/80 grid grid-cols-[auto_1fr] items-center gap-2 transition-colors cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-[4px] bg-slate-100 dark:bg-slate-800 grid place-items-center shrink-0">
                      {item.kind === 'project' ? (
                        <FolderKanban size={12} className="text-blue-500" />
                      ) : item.kind === 'campaign' ? (
                        <Layers size={12} className="text-amber-500" />
                      ) : (
                        <CheckSquare size={12} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="grid grid-cols-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {item.parentName || (item.kind === 'project' ? (lang === 'en' ? 'Project' : 'Dự án') : item.kind === 'campaign' ? (lang === 'en' ? 'Campaign' : 'Chiến dịch') : (lang === 'en' ? 'Task' : 'Đầu việc'))}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Shortcuts các tab chính */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <span className="block px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'en' ? 'Shortcuts' : 'Phím tắt'}
                </span>
                <div className="grid grid-cols-1 gap-0.5">
                  {navTabs.map((tab) => (
                    <NavLink
                      key={tab.name}
                      to={tab.path}
                      onClick={closeDrawer}
                      className={({ isActive }) => cn(
                        "grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 rounded-[6px] transition-colors cursor-pointer text-xs font-semibold",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-sky-300 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                      )}
                    >
                      <span className="w-5 h-5 grid place-items-center text-slate-500 dark:text-slate-400 shrink-0">
                        {React.cloneElement(tab.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                      </span>
                      <span className="truncate">{tab.name}</span>
                      {Boolean((tab as any).badgeCount > 0) && (
                        <span className="px-1 py-0.1 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                          {(tab as any).badgeCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            {/* 2 Nút cố định ở đáy: Home (về Mobile Hub) + Search */}
            <div className="border-t border-slate-200/70 dark:border-slate-800 p-2 grid grid-cols-2 gap-2 bg-slate-50/90 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/mobile-home');
                }}
                className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-[#002e6d] dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-[#0f1e36] shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Home size={13} strokeWidth={2.2} />
                <span>{lang === 'en' ? 'Home' : 'Trang chủ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  searchInputRef.current?.focus();
                }}
                className="grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-white dark:bg-[#0a192f] border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f1e36] shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Search size={13} strokeWidth={2.2} />
                <span>{t('header.search')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
