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
import { NotificationIcon, TONES, toneOf, toneStyle, PicText } from '../features/notifications/notificationVisual';
import toast from 'react-hot-toast';
import { entityLink } from '../../lib/taskTracking';
import { TopCollapsedNavbar } from './TopCollapsedNavbar';
import { appUpdateService, type UpdateInfo } from '../../services/appUpdateService';


export const Header: React.FC<{mobileHidden?:boolean}> = ({mobileHidden=false}) => {
  const { theme, toggleTheme, lang, setLang, toggleSidebar, isSidebarOpen } = useUiStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    setShowNotifs(false);
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
    <div inert={mobileHidden&&!showNotifs&&!isSearchExpanded} className={cn(mobileHidden&&!showNotifs&&!isSearchExpanded&&"mobile-header-hidden", "dashboard-top-chrome pointer-events-none absolute top-0 inset-x-0 select-none transition-all duration-200", showNotifs ? "z-[9999]" : "z-[60]")}>
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
        <div className="xl:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <img src="/logo-light.svg" alt="K COFFEE" className="h-7 sm:h-8 w-auto drop-shadow-md block dark:hidden" />
          <img src="/logo-dark.svg" alt="K COFFEE" className="h-7 sm:h-8 w-auto drop-shadow-md hidden dark:block" />
        </div>

        {/* RIGHT AREA */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative group hidden xl:block" >
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 group-focus-within:text-primary dark:group-focus-within:text-[#85df7d] transition-colors" />
            <input
              type="text"
              placeholder={t('header.search')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  navigate(`/tasks?search=${encodeURIComponent(e.currentTarget.value.trim())}`);
                }
              }}
              className="pl-9 pr-14 py-1.5 bg-[#FAFAFA] dark:bg-slate-800/80 border border-[#E4E4E7] dark:border-slate-700 rounded-lg text-xs w-32 md:w-52 focus:w-60 transition-all text-gray-800 dark:text-gray-100 outline-none focus:border-primary dark:focus:border-[#85df7d]"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-white dark:bg-slate-700/80 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono pointer-events-none">⌘K</kbd>
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

            
            <div className={`flex xl:hidden items-center transition-all duration-300 ${isSearchExpanded ? 'absolute right-12 left-4 z-[110] bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg' : 'relative border-transparent w-9'} border rounded-xl overflow-hidden h-9`}>
              <button aria-label={t('header.search')} onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="w-9 h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors flex-shrink-0">
                <Search size={18} />
              </button>
              <input
                type="text"
                placeholder={t("header.search")}
                autoFocus={isSearchExpanded}
                onBlur={() => setIsSearchExpanded(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    navigate(`/tasks?search=${encodeURIComponent(e.currentTarget.value.trim())}`);
                    setIsSearchExpanded(false);
                  }
                }}
                className={`bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 ${isSearchExpanded ? 'w-full opacity-100 pr-3' : 'w-0 opacity-0 pointer-events-none pr-0'}`}
              />
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
                  {notifications.length === 0 ? <p className="p-4 text-sm text-gray-500">{lang === 'en' ? 'No notifications yet.' : 'Chưa có thông báo.'}</p> : notifications.map(notification => <div key={notification.id} role="button" tabIndex={0} onClick={() => void openNotification(notification)} onKeyDown={e => { if (e.key === 'Enter') void openNotification(notification); }} style={toneStyle(notification)} className="notif-row group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"><NotificationIcon dim={notification.is_read} message={notification.message} metadata={notification.metadata} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{notification.title}</b><span className="notif-chip rounded-full px-1.5 py-px text-[10px] font-semibold">{TONES[toneOf(notification)].label}</span></span><span className="notif-msg mt-0.5 block text-xs leading-4">{<PicText message={notification.message} metadata={notification.metadata}/>}</span></span>{!notification.is_read && <button type="button" aria-label={lang === 'en' ? 'Mark as read' : 'Đánh dấu đã đọc'} onClick={e => { e.stopPropagation(); void markNotificationsRead([notification.id]).catch(() => toast.error('Chưa đồng bộ trạng thái đã đọc.')); }} className="notif-x notif-x-static"><X size={13} /></button>}</div>)}
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
