import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Search, Sun, Moon, Bell, Sidebar, Globe, RefreshCw, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../common/KpiCard';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/translations';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { markNotificationsRead, type NotificationItem } from '../../store/notificationStore';
import { PushNotificationSettings } from '../features/notifications/PushNotificationSettings';
import { NotificationIcon, TONES, toneOf, toneStyle, PicText, formatNotificationTimestamp } from '../features/notifications/notificationVisual';
import toast from 'react-hot-toast';
import { entityLink } from '../../lib/taskTracking';
import { TopCollapsedNavbar } from './TopCollapsedNavbar';
import { appUpdateService, type UpdateInfo } from '../../services/appUpdateService';


export const Header: React.FC<{mobileHidden?:boolean; entranceClass?: string}> = ({mobileHidden=false, entranceClass=''}) => {
  const { theme, toggleTheme, lang, setLang, toggleSidebar, isSidebarOpen } = useUiStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target) && !panelRef.current?.contains(target)) {
        setShowNotifs(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifs]);

  // Click outside and Escape handler for Header search
  useEffect(() => {
    if (!isSearchExpanded) return;

    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !desktopSearchRef.current?.contains(target) &&
        !mobileSearchRef.current?.contains(target)
      ) {
        setIsSearchExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchExpanded]);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchExpanded((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus when search is expanded
  useEffect(() => {
    if (isSearchExpanded) {
      setTimeout(() => {
        if (window.innerWidth >= 1280) {
          desktopSearchInputRef.current?.focus();
        } else {
          mobileSearchInputRef.current?.focus();
        }
      }, 50);
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    setShowNotifs(false);
    setIsSearchExpanded(false);
  }, [location.pathname]);
  const {items:notifications,unread} = useNotificationCenter();
  const latestUnread = notifications.find(item => !item.is_read);
  const [markingRead, setMarkingRead] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => appUpdateService.getUpdateInfo());

  useEffect(() => {
    return appUpdateService.subscribe(setUpdateInfo);
  }, []);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    const handleScroll = () => {
      const top = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      setIsScrolled(top > 4);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  const markAllNotificationsRead = async () => {
    if(markingRead||!unread)return;
    setMarkingRead(true);
    try{await markNotificationsRead();}catch{toast.error('Chưa đánh dấu đã đọc được. Vui lòng thử lại.');}
    finally{setMarkingRead(false);}
  };
  const openNotification = async (notification: NotificationItem) => {
    void markNotificationsRead([notification.id]).catch(()=>toast.error('Chưa đồng bộ trạng thái đã đọc.'));
    setShowNotifs(false);
    const href=entityLink(notification.entity_type,notification.entity_id,notification.metadata);
    if(href)navigate(href);
  };

  return (
    <>
    <div inert={mobileHidden&&!showNotifs&&!isSearchExpanded} className={cn(mobileHidden&&!showNotifs&&!isSearchExpanded&&"mobile-header-hidden", "dashboard-top-chrome pointer-events-none absolute top-0 inset-x-0 select-none transition-all duration-200", showNotifs ? "z-[9999]" : "z-[60]", entranceClass)}>
      {/* Liquid Glass Top Depth Mask (fades from blur to transparent - dark mode only) */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden dark:block liquid-glass-top-mask pointer-events-none absolute inset-x-0 top-0 z-10 transition-all duration-300",
          isScrolled && "is-scrolled"
        )}
      />
      
      {/* Floating Top Sidebar / Header Pill with Double-Border Bezel Frame */}
      <div className="app-top-sidebar-outer pointer-events-auto relative mx-3 mt-[calc(6px+env(safe-area-inset-top,0px))] xl:mx-4 xl:mt-2.5 transition-all duration-300">
        <header className={cn(
          "app-top-sidebar-inner liquid-glass-header flex h-11 items-center justify-between rounded-full px-3 xl:h-11 xl:rounded-xl xl:px-4 transition-all duration-300 w-full",
          showNotifs ? "z-[9999]" : "z-20",
          isScrolled && "is-scrolled"
        )}>
        
        {/* LEFT AREA */}
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600 flex-1 min-w-0 pr-4">
          <button
            type="button"
            onClick={toggleSidebar}
            title={isSidebarOpen ? "Thu gọn Sidebar" : "Mở rộng Sidebar"}
            aria-label={isSidebarOpen ? "Thu gọn Sidebar" : "Mở rộng Sidebar"}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-[#F4F4F5] dark:hover:bg-slate-700/60 transition-colors hidden xl:flex items-center justify-center cursor-pointer shrink-0"
          >
            <Sidebar size={18} />
          </button>
          
          {isSidebarOpen ? (
            <div className="hidden xl:flex items-center gap-2" />
          ) : (
            <TopCollapsedNavbar />
          )}

          {/* Mobile Left: Lang and Theme */}
          <div className="flex xl:hidden items-center gap-1">
            <button 
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              className="p-1.5 sm:p-2 hover:bg-[#F4F4F5] dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1 font-bold text-xs"
            >
              <Globe size={18} /> <span className="hidden sm:inline">{lang.toUpperCase()}</span>
            </button>
            <button 
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Bật giao diện tối' : 'Bật giao diện sáng'}
              aria-pressed={theme === 'dark'}
              className="p-1.5 sm:p-2 hover:bg-[#F4F4F5] dark:hover:bg-slate-700 rounded-xl transition-all text-gray-600 dark:text-gray-300"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>

        {/* CENTER AREA (Mobile Logo) */}
        <div className="xl:hidden absolute left-1/2 -translate-x-1/2 grid place-items-center pointer-events-none">
          <img src="/logo-light.svg" alt="Phúc Sinh Logo" className="h-8 sm:h-8.5 w-auto drop-shadow-md block dark:hidden" />
          <img src="/logo-dark.svg" alt="Phúc Sinh Logo" className="h-8 sm:h-8.5 w-auto drop-shadow-md hidden dark:block" />
        </div>

        {/* RIGHT AREA */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* DESKTOP SEARCH: Default compact icon button, expands on click/⌘K, collapses on click outside */}
          <div ref={desktopSearchRef} className="relative hidden xl:block">
            <div
              className={`relative h-9 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs transition-all duration-300 overflow-hidden ${
                isSearchExpanded
                  ? 'w-60 xl:w-68 ring-2 ring-primary/20 border-primary dark:border-[#85df7d]/70'
                  : 'w-9 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isSearchExpanded) {
                    setIsSearchExpanded(true);
                  }
                }}
                aria-label={t('header.search')}
                aria-expanded={isSearchExpanded}
                title={`${t('header.search')} (⌘K)`}
                className={`absolute left-0 top-0 h-full w-9 grid place-items-center text-gray-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer z-10 ${
                  isSearchExpanded ? 'pointer-events-none text-gray-400 dark:text-slate-400' : ''
                }`}
              >
                <Search size={16} />
              </button>

              <input
                ref={desktopSearchInputRef}
                type="text"
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                placeholder={t('header.search')}
                aria-label={t('header.search')}
                tabIndex={isSearchExpanded ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && headerSearchQuery.trim()) {
                    navigate(`/tasks?search=${encodeURIComponent(headerSearchQuery.trim())}`);
                    setIsSearchExpanded(false);
                  }
                }}
                className={`w-full h-full pl-9 pr-11 text-xs bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none border-none transition-opacity duration-200 ${
                  isSearchExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              />

              {isSearchExpanded && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                  {headerSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderSearchQuery('');
                        desktopSearchInputRef.current?.focus();
                      }}
                      aria-label="Xóa từ khóa"
                      title="Xóa từ khóa"
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded cursor-pointer grid place-items-center"
                    >
                      <X size={13} />
                    </button>
                  ) : (
                    <kbd className="hidden xl:inline-grid place-items-center text-[10px] text-gray-400 bg-gray-50 dark:bg-slate-700/80 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono pointer-events-none">
                      ⌘K
                    </kbd>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-300">
            <button 
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              className="p-1.5 hover:bg-[#F4F4F5] dark:hover:bg-slate-700/60 rounded-lg transition-all hidden xl:flex items-center gap-1 font-bold text-xs"
            >
              <Globe size={16} /> {lang.toUpperCase()}
            </button>
            
            <button 
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Bật giao diện tối' : 'Bật giao diện sáng'}
              aria-pressed={theme === 'dark'}
              className="p-1.5 hover:bg-[#F4F4F5] dark:hover:bg-slate-700/60 rounded-lg transition-all hidden xl:block"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            
            {/* MOBILE SEARCH: Default compact icon button, expands on click, collapses on click outside */}
            <div
              ref={mobileSearchRef}
              className={`xl:hidden transition-all duration-300 ${
                isSearchExpanded
                  ? 'absolute right-12 left-4 z-[110] bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg'
                  : 'relative border-transparent w-9'
              } border rounded-xl overflow-hidden h-9`}
            >
              <button
                type="button"
                aria-label={t('header.search')}
                aria-expanded={isSearchExpanded}
                onClick={() => setIsSearchExpanded((prev) => !prev)}
                className="w-9 h-9 grid place-items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
              >
                <Search size={18} />
              </button>

              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder={t('header.search')}
                aria-label={t('header.search')}
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                tabIndex={isSearchExpanded ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && headerSearchQuery.trim()) {
                    navigate(`/tasks?search=${encodeURIComponent(headerSearchQuery.trim())}`);
                    setIsSearchExpanded(false);
                  }
                }}
                className={`bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 absolute left-9 right-8 top-0 h-full ${
                  isSearchExpanded ? 'opacity-100 pointer-events-auto pr-2' : 'opacity-0 pointer-events-none pr-0'
                }`}
              />

              {isSearchExpanded && (
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(false)}
                  aria-label="Đóng tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer grid place-items-center"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            
            <div className={cn("relative", showNotifs && "z-[9999]")} ref={notifRef}>
              <button 
                type="button"
                onClick={() => setShowNotifs(!showNotifs)}
                aria-label={t('profile.notifications')}
                aria-expanded={showNotifs}
                className={cn(
                  "p-1.5 rounded-lg transition-all relative cursor-pointer",
                  showNotifs
                    ? "bg-primary/10 text-primary dark:bg-slate-700 dark:text-blue-300"
                    : "hover:bg-[#F4F4F5] dark:hover:bg-slate-700/60 text-gray-600 dark:text-gray-300"
                )}
              >
                <span className={unread > 0 ? 'notif-bell' : undefined} style={latestUnread ? toneStyle(latestUnread) : undefined}><Bell size={18} /></span>
                {unread > 0 && <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white">{unread > 99 ? "99+" : unread}</span>}
              </button>
            
            {showNotifs && createPortal(
              <div ref={panelRef} style={(() => { const r = notifRef.current?.getBoundingClientRect(); return r ? { top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) } : { top: 64, right: 12 }; })()} className="notif-glass fixed w-[min(360px,calc(100vw-24px))] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/80 font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center">
                  <span className="text-xs font-semibold">{lang === 'en' ? 'Notifications' : 'Thông báo'}{unread > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-300">{unread}</span>}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      disabled={markingRead||!unread} 
                      title={lang === 'en' ? 'Mark all as read' : 'Đã đọc tất cả'} 
                      aria-label={lang === 'en' ? 'Mark all as read' : 'Đã đọc tất cả'}
                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 dark:text-blue-400 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer" 
                      onClick={()=>void markAllNotificationsRead()}
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowNotifs(false)} 
                      title={lang === 'en' ? 'Collapse' : 'Thu gọn'} 
                      aria-label={lang === 'en' ? 'Collapse' : 'Thu gọn'} 
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
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
                      className="m-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/12 via-cyan-500/10 to-emerald-500/10 border border-blue-500/30 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-500/60 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
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
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0 shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={11} />
                        <span>Tải lại</span>
                      </button>
                    </div>
                  )}
                  {notifications.length === 0 ? <p className="p-4 text-sm text-gray-500">{lang === 'en' ? 'No notifications yet.' : 'Chưa có thông báo.'}</p> : notifications.map(notification => <div key={notification.id} role="button" tabIndex={0} onClick={() => void openNotification(notification)} onKeyDown={e => { if (e.key === 'Enter') void openNotification(notification); }} style={toneStyle(notification)} className="notif-row group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"><NotificationIcon dim={notification.is_read} message={notification.message} metadata={notification.metadata} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{notification.title}</b><span className="notif-chip rounded-full px-1.5 py-px text-[10px] font-semibold">{TONES[toneOf(notification)].label}</span></span><span className="notif-msg mt-0.5 block text-xs leading-4">{<PicText message={notification.message} metadata={notification.metadata}/>}</span><time className="mt-1 block text-[10px] text-gray-400 dark:text-slate-500" dateTime={notification.created_at}>{formatNotificationTimestamp(notification.created_at,lang)}</time></span>{!notification.is_read && <button type="button" aria-label={lang === 'en' ? 'Mark as read' : 'Đánh dấu đã đọc'} onClick={e => { e.stopPropagation(); void markNotificationsRead([notification.id]).catch(() => toast.error('Chưa đồng bộ trạng thái đã đọc.')); }} className="notif-x notif-x-static"><X size={13} /></button>}</div>)}
                </div>
              </div>,
              document.body
            )}
          </div>
          
          
        </div>
      </div>
    </header>
    </div>
    </div>
    </>
  );
};
