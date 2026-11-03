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
  LayoutGrid,
} from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import { canViewTeamManagement, isAdmin } from '../../lib/roleScope';

export const MobileNav: React.FC<{ scrollHidden?: boolean }> = ({ scrollHidden = false }) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Automatically dismiss mobile drawer and search when task detail panel opens
  useEffect(() => {
    if (taskDetailsOpen) {
      setIsDrawerOpen(false);
      setIsSearching(false);
    }
  }, [taskDetailsOpen]);

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
    { name: t('nav.agent'), path: '/agents', icon: <Bot size={20} strokeWidth={1.8} />, hidden: !isAdmin(profile), desc: lang === 'en' ? 'Ask about work and create task proposals' : 'Hỏi đáp công việc và tạo đề xuất task' },
    { name: t('nav.assets'), path: '/assets', icon: <Package size={20} strokeWidth={1.8} />, badgeCount: badges.borrowCount, desc: lang === 'en' ? 'Equipment and inventory items' : 'Thiết bị & mượn trả tài sản' },
    { name: t('nav.team'), path: '/team', icon: <Users size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'Department members and workloads' : 'Nhân sự & khối lượng công việc' },
    { name: t('nav.profile'), path: '/my-tasks', icon: <User size={20} strokeWidth={1.8} />, desc: lang === 'en' ? 'My profile and personal calendar' : 'Hồ sơ cá nhân & lịch làm việc' },
    { name: t('nav.reports'), path: '/reports', icon: <TrendingUp size={20} strokeWidth={1.8} />, hidden: false, desc: lang === 'en' ? 'Performance analytics and capacity' : 'Báo cáo năng suất & tải công việc' },
    { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} />, hidden: !isLeader, desc: lang === 'en' ? 'Executive overview cockpit' : 'Bảng điều khiển tổng quan' },
  ].filter(tab => !tab.hidden);

  if (location.pathname === '/mobile-home') return null;

  return (
    <>
      <style>{`
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
        .mobile-nav-container input[type="text"] {
          background-color: transparent !important;
          border: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
          outline: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-nav-container { transition-duration: 0.01ms; }
        }
      `}</style>

      {/* Modern 3-Element Bottom Bar: Menu 3 gạch + Thanh search dài + Nút Home (Feedback #4: xóa viền ngoài) */}
      <div 
        inert={isHidden}
        aria-hidden={isHidden}
        className={cn(
          "xl:hidden fixed left-3 right-3 z-[99] mobile-nav-container transition-all",
          isHidden && "nav-hidden",
          taskDetailsOpen && "nav-detail-hidden"
        )}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 max-w-[440px] mx-auto">
          {/* 1. Left: Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            aria-label={lang === 'en' ? 'Open navigation menu' : 'Mở menu điều hướng'}
            aria-expanded={isDrawerOpen}
            className="w-11 h-11 rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f1e36] transition-all cursor-pointer shadow-lg shrink-0 active:scale-95"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {/* 2. Middle: Integrated Search Input (Thanh search dài) */}
          <form 
            onSubmit={handleSearchSubmit}
            className="h-11 rounded-full bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 shadow-lg grid grid-cols-[auto_1fr_auto] items-center px-3.5 gap-2 min-w-0 transition-all focus-within:ring-1 focus-within:ring-[#002e6d]/40"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#002e6d]/30 text-slate-600 dark:text-sky-300 grid place-items-center shrink-0">
              <Search size={13} strokeWidth={2.2} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'en' ? 'Search or ask...' : 'Tìm kiếm nhanh...'}
              aria-label={t('header.search')}
              className="w-full !bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 !outline-none !border-none !border-transparent !shadow-none focus:!ring-0 focus:!outline-none min-w-0"
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

          {/* 3. Right: Home Button (Feedback #4) */}
          <button
            type="button"
            onClick={() => navigate('/mobile-home')}
            aria-label={lang === 'en' ? 'Home' : 'Trang chủ'}
            title={lang === 'en' ? 'Home' : 'Trang chủ'}
            className="w-11 h-11 rounded-full grid place-items-center bg-white dark:bg-[#0a192f] border border-gray-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f1e36] transition-all cursor-pointer shadow-lg shrink-0 active:scale-95"
          >
            <Home size={19} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Floating Popover / Context Menu nhỏ gọn góc dưới (~270px, Feedback #3: không có Recents, không blur background) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-[120] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'en' ? 'Navigation Popover' : 'Menu điều hướng nhanh'}
        >
          {/* Backdrop Overlay nhẹ không blur (Feedback #3: ko blur background sau) */}
          <div 
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/10 dark:bg-black/25 transition-opacity"
          />

          {/* Floating Popover Card */}
          <div 
            className="absolute left-3 bottom-[calc(76px+env(safe-area-inset-bottom))] w-[270px] max-h-[75vh] bg-white dark:bg-[#0a192f] rounded-[14px] border border-slate-200/90 dark:border-slate-700/80 shadow-2xl overflow-hidden grid grid-cols-1 grid-rows-[auto_1fr_auto] animate-in zoom-in-95 fade-in duration-200"
          >
            {/* Header: Tiêu đề Danh mục Tabs & nút đóng */}
            <div className="grid grid-cols-[1fr_auto] items-center px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
                <LayoutGrid size={13} className="text-[#002e6d] dark:text-sky-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {lang === 'en' ? 'Dashboard Tabs' : 'Danh mục Dashboard'}
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

            {/* Scrollable Content: CHỈ HIỂN THỊ CÁC TAB CỦA DASHBOARD (Feedback #3) */}
            <div className="overflow-y-auto px-2 py-1.5 max-h-[calc(75vh-120px)] custom-scrollbar">
              <div className="grid grid-cols-1 gap-1">
                {navTabs.map((tab) => (
                  <NavLink
                    key={tab.name}
                    to={tab.path}
                    onClick={closeDrawer}
                    className={({ isActive }) => cn(
                      "grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-2.5 py-2 rounded-[8px] transition-colors cursor-pointer text-xs font-semibold",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-sky-300 font-bold border border-blue-200/70 dark:border-blue-800/60"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    )}
                  >
                    <span className="w-5 h-5 grid place-items-center text-slate-500 dark:text-slate-400 shrink-0">
                      {React.cloneElement(tab.icon as React.ReactElement<{ size?: number }>, { size: 15 })}
                    </span>
                    <span className="truncate">{tab.name}</span>
                    {Boolean((tab as any).badgeCount > 0) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                        {(tab as any).badgeCount}
                      </span>
                    )}
                  </NavLink>
                ))}
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
