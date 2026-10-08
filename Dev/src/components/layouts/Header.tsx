import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, History, Bell, Sidebar, Globe, Home, CheckSquare, Users, BarChart2, Box, AlertCircle, ChevronRight } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { cn } from '../common/KpiCard';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';

type NotificationItem = { id: string; title: string; message: string; entity_type?: string | null; entity_id?: string | null };

export const Header: React.FC = () => {
    const { theme, toggleTheme, lang, setLang, toggleSidebar, isSidebarOpen } = useUiStore();
  const { t } = useTranslation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);
  const profileId = useAuthStore(state => state.profile?.id);
  const profile = useAuthStore(state => state.profile);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const travelRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const animationLockUntilRef = useRef(0);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    let activeScrollTarget: HTMLElement = scrollContainer;
    let lastY = scrollContainer.scrollTop;
    let frame = 0;
    let pendingScrollTarget: HTMLElement = scrollContainer;

    const handleScroll = (event: Event) => {
      const eventTarget = event.target;
      pendingScrollTarget = eventTarget instanceof HTMLElement && scrollContainer.contains(eventTarget)
        ? eventTarget
        : scrollContainer;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const target = pendingScrollTarget;
        const y = Math.max(0, target.scrollTop);
        if (target !== activeScrollTarget) {
          activeScrollTarget = target;
          lastY = y;
          travelRef.current = 0;
          return;
        }
        const delta = y - lastY;
        lastY = y;

        if (y <= 12) {
          travelRef.current = 0;
          animationLockUntilRef.current = 0;
          headerHiddenRef.current = false;
          setIsHeaderHidden(false);
          return;
        }

        // Ignore tiny wheel/touch fluctuations and scroll adjustments while the
        // header is animating; both were causing the bar to flicker in place.
        if (Math.abs(delta) < 3 || performance.now() < animationLockUntilRef.current) return;
        if (travelRef.current && Math.sign(delta) !== Math.sign(travelRef.current)) {
          travelRef.current = 0;
        }
        travelRef.current += delta;

        const shouldHide = !headerHiddenRef.current && travelRef.current >= 36;
        const shouldShow = headerHiddenRef.current && travelRef.current <= -22;
        if (shouldHide || shouldShow) {
          headerHiddenRef.current = shouldHide;
          setIsHeaderHidden(shouldHide);
          travelRef.current = 0;
          animationLockUntilRef.current = performance.now() + 320;
        }
      });
    };

    // Capture scroll events from nested page panels too (for example the
    // Profile calendar), while ignoring scrolls outside the page content.
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll, { capture: true });
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  
  
  const canViewDashboard = true;
  const isMarketingLead = profile?.department_id === 'dea85847-2e5d-4258-ba6d-900dde8f6ed0' && profile?.employment_level === 'Leader';

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      if (!profileId) { if (active) setNotifications([]); return; }
      const { data } = await supabase.from('notifications').select('id, type, message, entity_type, entity_id, is_read').eq('user_id', profileId).eq('is_read', false).order('created_at', { ascending: false }).limit(12);
      if (!active) return;
      setNotifications((data || []).map((notification: any) => ({ id: notification.id, title: notification.type === 'task_completed' ? 'Task completed' : notification.type === 'task_comment' ? 'Bình luận mới' : notification.type === 'weekly_report' ? 'Weekly Report mới' : notification.type === 'report_reminder' ? 'Nhắc report' : 'Thông báo', message: notification.message, entity_type: notification.entity_type, entity_id: notification.entity_id })));
    };
    void loadNotifications();
    const channel = profileId
      ? supabase
          .channel(`header-notifications-${profileId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profileId}` },
            () => { void loadNotifications(); },
          )
          .subscribe()
      : null;

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [profileId]);

  const markAllNotificationsRead = async () => {
    const ids = notifications.map(notification => notification.id);
    setNotifications([]);
    if (ids.length) await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', ids);
  };

  const openNotification = async (notification: NotificationItem) => {
    setNotifications(current => current.filter(item => item.id !== notification.id));
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notification.id);
    setShowNotifs(false);
    if (notification.entity_type === 'task' && notification.entity_id) {
      navigate(`/tasks?task=${notification.entity_id}`);
    } else if (notification.entity_type === 'project_subtask') {
      navigate(`/projects`);
    } else if (notification.entity_type === 'weekly_report') {
      navigate(`/profile`);
    }
  };

  const navGroups = [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.home'), path: '/', icon: <Home size={18} /> },
        { name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} />, hidden: !canViewDashboard }
      ]
    },
    {
      title: t('nav.tasksProj'),
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        { name: 'Profile', path: '/my-tasks', icon: <Users size={18} /> },
        { name: t('nav.designTeam'), path: '/project', icon: <AlertCircle size={18} /> },
      ]
    },
    {
      title: t('nav.assets'),
      items: [
        { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
        { name: t('nav.borrow'), path: '/borrow-requests', icon: <History size={18} />, hidden: isMarketingLead },
      ]
    },
    {
      title: t('nav.teamRep'),
      items: [
        { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
        { name: 'Members', path: '/members', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} /> },
      ]
    }
  ];

  // Auto expand the group that contains the current active route on mount or location change
  useEffect(() => {
    if (!isSidebarOpen) {
      const activeGroup = navGroups.find(g => g.items.some(i => i.path === location.pathname));
      if (activeGroup) {
        setExpandedGroup(activeGroup.title);
      }
    }
  }, [location.pathname, isSidebarOpen]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <>
    <div
      aria-hidden={isHeaderHidden}
      className={cn(
        'shrink-0 overflow-hidden transition-[height,opacity,transform] duration-300 ease-out z-[100] relative motion-reduce:transition-none',
        isHeaderHidden
          ? 'h-0 -translate-y-3 opacity-0 pointer-events-none'
          : 'h-24 translate-y-0 opacity-100',
      )}
    >
    <header className="h-16 flex items-center justify-between px-4 md:px-8 mx-4 mt-4 rounded-2xl card-hub shadow-sm z-[100] relative">
      
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
                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1",
                    expandedGroup === group.title 
                      ? "text-primary dark:text-white" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {group.title}
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
                        "px-3 py-1.5 mx-0.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap",
                        isActive 
                          ? "bg-primary text-white shadow-md font-semibold" 
                          : "text-gray-500 hover:text-primary hover:bg-white dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                      )}
                    >
                      {item.icon}
                      <span className="text-xs">{item.name}</span>
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all hidden md:block"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          
          <div className={`sm:hidden flex items-center transition-all duration-300 ${isSearchExpanded ? 'absolute right-12 left-4 z-[110] bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg' : 'relative border-transparent'} border rounded-xl overflow-hidden h-9`}>
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
              className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300 pr-3 transition-opacity duration-300 ${isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
          </div>
          
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all relative"
            >
              <Bell size={20} />
              {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
            </button>
            
            {showNotifs && (
              <div className="fixed inset-x-4 top-[80px] sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-[9999] overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center">
                  <span>Notifications</span>
                  <span className="text-xs text-primary cursor-pointer hover:underline" onClick={markAllNotificationsRead}>Mark all as read</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? <p className="p-4 text-sm text-gray-500">Không có thông báo mới.</p> : notifications.map(notification => <button type="button" onClick={() => void openNotification(notification)} key={notification.id} className="w-full text-left p-4 border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"><p className="text-sm font-medium text-gray-800 dark:text-gray-200">{notification.title}</p><p className="text-xs text-gray-500 mt-1">{notification.message}</p></button>)}
                </div>
                <div className="p-3 text-center text-xs text-gray-500 hover:text-primary cursor-pointer border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                  View all notifications
                </div>
              </div>
            )}
          </div>
          
          
        </div>
      </div>
    </header>
    </div>
    </>
  );
};
