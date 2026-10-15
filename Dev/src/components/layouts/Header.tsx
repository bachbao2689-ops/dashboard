import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Search, Sun, Moon, History, Bell, Sidebar, Globe, CheckSquare, Users, User, BarChart2, Box, ChevronRight, FolderKanban, Layers, MessageSquare } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { cn } from '../common/KpiCard';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import {useNotificationCenter} from '../../hooks/useNotificationCenter';
import {markNotificationsRead,type NotificationItem} from '../../store/notificationStore';
import {PushNotificationSettings} from '../features/notifications/PushNotificationSettings';
import {NotificationIcon,TONES,toneOf,toneStyle,PicText} from '../features/notifications/notificationVisual';
import toast from 'react-hot-toast';
import {entityLink} from '../../lib/taskTracking';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';


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
  const profile = useAuthStore(state => state.profile);
  const {items:notifications,unread} = useNotificationCenter();
  const latestUnread = notifications.find(item => !item.is_read);
  const [markingRead, setMarkingRead] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const role = profile?.role || 'member';
  const isLeader = (profile?.employment_level || '').toLowerCase() === 'leader' || ['leader', 'manager', 'admin'].includes(role.toLowerCase());
  const badges = useSidebarBadges();
  
  const canViewDashboard = ['admin', 'manager', 'leader'].includes((profile?.role || '').toLowerCase()) || ['admin', 'manager', 'leader'].includes((profile?.employment_level || '').toLowerCase());

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

  const navGroups = [
    {
      title: t('nav.main'),
      hasNotification: badges.workflowCount > 0,
      items: [
        { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <BarChart2 size={18} />, hidden: !canViewDashboard },
        {
          name: t('nav.home'),
          path: '/workflow',
          icon: <Layers size={18} />,
          badge: badges.workflowCount > 0 ? (
            <span title="Có bình luận / nhắc đến" className="relative inline-flex items-center ml-1 shrink-0">
              <MessageSquare size={12} className="text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-xs" />
            </span>
          ) : null
        }
      ]
    },
    {
      title: t('nav.tasksProj'),
      hasNotification: badges.projectCount > 0,
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        {
          name: t('nav.projects'),
          path: '/projects',
          icon: <FolderKanban size={18} />,
          badge: badges.projectCount > 0 ? (
            <span title="Có bình luận / nhắc đến" className="relative inline-flex items-center ml-1 shrink-0">
              <MessageSquare size={12} className="text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-xs" />
            </span>
          ) : null
        },
        { name: t('nav.profile'), path: '/my-tasks', icon: <User size={18} /> },
        { name: t('nav.departments'), path: '/departments-2', icon: <Users size={18} />, hidden: role !== 'admin' },
      ]
    },
    {
      title: t('nav.assets'),
      hasNotification: badges.borrowCount > 0,
      items: [
        { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
        {
          name: profile && ['admin', 'manager'].includes(profile.role) ? t('nav.borrow') : t('nav.myBorrow'),
          path: profile && ['admin', 'manager'].includes(profile.role) ? '/borrow-requests' : '/borrow-requests?scope=mine',
          icon: <History size={18} />,
          badge: badges.borrowCount > 0 ? (
            <span className="shrink-0 ml-1 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-red-500 text-white font-bold text-[10px] shadow-xs" title="Đơn cần duyệt / mượn">
              {badges.borrowCount > 99 ? '99+' : badges.borrowCount}
            </span>
          ) : null
        },
      ]
    },
    {
      title: t('nav.teamRep'),
      hasNotification: false,
      items: [
        { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
        { name: t('nav.members'), path: '/members', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} />, hidden: role !== 'admin' && (role === 'member' || role === 'staff') && !isLeader },
      ]
    }
  ];

  // Auto expand the group that contains the current active route on mount or location change
  useEffect(() => {
    if (!isSidebarOpen) {
      const activeGroup = navGroups.find(g => g.items.some(i => i.path.split('?')[0] === location.pathname));
      if (activeGroup) {
        setExpandedGroup(activeGroup.title);
      }
    }
  }, [location.pathname, isSidebarOpen]); // eslint-disable-line react-hooks/exhaustive-deps


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
      
      {/* Floating Liquid Glass Top Header Pill */}
      <header className={cn(
        "liquid-glass-header pointer-events-auto relative mx-3 mt-[calc(6px+env(safe-area-inset-top,0px))] flex h-11 items-center justify-between rounded-full px-3 md:mx-4 md:mt-2.5 md:h-12 md:rounded-2xl md:px-5 transition-all duration-300",
        showNotifs ? "z-[9999]" : "z-20",
        isScrolled && "is-scrolled"
      )}>
      
      {/* LEFT AREA */}
      <div className="flex items-center gap-4 text-sm font-medium text-gray-600 flex-1 min-w-0 pr-4">
        <Sidebar size={20} onClick={toggleSidebar} className="cursor-pointer hover:text-primary transition-colors hidden md:block" />
        
        {isSidebarOpen ? (
          <div className="hidden md:flex items-center gap-2">
            
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide w-full">
            {navGroups.map(group => (
              <div 
                key={group.title} 
                className={cn(
                  "flex items-center rounded-xl border transition-all duration-300 overflow-hidden flex-shrink-0",
                  expandedGroup === group.title 
                    ? "bg-gray-50/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 shadow-sm" 
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                <button 
                  onClick={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
                  className={cn(
                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                    expandedGroup === group.title 
                      ? "text-primary dark:text-white" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {group.title}
                  {expandedGroup !== group.title && (group as any).hasNotification && (
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                  )}
                  <ChevronRight size={14} className={cn("transition-transform duration-300", expandedGroup === group.title && "rotate-90")} />
                </button>
                
                <div 
                  className={cn(
                    "flex items-center transition-all duration-500 ease-in-out",
                    expandedGroup === group.title ? "max-w-[800px] opacity-100 pr-1 pl-0" : "max-w-0 opacity-0 px-0"
                  )}
                >
                  {group.items.filter(item => !(item as any).hidden).map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        "sidebar-link relative px-3 py-1.5 mx-0.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap text-xs border border-transparent",
                        isActive 
                          ? "sidebar-link-active font-semibold" 
                          : "sidebar-link-idle"
                      )}
                    >
                      {item.icon}
                      <span className="text-xs">{item.name}</span>
                      {(item as any).badge}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Left: Lang and Theme */}
        <div className="flex md:hidden items-center gap-1">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> <span className="hidden sm:inline">{lang.toUpperCase()}</span>
          </button>
          <button 
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Bật giao diện tối' : 'Bật giao diện sáng'}
            aria-pressed={theme === 'dark'}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all text-gray-600 dark:text-gray-300"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* CENTER AREA (Mobile Logo) */}
      <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        <img src="/logo-light.svg" alt="K COFFEE" className="h-7 sm:h-8 w-auto drop-shadow-md block dark:hidden" />
        <img src="/logo-dark.svg" alt="K COFFEE" className="h-7 sm:h-8 w-auto drop-shadow-md hidden dark:block" />
      </div>

      {/* RIGHT AREA */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative group hidden sm:block" >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder={t('header.search')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                navigate(`/tasks?search=${encodeURIComponent(e.currentTarget.value.trim())}`);
              }
            }}
            className="pl-10 pr-16 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm w-32 md:w-56 focus:w-64 transition-all text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/20"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 font-mono pointer-events-none">⌘K</kbd>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3 text-gray-600 dark:text-gray-300">
          <button 
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all hidden md:flex items-center gap-1 font-bold text-xs"
          >
            <Globe size={18} /> {lang.toUpperCase()}
          </button>
          
          <button 
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Bật giao diện tối' : 'Bật giao diện sáng'}
            aria-pressed={theme === 'dark'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all hidden md:block"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          
          <div className={`sm:hidden flex items-center transition-all duration-300 ${isSearchExpanded ? 'absolute right-12 left-4 z-[110] bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg' : 'relative border-transparent w-9'} border rounded-xl overflow-hidden h-9`}>
            <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="w-9 h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors flex-shrink-0">
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
                "p-2 rounded-xl transition-all relative cursor-pointer",
                showNotifs
                  ? "bg-primary/10 text-primary dark:bg-slate-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
              )}
            >
              <span className={unread > 0 ? 'notif-bell' : undefined} style={latestUnread ? toneStyle(latestUnread) : undefined}><Bell size={20} /></span>
              {unread > 0 && <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white">{unread > 99 ? "99+" : unread}</span>}
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
    </>
  );
};
