import { useOverlayStore } from '../../store/overlayStore';
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ChevronRight
} from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import { canViewTeamManagement } from '../../lib/roleScope';

export const MobileNav: React.FC<{ scrollHidden?: boolean }> = ({ scrollHidden = false }) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const taskDetailsOpen = useOverlayStore(state => state.taskDetails > 0);
  const isHidden = scrollHidden || taskDetailsOpen;
  const profile = useAuthStore(s => s.profile);
  const isLeader = canViewTeamManagement(profile);
  const badges = useSidebarBadges();

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
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} />, badgeCount: badges.borrowCount, desc: lang === 'en' ? 'Equipment and inventory items' : 'Thiết bị & mượn trả tài sản' },
    { name: t('nav.team'), path: '/team', icon: <Users size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'Department members and workloads' : 'Nhân sự & khối lượng công việc' },
    { name: t('nav.profile'), path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'My profile and personal calendar' : 'Hồ sơ cá nhân & lịch làm việc' },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: lang === 'en' ? 'Performance analytics and capacity' : 'Báo cáo năng suất & tải công việc' },
    { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: lang === 'en' ? 'Executive overview cockpit' : 'Bảng điều khiển tổng quan' },
  ].filter(tab => !tab.hidden);

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

      {/* Modern 3-Part Mobile Bottom Bar (Ref image1.png): Menu Button + Search Input + Workflow/Action Button */}
      <div 
        inert={isHidden}
        aria-hidden={isHidden}
        className={cn(
          "xl:hidden fixed left-3 right-3 z-[99] mobile-nav-container transition-all",
          isHidden && "nav-hidden",
          taskDetailsOpen && "nav-detail-hidden"
        )}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 p-1.5 rounded-full mobile-liquid-glass backdrop-blur-2xl shadow-xl border border-white/60 dark:border-slate-700/60 bg-white/80 dark:bg-[#0b1329]/85">
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

          {/* 2. Middle: Integrated Search Input (Ref image1.png: Ask AI / Search pill) */}
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

          {/* 3. Right: Quick Action / Workflow Button (Ref image1.png & image3.png) */}
          <NavLink
            to="/workflow"
            aria-label={t('nav.home')}
            title={t('nav.home')}
            className={({ isActive }) => cn(
              "w-11 h-11 rounded-full grid place-items-center transition-all cursor-pointer shadow-xs shrink-0 active:scale-95",
              isActive
                ? "bg-gradient-to-tr from-[#002e6d] to-[#38bdf8] text-white shadow-md ring-2 ring-blue-400/40"
                : "bg-slate-100/90 dark:bg-[#0a192f] border border-transparent dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#0f1e36]"
            )}
          >
            <Layers size={20} strokeWidth={1.8} />
          </NavLink>
        </div>
      </div>

      {/* Mobile All-Tabs Drawer / Bottom Sheet (Opened by Hamburger Button) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-[120] xl:hidden transition-opacity duration-300"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'en' ? 'Dashboard Navigation Menu' : 'Menu điều hướng Dashboard'}
        >
          {/* Backdrop Overlay */}
          <div 
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Bottom Sheet Drawer */}
          <div 
            className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl rounded-t-3xl border-t border-slate-200/80 dark:border-slate-700/80 shadow-2xl p-4 pb-[calc(24px+env(safe-area-inset-bottom))] grid grid-cols-1 gap-3 overflow-hidden animate-in slide-in-from-bottom duration-300"
          >
            {/* Sheet Header */}
            <div className="grid grid-cols-[1fr_auto] items-center pb-2 border-b border-slate-200/70 dark:border-slate-800">
              <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#002e6d]/10 dark:bg-[#38bdf8]/10 text-[#002e6d] dark:text-[#38bdf8] grid place-items-center">
                  <Menu size={18} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {lang === 'en' ? 'Dashboard Navigation' : 'Danh mục Dashboard'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Select a module to view and manage' : 'Chọn phân hệ để làm việc'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 grid place-items-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of Dashboard Tabs */}
            <div className="max-h-[60vh] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
              {navTabs.map((tab) => (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  onClick={closeDrawer}
                  className={({ isActive }) => cn(
                    "grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 rounded-[8px] transition-all cursor-pointer border",
                    isActive
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-300/80 dark:border-blue-700/80 text-blue-900 dark:text-blue-100 shadow-xs"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  )}
                >
                  <div className="w-9 h-9 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center text-slate-700 dark:text-slate-200 shadow-2xs shrink-0">
                    {tab.icon}
                  </div>

                  <div className="grid grid-cols-1 min-w-0">
                    <div className="grid grid-flow-col auto-cols-max items-center gap-2">
                      <span className="font-bold text-xs truncate">{tab.name}</span>
                      {Boolean((tab as any).badgeCount > 0) && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                          {(tab as any).badgeCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">{tab.desc}</span>
                  </div>

                  <ChevronRight size={16} className="text-slate-400 justify-self-end" />
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
